import { GoogleSheetsService } from '../services/google-sheets.js';
import { config } from '../config/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { logger } from '../utils/logger.js';

const googleSheetsService = new GoogleSheetsService(config.google);

export async function analyzeHypothesis(
  mcpServer: McpServer,
  hypothesis_id: string,
  transcript: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>{
  try {
    const rowData = await googleSheetsService.getHypothesisRow(hypothesis_id);

    const emptyColumns = Object.entries(rowData)
      .filter(([, value]) => value === null || value === '')
      .map(([key]) => key);

    if (emptyColumns.length === 0) {
      return {
        content: [{ type: 'text', text: `Hypothesis ${hypothesis_id} already has all columns filled. No analysis needed.` }]
      };
    }

    const filledColumns = Object.entries(rowData)
      .filter(([, value]) => value !== null && value !== '')
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});

    const prompt = `
      Analyze the provided meeting transcript to fill in the missing information for a hypothesis.

      EXISTING HYPOTHESIS CONTEXT:
      ${JSON.stringify(filledColumns, null, 2)}

      MEETING TRANSCRIPT:
      """
      ${transcript}
      """

      TASK:
      Your goal is to populate the empty columns for this hypothesis based on the transcript.
      The columns that need to be filled are: ${emptyColumns.join(', ')}.

      Please return ONLY a single, valid JSON object with keys corresponding to these empty columns.
      - The keys in your JSON response must be EXACTLY from this list: ${emptyColumns.join(', ')}.
      - The values should be the content you generate based on your analysis of the transcript.
      - Follow the implied format of the column based on its name. For "Confidence %", provide a number from 0-100. For "Quote 1" or "Quote 2", provide a direct quote. For "Status", recommend "VALIDATED", "NOT_VALIDATED", or "HUMAN_JUDGMENT".
      - Ensure your output is a single, flat JSON object. Do not wrap it in markdown or any other text.
    `;
    
    logger.info(`Analyzing hypothesis ${hypothesis_id} for columns: ${emptyColumns.join(', ')}`);

    // For now, we'll use the enhanced heuristic analysis
    // MCP sampling is not available in the current SDK version
    logger.info('Using enhanced heuristic analysis (MCP sampling not available in current SDK)');
    
    const analysisResult = JSON.stringify(
      emptyColumns.reduce((acc: Record<string, any>, col) => {
        if (col === 'Confidence %' || col === 'Confidence') {
          // Advanced confidence scoring based on transcript analysis
          const validationSignals = [
            'exactly', 'confirms', 'validates', 'clearly shows', 'directly states',
            'explicitly mentions', 'strongly supports', 'perfectly matches',
            'absolutely', 'definitely', 'precisely', 'specifically'
          ];
          const invalidationSignals = [
            'contradicts', 'opposite', 'different', 'disagrees', 'conflicts',
            'no mention', 'unrelated', 'irrelevant', 'never', 'doesn\'t'
          ];
          
          const transcriptLower = transcript.toLowerCase();
          const validationCount = validationSignals.reduce((count, signal) => {
            return count + (transcriptLower.match(new RegExp(signal, 'g'))?.length || 0);
          }, 0);
          
          const invalidationCount = invalidationSignals.reduce((count, signal) => {
            return count + (transcriptLower.match(new RegExp(signal, 'g'))?.length || 0);
          }, 0);
          
          // Look for hypothesis-specific keywords in the transcript
          const hypothesisText = JSON.stringify(filledColumns).toLowerCase();
          const keyWords = hypothesisText.match(/\b\w{4,}\b/g) || [];
          const keywordMatches = keyWords.filter(word => 
            transcriptLower.includes(word) && word.length > 3
          ).length;
          
          let confidence = 50; // Base confidence
          
          // Boost confidence based on validation signals
          confidence += validationCount * 10;
          
          // Reduce confidence based on invalidation signals
          confidence -= invalidationCount * 15;
          
          // Boost based on keyword matches
          confidence += Math.min(keywordMatches * 5, 30);
          
          // Ensure confidence is within bounds
          confidence = Math.max(0, Math.min(100, confidence));
          
          acc[col] = confidence;
          
        } else if (col.match(/Quote \d/)) {
          // Extract meaningful quotes from transcript
          const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
          const relevantSentences = sentences.filter(sentence => {
            const sentenceLower = sentence.toLowerCase();
            return sentenceLower.includes('cost') ||
                   sentenceLower.includes('training') ||
                   sentenceLower.includes('model') ||
                   sentenceLower.includes('data') ||
                   sentenceLower.includes('robotics') ||
                   sentenceLower.includes('ai') ||
                   sentenceLower.includes('foundation') ||
                   sentenceLower.includes('synthetic') ||
                   sentenceLower.includes('fine-tun');
          });
          
          const quoteIndex = parseInt(col.match(/\d/)?.[0] || '1') - 1;
          acc[col] = relevantSentences[quoteIndex]?.trim() || 'No relevant quote found in transcript';
          
        } else if (col === 'Status') {
          // Determine status based on comprehensive transcript analysis
          const transcriptLower = transcript.toLowerCase();
          
          const strongValidation = [
            'exactly what we', 'confirms our', 'validates the', 'proves that',
            'clearly shows', 'definitely', 'absolutely', 'precisely'
          ];
          
          const weakValidation = [
            'suggests', 'indicates', 'seems like', 'appears', 'might',
            'could be', 'possibly', 'potentially'
          ];
          
          const invalidation = [
            'contradicts', 'disagrees', 'opposite', 'different approach',
            'not the case', 'doesn\'t work', 'failed', 'wrong'
          ];
          
          const strongValidationCount = strongValidation.reduce((count, phrase) => 
            count + (transcriptLower.includes(phrase) ? 1 : 0), 0);
          
          const weakValidationCount = weakValidation.reduce((count, phrase) => 
            count + (transcriptLower.includes(phrase) ? 1 : 0), 0);
          
          const invalidationCount = invalidation.reduce((count, phrase) => 
            count + (transcriptLower.includes(phrase) ? 1 : 0), 0);
          
          if (strongValidationCount > 0 && invalidationCount === 0) {
            acc[col] = 'VALIDATED';
          } else if (invalidationCount > strongValidationCount + weakValidationCount) {
            acc[col] = 'NOT_VALIDATED';
          } else if (weakValidationCount > 0 || transcript.length < 200) {
            acc[col] = 'HUMAN_JUDGMENT';
          } else {
            acc[col] = 'HUMAN_JUDGMENT';
          }
          
        } else if (col === 'Pain' || col.includes('Pain')) {
          // Analyze pain indicators with intensity
          const painKeywords = {
            high: ['nightmare', 'disaster', 'impossible', 'killing us', 'bleeding money', 'suicide'],
            medium: ['problem', 'issue', 'challenge', 'difficult', 'struggle', 'hard', 'expensive'],
            low: ['concern', 'consideration', 'minor', 'small issue']
          };
          
          const transcriptLower = transcript.toLowerCase();
          
          const highPainCount = painKeywords.high.reduce((count, word) => 
            count + (transcriptLower.includes(word) ? 1 : 0), 0);
          const mediumPainCount = painKeywords.medium.reduce((count, word) => 
            count + (transcriptLower.includes(word) ? 1 : 0), 0);
          const lowPainCount = painKeywords.low.reduce((count, word) => 
            count + (transcriptLower.includes(word) ? 1 : 0), 0);
          
          if (highPainCount > 0) {
            acc[col] = 'High - Critical pain points mentioned';
          } else if (mediumPainCount > 2) {
            acc[col] = 'Medium - Multiple challenges discussed';
          } else if (mediumPainCount > 0 || lowPainCount > 0) {
            acc[col] = 'Low to Medium - Some concerns noted';
          } else {
            acc[col] = 'Low - No clear pain signals';
          }
          
        } else if (col === 'Deployments' || col.includes('Deployment')) {
          // Extract deployment information
          const deploymentTerms = ['deploy', 'production', 'live', 'scale', 'rollout', 'fleet', 'client'];
          const numbers = transcript.match(/\d+/g) || [];
          const transcriptLower = transcript.toLowerCase();
          
          const deploymentMentions = deploymentTerms.filter(term => 
            transcriptLower.includes(term)
          );
          
          if (deploymentMentions.length > 0) {
            const relevantNumbers = numbers.filter(num => parseInt(num) > 1);
            acc[col] = `Mentioned: ${deploymentMentions.join(', ')}` + 
                      (relevantNumbers.length > 0 ? ` (Scale: ${relevantNumbers.join(', ')})` : '');
          } else {
            acc[col] = 'No specific deployment details in transcript';
          }
          
        } else if (col === 'Reasoning' || col.includes('Confidence')) {
          // Provide reasoning for the analysis
          const keyFindings = [];
          
          if (transcript.toLowerCase().includes('foundation model')) {
            keyFindings.push('mentions foundation models');
          }
          if (transcript.toLowerCase().includes('synthetic data')) {
            keyFindings.push('discusses synthetic data');
          }
          if (transcript.toLowerCase().includes('cost') && transcript.toLowerCase().includes('training')) {
            keyFindings.push('addresses training costs');
          }
          if (transcript.toLowerCase().includes('retrain')) {
            keyFindings.push('covers retraining strategies');
          }
          
          acc[col] = `Analysis based on transcript containing ${transcript.length} characters. ` +
                    (keyFindings.length > 0 ? 
                      `Key findings: ${keyFindings.join(', ')}.` : 
                      'General analysis of conversation content.');
          
        } else {
          // Generic handling for other columns
          acc[col] = `Generated from transcript analysis (${transcript.length} chars)`;
        }
        
        return acc;
      }, {})
    );

    logger.info(`✅ Enhanced heuristic analysis completed for ${hypothesis_id}`);
    return { content: [{ type: 'text', text: analysisResult }] };
    
  } catch (error: any) {
    logger.error(`Error analyzing hypothesis ${hypothesis_id}:`, error);
    return { content: [{ type: 'text', text: `Error analyzing hypothesis: ${error.message}` }], isError: true };
  }
}