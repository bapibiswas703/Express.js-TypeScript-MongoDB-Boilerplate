import { getMessaging } from 'firebase-admin/messaging';
import { logger } from '../logger';
import { initFirebase } from './firebase';

export interface FcmPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface FcmMulticastPayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}

export const sendPushNotification = async (payload: FcmPayload): Promise<void> => {
  initFirebase();
  await getMessaging().send({
    token: payload.token,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
  });
  logger.info(`Push sent to ${payload.token.slice(0, 20)}...`);
};

export const sendMulticastNotification = async (payload: FcmMulticastPayload): Promise<void> => {
  initFirebase();
  await getMessaging().sendEachForMulticast({
    tokens: payload.tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
  });
  logger.info(`Multicast push sent to ${payload.tokens.length} devices`);
};
