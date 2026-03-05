import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import multer from 'multer';
import { prisma }      from '../../config/prisma';
import { uploadAvatarBuffer, deleteAvatarFromCloudinary, resolveAvatarUrl } from '../../config/cloudinary';
import { AuthRequest } from '../../types';

const router = Router();

// Multer for avatar uploads — images only, max 5 MB
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
  },
});

// ─── GET /api/profile ─────────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const avatarUrl = await resolveAvatarUrl(user.avatarUrl);
    res.json({ ...user, avatarUrl });
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

    if (data.email) {
      const clash = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: req.user!.userId } },
      });
      if (clash) { res.status(409).json({ error: 'Email already in use' }); return; }
    }

    const user = await prisma.user.update({
      where:  { id: req.user!.userId },
      data,
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
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

// ─── POST /api/profile/avatar ─────────────────────────────

router.post('/avatar', avatarUpload.single('avatar'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No image file provided' }); return; }

    const avatarKey = await uploadAvatarBuffer(req.file.buffer, req.user!.userId, req.file.mimetype);

    const user = await prisma.user.update({
      where:  { id: req.user!.userId },
      data:   { avatarUrl: avatarKey },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    // Return a resolved presigned URL so the client can display it immediately
    const avatarUrl = await resolveAvatarUrl(user.avatarUrl);
    res.json({ ...user, avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to upload avatar' });
  }
});

// ─── DELETE /api/profile/avatar ───────────────────────────

router.delete('/avatar', async (req: AuthRequest, res: Response) => {
  try {
    const current = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { avatarUrl: true } });
    await deleteAvatarFromCloudinary(req.user!.userId, current?.avatarUrl);

    const user = await prisma.user.update({
      where:  { id: req.user!.userId },
      data:   { avatarUrl: null },
      select: { id: true, name: true, email: true, role: true, avatarUrl: true },
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to remove avatar' });
  }
});

export default router;

