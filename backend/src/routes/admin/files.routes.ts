import { Router, Response } from 'express';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Readable } from 'stream';
import { Prisma } from '@prisma/client';
import { prisma }        from '../../config/prisma';
import { upload }        from '../../config/multer';
import { piiScanQueue }  from '../../config/queue';
import { r2Service }     from '../../services/r2.service';
import { auditService }  from '../../services/audit.service';
import { AuthRequest }   from '../../types';

const router = Router();

// ─── Helper ──────────────────────────────────────────────

const computeRiskScore = (count: number | null): 'low' | 'medium' | 'high' => {
  if (!count) return 'low';
  if (count > 20) return 'high';
  if (count > 5)  return 'medium';
  return 'low';
};

// ─── GET /api/admin/files ─────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      status, page = '1', limit = '20', search,
    } = req.query as Record<string, string>;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (status) where.status = status.toUpperCase();
    if (search) where.originalName = { contains: search, mode: 'insensitive' };

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take:     parseInt(limit, 10),
        orderBy:  { uploadedAt: 'desc' },
        include:  { uploader: { select: { id: true, name: true, email: true } } },
      }),
      prisma.file.count({ where }),
    ]);

    res.json({
      files: files.map((f) => ({ ...f, riskScore: computeRiskScore(f.entityCount) })),
      total,
      page:  parseInt(page, 10),
      limit: parseInt(limit, 10),
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// ─── POST /api/admin/files/upload ────────────────────────

router.post('/upload', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file provided' });
    return;
  }

  const fileId      = uuidv4();
  const ext         = path.extname(req.file.originalname).replace('.', '') || 'bin';
  const originalKey = r2Service.buildKey('originals', fileId, ext);

  try {
    // Stream file buffer to Cloudflare R2
    await r2Service.upload(originalKey, req.file.buffer, req.file.mimetype);

    // Insert DB record
    await prisma.file.create({
      data: {
        id:           fileId,
        originalName: req.file.originalname,
        mimeType:     req.file.mimetype,
        sizeBytes:    req.file.size,
        originalKey,
        uploadedBy:   req.user!.userId,
        status:       'PENDING',
      },
    });

    // Enqueue BullMQ job
    await piiScanQueue.add('scan', { fileId, originalKey, mimeType: req.file.mimetype, ext });

    // Audit log
    await auditService.log({
      userId:    req.user!.userId,
      action:    'UPLOAD',
      fileId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        originalName: req.file.originalname,
        mimeType:     req.file.mimetype,
        sizeBytes:    req.file.size,
      },
    });

    res.status(201).json({ fileId, status: 'pending' });
  } catch (err) {
    console.error('[Upload]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── GET /api/admin/files/:id ─────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({
      where:   { id: req.params.id },
      include: { uploader: { select: { id: true, name: true, email: true } } },
    });
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }
    res.json({ ...file, riskScore: computeRiskScore(file.entityCount) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// ─── GET /api/admin/files/:id/status ─────────────────────

router.get('/:id/status', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({
      where:  { id: req.params.id },
      select: { status: true, entityCount: true, entitiesByType: true, sanitizedAt: true, lastError: true },
    });
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }
    res.json(file);
  } catch {
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// ─── GET /api/admin/files/:id/original ───────────────────

router.get('/:id/original', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    const r2Res = await r2Service.download(file.originalKey);

    await auditService.log({
      userId:    req.user!.userId,
      action:    'DOWNLOAD_ORIGINAL',
      fileId:    file.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { originalName: file.originalName },
    });

    res.setHeader('Content-Type',        file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    (r2Res.Body as Readable).pipe(res);
  } catch {
    res.status(500).json({ error: 'Download failed' });
  }
});

// ─── GET /api/admin/files/:id/sanitized ──────────────────

router.get('/:id/sanitized', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });

    if (!file || file.status !== 'SANITIZED' || !file.sanitizedKey) {
      res.status(404).json({ error: 'Sanitized file not yet available' });
      return;
    }

    const r2Res = await r2Service.download(file.sanitizedKey);

    await auditService.log({
      userId:    req.user!.userId,
      action:    'DOWNLOAD_SANITIZED',
      fileId:    file.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { originalName: file.originalName },
    });

    res.setHeader('Content-Type',        file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="sanitized_${file.originalName}"`);
    (r2Res.Body as Readable).pipe(res);
  } catch {
    res.status(500).json({ error: 'Download failed' });
  }
});

// ─── POST /api/admin/files/:id/rescan ────────────────────

router.post('/:id/rescan', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    const ext = path.extname(file.originalName).replace('.', '') || 'bin';

    await prisma.file.update({
      where: { id: file.id },
      data:  { status: 'PENDING', lastError: null, entityCount: null, entitiesByType: Prisma.JsonNull },
    });

    await piiScanQueue.add('scan', {
      fileId:      file.id,
      originalKey: file.originalKey,
      mimeType:    file.mimeType,
      ext,
    });

    await auditService.log({
      userId:    req.user!.userId,
      action:    'RESCAN',
      fileId:    file.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ fileId: file.id, status: 'pending', message: 'Rescan queued' });
  } catch {
    res.status(500).json({ error: 'Failed to queue rescan' });
  }
});

// ─── DELETE /api/admin/files/:id ─────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    // Try to remove from R2 (best-effort)
    try {
      await r2Service.delete(file.originalKey);
      if (file.sanitizedKey) await r2Service.delete(file.sanitizedKey);
    } catch (r2Err) {
      console.warn('[Delete] R2 cleanup error:', r2Err);
    }

    await prisma.file.delete({ where: { id: file.id } });

    await auditService.log({
      userId:    req.user!.userId,
      action:    'DELETE_FILE',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata:  { deletedFileId: file.id, originalName: file.originalName },
    });

    res.json({ message: 'File deleted successfully' });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// ─── GET /api/admin/files/:id/presigned ──────────────────
// Returns short-lived pre-signed URL for direct browser download (optional)

router.get('/:id/presigned', async (req: AuthRequest, res: Response) => {
  try {
    const { type = 'sanitized' } = req.query as { type?: string };
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    const key = type === 'original' ? file.originalKey : file.sanitizedKey;
    if (!key)  { res.status(404).json({ error: 'Requested file version not available' }); return; }

    const url = await r2Service.getPresignedUrl(key, 900); // 15 min
    res.json({ url, expiresIn: 900 });
  } catch {
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});

// ─── Schema for bulk-status query ────────────────────────
const bulkStatusSchema = z.object({ ids: z.array(z.string().uuid()).max(50) });

// ─── POST /api/admin/files/bulk-status ───────────────────

router.post('/bulk-status', async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = bulkStatusSchema.parse(req.body);
    const files = await prisma.file.findMany({
      where:  { id: { in: ids } },
      select: { id: true, status: true, entityCount: true, sanitizedAt: true, lastError: true },
    });
    res.json(files);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

export default router;
