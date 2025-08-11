import { logger } from '../utils/logger.js';
import type { NotificationData } from '../types/index.js';

export class SlackService {
  constructor(private readonly webhookUrl: string) {}

  async sendNotification(data: NotificationData): Promise<void> {
    const text = `Hypothesis ${data.hypothesis_id}: ${data.confidence_score}%\n${data.summary}`;

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Slack webhook failed (${response.status}): ${body}`);
      }
      logger.success('Slack notification sent');
    } catch (error: any) {
      logger.error('Slack notification failed', error);
      throw error;
    }
  }
}


