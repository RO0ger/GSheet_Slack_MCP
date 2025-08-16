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

  async getHeaders(): Promise<string[]> {
    const sheetTitle = await this.findHypothesesSheetTitle();
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetTitle}!1:1`
    });
    const headers = response.data.values?.[0] || [];
    return headers.map(h => String(h).trim());
  }

  async getHypothesisRow(id: string): Promise<Record<string, any>> {
    const hypotheses = await this.loadHypotheses();
    const hypothesis = hypotheses.find(h => h.ID === id);
    if (!hypothesis) {
      throw new Error(`Hypothesis ${id} not found`);
    }
    return hypothesis as Record<string, any>;
  }

  async updateHypothesis(id: string, updates: Record<string, any>): Promise<void> {
    try {
      const sheetTitle = await this.findHypothesesSheetTitle();
      const headers = await this.getHeaders();
      if (headers.length === 0) {
        throw new Error('Could not read sheet headers.');
      }
      
      const idColumnIndex = headers.indexOf('ID');
      if (idColumnIndex === -1) {
        throw new Error('Could not find "ID" column in the sheet.');
      }
      
      const idColumnLetter = this.columnIndexToLetter(idColumnIndex);
      const idColumnRange = `${sheetTitle}!${idColumnLetter}1:${idColumnLetter}`;

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: idColumnRange
      });

      const idColumnValues = (response.data.values || []).flat();
      const rowIndex = idColumnValues.findIndex(cell => cell === id);

      if (rowIndex === -1) {
        throw new Error(`Hypothesis ${id} not found in sheet`);
      }

      const absoluteRowNumber = rowIndex + 1;

      const currentRowData = await this.getHypothesisRow(id);
      const updatedData = { ...currentRowData, ...updates };

      // Handle special cases like percentage formatting for Google Sheets
      if (updates['Confidence %'] && typeof updates['Confidence %'] === 'number') {
        updatedData['Confidence %'] = updates['Confidence %'] / 100;
      }

      const orderedRowValues = headers.map(header => updatedData[header] ?? '');

      const endColumnLetter = this.columnIndexToLetter(headers.length - 1);
      const updateRange = `${sheetTitle}!A${absoluteRowNumber}:${endColumnLetter}${absoluteRowNumber}`;

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [orderedRowValues] }
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


