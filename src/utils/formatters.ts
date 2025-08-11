export interface SlackFormatter {
  formatProcessingComplete(summary: ProcessingSummary): any;
  formatProcessingError(meetingId: string, error: string): any;
}

export interface ProcessingSummary {
  meetingId: string;
  totalHypotheses: number;
  processedCount: number;
  duration: number;
  processedAt: string;
}

class DefaultSlackFormatter implements SlackFormatter {
  formatProcessingComplete(summary: ProcessingSummary) {
    return {
      text: `Meeting ${summary.meetingId} analysis complete`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*✅ Meeting Analysis Complete*\n\n` +
                  `*Meeting:* ${summary.meetingId}\n` +
                  `*Hypotheses Analyzed:* ${summary.processedCount} / ${summary.totalHypotheses}\n` +
                  `*Duration:* ${(summary.duration / 1000).toFixed(1)}s`
          }
        }
      ]
    };
  }
  
  formatProcessingError(meetingId: string, error: string) {
    return {
      text: `❌ Meeting ${meetingId} processing failed: ${error}`
    };
  }
}

export const slackFormatter: SlackFormatter = new DefaultSlackFormatter(); 