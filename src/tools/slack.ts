import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { slackFormatter } from '../utils/formatters.js';

const webhookUrl = config.slack.webhookUrl;

export async function sendSlackNotification({ summary }: { summary: any }): Promise<{ success: boolean }> {
  logger.info('Sending Slack notification...');
  
  try {
    const payload = summary.error
      ? slackFormatter.formatProcessingError(summary.meetingId, summary.error)
      : slackFormatter.formatProcessingComplete(summary);

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Slack API returned an error', { status: response.status, body: errorBody });
      throw new Error(`Slack API failed with status ${response.status}`);
    }

    logger.success('Successfully sent Slack notification.');
    return { success: true };

  } catch (error: any) {
    logger.error('Failed to send Slack notification', { error: error.message });
    throw error;
  }
} 