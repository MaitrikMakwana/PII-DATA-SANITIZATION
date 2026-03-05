import { Router, Response } from 'express';
import { Readable }       from 'stream';
import { prisma }         from '../../config/prisma';
import { r2Service }      from '../../services/r2.service';
import { auditService }   from '../../services/audit.service';
import { AuthRequest }    from '../../types';

const router = Router();

// ─── GET /api/files ───────────────────────────────────────
// Standard users see only sanitized files
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query as Record<string, string>;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where: Record<string, unknown> = { status: 'SANITIZED' };
    if (search) where.originalName = { contains: search, mode: 'insensitive' };

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take:    parseInt(limit, 10),
        orderBy: { sanitizedAt: 'desc' },
        select: {
          id:            true,
          originalName:  true,
          mimeType:      true,
          sizeBytes:     true,
          entityCount:   true,
          entitiesByType: true,
          sanitizedAt:   true,
          status:        true,
          uploader:      { select: { name: true } },
        },
      }),
      prisma.file.count({ where }),
    ]);

    res.json({ files, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// ─── GET /api/files/:id/status ────────────────────────────

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

// ─── GET /api/files/:id ───────────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({
      where:  { id: req.params.id },
      select: {
        id:            true,
        originalName:  true,
        mimeType:      true,
        sizeBytes:     true,
        entityCount:   true,
        entitiesByType: true,
        sanitizedAt:   true,
        status:        true,
        processingTimeMs: true,
        uploader:      { select: { name: true } },
      },
    });
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }

    // Standard users cannot see files that are not yet sanitized
    if (file.status !== 'SANITIZED') {
      res.status(403).json({ error: 'File not available' });
      return;
    }
    res.json(file);
  } catch {
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

// ─── GET /api/files/:id/sanitized ────────────────────────

router.get('/:id/sanitized', async (req: AuthRequest, res: Response) => {
  try {
    const file = await prisma.file.findUnique({ where: { id: req.params.id } });

    if (!file || file.status !== 'SANITIZED' || !file.sanitizedKey) {
      res.status(404).json({ error: 'Sanitized file not available' });
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

export default router;
