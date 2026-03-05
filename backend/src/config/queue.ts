import { Queue } from 'bullmq';
import { redisConnection } from './redis';

export const piiScanQueue = new Queue('pii-scan', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type:  'exponential',
      delay: 5000, // 5s → 25s → 125s
    },
    removeOnComplete: { age: 3600 },   // keep completed jobs for 1h
    removeOnFail:     { age: 86400 },  // keep failed jobs for 24h
  },
});

export type PiiScanJobData = {
  fileId:      string;
  originalKey: string;
  mimeType:    string;
  ext:         string;
};
