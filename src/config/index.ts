import fs from 'node:fs';

export interface AppConfig {
  google: {
    applicationCredentials?: any; // Parsed service account JSON
    sheets: {
      spreadsheetId: string;
    };
  };
  slack: {
    webhookUrl: string;
  };
  files: {
    promptsDir: string;
  };
  server: {
    port: number;
    webhookPath: string;
  };
  processing: {
    maxConcurrentMeetings: number;
    timeoutMs: number;
  };
  retryPolicy: {
    maxRetries: number;
    baseDelayMs: number;
  };
}

function parseGoogleCredentials(): any | undefined {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw) return undefined;
  const trimmed = raw.trim();
  // Case 1: Raw JSON string
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return undefined;
    }
  }
  // Case 2: Treat as filesystem path to JSON
  try {
    if (fs.existsSync(trimmed)) {
      const fileContents = fs.readFileSync(trimmed, 'utf-8');
      return JSON.parse(fileContents);
    }
  } catch {
    // fall through
  }
  return undefined;
}

export const config: AppConfig = {
  google: {
    applicationCredentials: parseGoogleCredentials(),
    sheets: {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || ''
    }
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
  },
  files: {
    promptsDir: process.env.PROMPTS_DIR || './prompts'
  },
  server: {
    port: Number(process.env.PORT || 8080),
    webhookPath: process.env.WEBHOOK_PATH || '/meeting-ended'
  },
  processing: {
    maxConcurrentMeetings: Number(process.env.MAX_CONCURRENT || 5),
    timeoutMs: Number(process.env.PROCESSING_TIMEOUT || 120000)
  },
  retryPolicy: {
    maxRetries: Number(process.env.RETRY_MAX_RETRIES || 3),
    baseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS || 1000)
  }
};