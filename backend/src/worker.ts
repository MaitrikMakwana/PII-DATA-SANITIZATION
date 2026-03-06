/**
 * BullMQ Worker — PII Scan Pipeline
 *
 * Stages:
 *  1. Set file status → PROCESSING
 *  2. Download original from Cloudflare R2
 *  3. POST /analyze  → Python PII Engine  (entity detection)
 *  4. POST /sanitize → Python PII Engine  (entity redaction)
 *  5. Upload sanitized file → Cloudflare R2
 *  6. Update DB   status → SANITIZED
 *  7. Write SCAN_COMPLETE audit log
 *  8. Notify uploader via email
 *
 * The ML endpoint (PII_ENGINE_URL) is set in .env and injected when ready.
 */

import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import axios           from 'axios';
import FormData        from 'form-data';
import { redisConnection } from './config/redis';
import { prisma }       from './config/prisma';
import { r2Service }    from './services/r2.service';
import { auditService } from './services/audit.service';
import { emailService } from './services/email.service';
import { PiiScanJobData } from './config/queue';

const PII_ENGINE_URL  = process.env.PII_ENGINE_URL!;
const CONCURRENCY     = parseInt(process.env.WORKER_CONCURRENCY ?? '5', 10);

// ─── Timeout per MIME type (ms) ───────────────────────────

function jobTimeout(mimeType: string): number {
  if (mimeType === 'application/pdf') return 120_000;
  if (mimeType.includes('word'))      return 60_000;
  if (mimeType.startsWith('image/'))  return 120_000;
  return 30_000;
}

// ─── Main processor ──────────────────────────────────────

async function processJob(job: Job<PiiScanJobData>): Promise<void> {
  const { fileId, originalKey, mimeType, ext } = job.data;
  console.log(`[Worker] Job ${job.id} started — fileId=${fileId}`);

  // Stage 1 — mark as processing
  await prisma.file.update({
    where: { id: fileId },
    data:  { status: 'PROCESSING' },
  });

  const startTime = Date.now();

  // Stage 2 — download original from R2 into a buffer
  const r2Res = await r2Service.download(originalKey);
  const chunks: Buffer[] = [];
  for await (const chunk of r2Res.Body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  const fileBuffer = Buffer.concat(chunks);

  const timeout = jobTimeout(mimeType);

  // Stage 3 — call /analyze on Python PII Engine
  const analyzeForm = new FormData();
  analyzeForm.append('file', fileBuffer, { filename: `file.${ext}`, contentType: mimeType });

  const analyzeRes = await axios.post<{
    entities: Array<{ type: string; text: string; start: number; end: number; score: number }>;
    stats:    { total: number; by_type: Record<string, number> };
  }>(
    `${PII_ENGINE_URL}/analyze`,
    analyzeForm,
    { headers: analyzeForm.getHeaders(), timeout },
  );

  const { entities, stats } = analyzeRes.data;

  // Stage 4 — call /sanitize on Python PII Engine
  const sanitizeForm = new FormData();
  sanitizeForm.append('file',     fileBuffer,              { filename: `file.${ext}`, contentType: mimeType });
  sanitizeForm.append('entities', JSON.stringify(entities));

  const sanitizeRes = await axios.post<Buffer>(
    `${PII_ENGINE_URL}/sanitize`,
    sanitizeForm,
    { headers: sanitizeForm.getHeaders(), responseType: 'arraybuffer', timeout },
  );

  const sanitizedBuffer = Buffer.from(sanitizeRes.data);
  const sanitizedKey    = r2Service.buildKey('sanitized', fileId, ext);

  // Stage 5 — upload sanitized file to R2
  await r2Service.upload(sanitizedKey, sanitizedBuffer, mimeType);

  const processingTimeMs = Date.now() - startTime;

  // Stage 6 — update DB row
  await prisma.file.update({
    where: { id: fileId },
    data: {
      status:          'SANITIZED',
      sanitizedKey,
      entityCount:     stats.total,
      entitiesByType:  stats.by_type,
      processingTimeMs,
      sanitizedAt:     new Date(),
      lastError:       null,
    },
  });

  // Stage 7 — audit log
  await auditService.log({
    action: 'SCAN_COMPLETE',
    fileId,
    metadata: {
      entityCount:     stats.total,
      entitiesByType:  stats.by_type,
      processingTimeMs,
    },
  });

  // Stage 8 — email notification
  const file = await prisma.file.findUnique({
    where:   { id: fileId },
    include: { uploader: { select: { email: true, name: true } } },
  });
  if (file?.uploader) {
    await emailService.sendFileReady(
      file.uploader.email,
      file.uploader.name,
      file.originalName,
    );
  }

  console.log(`[Worker] Job ${job.id} completed in ${processingTimeMs}ms — ${stats.total} PII entities`);
}

// ─── Worker instance ─────────────────────────────────────

const worker = new Worker<PiiScanJobData>('pii-scan', processJob, {
  connection:  redisConnection,
  concurrency: CONCURRENCY,
});

// ─── Failure handler ─────────────────────────────────────

worker.on('failed', async (job, err) => {
  if (!job) return;
  console.error(`[Worker] Job ${job.id} failed (attempt ${job.attemptsMade}):`, err.message);

  const maxAttempts = job.opts.attempts ?? 3;

  if (job.attemptsMade >= maxAttempts) {
    // All retries exhausted — mark as error
    await prisma.file.update({
      where: { id: job.data.fileId },
      data:  { status: 'ERROR', lastError: err.message },
    });

    await auditService.log({
      action: 'SCAN_FAILED',
      fileId: job.data.fileId,
      metadata: { error: err.message, attempts: job.attemptsMade },
    });
  }
});

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} ✓`);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err.message);
});

console.log(`[Worker] Started — concurrency=${CONCURRENCY}  PII_ENGINE=${PII_ENGINE_URL}`);
