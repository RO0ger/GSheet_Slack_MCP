import type { Hypothesis } from '../types/index.js';
import { GoogleSheetsService } from '../services/google-sheets.js';
import { config } from '../config/index.js';

const googleSheetsService = new GoogleSheetsService(config.google);

export async function loadHypotheses(): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>{
  try {
    const hypotheses: Hypothesis[] = await googleSheetsService.loadHypotheses();
    return { content: [{ type: 'text', text: JSON.stringify(hypotheses, null, 2) }] };
  } catch (error: any) {
    return { content: [{ type: 'text', text: `Error loading hypotheses: ${error.message}` }], isError: true };
  }
}


