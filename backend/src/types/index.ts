import { Request } from 'express';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  email:  string;
  role:   Role;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}
