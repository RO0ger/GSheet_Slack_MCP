import type { NotificationData } from '../types/index.js';
import { SlackService } from '../services/slack.js';
import { config } from '../config/index.js';

const slackService = new SlackService(config.slack.webhookUrl);

export async function sendSlackNotification(
  hypothesis_id: string,
  confidence_score: number,
  summary: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>{
  try {
    const notificationData: NotificationData = {
      hypothesis_id,
      confidence_score,
      summary
    };

    await slackService.sendNotification(notificationData);

    return { content: [{ type: 'text', text: `✅ Slack notification sent for hypothesis ${hypothesis_id}` }] };
  } catch (error: any) {
    return {
      content: [{ type: 'text', text: `❌ Slack notification failed: ${error.message}` }],
      isError: true
    };
  }
}


