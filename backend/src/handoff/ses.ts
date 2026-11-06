// Handoff emails through Amazon SES in the client's account (D36). The configuration set the
// stack creates requires TLS to the receiving server, so a handoff never travels in clear text.
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import type { Email, Outbox } from './email.ts';

export class SesOutbox implements Outbox {
  private readonly ses = new SESv2Client({});

  constructor(private readonly configurationSet: string) {}

  async send(email: Email): Promise<string> {
    const r = await this.ses.send(
      new SendEmailCommand({
        FromEmailAddress: email.from,
        Destination: { ToAddresses: [email.to] },
        ConfigurationSetName: this.configurationSet,
        Content: {
          Simple: {
            Subject: { Data: email.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: email.body, Charset: 'UTF-8' } },
          },
        },
      }),
    );
    return r.MessageId ?? '';
  }
}
