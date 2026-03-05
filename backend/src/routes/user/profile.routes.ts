import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma }      from '../../config/prisma';
import { AuthRequest } from '../../types';

const router = Router();

// ─── GET /api/profile ─────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ─── PUT /api/profile ─────────────────────────────────────

router.put('/', async (req: AuthRequest, res: Response) => {
  try {
    const data = z.object({
      name:  z.string().min(2).max(100).optional(),
      email: z.string().email().optional(),
    }).parse(req.body);

    // Check email uniqueness if changing
    if (data.email) {
      const clash = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: req.user!.userId } },
      });
      if (clash) { res.status(409).json({ error: 'Email already in use' }); return; }
    }

    const user = await prisma.user.update({
      where:  { id: req.user!.userId },
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    res.json(user);
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ─── PUT /api/profile/password ────────────────────────────

router.put('/password', async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword:     z.string().min(8),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) { res.status(400).json({ error: 'Current password is incorrect' }); return; }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Failed to update password' });
  }
});

export default router;
