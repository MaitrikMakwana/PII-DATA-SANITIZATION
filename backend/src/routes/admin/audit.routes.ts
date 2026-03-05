import { Router, Response } from 'express';
import { prisma }        from '../../config/prisma';
import { AuthRequest }   from '../../types';

const router = Router();

// ─── Inline CSV serializer (no extra dependency) ─────────

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape  = (val: unknown) =>
    `"${String(val ?? '').replace(/"/g, '""')}"`;

  return [
    headers.map(escape).join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
}

// ─── GET /api/admin/audit-logs ────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      userId,
      fileId,
      from,
      to,
    } = req.query as Record<string, string>;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (fileId) where.fileId = fileId;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to)   range.lte = new Date(to);
      where.createdAt = range;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take:     parseInt(limit, 10),
        orderBy:  { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          file: { select: { originalName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ logs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ─── GET /api/admin/audit-logs/export ────────────────────

router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const { action, userId, from, to } = req.query as Record<string, string>;

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.gte = new Date(from);
      if (to)   range.lte = new Date(to);
      where.createdAt = range;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        file: { select: { originalName: true } },
      },
    });

    const rows = logs.map((l) => ({
      id:        l.id,
      timestamp: l.createdAt.toISOString(),
      user:      l.user?.email ?? 'system',
      userName:  l.user?.name  ?? '',
      action:    l.action,
      file:      l.file?.originalName ?? '',
      ipAddress: l.ipAddress ?? '',
      metadata:  JSON.stringify(l.metadata ?? {}),
    }));

    const csv = toCSV(rows);

    res.setHeader('Content-Type',        'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

// ─── GET /api/admin/audit-logs/actions ───────────────────
// Returns distinct action types for filter dropdowns

router.get('/actions', async (_req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.auditLog.findMany({
      distinct: ['action'],
      select:   { action: true },
      orderBy:  { action: 'asc' },
    });
    res.json(result.map((r) => r.action));
  } catch {
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

export default router;
