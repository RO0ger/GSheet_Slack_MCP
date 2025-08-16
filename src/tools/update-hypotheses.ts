import { GoogleSheetsService } from '../services/google-sheets.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

const googleSheetsService = new GoogleSheetsService(config.google);

export async function updateHypotheses(
  hypothesis_id: string,
  updates_json: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>{
  try {
    let updates: Record<string, any>;
    try {
      updates = JSON.parse(updates_json);
    } catch (error) {
      throw new Error('Invalid JSON provided. Please provide a valid JSON string.');
    }

    await googleSheetsService.updateHypothesis(hypothesis_id, updates);

    const updatedColumns = Object.keys(updates).join(', ');
    return {
      content: [{
        type: 'text',
        text: `✅ Successfully updated hypothesis ${hypothesis_id}. Columns updated: ${updatedColumns}`
      }]
    };
  } catch (error: any) {
    logger.error(`Failed to update hypothesis ${hypothesis_id}:`, error);
    return {
      content: [{ type: 'text', text: `❌ Error updating hypothesis: ${error.message}` }],
      isError: true
    };
  }
}


