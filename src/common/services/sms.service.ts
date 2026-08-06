import twilio from 'twilio';
import { config } from '../../config';
import { logger } from '../logger';

export interface SmsPayload {
  to: string;
  body: string;
}

export interface BulkSmsPayload {
  recipients: string[];
  body: string;
}

let client: twilio.Twilio | null = null;

const getClient = (): twilio.Twilio => {
  if (!client) {
    client = twilio(config.twilio.accountSid, config.twilio.authToken);
  }
  return client;
};

export const sendSms = async (payload: SmsPayload): Promise<void> => {
  const twilioClient = getClient();
  await twilioClient.messages.create({
    to: payload.to,
    from: config.twilio.phoneNumber,
    body: payload.body,
  });
  logger.info({ to: payload.to }, `SMS sent to ${payload.to}`);
};

export const sendBulkSms = async (payload: BulkSmsPayload): Promise<void> => {
  const twilioClient = getClient();
  await Promise.allSettled(
    payload.recipients.map((to) =>
      twilioClient.messages.create({
        to,
        from: config.twilio.phoneNumber,
        body: payload.body,
      }),
    ),
  );
  logger.info(`Bulk SMS sent to ${payload.recipients.length} recipients`);
};
