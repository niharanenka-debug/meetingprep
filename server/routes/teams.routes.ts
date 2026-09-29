import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

export const teamsRouter = Router();

teamsRouter.use(requireAuth);

// Get user teams
teamsRouter.get('/', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const teams = db.getUserTeams(user.id);
  res.json(teams);
});

// Create team
teamsRouter.post('/', (req: AuthenticatedRequest, res) => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ error: 'Team name is required' });
    return;
  }
  const team = db.createTeam(name, description || '', req.user!.id);
  res.status(201).json(team);
});

// Get team details with members
teamsRouter.get('/:id', (req: AuthenticatedRequest, res) => {
  const team = db.getTeamById(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }
  // Verify membership
  if (!db.isUserInTeam(req.user!.id, team.id) && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: you are not a member of this team' });
    return;
  }
  const members = db.getTeamMembers(team.id);
  res.json({ ...team, members });
});

// Add member to team
teamsRouter.post('/:id/members', (req: AuthenticatedRequest, res) => {
  const team = db.getTeamById(req.params.id);
  if (!team) {
    res.status(404).json({ error: 'Team not found' });
    return;
  }
  const actingMember = db.getTeamMembers(team.id).find(member => member.userId === req.user!.id);
  if (actingMember?.role !== 'OWNER' && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only team owners or administrators can add members' });
    return;
  }
  const { userId, role } = req.body;
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  if (!db.getUserById(userId)) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (role && !['OWNER', 'MEMBER'].includes(role)) {
    res.status(400).json({ error: 'Invalid team member role' });
    return;
  }
  if (db.isUserInTeam(userId, team.id)) {
    res.status(409).json({ error: 'User is already a member of this team' });
    return;
  }
  const member = db.addTeamMember(team.id, userId, role || 'MEMBER');
  res.status(201).json(member);
});
