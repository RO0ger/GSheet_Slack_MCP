#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { loadHypotheses } from './tools/load-hypotheses.js';
import { analyzeHypothesis } from './tools/analyze-hypothesis.js';
import { updateHypotheses } from './tools/update-hypotheses.js';
import { sendSlackNotification } from './tools/slack-notification.js';

const server = new McpServer(
  { name: 'gsheet-mcp', version: '3.0.0' },
  { 
    capabilities: { 
      tools: {}, 
      logging: {},
      sampling: {}
    } 
  }
);

// Tool 1: Load hypotheses from Google Sheets
server.registerTool(
  'gsheets_load_hypotheses',
  {
    title: 'Load Hypotheses from Google Sheets',
    description: 'Load all hypotheses from the configured Google Sheets document for analysis',
    inputSchema: {}
  },
  async () => {
    logger.info('🔄 Loading hypotheses from Google Sheets');
    const result = await loadHypotheses();
    logger.info(result.isError ? '❌ Failed to load hypotheses' : '✅ Hypotheses loaded successfully');
    return result as any;
  }
);

// Tool 2: Analyze hypothesis with Claude via MCP sampling
server.registerTool(
  'analyze_hypothesis',
  {
    title: 'Analyze Hypothesis with Claude',
    description: 'Analyze meeting transcript against specific hypothesis using Claude via MCP sampling',
    inputSchema: {
      hypothesis_id: z.string().describe('Hypothesis ID (P1, P2, P3, etc.)'),
      transcript: z.string().describe('Meeting transcript content to analyze')
    }
  },
  async ({ hypothesis_id, transcript }) => {
    logger.info(`🔍 Analyzing hypothesis ${hypothesis_id} with Claude`);
    const result = await analyzeHypothesis(server, hypothesis_id, transcript);
    logger.info(result.isError ? `❌ Analysis failed for ${hypothesis_id}` : `✅ Analysis complete for ${hypothesis_id}`);
    return result as any;
  }
);

// Tool 3: Update hypothesis in Google Sheets
server.registerTool(
  'gsheets_update_hypotheses',
  {
    title: 'Update Hypotheses in Google Sheets',
    description: 'Update a hypothesis row with the JSON output from the analysis tool.',
    inputSchema: {
      hypothesis_id: z.string().describe('Hypothesis ID to update (e.g., P1, P2)'),
      updates_json: z.string().describe('A valid JSON string containing the columns and values to update.')
    }
  },
  async ({ hypothesis_id, updates_json }) => {
    logger.info(`📝 Updating hypothesis ${hypothesis_id} in Google Sheets`);
    const result = await updateHypotheses(
      hypothesis_id,
      updates_json
    );
    logger.info(result.isError ? `❌ Update failed for ${hypothesis_id}` : `✅ Updated ${hypothesis_id} successfully`);
    return result as any;
  }
);

// Tool 4: Send Slack notification
server.registerTool(
  'slack_send_notification',
  {
    title: 'Send Slack Notification',
    description: 'Send analysis summary notification to configured Slack channel',
    inputSchema: {
      hypothesis_id: z.string().describe('Hypothesis ID for the notification'),
      confidence_score: z.number().min(0).max(100).describe('Confidence score to include in notification'),
      summary: z.string().describe('Analysis summary message to send to Slack')
    }
  },
  async ({ hypothesis_id, confidence_score, summary }) => {
    logger.info(`📢 Sending Slack notification for hypothesis ${hypothesis_id} (${confidence_score}% confidence)`);
    const result = await sendSlackNotification(hypothesis_id, confidence_score, summary);
    logger.info(result.isError ? `❌ Slack notification failed for ${hypothesis_id}` : `✅ Slack notification sent for ${hypothesis_id}`);
    return result as any;
  }
);

async function main() {
  try {
    logger.info('🚀 Starting MCP Server...', {
      serverName: 'gsheet-mcp',
      version: '3.0.0',
      nodeVersion: process.version
    });

    // Validate environment variables
    const requiredEnvVars = [
      'GOOGLE_APPLICATION_CREDENTIALS',
      'GOOGLE_SHEETS_SPREADSHEET_ID',
      'SLACK_WEBHOOK_URL'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('✅ MCP Server started successfully on stdio transport');
    logger.info('📋 Registered tools:', {
      tools: [
        'gsheets_load_hypotheses',
        'analyze_hypothesis',
        'gsheets_update_hypotheses',
        'slack_send_notification'
      ]
    });

    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection:', { promise, reason });
      process.exit(1);
    });

    process.on('SIGINT', () => {
      logger.info('🛑 Received SIGINT, shutting down gracefully');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('🛑 Received SIGTERM, shutting down gracefully');
      process.exit(0);
    });
  } catch (error: any) {
    logger.error('💥 Server startup failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});