import { Agenda } from 'agenda';
import { MongoBackend } from '@agendajs/mongo-backend';
import { config } from '../../config';
import { logger } from '../logger';

const agenda = new Agenda({
  backend: new MongoBackend({
    address: config.mongoUri,
    collection: 'jobs',
  }),
  processEvery: '10 seconds',
  maxConcurrency: 10,
});

agenda.on('ready', () => logger.info('Agenda connected'));
agenda.on('error', (err: Error) => logger.error({ err }, 'Agenda error'));

export const startAgenda = async (): Promise<void> => {
  await agenda.start();
  logger.info('Agenda started');
};

export const shutdownQueues = async (): Promise<void> => {
  await agenda.stop();
  logger.info('Agenda stopped');
};

export { agenda };
