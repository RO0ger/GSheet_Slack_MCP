import type { HypothesisUpdate } from '../types/index.js';
import { GoogleSheetsService } from '../services/google-sheets.js';
import { config } from '../config/index.js';

const googleSheetsService = new GoogleSheetsService(config.google);

export async function updateHypotheses(
  hypothesis_id: string,
  confidence_score: number,
  reasoning: string,
  relevant_quotes: string[],
  status_recommendation: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>{
  try {
    const updates: HypothesisUpdate = {
      confidence: reasoning,
      confidencePercent: confidence_score,
      quote1: relevant_quotes[0] || '',
      quote2: relevant_quotes[1] || ''
    };

    if (confidence_score >= 80) {
      updates.status = 'VALIDATED';
    } else if (confidence_score < 50) {
      updates.status = 'NOT_VALIDATED';
    }

    await googleSheetsService.updateHypothesis(hypothesis_id, updates);

    return {
      content: [{
        type: 'text',
        text: `✅ Updated hypothesis ${hypothesis_id}: ${confidence_score}% confidence, status: ${updates.status || 'unchanged'}`
      }]
    };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `❌ Error updating hypothesis: ${error.message}` }],
      isError: true
    };
  }
}


