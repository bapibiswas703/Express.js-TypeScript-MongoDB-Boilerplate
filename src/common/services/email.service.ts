import type { Transporter } from 'nodemailer';
import nodemailer from 'nodemailer';
import { config } from '../../config';
import { renderTemplate } from '../utils/template';
import { logger } from '../logger';

export interface EmailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, unknown>;
}

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  let html = payload.html || '';

  if (payload.template) {
    html = await renderTemplate(payload.template, {
      appName: config.appName,
      ...payload.data,
    });
  }

  const transport = getTransporter();
  await transport.sendMail({
    from: config.smtp.from,
    to: payload.to,
    subject: payload.subject,
    html,
    text: payload.text,
  });
  logger.info({ to: payload.to }, `Email sent to ${payload.to}`);
};
