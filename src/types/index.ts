export type Role = 'USER' | 'ADMIN';
export type MeetingStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ActionItemStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CONVERTED';
export type CommitmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type DecisionStatus = 'AGREED' | 'SUPERSEDED' | 'REVOKED';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  jobTitle?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user?: User;
}

export interface Recording {
  id: string;
  meetingId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  duration?: number | null;
  storagePath: string;
  transcriptionStatus: 'UPLOADED' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
  transcribedAt?: string | null;
  createdAt: string;
}

export interface MeetingTranscript {
  id: string;
  meetingId: string;
  recordingId?: string | null;
  content: string;
  language: string;
  version: number;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  teamId: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration?: number;
  status: MeetingStatus;
  location: string;
  transcript: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  participants?: Array<{ id: string; userId: string; attendanceStatus: string; user: User }>;
  hasBrief?: boolean;
  hasMom?: boolean;
  actionItemsCount?: number;
  recordingsCount?: number;
}

export interface MeetingBrief {
  meetingObjective?: string;
  summary: string;
  previousContext?: string;
  previousDecisions: Array<{ id: string; decision: string; meetingTitle: string; date: string }>;
  pendingCommitments: Array<{ id: string; commitment: string; person: string; meetingTitle: string; dueDate?: string }>;
  overdueItems: Array<{ id: string; task: string; person: string; dueDate: string }>;
  openIssues: Array<{ id: string; issue: string; owner?: string; lastDiscussed: string }>;
  discussionTopics: string[];
  suggestedQuestions: string[];
  importantContext: string[];
  whatChanged?: string;
  generatedAt: string;
}

export interface MeetingMom {
  id: string;
  meetingId: string;
  summary: string;
  discussionPoints?: string[];
  generatedAt: string;
  generatedByModel: string;
  reviewed: boolean;
  unresolvedIssues?: string[];
  createdAt: string;
}

export type MemoryType = 'DISCUSSION' | 'DECISION' | 'COMMITMENT' | 'PREFERENCE' | 'ISSUE' | 'FOLLOW_UP';
export type MemoryImportance = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MeetingMemory {
  id: string;
  teamId?: string;
  meetingId: string;
  memoryType: MemoryType;
  content: string;
  importance: MemoryImportance;
  createdAt: string;
}

export interface Decision {
  id: string;
  teamId?: string;
  meetingId: string;
  decision: string;
  context: string;
  status?: DecisionStatus;
  createdAt: string;
  meetingTitle?: string;
  meetingDate?: string;
}

export interface Commitment {
  id: string;
  teamId?: string;
  meetingId: string;
  person: string;
  personUserId?: string | null;
  commitment: string;
  deadline?: string | null;
  status: CommitmentStatus;
  createdAt: string;
  updatedAt: string;
  meetingTitle?: string;
  meetingDate?: string;
}

export interface Issue {
  id: string;
  teamId?: string;
  meetingId: string;
  issue: string;
  owner?: string | null;
  ownerUserId?: string | null;
  status: IssueStatus;
  lastDiscussed: string;
  nextFollowUp?: string | null;
  createdAt: string;
  updatedAt: string;
  meetingTitle?: string;
}

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  assignedTo: string | null;
  suggestedName?: string | null;
  deadline: string;
  priority: TaskPriority;
  confidence: number;
  needsConfirmation: boolean;
  status: ActionItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  actionItemId?: string | null;
  meetingId?: string | null;
  assignedTo: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  assigneeEmail?: string;
  meetingTitle?: string;
}

export interface MeetingCompleteness {
  decisionsIdentified: number;
  actionItemsIdentified: number;
  assignedActionItems: number;
  unassignedActionItems: number;
  itemsWithDeadlines: number;
  unresolvedIssues: number;
  score: number;
}

export interface SinceLastMeetingReport {
  lastMeetingTitle: string;
  completedTasksCount: number;
  inProgressTasksCount: number;
  overdueCommitmentsCount: number;
  unresolvedIssuesCount: number;
  newDecisionsCount: number;
  completedTasks: Array<{ title: string; assignedTo: string }>;
  inProgressTasks: Array<{ title: string; assignedTo: string }>;
  overdueCommitments: Array<{ person: string; commitment: string; deadline?: string }>;
  unresolvedIssues: Array<{ issue: string; owner?: string }>;
  newDecisions: Array<{ decision: string; context: string }>;
}

export interface FollowUpMessage {
  subject: string;
  body: string;
  decisions: string[];
  actionItems: Array<{ title: string; assignee: string; deadline: string }>;
  nextSteps: string[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  relatedMeetingId?: string;
  relatedTaskId?: string;
  createdAt: string;
}

export interface SourceReference {
  type: 'MEETING' | 'DECISION' | 'COMMITMENT' | 'TASK' | 'MOM' | 'ISSUE';
  title: string;
  date?: string;
  excerpt: string;
  referenceId?: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SourceReference[];
  createdAt: string;
}

export interface DashboardMetrics {
  upcomingMeetingsCount: number;
  meetingsThisWeekCount: number;
  pendingTasksCount: number;
  overdueTasksCount: number;
  pendingCommitmentsCount: number;
  overdueCommitmentsCount: number;
  unresolvedIssuesCount: number;
  decisionsCount: number;
  unreadNotificationsCount: number;
}
