import { google, sheets_v4 } from 'googleapis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import type { Hypothesis, HypothesisUpdate } from '../types/index.js';

type GoogleConfig = typeof config.google;

export class GoogleSheetsService {
  private readonly sheets: sheets_v4.Sheets;
  private readonly spreadsheetId: string;

  constructor(googleConfig: GoogleConfig) {
    const auth = new google.auth.GoogleAuth({
      credentials: googleConfig.applicationCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = googleConfig.sheets.spreadsheetId;
  }

  async loadHypotheses(): Promise<Hypothesis[]> {
    try {
      const sheetTitle = await this.findHypothesesSheetTitle();

      logger.info(`Loading all data from sheet: "${sheetTitle}"`);
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: sheetTitle
      });

      const rows = response.data.values;
      if (!rows || rows.length < 2) {
        logger.warn('No hypotheses found in the sheet.');
        return [] as Hypothesis[];
      }

      const headers = rows[0].map(h => (typeof h === 'string' ? h.trim() : h));
      const hypotheses = rows.slice(1).map(row => {
        const hypothesis: Record<string, any> = {};
        headers.forEach((header, index) => {
          hypothesis[header as string] = row[index];
        });
        return hypothesis as Hypothesis;
      });

      logger.success(`Successfully loaded ${hypotheses.length} hypotheses.`);
      return hypotheses;
    } catch (error: any) {
      logger.error('Failed to load hypotheses from Google Sheets', error);
      throw new Error(`Could not read from Google Sheets. Original error: ${error.message}`);
    }
  }

  async getHypothesis(id: string): Promise<Hypothesis> {
    const hypotheses = await this.loadHypotheses();
    const hypothesis = hypotheses.find(h => h.ID === id);
    if (!hypothesis) {
      throw new Error(`Hypothesis ${id} not found`);
    }
    return hypothesis;
  }

  async updateHypothesis(id: string, updates: HypothesisUpdate): Promise<void> {
    try {
      const sheetTitle = await this.findHypothesesSheetTitle();

      // Read complete sheet to identify headers and target row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: sheetTitle
      });

      const rows = response.data.values || [];
      if (rows.length < 2) {
        throw new Error('Sheet appears to be empty');
      }

      // Identify columns
      const headers = rows[0].map(h => (typeof h === 'string' ? h.trim() : h));
      const idColumnIndex = headers.indexOf('ID');
      if (idColumnIndex === -1) {
        throw new Error('Could not find "ID" column in the sheet.');
      }

      const dataRows = rows.slice(1);
      const rowIndex = dataRows.findIndex(row => row[idColumnIndex] === id);
      if (rowIndex === -1) {
        throw new Error(`Hypothesis ${id} not found in sheet`);
      }

      const absoluteRowNumber = rowIndex + 2; // +1 header, +1 1-based indexing

      // Update in-memory row using header names for safety
      const updatedRow = [...dataRows[rowIndex]];

      const setIfPresent = (headerName: string, value: unknown) => {
        const colIndex = headers.indexOf(headerName);
        if (colIndex !== -1 && value !== undefined) {
          updatedRow[colIndex] = value as any;
        }
      };

      setIfPresent('Confidence', updates.confidence);
      // Google Sheets percent-formatted cells expect 0-1 values.
      const normalizedConfidencePercent =
        typeof updates.confidencePercent === 'number'
          ? updates.confidencePercent / 100
          : undefined;
      setIfPresent('Confidence %', normalizedConfidencePercent);
      setIfPresent('Quote 1', updates.quote1);
      setIfPresent('Quote 2', updates.quote2);
      setIfPresent('Status', updates.status);

      // Compute end column letter based on header count
      const endColumnLetter = this.columnIndexToLetter(headers.length - 1);

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetTitle}!A${absoluteRowNumber}:${endColumnLetter}${absoluteRowNumber}`,
        valueInputOption: 'RAW',
        requestBody: { values: [updatedRow] }
      });

      logger.success(`✅ Updated hypothesis ${id}`);
    } catch (error: any) {
      logger.error(`❌ Failed to update hypothesis ${id}`, error);
      throw error;
    }
  }

  private async findHypothesesSheetTitle(): Promise<string> {
    const spreadsheetInfo = await this.sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId
    });
    const sheetsList = spreadsheetInfo.data.sheets || [];
    if (!sheetsList.length) {
      throw new Error('No sheets found in the spreadsheet.');
    }

    for (const sheet of sheetsList) {
      const title = sheet.properties?.title;
      if (!title) continue;

      const headerResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${title}!A1:Z1`
      });
      const headers = headerResponse.data.values?.[0];
      if (!headers) continue;

      const cleanedHeaders = headers.map(h => (typeof h === 'string' ? h.trim() : h));
      const expectedHeaders = ['Problem Title', 'Hypothesis', 'Questions to Ask in Meeting'];
      if (expectedHeaders.every(h => cleanedHeaders.includes(h))) {
        return title;
      }
    }
    throw new Error('Could not find a sheet with the required headers.');
  }

  private columnIndexToLetter(index: number): string {
    let dividend = index + 1;
    let columnName = '';
    while (dividend > 0) {
      const modulo = (dividend - 1) % 26;
      columnName = String.fromCharCode(65 + modulo) + columnName;
      dividend = Math.floor((dividend - modulo) / 26);
    }
    return columnName;
  }
}


