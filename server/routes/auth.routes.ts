import { Router } from 'express';
import { db } from '../db.js';
import { env } from '../config/env.js';
import { generateToken, hashPassword, requireAuth, verifyPassword, verifyFirebaseToken, type AuthenticatedRequest } from '../auth.js';

export const authRouter = Router();

function requireDemoAuth(_req: any, res: any, next: any) {
  if (env.DEMO_AUTH_ENABLED !== 'true' || env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Demo authentication is disabled' });
    return;
  }
  next();
}

// Login
authRouter.post('/login', requireDemoAuth, (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: 'User not found with this email address' });
    return;
  }

  // If passwordHash exists, verify it; otherwise allow demo login
  if (user.passwordHash) {
    if (!password || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid password credentials' });
      return;
    }
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      jobTitle: user.jobTitle,
    },
  });
});

// Register
authRouter.post('/register', requireDemoAuth, (req, res) => {
  const { name, email, password, jobTitle } = req.body;
  if (!name || !email) {
    res.status(400).json({ error: 'Name and email are required' });
    return;
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    res.status(409).json({ error: 'A user with this email already exists' });
    return;
  }

  const newUser = db.createUser({
    name,
    email,
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
    role: 'USER',
    jobTitle: jobTitle || 'Team Contributor',
    passwordHash: password ? hashPassword(password) : undefined,
  });

  // Assign user to default team
  const teams = db.getTeams();
  if (teams.length > 0) {
    db.addTeamMember(teams[0].id, newUser.id, 'MEMBER');
  }

  const token = generateToken(newUser);
  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      role: newUser.role,
      jobTitle: newUser.jobTitle,
    },
  });
});

// Exchange Firebase ID Token for application session token
authRouter.post('/exchange', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

  try {
    const authPayload = await verifyFirebaseToken(idToken);
    if (!authPayload) return res.status(401).json({ error: 'Invalid Firebase ID token' });

    const user = db.getUserById(authPayload.userId);
    const token = generateToken(
      user || ({ id: authPayload.userId, email: authPayload.email, name: '', avatar: '', role: authPayload.role, jobTitle: 'Member' } as any),
    );

    return res.json({ token });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify token' });
  }
});

// Current user profile
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
    jobTitle: user.jobTitle,
  });
});

// List users (for demo switcher & participant selection)
authRouter.get('/users', (req, res, next) => {
  if (env.DEMO_AUTH_ENABLED === 'true' && env.NODE_ENV !== 'production') {
    next();
    return;
  }
  requireAuth(req, res, next);
}, (req: AuthenticatedRequest, res) => {
  const visibleUserIds = env.DEMO_AUTH_ENABLED === 'true' && env.NODE_ENV !== 'production'
    ? new Set(db.getUsers().map(user => user.id))
    : new Set(db.getUserTeams(req.user!.id)
      .flatMap(team => db.getTeamMembers(team.id).map(member => member.userId)));
  if (req.user) visibleUserIds.add(req.user.id);
  const users = db.getUsers().filter(user => visibleUserIds.has(user.id)).map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    role: u.role,
    jobTitle: u.jobTitle,
  }));
  res.json(users);
});

// Quick Switch User (Essential for Hackathon Demo Story Step 7)
authRouter.post('/switch-user', requireDemoAuth, (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const user = db.getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'Target user not found' });
    return;
  }

  const token = generateToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      jobTitle: user.jobTitle,
    },
  });
});
