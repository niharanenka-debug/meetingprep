export type Role = 'USER' | 'ADMIN';
export type TeamMemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type MeetingStatus = 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'ATTENDING' | 'INVITED' | 'DECLINED' | 'COMPLETED';
export type MemoryType = 'DISCUSSION' | 'DECISION' | 'COMMITMENT' | 'PREFERENCE' | 'ISSUE' | 'FOLLOW_UP';
export type MemoryImportance = 'LOW' | 'MEDIUM' | 'HIGH';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ActionItemStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CONVERTED';
export type CommitmentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type DecisionStatus = 'AGREED' | 'SUPERSEDED' | 'REVOKED';
export type RecordingStatus = 'UPLOADED' | 'TRANSCRIBING' | 'COMPLETED' | 'FAILED';
export type NotificationType = 'TASK_ASSIGNED' | 'MEETING_BRIEF_READY' | 'MOM_GENERATED' | 'TASK_DUE' | 'COMMITMENT_ASSIGNED' | 'SYSTEM';

export interface User {
  id: string;
  firebaseUid?: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  jobTitle?: string;
  passwordHash?: string;
  createdAt: string;
  updatedAt: string;
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
  role: TeamMemberRole;
  createdAt: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  organization: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  teamId: string;
  title: string;
  description: string;
  scheduledAt: string;
  duration?: number; // in minutes
  status: MeetingStatus;
  location: string;
  transcript: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recording {
  id: string;
  meetingId: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  duration?: number | null;
  storagePath: string;
  transcriptionStatus: RecordingStatus;
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

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  attendanceStatus: AttendanceStatus;
}

export interface MeetingMemory {
  id: string;
  teamId?: string;
  meetingId: string;
  memoryType: MemoryType;
  content: string;
  importance: MemoryImportance;
  createdAt: string;
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

export interface Decision {
  id: string;
  teamId?: string;
  meetingId: string;
  decision: string;
  context: string;
  status: DecisionStatus;
  createdAt: string;
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
}

export interface ActionItem {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  assignedTo: string | null; // userId or null
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
  assignedTo: string; // userId
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  relatedMeetingId?: string;
  relatedTaskId?: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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

export interface MeetingCompleteness {
  decisionsIdentified: number;
  actionItemsIdentified: number;
  assignedActionItems: number;
  unassignedActionItems: number;
  itemsWithDeadlines: number;
  unresolvedIssues: number;
  score: number; // 0-100
}

export interface FollowUpMessage {
  subject: string;
  body: string;
  decisions: string[];
  actionItems: Array<{ title: string; assignee: string; deadline: string }>;
  nextSteps: string[];
}
