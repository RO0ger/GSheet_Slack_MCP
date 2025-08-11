import type { Hypothesis } from '../types/index.js';
import { GoogleSheetsService } from '../services/google-sheets.js';
import { config } from '../config/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const googleSheetsService = new GoogleSheetsService(config.google);

export async function analyzeHypothesis(
  mcpServer: McpServer,
  hypothesis_id: string,
  transcript: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>{
  try {
    const hypothesis: Hypothesis = await googleSheetsService.getHypothesis(hypothesis_id);

    const response = await (mcpServer as any).server.createMessage({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze this meeting transcript against hypothesis ${hypothesis_id}.

HYPOTHESIS: "${hypothesis.Hypothesis}"

TRANSCRIPT: ${transcript}

TASK: Return ONLY valid JSON with this exact structure:
{
  "confidence_score": <integer 0-100>,
  "reasoning": "<detailed 2-3 sentence analysis explaining the confidence score>",
  "relevant_quotes": ["<exact quote from transcript>", "<another exact quote if relevant>"],
  "status_recommendation": "<VALIDATED|NOT_VALIDATED|HUMAN_JUDGMENT>"
}

RULES:
- confidence_score: integer 0-100 based on evidence strength
- reasoning: explain WHY you assigned this confidence score
- relevant_quotes: exact text from transcript (empty array if none)
- status_recommendation: VALIDATED (≥80%), NOT_VALIDATED (<50%), HUMAN_JUDGMENT (51-79%)`
        }
      }],
      maxTokens: 500,
      temperature: 0.1
    });

    const text = response?.content?.type === 'text' ? response.content.text : JSON.stringify(response);
    return { content: [{ type: 'text', text }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error analyzing hypothesis: ${error.message}` }], isError: true };
  }
}


