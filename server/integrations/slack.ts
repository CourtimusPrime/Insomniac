interface SlackResult {
  success: boolean;
  error?: string;
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: Array<{ type: string; text: string }>;
}

interface SlackMessage {
  text: string;
  blocks?: SlackBlock[];
  attachments?: Array<{ color: string; blocks: SlackBlock[] }>;
}

const STATUS_COLORS: Record<string, string> = {
  success: '#36a64f',
  warning: '#f2c744',
  error: '#e01e5a',
  info: '#1264a3',
};

export class SlackNotifier {
  /**
   * Send a message to a Slack incoming webhook.
   */
  async sendMessage(
    webhookUrl: string,
    message: SlackMessage,
  ): Promise<SlackResult> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          success: false,
          error: `Slack API error (${response.status}): ${body}`,
        };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Failed to send Slack message: ${message}`,
      };
    }
  }

  /**
   * Build a formatted Slack message with title, body, and status color.
   */
  private buildFormattedMessage(
    title: string,
    body: string,
    status: keyof typeof STATUS_COLORS,
  ): SlackMessage {
    const color = STATUS_COLORS[status] ?? STATUS_COLORS.info;

    return {
      text: title,
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*${title}*` },
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: body },
            },
          ],
        },
      ],
    };
  }

  /**
   * Notify that a pipeline has completed successfully.
   */
  async notifyPipelineComplete(
    webhookUrl: string,
    pipelineName: string,
    details: string,
  ): Promise<SlackResult> {
    const message = this.buildFormattedMessage(
      `Pipeline Complete: ${pipelineName}`,
      details,
      'success',
    );
    return this.sendMessage(webhookUrl, message);
  }

  /**
   * Notify that a decision is needed from a human.
   */
  async notifyDecisionNeeded(
    webhookUrl: string,
    subject: string,
    details: string,
  ): Promise<SlackResult> {
    const message = this.buildFormattedMessage(
      `Decision Needed: ${subject}`,
      details,
      'warning',
    );
    return this.sendMessage(webhookUrl, message);
  }

  /**
   * Notify that an error occurred.
   */
  async notifyError(
    webhookUrl: string,
    errorTitle: string,
    details: string,
  ): Promise<SlackResult> {
    const message = this.buildFormattedMessage(
      `Error: ${errorTitle}`,
      details,
      'error',
    );
    return this.sendMessage(webhookUrl, message);
  }
}
