import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma }       from '../config/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { auditService } from '../services/audit.service';
import { emailService } from '../services/email.service';
import { resolveAvatarUrl } from '../config/cloudinary';
import { AuthRequest }  from '../types';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// ─── POST /api/auth/login ─────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLoginAt: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN ?? '7d' } as jwt.SignOptions,
    );

    await auditService.log({
      userId:    user.id,
      action:    'LOGIN',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      token,
      user: {
        id:       user.id,
        name:     user.name,
        email:    user.email,
        role:     user.role,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────

router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  await auditService.log({
    userId:    req.user?.userId,
    action:    'LOGOUT',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /api/auth/me ─────────────────────────────────────

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true, avatarUrl: true, createdAt: true, lastLoginAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const avatarUrl = await resolveAvatarUrl(user.avatarUrl);
    res.json({ ...user, avatarUrl });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────
// Generates a 6-digit OTP, stores hashed copy in DB, emails OTP to user.

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    // Always respond the same to prevent email enumeration
    if (user && user.isActive) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHashed = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await prisma.user.update({
        where: { id: user.id },
        data:  { otpCode: otpHashed, otpExpiry },
      });

      await emailService.sendOtp(user.email, user.name, otp);
    }

    res.json({ message: 'If that email exists, a 6-digit code has been sent.' });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/verify-otp ────────────────────────────
// Verifies the OTP and returns a short-lived reset token.

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = z.object({
      email: z.string().email(),
      otp:   z.string().length(6),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.otpCode || !user.otpExpiry) {
      res.status(400).json({ error: 'Invalid or expired code' });
      return;
    }

    if (new Date() > user.otpExpiry) {
      res.status(400).json({ error: 'Code has expired. Please request a new one.' });
      return;
    }

    const valid = await bcrypt.compare(otp, user.otpCode);
    if (!valid) {
      res.status(400).json({ error: 'Invalid code' });
      return;
    }

    // Clear OTP now that it has been used
    await prisma.user.update({
      where: { id: user.id },
      data:  { otpCode: null, otpExpiry: null },
    });

    // Issue a short-lived reset token
    const resetToken = jwt.sign(
      { userId: user.id, type: 'reset' },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' } as jwt.SignOptions,
    );

    res.json({ resetToken });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────
// Accepts the resetToken from verify-otp and sets a new password.

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { resetToken, password } = z.object({
      resetToken: z.string(),
      password:   z.string().min(8),
    }).parse(req.body);

    const payload = jwt.verify(resetToken, process.env.JWT_SECRET!) as { userId: string; type: string };

    if (payload.type !== 'reset') {
      res.status(400).json({ error: 'Invalid reset token' });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: payload.userId }, data: { password: hashed } });

    res.json({ message: 'Password reset successfully' });
  } catch {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;
