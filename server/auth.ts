import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from './db.js';
import type { User } from './types.js';
import admin from 'firebase-admin';
import { env } from './config/env.js';

// Initialize Firebase Admin only when credentials are configured.
if (
  !admin.apps.length &&
  env.FIREBASE_PROJECT_ID &&
  env.FIREBASE_CLIENT_EMAIL &&
  env.FIREBASE_PRIVATE_KEY
) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // FIREBASE_PRIVATE_KEY may contain escaped newlines
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    } as any),
  });
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function hashPassword(password: string): string {
  const salt = 'alpha_salt_99';
  return crypto.scryptSync(password, salt, 32).toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(user: User): string {
  const payload: AuthPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', env.JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const [header, body, signature, ...extra] = token.split('.');
    if (!header || !body || !signature || extra.length > 0) return null;

    const expectedSignature = crypto
      .createHmac('sha256', env.JWT_SECRET)
      .update(`${header}.${body}`)
      .digest();
    const actualSignature = Buffer.from(signature, 'base64url');
    if (
      actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AuthPayload;
    if (
      typeof payload.userId !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function verifyFirebaseToken(token: string): Promise<AuthPayload | null> {
  if (!admin.apps.length) return null;
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const firebaseUid = (decoded as any).uid || (decoded as any).sub;

    let user = db.getUserByFirebaseUid(firebaseUid as string);
    if (!user && (decoded as any).email) {
      user = db.getUserByEmail((decoded as any).email);
      if (user) db.updateUserFirebaseUid(user.id, firebaseUid as string);
    }

    if (!user && (decoded as any).email) {
      user = db.createUser({
        name: (decoded as any).name || (decoded as any).email.split('@')[0],
        email: (decoded as any).email,
        avatar: (decoded as any).picture || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent((decoded as any).name || (decoded as any).email)}`,
        role: 'USER',
        jobTitle: 'Team Member',
        firebaseUid: firebaseUid as string,
      });
      const defaultTeams = db.getTeams();
      if (defaultTeams.length > 0) db.addTeamMember(defaultTeams[0].id, user.id, 'MEMBER');
    }

    if (!user) return null;

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };
  } catch (err) {
    return null;
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: missing authentication token' });
    return;
  }

  const token = authHeader.slice(7).trim();

  // App-issued tokens are used by password login; Firebase tokens are also accepted.
  const payload = verifyToken(token) || await verifyFirebaseToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired session token' });
    return;
  }

  const user = db.getUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized: user does not exist' });
    return;
  }

  req.user = user;
  next();
}

export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const payload = verifyToken(token) || await verifyFirebaseToken(token);
    if (payload) {
      const user = db.getUserById(payload.userId);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}
