import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';
import type { TaskPriority, TaskStatus } from '../types.js';

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

function canViewTask(user: NonNullable<AuthenticatedRequest['user']>, task: ReturnType<typeof db.getTasks>[number]): boolean {
  if (task.assignedTo === user.id || user.role === 'ADMIN') return true;
  return Boolean(task.meetingId && db.getMeetings({ userId: user.id }).some(meeting => meeting.id === task.meetingId));
}

function canManageTask(user: NonNullable<AuthenticatedRequest['user']>, task: ReturnType<typeof db.getTasks>[number]): boolean {
  return task.assignedTo === user.id || user.role === 'ADMIN';
}

// Get tasks (Team view or filtered)
tasksRouter.get('/', (req: AuthenticatedRequest, res) => {
  const { status, priority, assignedTo, meetingId } = req.query;
  let tasks = db.getTasks().filter(task => canViewTask(req.user!, task));

  if (status) tasks = tasks.filter(task => task.status === status);
  if (meetingId) tasks = tasks.filter(task => task.meetingId === meetingId);
  if (assignedTo) tasks = tasks.filter(task => task.assignedTo === assignedTo);

  if (priority) {
    tasks = tasks.filter(t => t.priority === priority);
  }

  if (assignedTo) {
    tasks = tasks.filter(t => t.assignedTo === assignedTo);
  }

  // Enrich with user & meeting title
  const enriched = tasks.map(t => {
    const user = db.getUserById(t.assignedTo);
    const meeting = t.meetingId ? db.getMeetingById(t.meetingId) : undefined;
    return {
      ...t,
      assigneeName: user?.name || 'Unassigned',
      assigneeAvatar: user?.avatar,
      assigneeEmail: user?.email,
      meetingTitle: meeting?.title,
    };
  });

  res.json(enriched);
});

// Get My Tasks (Only current user's tasks - Step 7 in Hackathon Demo)
tasksRouter.get('/my', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const tasks = db.getTasks({ userId: user.id });

  const enriched = tasks.map(t => {
    const meeting = t.meetingId ? db.getMeetingById(t.meetingId) : undefined;
    return {
      ...t,
      assigneeName: user.name,
      assigneeAvatar: user.avatar,
      assigneeEmail: user.email,
      meetingTitle: meeting?.title,
    };
  });

  res.json(enriched);
});

// Get Team Tasks (Section 35 & 39)
tasksRouter.get('/team', (req: AuthenticatedRequest, res) => {
  const allTasks = db.getTasks().filter(task => canViewTask(req.user!, task));
  const enriched = allTasks.map(t => {
    const user = db.getUserById(t.assignedTo);
    const meeting = t.meetingId ? db.getMeetingById(t.meetingId) : undefined;
    return {
      ...t,
      assigneeName: user?.name || 'Unassigned',
      assigneeAvatar: user?.avatar,
      assigneeEmail: user?.email,
      meetingTitle: meeting?.title,
    };
  });

  res.json(enriched);
});

// Create Task
tasksRouter.post('/', (req: AuthenticatedRequest, res) => {
  const { title, description, assignedTo, priority, dueDate, meetingId } = req.body;

  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'Title is required' });
    return;
  }

  const targetAssignedTo = assignedTo || req.user!.id;
  const targetUser = db.getUserById(targetAssignedTo);
  if (!targetUser) {
    res.status(400).json({ error: 'Assignee was not found' });
    return;
  }

  const meeting = meetingId ? db.getMeetingById(meetingId) : undefined;
  if (meetingId && (!meeting || !db.getMeetings({ userId: req.user!.id }).some(item => item.id === meeting.id))) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }
  if (targetAssignedTo !== req.user!.id && req.user!.role !== 'ADMIN') {
    const sharedTeam = db.getUserTeams(req.user!.id).some(team => db.isUserInTeam(targetAssignedTo, team.id));
    const belongsToMeetingTeam = meeting && db.getTeamMembers(meeting.teamId).some(member => member.userId === targetAssignedTo);
    if (!sharedTeam && !belongsToMeetingTeam) {
      res.status(403).json({ error: 'You cannot assign tasks to this user' });
      return;
    }
  }

  if (priority && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
    res.status(400).json({ error: 'Invalid task priority' });
    return;
  }
  const parsedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(parsedDueDate.getTime())) {
    res.status(400).json({ error: 'Invalid due date' });
    return;
  }

  const task = db.createTask({
    title: title.trim(),
    description: description || '',
    assignedTo: targetAssignedTo,
    priority: (priority || 'MEDIUM') as TaskPriority,
    dueDate: parsedDueDate.toISOString(),
    status: 'TODO',
    meetingId: meetingId || null,
  });

  res.status(201).json(task);
});

// Update Task (status, priority, dueDate)
tasksRouter.put('/:id', (req: AuthenticatedRequest, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  if (!canManageTask(req.user!, task)) {
    res.status(403).json({ error: 'You cannot update this task' });
    return;
  }

  const { title, description, assignedTo, priority, dueDate, status } = req.body;

  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
    res.status(400).json({ error: 'Invalid task priority' });
    return;
  }
  if (status !== undefined && !['TODO', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'].includes(status)) {
    res.status(400).json({ error: 'Invalid task status' });
    return;
  }
  if (assignedTo !== undefined && assignedTo !== task.assignedTo && req.user!.role !== 'ADMIN') {
    res.status(403).json({ error: 'Only an administrator can reassign this task' });
    return;
  }
  if (assignedTo !== undefined && !db.getUserById(assignedTo)) {
    res.status(400).json({ error: 'Assignee was not found' });
    return;
  }
  if (dueDate !== undefined && Number.isNaN(new Date(dueDate).getTime())) {
    res.status(400).json({ error: 'Invalid due date' });
    return;
  }

  const updated = db.updateTask(task.id, {
    title: title ?? task.title,
    description: description ?? task.description,
    assignedTo: assignedTo ?? task.assignedTo,
    priority: priority ?? task.priority,
    dueDate: dueDate ?? task.dueDate,
    status: status ?? task.status,
  });

  res.json(updated);
});

// Delete Task
tasksRouter.delete('/:id', (req: AuthenticatedRequest, res) => {
  const task = db.getTaskById(req.params.id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  if (!canManageTask(req.user!, task)) {
    res.status(403).json({ error: 'You cannot delete this task' });
    return;
  }
  const success = db.deleteTask(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ success: true });
});
