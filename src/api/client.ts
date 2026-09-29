import type {
  ActionItem,
  ChatMessage,
  Commitment,
  DashboardMetrics,
  Decision,
  FollowUpMessage,
  Issue,
  Meeting,
  MeetingBrief,
  MeetingCompleteness,
  MeetingMom,
  MeetingTranscript,
  NotificationItem,
  Recording,
  SinceLastMeetingReport,
  Task,
  Team,
  TeamMember,
  User,
} from '../types/index.js';

const TOKEN_KEY = 'meeting_prep_token';
const TOKEN_SOURCE_KEY = 'meeting_prep_token_source';

class ApiClient {
  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  public setToken(token: string, source: 'app' | 'firebase' = 'app'): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_SOURCE_KEY, source);
  }

  public getTokenSource(): 'app' | 'firebase' | null {
    if (!this.getToken()) return null;
    return localStorage.getItem(TOKEN_SOURCE_KEY) === 'firebase' ? 'firebase' : 'app';
  }

  public clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_SOURCE_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const body = await response.json();
        errorMsg = body.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return response.json() as Promise<T>;
  }

  // Auth
  public async login(email: string, password?: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async register(name: string, email: string, password?: string, jobTitle?: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, jobTitle }),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe(): Promise<User> {
    return this.request<User>('/api/auth/me');
  }

  public async getUsers(): Promise<User[]> {
    return this.request<User[]>('/api/auth/users');
  }

  public async switchUser(userId: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/api/auth/switch-user', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
    this.setToken(res.token);
    return res;
  }

  // Teams
  public async getTeams(): Promise<Team[]> {
    return this.request<Team[]>('/api/teams');
  }

  public async getTeam(id: string): Promise<Team & { members: TeamMember[] }> {
    return this.request<Team & { members: TeamMember[] }>(`/api/teams/${id}`);
  }

  public async createTeam(name: string, description: string): Promise<Team> {
    return this.request<Team>('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  // Meetings
  public async getMeetings(params?: { teamId?: string; status?: string; search?: string }): Promise<Meeting[]> {
    const query = new URLSearchParams();
    if (params?.teamId) query.set('teamId', params.teamId);
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Meeting[]>(`/api/meetings${qs}`);
  }

  public async getMeeting(id: string): Promise<Meeting & {
    brief?: MeetingBrief;
    mom?: MeetingMom;
    decisions: Decision[];
    commitments: Commitment[];
    issues: Issue[];
    actionItems: ActionItem[];
    tasks: Task[];
    recordings: Recording[];
    transcriptApproved: boolean;
    transcriptVersion: number;
    completeness?: MeetingCompleteness;
  }> {
    return this.request<any>(`/api/meetings/${id}`);
  }

  public async createMeeting(data: {
    title: string;
    description: string;
    scheduledAt: string;
    duration?: number;
    location?: string;
    teamId?: string;
    participantUserIds: string[];
  }): Promise<Meeting> {
    return this.request<Meeting>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateMeeting(id: string, updates: Partial<Meeting>): Promise<Meeting> {
    return this.request<Meeting>(`/api/meetings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async deleteMeeting(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/meetings/${id}`, {
      method: 'DELETE',
    });
  }

  // Audio Recordings & Transcription
  public async uploadAudioRecording(meetingId: string, file: Blob, fileName?: string): Promise<{
    recording: Recording;
    transcript: MeetingTranscript;
    segments?: any[];
  }> {
    const formData = new FormData();
    formData.append('audio', file, fileName || 'meeting_recording.webm');

    return this.request<any>(`/api/meetings/${meetingId}/recordings`, {
      method: 'POST',
      body: formData,
    });
  }

  public async getRecordings(meetingId: string): Promise<Recording[]> {
    return this.request<Recording[]>(`/api/meetings/${meetingId}/recordings`);
  }

  public async getTranscript(meetingId: string): Promise<MeetingTranscript> {
    return this.request<MeetingTranscript>(`/api/meetings/${meetingId}/transcript`);
  }

  public async saveTranscript(meetingId: string, content: string, approved: boolean = true): Promise<MeetingTranscript> {
    return this.request<MeetingTranscript>(`/api/meetings/${meetingId}/transcript`, {
      method: 'PUT',
      body: JSON.stringify({ content, approved }),
    });
  }

  // Meeting Preparation & What Changed
  public async prepareMeeting(id: string): Promise<MeetingBrief> {
    return this.request<MeetingBrief>(`/api/meetings/${id}/prepare`, {
      method: 'POST',
    });
  }

  public async getWhatChanged(id: string): Promise<SinceLastMeetingReport> {
    return this.request<SinceLastMeetingReport>(`/api/meetings/${id}/what-changed`, {
      method: 'POST',
    });
  }

  // MOM & Approvals
  public async generateMOM(id: string, transcript?: string): Promise<{
    mom: MeetingMom;
    actionItems: ActionItem[];
    decisions: Decision[];
    unresolvedIssues: string[];
    completeness: MeetingCompleteness;
  }> {
    return this.request<any>(`/api/meetings/${id}/generate-mom`, {
      method: 'POST',
      body: JSON.stringify({ transcript }),
    });
  }

  public async approveMOM(id: string, items?: ActionItem[]): Promise<{
    success: boolean;
    createdTasksCount: number;
    createdCommitmentsCount: number;
    tasks: Task[];
    commitments: Commitment[];
  }> {
    return this.request<any>(`/api/meetings/${id}/approve-mom`, {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  public async generateFollowUp(id: string): Promise<FollowUpMessage> {
    return this.request<FollowUpMessage>(`/api/meetings/${id}/generate-follow-up`, {
      method: 'POST',
    });
  }

  public async updateActionItem(meetingId: string, itemId: string, updates: Partial<ActionItem>): Promise<ActionItem> {
    return this.request<ActionItem>(`/api/meetings/${meetingId}/action-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Commitments
  public async getCommitments(params?: { status?: string; meetingId?: string }): Promise<Commitment[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.meetingId) query.set('meetingId', params.meetingId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Commitment[]>(`/api/commitments${qs}`);
  }

  public async getMyCommitments(): Promise<Commitment[]> {
    return this.request<Commitment[]>('/api/commitments/my');
  }

  public async updateCommitment(id: string, updates: Partial<Commitment>): Promise<Commitment> {
    return this.request<Commitment>(`/api/commitments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Decisions
  public async getDecisions(params?: { meetingId?: string }): Promise<Decision[]> {
    const query = new URLSearchParams();
    if (params?.meetingId) query.set('meetingId', params.meetingId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Decision[]>(`/api/decisions${qs}`);
  }

  // Issues
  public async getIssues(params?: { status?: string; meetingId?: string }): Promise<Issue[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.meetingId) query.set('meetingId', params.meetingId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Issue[]>(`/api/issues${qs}`);
  }

  public async updateIssue(id: string, updates: Partial<Issue>): Promise<Issue> {
    return this.request<Issue>(`/api/issues/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Tasks
  public async getTasks(params?: { status?: string; priority?: string; assignedTo?: string }): Promise<Task[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.assignedTo) query.set('assignedTo', params.assignedTo);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<Task[]>(`/api/tasks${qs}`);
  }

  public async getMyTasks(): Promise<Task[]> {
    return this.request<Task[]>('/api/tasks/my');
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    return this.request<Task>(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  public async deleteTask(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' });
  }

  public async createTask(data: {
    title: string;
    description?: string;
    assignedTo?: string;
    priority?: string;
    dueDate?: string;
    meetingId?: string;
  }): Promise<Task> {
    return this.request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Chatbot
  public async sendMessage(message: string, sessionId?: string): Promise<{ sessionId: string; message: ChatMessage }> {
    return this.request<{ sessionId: string; message: ChatMessage }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    });
  }

  public async getChatSessions(): Promise<Array<{ id: string; title: string; createdAt: string; updatedAt: string }>> {
    return this.request<any[]>('/api/chat/sessions');
  }

  public async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/api/chat/sessions/${sessionId}/messages`);
  }

  // Dashboard
  public async getDashboardData(): Promise<{
    metrics: DashboardMetrics;
    upcomingMeetings: Meeting[];
    pendingTasks: Task[];
    myCommitments: Commitment[];
    unresolvedIssues: Issue[];
    recentDecisions: Decision[];
    followUpRadar: {
      overdueCommitments: Array<{ id: string; title: string; deadline?: string; meetingId: string }>;
      upcomingDeadlines: Array<{ id: string; title: string; dueDate: string; priority: string; meetingId?: string }>;
      unresolvedIssues: Array<{ id: string; issue: string; owner?: string; meetingId: string }>;
      recentDecisionsCount: number;
    };
    aiInsight: string;
  }> {
    return this.request<any>('/api/dashboard');
  }

  public async getNotifications(): Promise<NotificationItem[]> {
    return this.request<NotificationItem[]>('/api/dashboard/notifications');
  }

  public async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/dashboard/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  public async markAllNotificationsRead(): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/dashboard/notifications/read-all', {
      method: 'PUT',
    });
  }

  public async resetDemo(): Promise<{ success: boolean; message: string }> {
    return this.request<any>('/api/demo/reset', { method: 'POST' });
  }
}

export const api = new ApiClient();
