import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { config } from '../../config';

export const initFirebase = (): void => {
  if (getApps().length > 0 || !config.fcm.projectId) return;
  initializeApp({
    credential: cert({
      projectId: config.fcm.projectId,
      privateKey: config.fcm.privateKey,
      clientEmail: config.fcm.clientEmail,
    }),
  });
};
