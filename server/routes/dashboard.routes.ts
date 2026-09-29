import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../auth.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// Aggregated Dashboard Data
dashboardRouter.get('/', (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const now = new Date();
  const oneWeekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // User meetings
  const allUserMeetings = db.getMeetings({ userId: user.id });
  const upcomingMeetings = allUserMeetings
    .filter(m => m.status === 'UPCOMING' && new Date(m.scheduledAt) >= now)
    .slice(0, 5);

  const meetingsThisWeek = allUserMeetings.filter(m => {
    const d = new Date(m.scheduledAt);
    return d >= now && d <= oneWeekAhead;
  });

  // User tasks
  const myTasks = db.getTasks({ userId: user.id });
  const pendingTasks = myTasks.filter(t => t.status === 'TODO' || t.status === 'IN_PROGRESS');
  const overdueTasks = myTasks.filter(t => t.status !== 'COMPLETED' && new Date(t.dueDate) < now);

  // Commitments
  const visibleMeetingIds = new Set(allUserMeetings.map(meeting => meeting.id));
  const myCommitments = db.getCommitments().filter(
    c => visibleMeetingIds.has(c.meetingId) && (c.personUserId === user.id || c.person.toLowerCase() === user.name.toLowerCase())
  );
  const pendingCommitments = myCommitments.filter(c => c.status === 'PENDING' || c.status === 'IN_PROGRESS');
  const overdueCommitments = myCommitments.filter(
    c => c.status === 'OVERDUE' || (c.deadline && new Date(c.deadline) < now && c.status !== 'COMPLETED')
  );

  // Recent decisions
  const userMeetingIds = allUserMeetings.map(m => m.id);
  const recentDecisions = db.getDecisions()
    .filter(d => userMeetingIds.includes(d.meetingId))
    .slice(0, 5)
    .map(d => {
      const mtg = db.getMeetingById(d.meetingId);
      return {
        ...d,
        meetingTitle: mtg?.title || 'Team Meeting',
      };
    });

  // Unresolved Issues (Section 29)
  const unresolvedIssues = db.getIssues().filter(i =>
    visibleMeetingIds.has(i.meetingId) && (i.status === 'OPEN' || i.status === 'IN_PROGRESS')
  );

  // Follow-Up Radar (Section 27)
  const followUpRadar = {
    overdueCommitments: overdueCommitments.map(c => ({
      id: c.id,
      title: `${c.person}: ${c.commitment}`,
      deadline: c.deadline,
      meetingId: c.meetingId,
    })),
    upcomingDeadlines: pendingTasks.slice(0, 4).map(t => ({
      id: t.id,
      title: t.title,
      dueDate: t.dueDate,
      priority: t.priority,
      meetingId: t.meetingId,
    })),
    unresolvedIssues: unresolvedIssues.slice(0, 3).map(i => ({
      id: i.id,
      issue: i.issue,
      owner: i.owner,
      meetingId: i.meetingId,
    })),
    recentDecisionsCount: recentDecisions.length,
  };

  // Dynamic AI Insight
  let aiInsight = '';
  if (overdueCommitments.length > 0) {
    aiInsight = `Follow-Up Alert: You have ${overdueCommitments.length} overdue commitment${overdueCommitments.length > 1 ? 's' : ''} that need resolution before your next sync.`;
  } else if (upcomingMeetings.length > 0) {
    aiInsight = `Next session: "${upcomingMeetings[0].title}". You have ${pendingTasks.length} active deliverable${pendingTasks.length !== 1 ? 's' : ''} in flight. Click "Prepare Me" for historical briefing.`;
  } else {
    aiInsight = `All team commitments are aligned. Continuous meeting memory is up to date.`;
  }

  res.json({
    metrics: {
      upcomingMeetingsCount: upcomingMeetings.length,
      meetingsThisWeekCount: meetingsThisWeek.length,
      pendingTasksCount: pendingTasks.length,
      overdueTasksCount: overdueTasks.length,
      pendingCommitmentsCount: pendingCommitments.length,
      overdueCommitmentsCount: overdueCommitments.length,
      unresolvedIssuesCount: unresolvedIssues.length,
      decisionsCount: recentDecisions.length,
      unreadNotificationsCount: db.getNotifications(user.id).filter(n => !n.read).length,
    },
    upcomingMeetings,
    pendingTasks: pendingTasks.slice(0, 6).map(t => ({
      ...t,
      meetingTitle: t.meetingId ? db.getMeetingById(t.meetingId)?.title : undefined,
    })),
    myCommitments: myCommitments.slice(0, 5),
    unresolvedIssues: unresolvedIssues.slice(0, 4),
    recentDecisions,
    followUpRadar,
    aiInsight,
  });
});

dashboardRouter.get('/notifications', (req: AuthenticatedRequest, res) => {
  const notifications = db.getNotifications(req.user!.id);
  res.json(notifications);
});

dashboardRouter.put('/notifications/:id/read', (req: AuthenticatedRequest, res) => {
  const success = db.markNotificationAsRead(req.params.id, req.user!.id);
  res.json({ success });
});

dashboardRouter.put('/notifications/read-all', (req: AuthenticatedRequest, res) => {
  db.markAllNotificationsAsRead(req.user!.id);
  res.json({ success: true });
});
