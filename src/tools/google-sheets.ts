import { google } from 'googleapis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

// Configure Google Sheets client using service account JSON from env
const auth = new google.auth.GoogleAuth({
  credentials: config.google.applicationCredentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = config.google.sheets.spreadsheetId;

/**
 * Loads hypotheses from the "Hypotheses" tab of the Google Sheet.
 */
export async function loadHypotheses(): Promise<any[]> {
  try {
    // 1. Get all sheet metadata to find their titles
    logger.info('Finding the hypotheses sheet automatically...');
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    const sheetsList = spreadsheetInfo.data.sheets || [];
    if (sheetsList.length === 0) {
      throw new Error('No sheets found in the spreadsheet.');
    }

    let hypothesesSheetTitle: string | null = null;

    // 2. Iterate through each sheet to find the one with the correct headers
    for (const sheet of sheetsList) {
      const title = sheet.properties?.title;
      if (!title) continue;

      logger.info(`Checking sheet: "${title}" for valid headers...`);
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${title}!A1:Z1`, // Read the first row
      });

      const headers = headerResponse.data.values?.[0];
      if (!headers) continue; // Skip if no headers found

      // Clean headers by trimming whitespace
      const cleanedHeaders = headers.map(h => (typeof h === 'string' ? h.trim() : h));

      // Define our expected headers. This makes the check robust.
      const expectedHeaders = ['Problem Title', 'Hypothesis', 'Questions to Ask in Meeting'];
      
      // Log the headers we found for debugging
      logger.info(`Headers found in sheet "${title}": [${cleanedHeaders.join(', ')}]`);
      logger.info(`Expected headers: [${expectedHeaders.join(', ')}]`);

      if (expectedHeaders.every(h => cleanedHeaders.includes(h))) {
        logger.success(`Found valid hypotheses sheet: "${title}"`);
        hypothesesSheetTitle = title;
        break; // Stop after finding the first valid sheet
      }
    }

    if (!hypothesesSheetTitle) {
      throw new Error('Could not find a sheet with the required headers: "Problem Title", "Hypothesis", and "Questions to Ask in Meeting".');
    }
    
    // 3. Load all data from the identified sheet
    logger.info(`Loading all data from sheet: "${hypothesesSheetTitle}"`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: hypothesesSheetTitle, // Use the dynamically found title
    });

    const rows = response.data.values;
    if (!rows || rows.length < 2) {
      logger.warn('No hypotheses found in the sheet.');
      return [];
    }

    logger.info(`=== GSHEETS DEBUG ===`);
    logger.info(`Total rows loaded: ${rows.length}`);
    rows.forEach((row, index) => {
      logger.info(`Row ${index}: ${JSON.stringify(row)}`);
    });
    logger.info(`=== END GSHEETS DEBUG ===`);

    // Clean the headers to ensure consistent mapping
    const headers = rows[0].map(h => (typeof h === 'string' ? h.trim() : h));
    const hypotheses = rows.slice(1).map(row => {
      const hypothesis: { [key: string]: any } = {};
      headers.forEach((header, index) => {
        hypothesis[header] = row[index];
      });
      return hypothesis;
    });

    logger.success(`Successfully loaded ${hypotheses.length} hypotheses.`);
    return hypotheses;
  } catch (error: any) {
    logger.error('Failed to load hypotheses from Google Sheet', { 
      error: error.message,
      details: error.errors || 'No additional details provided.' 
    });
    throw new Error(`Could not read from Google Sheets. Original error: ${error.message}`);
  }
}

/**
 * Updates a batch of hypotheses in place in the Google Sheet.
 * @param results The analysis results to write for each hypothesis.
 */
export async function updateHypotheses({ results }: { results: any[] }): Promise<{ success: boolean }> {
  logger.info(`Updating ${results.length} hypotheses in place...`);
  if (results.length === 0) {
    logger.warn('No results provided to update.');
    return { success: true };
  }

  // First, find the sheet and get all its data to locate rows by ID
  const sheetTitle = await findHypothesesSheetTitle();
  const rangeData = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: sheetTitle,
  });

  const rows = rangeData.data.values || [];
  const headers = rows[0] || [];
  const idColumnIndex = headers.indexOf('ID');
  if (idColumnIndex === -1) {
    throw new Error('Could not find "ID" column in the sheet.');
  }

  // Create a map of ID to row number (1-based for Google Sheets)
  const idToRowMap = new Map<string, number>();
  rows.slice(1).forEach((row, i) => {
    const id = row[idColumnIndex];
    if (id) {
      idToRowMap.set(id, i + 2); // +2 because: +1 for header row, +1 for 1-based indexing
    }
  });

  // These are the headers we expect to update, in the correct order.
  const updateHeaders = ['Pain', 'Status', 'Deployments', 'Confidence', 'Confidence %', 'Quote 1', 'Quote 2', 'Possible Fix', 'Scale Risk'];

  // Get the column letters for each header we want to update
  const headerToColumnMap = new Map<string, string>();
  updateHeaders.forEach(header => {
    const columnIndex = headers.indexOf(header);
    if (columnIndex === -1) {
      throw new Error(`Could not find "${header}" column in the sheet.`);
    }
    const columnLetter = String.fromCharCode(65 + columnIndex);
    headerToColumnMap.set(header, columnLetter);
  });

  // Prepare individual cell updates for each result
  const dataUpdatePayload: any[] = [];
  for (const result of results) {
    const rowNumber = idToRowMap.get(result.hypothesis_id);
    if (!rowNumber) {
      logger.warn(`Could not find row for ID: ${result.hypothesis_id} in the sheet. Skipping update.`);
      continue;
    }

    // Create individual cell updates for each analysis field
    updateHeaders.forEach(header => {
      const columnLetter = headerToColumnMap.get(header);
      const value = result.analysis[header] || '';
      
      if (columnLetter) {
        dataUpdatePayload.push({
          range: `${sheetTitle}!${columnLetter}${rowNumber}`,
          values: [[value]], // Single cell value wrapped in array
        });
      }
    });
  }

  if (dataUpdatePayload.length === 0) {
    logger.warn('No valid updates to perform.');
    return { success: true };
  }

  // Perform batch update with individual cell ranges
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: dataUpdatePayload,
    },
  });

  logger.success(`Successfully updated ${dataUpdatePayload.length} cells across ${results.length} hypotheses.`);
  return { success: true };
}

async function findHypothesesSheetTitle(): Promise<string> {
  // This logic is duplicated from loadHypotheses. In a real app, this would be refactored.
  const spreadsheetInfo = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
  });
  const sheetsList = spreadsheetInfo.data.sheets || [];
  for (const sheet of sheetsList) {
    const title = sheet.properties?.title;
    if (!title) continue;
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${title}!A1:Z1`,
    });
    const headers = headerResponse.data.values?.[0];

    // Clean headers by trimming whitespace
    if (!headers) continue;
    const cleanedHeaders = headers.map(h => (typeof h === 'string' ? h.trim() : h));
    const expectedHeaders = ['Problem Title', 'Hypothesis', 'Questions to Ask in Meeting'];
    if (expectedHeaders.every(h => cleanedHeaders.includes(h))) {
      return title;
    }
  }
  throw new Error('Could not find a sheet with the required headers.');
} 