import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  User,
  Team,
  TeamMember,
  Contact,
  Meeting,
  MeetingParticipant,
  MeetingMemory,
  MeetingMom,
  Decision,
  ActionItem,
  Task,
  Notification,
  ChatSession,
  ChatMessage,
  MeetingBrief,
  Commitment,
  Issue,
  Recording,
  MeetingTranscript,
} from './types.js';

interface DatabaseSchema {
  users: User[];
  teams: Team[];
  team_members: TeamMember[];
  contacts: Contact[];
  meetings: Meeting[];
  recordings: Recording[];
  meeting_transcripts: MeetingTranscript[];
  meeting_participants: MeetingParticipant[];
  meeting_memories: MeetingMemory[];
  meeting_mom: MeetingMom[];
  meeting_briefs: Record<string, MeetingBrief>;
  decisions: Decision[];
  commitments: Commitment[];
  issues: Issue[];
  action_items: ActionItem[];
  tasks: Task[];
  notifications: Notification[];
  chat_sessions: ChatSession[];
  chat_messages: ChatMessage[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
    if (this.data.users.length === 0 || !this.data.commitments || this.data.commitments.length === 0) {
      this.seedDemoData();
    }
  }

  private getEmptySchema(): DatabaseSchema {
    return {
      users: [],
      teams: [],
      team_members: [],
      contacts: [],
      meetings: [],
      recordings: [],
      meeting_transcripts: [],
      meeting_participants: [],
      meeting_memories: [],
      meeting_mom: [],
      meeting_briefs: {},
      decisions: [],
      commitments: [],
      issues: [],
      action_items: [],
      tasks: [],
      notifications: [],
      chat_sessions: [],
      chat_messages: [],
    };
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...this.getEmptySchema(),
          ...parsed,
          recordings: parsed.recordings || [],
          meeting_transcripts: parsed.meeting_transcripts || [],
          commitments: parsed.commitments || [],
          issues: parsed.issues || [],
          meeting_briefs: parsed.meeting_briefs || {},
        };
      }
    } catch (e) {
      console.error('Failed to load database file, creating fresh store:', e);
    }
    return this.getEmptySchema();
  }

  public save(): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving database file:', e);
    }
  }

  public resetToDemo(): void {
    this.data = this.getEmptySchema();
    this.seedDemoData();
    this.save();
  }

  public seedDemoData(): void {
    const now = new Date();
    const isoNow = now.toISOString();

    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const nextMonday = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const nextWednesday = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
    const nextFriday = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Users (Maroof, Ayesha, Rahul, Sarah)
    const maroof: User = {
      id: 'usr_maroof',
      name: 'Maroof',
      email: 'maroofmubeen786@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'ADMIN',
      jobTitle: 'Engineering Lead & Solution Architect',
      createdAt: fiveDaysAgo,
      updatedAt: isoNow,
    };

    const ayesha: User = {
      id: 'usr_ayesha',
      name: 'Ayesha',
      email: 'ayesha@projectalpha.org',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
      role: 'USER',
      jobTitle: 'Lead Product Designer',
      createdAt: fiveDaysAgo,
      updatedAt: isoNow,
    };

    const rahul: User = {
      id: 'usr_rahul',
      name: 'Rahul',
      email: 'rahul@projectalpha.org',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      role: 'USER',
      jobTitle: 'Senior Backend Engineer',
      createdAt: fiveDaysAgo,
      updatedAt: isoNow,
    };

    const sarah: User = {
      id: 'usr_sarah',
      name: 'Sarah',
      email: 'sarah@projectalpha.org',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
      role: 'USER',
      jobTitle: 'QA & Product Manager',
      createdAt: fiveDaysAgo,
      updatedAt: isoNow,
    };

    this.data.users = [maroof, ayesha, rahul, sarah];

    // 2. Teams
    const teamAlpha: Team = {
      id: 'team_alpha',
      name: 'Project Alpha',
      description: 'Core platform architecture, API services, and client dashboards for enterprise deployment.',
      createdAt: fiveDaysAgo,
      updatedAt: isoNow,
    };
    this.data.teams = [teamAlpha];

    // 3. Team Members
    this.data.team_members = [
      { id: 'tm_1', teamId: teamAlpha.id, userId: maroof.id, role: 'OWNER', createdAt: fiveDaysAgo },
      { id: 'tm_2', teamId: teamAlpha.id, userId: ayesha.id, role: 'MEMBER', createdAt: fiveDaysAgo },
      { id: 'tm_3', teamId: teamAlpha.id, userId: rahul.id, role: 'MEMBER', createdAt: fiveDaysAgo },
      { id: 'tm_4', teamId: teamAlpha.id, userId: sarah.id, role: 'MEMBER', createdAt: fiveDaysAgo },
    ];

    // 4. Contacts
    this.data.contacts = [
      { id: 'cnt_1', name: 'Dr. Evelyn Vance', email: 'evelyn@cloudpartners.io', organization: 'Cloud Infrastructure Advisory', notes: 'Consulted on AWS vs GCP architecture', createdAt: fiveDaysAgo, updatedAt: isoNow },
      { id: 'cnt_2', name: 'Kenji Sato', email: 'kenji@securescale.com', organization: 'Penetration Testing Partner', notes: 'Scheduled security audit after API completion', createdAt: fiveDaysAgo, updatedAt: isoNow },
    ];

    // 5. Meetings
    const meetingPlanning: Meeting = {
      id: 'mtg_planning',
      teamId: teamAlpha.id,
      title: 'Project Alpha Planning',
      description: 'Initial architectural roadmap, technical stack alignment, and sprint commitments.',
      scheduledAt: fiveDaysAgo,
      duration: 45,
      status: 'COMPLETED',
      location: 'Conference Room 3A & Google Meet',
      transcript: `Maroof: Welcome everyone to the Project Alpha Planning session. We need to align on our API integration, UI prototype, deployment pipeline, and project deadline.
Rahul: Regarding the API layer, I reviewed GraphQL versus REST. Given our timeframe and client requirements, REST APIs with OpenAPI specifications will be much faster to stabilize.
Sarah: Agreed. What about automated testing?
Rahul: I will take responsibility for the API integration testing. Rahul will complete API testing by Monday.
Ayesha: For the user interface, I have the wireframes ready. Ayesha will finish the dashboard prototype by Friday so engineering can review the tokens.
Maroof: Excellent. We will use PostgreSQL with normalized tables for reliable data integrity. Maroof will prepare deployment documentation by Wednesday.
Sarah: That gives us a solid target. I will also write the acceptance test suites once Rahul submits the test report.
Maroof: Perfect. Let's record these decisions: REST APIs chosen, PostgreSQL for storage, and automated deployment docs ready by Wednesday.`,
      createdBy: maroof.id,
      createdAt: fiveDaysAgo,
      updatedAt: twoDaysAgo,
    };

    const meetingProgressReview: Meeting = {
      id: 'mtg_review',
      teamId: teamAlpha.id,
      title: 'Project Alpha Progress Review',
      description: 'Review of API testing deliverables, prototype demonstration, and deployment timeline.',
      scheduledAt: tomorrow,
      duration: 30,
      status: 'UPCOMING',
      location: 'Virtual / Google Meet',
      transcript: '',
      createdBy: maroof.id,
      createdAt: twoDaysAgo,
      updatedAt: isoNow,
    };

    this.data.meetings = [meetingPlanning, meetingProgressReview];

    // Meeting Transcripts
    this.data.meeting_transcripts = [
      {
        id: 'trn_1',
        meetingId: meetingPlanning.id,
        content: meetingPlanning.transcript,
        language: 'en',
        version: 1,
        approved: true,
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      },
    ];

    // Recordings
    this.data.recordings = [
      {
        id: 'rec_1',
        meetingId: meetingPlanning.id,
        uploadedBy: maroof.id,
        fileName: 'project_alpha_planning_session.webm',
        mimeType: 'audio/webm',
        duration: 2700,
        storagePath: '/recordings/project_alpha_planning_session.webm',
        transcriptionStatus: 'COMPLETED',
        transcribedAt: fiveDaysAgo,
        createdAt: fiveDaysAgo,
      },
    ];

    // Participants
    this.data.meeting_participants = [
      { id: 'mp_1', meetingId: meetingPlanning.id, userId: maroof.id, attendanceStatus: 'COMPLETED' },
      { id: 'mp_2', meetingId: meetingPlanning.id, userId: ayesha.id, attendanceStatus: 'COMPLETED' },
      { id: 'mp_3', meetingId: meetingPlanning.id, userId: rahul.id, attendanceStatus: 'COMPLETED' },
      { id: 'mp_4', meetingId: meetingPlanning.id, userId: sarah.id, attendanceStatus: 'COMPLETED' },

      { id: 'mp_5', meetingId: meetingProgressReview.id, userId: maroof.id, attendanceStatus: 'ATTENDING' },
      { id: 'mp_6', meetingId: meetingProgressReview.id, userId: ayesha.id, attendanceStatus: 'ATTENDING' },
      { id: 'mp_7', meetingId: meetingProgressReview.id, userId: rahul.id, attendanceStatus: 'ATTENDING' },
      { id: 'mp_8', meetingId: meetingProgressReview.id, userId: sarah.id, attendanceStatus: 'ATTENDING' },
    ];

    // Meeting Memories
    this.data.meeting_memories = [
      {
        id: 'mem_1',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        memoryType: 'DECISION',
        content: 'Adopted REST APIs with OpenAPI documentation over GraphQL for client-server protocol.',
        importance: 'HIGH',
        createdAt: fiveDaysAgo,
      },
      {
        id: 'mem_2',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        memoryType: 'COMMITMENT',
        content: 'Rahul committed to completing API testing by Monday.',
        importance: 'HIGH',
        createdAt: fiveDaysAgo,
      },
      {
        id: 'mem_3',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        memoryType: 'COMMITMENT',
        content: 'Ayesha committed to finishing the dashboard prototype by Friday.',
        importance: 'HIGH',
        createdAt: fiveDaysAgo,
      },
      {
        id: 'mem_4',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        memoryType: 'COMMITMENT',
        content: 'Maroof committed to preparing deployment documentation by Wednesday.',
        importance: 'HIGH',
        createdAt: fiveDaysAgo,
      },
      {
        id: 'mem_5',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        memoryType: 'DISCUSSION',
        content: 'Team evaluated PostgreSQL schema design and confirmed weekly sprint review cadences.',
        importance: 'MEDIUM',
        createdAt: fiveDaysAgo,
      },
      {
        id: 'mem_6',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        memoryType: 'ISSUE',
        content: 'Staging environment rate limiting needs to be resolved before load testing.',
        importance: 'MEDIUM',
        createdAt: fiveDaysAgo,
      },
    ];

    // Meeting MOM
    this.data.meeting_mom = [
      {
        id: 'mom_planning',
        meetingId: meetingPlanning.id,
        summary: 'The Project Alpha team aligned on architecture, API design, prototype targets, and assigned critical milestones to Rahul, Ayesha, and Maroof.',
        discussionPoints: [
          'Evaluated REST vs GraphQL; decided on REST APIs for immediate stability and OpenAPI tooling.',
          'UI design system and prototype milestone planned for Friday delivery.',
          'Deployment documentation and infrastructure verification assigned for Wednesday.',
          'Agreed on weekly progress review meetings.',
        ],
        unresolvedIssues: [
          'Staging environment rate limiting needs resolution before stress testing.',
        ],
        generatedAt: fiveDaysAgo,
        generatedByModel: 'Mistral-Large',
        reviewed: true,
        createdAt: fiveDaysAgo,
      },
    ];

    // Decisions Log (Section 28)
    this.data.decisions = [
      {
        id: 'dec_1',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        decision: 'The team decided to use REST APIs for client-server communication.',
        context: 'Chosen over GraphQL to accelerate MVP delivery and maintain clear OpenAPI contracts.',
        status: 'AGREED',
        createdAt: fiveDaysAgo,
      },
      {
        id: 'dec_2',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        decision: 'Use PostgreSQL with normalized schemas for all operational relational storage.',
        context: 'Ensures strict ACID guarantees and clear foreign-key data ownership.',
        status: 'AGREED',
        createdAt: fiveDaysAgo,
      },
    ];

    // Commitments Tracker (Section 17)
    this.data.commitments = [
      {
        id: 'cmt_1',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        person: 'Rahul',
        personUserId: rahul.id,
        commitment: 'Complete API testing against all endpoints and produce endpoint coverage report.',
        deadline: nextMonday,
        status: 'IN_PROGRESS',
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: 'cmt_2',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        person: 'Ayesha',
        personUserId: ayesha.id,
        commitment: 'Finish dashboard prototype in Figma with component tokens.',
        deadline: nextFriday,
        status: 'IN_PROGRESS',
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: 'cmt_3',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        person: 'Maroof',
        personUserId: maroof.id,
        commitment: 'Prepare deployment documentation covering container configuration and CI/CD pipelines.',
        deadline: nextWednesday,
        status: 'PENDING',
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      },
      {
        id: 'cmt_4',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        person: 'Sarah',
        personUserId: sarah.id,
        commitment: 'Draft QA acceptance criteria for API release.',
        deadline: twoDaysAgo,
        status: 'COMPLETED',
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
    ];

    // Unresolved Issues (Section 29)
    this.data.issues = [
      {
        id: 'iss_1',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        issue: 'Staging environment rate limiting needs to be resolved before load testing.',
        owner: 'Rahul',
        ownerUserId: rahul.id,
        status: 'OPEN',
        lastDiscussed: fiveDaysAgo,
        nextFollowUp: tomorrow,
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: 'iss_2',
        teamId: teamAlpha.id,
        meetingId: meetingPlanning.id,
        issue: 'OAuth client credentials token expiration lifecycle across microservices.',
        owner: 'Maroof',
        ownerUserId: maroof.id,
        status: 'IN_PROGRESS',
        lastDiscussed: fiveDaysAgo,
        nextFollowUp: nextWednesday,
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
    ];

    // Action Items
    const act1: ActionItem = {
      id: 'act_1',
      meetingId: meetingPlanning.id,
      title: 'Complete API testing',
      description: 'Execute integration tests against all endpoints and produce endpoint coverage report.',
      assignedTo: rahul.id,
      suggestedName: 'Rahul',
      deadline: nextMonday,
      priority: 'HIGH',
      confidence: 0.98,
      needsConfirmation: false,
      status: 'CONVERTED',
      createdAt: fiveDaysAgo,
      updatedAt: fiveDaysAgo,
    };

    const act2: ActionItem = {
      id: 'act_2',
      meetingId: meetingPlanning.id,
      title: 'Finish dashboard prototype',
      description: 'Deliver high-fidelity interactive dashboard screens in Figma with component tokens.',
      assignedTo: ayesha.id,
      suggestedName: 'Ayesha',
      deadline: nextFriday,
      priority: 'MEDIUM',
      confidence: 0.95,
      needsConfirmation: false,
      status: 'CONVERTED',
      createdAt: fiveDaysAgo,
      updatedAt: fiveDaysAgo,
    };

    const act3: ActionItem = {
      id: 'act_3',
      meetingId: meetingPlanning.id,
      title: 'Prepare deployment documentation',
      description: 'Document container setup, environment variable requirements, and CI/CD steps.',
      assignedTo: maroof.id,
      suggestedName: 'Maroof',
      deadline: nextWednesday,
      priority: 'HIGH',
      confidence: 0.96,
      needsConfirmation: false,
      status: 'CONVERTED',
      createdAt: fiveDaysAgo,
      updatedAt: fiveDaysAgo,
    };

    this.data.action_items = [act1, act2, act3];

    // Tasks
    this.data.tasks = [
      {
        id: 'tsk_1',
        actionItemId: act1.id,
        meetingId: meetingPlanning.id,
        assignedTo: rahul.id,
        title: 'Complete API testing',
        description: 'Execute integration tests against all endpoints and produce endpoint coverage report.',
        priority: 'HIGH',
        dueDate: nextMonday,
        status: 'IN_PROGRESS',
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: 'tsk_2',
        actionItemId: act2.id,
        meetingId: meetingPlanning.id,
        assignedTo: ayesha.id,
        title: 'Finish dashboard prototype',
        description: 'Deliver high-fidelity interactive dashboard screens in Figma with component tokens.',
        priority: 'MEDIUM',
        dueDate: nextFriday,
        status: 'IN_PROGRESS',
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
      {
        id: 'tsk_3',
        actionItemId: act3.id,
        meetingId: meetingPlanning.id,
        assignedTo: maroof.id,
        title: 'Prepare deployment documentation',
        description: 'Document container setup, environment variable requirements, and CI/CD steps.',
        priority: 'HIGH',
        dueDate: nextWednesday,
        status: 'TODO',
        createdAt: fiveDaysAgo,
        updatedAt: fiveDaysAgo,
      },
      {
        id: 'tsk_4',
        actionItemId: null,
        meetingId: meetingPlanning.id,
        assignedTo: sarah.id,
        title: 'Draft QA acceptance criteria for API release',
        description: 'Set up test cases covering error boundaries and unauthorized user access.',
        priority: 'MEDIUM',
        dueDate: twoDaysAgo,
        status: 'COMPLETED',
        createdAt: fiveDaysAgo,
        updatedAt: twoDaysAgo,
      },
    ];

    // Notifications
    this.data.notifications = [
      {
        id: 'notif_1',
        userId: rahul.id,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned to you',
        message: 'Complete API testing due Monday from Project Alpha Planning.',
        read: false,
        relatedTaskId: 'tsk_1',
        relatedMeetingId: meetingPlanning.id,
        createdAt: fiveDaysAgo,
      },
      {
        id: 'notif_2',
        userId: ayesha.id,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned to you',
        message: 'Finish dashboard prototype due Friday from Project Alpha Planning.',
        read: false,
        relatedTaskId: 'tsk_2',
        relatedMeetingId: meetingPlanning.id,
        createdAt: fiveDaysAgo,
      },
      {
        id: 'notif_3',
        userId: maroof.id,
        type: 'TASK_ASSIGNED',
        title: 'New task assigned to you',
        message: 'Prepare deployment documentation due Wednesday from Project Alpha Planning.',
        read: false,
        relatedTaskId: 'tsk_3',
        relatedMeetingId: meetingPlanning.id,
        createdAt: fiveDaysAgo,
      },
    ];

    this.save();
  }

  // --- Users ---
  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getUserByFirebaseUid(firebaseUid: string): User | undefined {
    return this.data.users.find(u => u.firebaseUid === firebaseUid);
  }

  public updateUserFirebaseUid(userId: string, firebaseUid: string): User | undefined {
    const user = this.getUserById(userId);
    if (user) {
      user.firebaseUid = firebaseUid;
      user.updatedAt = new Date().toISOString();
      this.save();
    }
    return user;
  }

  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): User {
    const newUser: User = {
      id: `usr_${crypto.randomUUID().slice(0, 8)}`,
      ...user,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  // --- Teams ---
  public getTeams(): Team[] {
    return this.data.teams;
  }

  public getTeamById(id: string): Team | undefined {
    return this.data.teams.find(t => t.id === id);
  }

  public getUserTeams(userId: string): Team[] {
    const memberTeamIds = this.data.team_members
      .filter(tm => tm.userId === userId)
      .map(tm => tm.teamId);
    return this.data.teams.filter(t => memberTeamIds.includes(t.id));
  }

  public isUserInTeam(userId: string, teamId: string): boolean {
    return this.data.team_members.some(tm => tm.userId === userId && tm.teamId === teamId);
  }

  public getTeamMembers(teamId: string): Array<TeamMember & { user: User }> {
    return this.data.team_members
      .filter(tm => tm.teamId === teamId)
      .map(tm => ({
        ...tm,
        user: this.getUserById(tm.userId)!,
      }))
      .filter(tm => tm.user !== undefined);
  }

  public addTeamMember(teamId: string, userId: string, role: TeamMember['role'] = 'MEMBER'): TeamMember {
    const existing = this.data.team_members.find(tm => tm.teamId === teamId && tm.userId === userId);
    if (existing) return existing;
    const newMember: TeamMember = {
      id: `tm_${crypto.randomUUID().slice(0, 8)}`,
      teamId,
      userId,
      role,
      createdAt: new Date().toISOString(),
    };
    this.data.team_members.push(newMember);
    this.save();
    return newMember;
  }

  public createTeam(name: string, description: string, creatorUserId: string): Team {
    const newTeam: Team = {
      id: `team_${crypto.randomUUID().slice(0, 8)}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.teams.push(newTeam);
    this.addTeamMember(newTeam.id, creatorUserId, 'OWNER');
    this.save();
    return newTeam;
  }

  // --- Meetings ---
  public getMeetings(options?: { teamId?: string; userId?: string; status?: string; search?: string }): Meeting[] {
    let list = [...this.data.meetings];

    if (options?.teamId) {
      list = list.filter(m => m.teamId === options.teamId);
    }
    if (options?.status) {
      list = list.filter(m => m.status === options.status);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
    }
    if (options?.userId) {
      const userTeamIds = this.getUserTeams(options.userId).map(t => t.id);
      const participantMeetingIds = this.data.meeting_participants
        .filter(p => p.userId === options.userId)
        .map(p => p.meetingId);
      list = list.filter(m => userTeamIds.includes(m.teamId) || participantMeetingIds.includes(m.id) || m.createdBy === options.userId);
    }

    return list.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }

  public getMeetingById(id: string): Meeting | undefined {
    return this.data.meetings.find(m => m.id === id);
  }

  public createMeeting(payload: {
    teamId: string;
    title: string;
    description: string;
    scheduledAt: string;
    duration?: number;
    location?: string;
    participantUserIds: string[];
    createdBy: string;
  }): Meeting {
    const newMeeting: Meeting = {
      id: `mtg_${crypto.randomUUID().slice(0, 8)}`,
      teamId: payload.teamId,
      title: payload.title,
      description: payload.description || '',
      scheduledAt: payload.scheduledAt,
      duration: payload.duration || 30,
      status: 'UPCOMING',
      location: payload.location || 'Google Meet / Conference Room',
      transcript: '',
      createdBy: payload.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.meetings.push(newMeeting);

    const uniqueIds = Array.from(new Set([...payload.participantUserIds, payload.createdBy]));
    uniqueIds.forEach(userId => {
      this.data.meeting_participants.push({
        id: `mp_${crypto.randomUUID().slice(0, 8)}`,
        meetingId: newMeeting.id,
        userId,
        attendanceStatus: 'INVITED',
      });
    });

    this.save();
    return newMeeting;
  }

  public updateMeeting(id: string, updates: Partial<Meeting>): Meeting | undefined {
    const idx = this.data.meetings.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    this.data.meetings[idx] = {
      ...this.data.meetings[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.meetings[idx];
  }

  public deleteMeeting(id: string): boolean {
    const initialLen = this.data.meetings.length;
    this.data.meetings = this.data.meetings.filter(m => m.id !== id);
    this.data.meeting_participants = this.data.meeting_participants.filter(p => p.meetingId !== id);
    this.data.meeting_memories = this.data.meeting_memories.filter(m => m.meetingId !== id);
    this.data.meeting_mom = this.data.meeting_mom.filter(m => m.meetingId !== id);
    this.data.decisions = this.data.decisions.filter(d => d.meetingId !== id);
    this.data.commitments = this.data.commitments.filter(c => c.meetingId !== id);
    this.data.issues = this.data.issues.filter(i => i.meetingId !== id);
    this.data.action_items = this.data.action_items.filter(a => a.meetingId !== id);
    this.data.tasks = this.data.tasks.filter(t => t.meetingId !== id);
    this.data.recordings = this.data.recordings.filter(r => r.meetingId !== id);
    this.data.meeting_transcripts = this.data.meeting_transcripts.filter(t => t.meetingId !== id);
    delete this.data.meeting_briefs[id];
    this.save();
    return this.data.meetings.length < initialLen;
  }

  public getMeetingParticipants(meetingId: string): Array<MeetingParticipant & { user: User }> {
    return this.data.meeting_participants
      .filter(p => p.meetingId === meetingId)
      .map(p => ({
        ...p,
        user: this.getUserById(p.userId)!,
      }))
      .filter(p => p.user !== undefined);
  }

  // --- Voice Recordings & Transcripts ---
  public getRecordings(meetingId: string): Recording[] {
    return this.data.recordings.filter(r => r.meetingId === meetingId);
  }

  public getRecordingById(id: string): Recording | undefined {
    return this.data.recordings.find(r => r.id === id);
  }

  public addRecording(recording: Omit<Recording, 'id' | 'createdAt'>): Recording {
    const newRec: Recording = {
      id: `rec_${crypto.randomUUID().slice(0, 8)}`,
      ...recording,
      createdAt: new Date().toISOString(),
    };
    this.data.recordings.push(newRec);
    this.save();
    return newRec;
  }

  public updateRecording(id: string, updates: Partial<Recording>): Recording | undefined {
    const idx = this.data.recordings.findIndex(r => r.id === id);
    if (idx === -1) return undefined;
    this.data.recordings[idx] = { ...this.data.recordings[idx], ...updates };
    this.save();
    return this.data.recordings[idx];
  }

  public getMeetingTranscripts(meetingId: string): MeetingTranscript[] {
    return this.data.meeting_transcripts
      .filter(t => t.meetingId === meetingId)
      .sort((a, b) => b.version - a.version);
  }

  public getLatestTranscript(meetingId: string): MeetingTranscript | undefined {
    const list = this.getMeetingTranscripts(meetingId);
    return list.find(t => t.approved) || list[0];
  }

  public saveMeetingTranscript(payload: {
    meetingId: string;
    recordingId?: string | null;
    content: string;
    language?: string;
    approved?: boolean;
  }): MeetingTranscript {
    const existing = this.getMeetingTranscripts(payload.meetingId);
    const nextVersion = existing.length > 0 ? existing[0].version + 1 : 1;

    const newTrans: MeetingTranscript = {
      id: `trn_${crypto.randomUUID().slice(0, 8)}`,
      meetingId: payload.meetingId,
      recordingId: payload.recordingId || null,
      content: payload.content,
      language: payload.language || 'en',
      version: nextVersion,
      approved: payload.approved ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.meeting_transcripts.unshift(newTrans);

    // Also sync to meeting.transcript
    this.updateMeeting(payload.meetingId, { transcript: payload.content });

    this.save();
    return newTrans;
  }

  // --- Commitments Tracker ---
  public getCommitments(options?: { teamId?: string; meetingId?: string; personUserId?: string; status?: string }): Commitment[] {
    let list = [...this.data.commitments];
    if (options?.teamId) list = list.filter(c => c.teamId === options.teamId);
    if (options?.meetingId) list = list.filter(c => c.meetingId === options.meetingId);
    if (options?.personUserId) list = list.filter(c => c.personUserId === options.personUserId);
    if (options?.status) list = list.filter(c => c.status === options.status);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addCommitment(cmt: Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>): Commitment {
    const newCmt: Commitment = {
      id: `cmt_${crypto.randomUUID().slice(0, 8)}`,
      ...cmt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.commitments.push(newCmt);
    this.save();
    return newCmt;
  }

  public updateCommitment(id: string, updates: Partial<Commitment>): Commitment | undefined {
    const idx = this.data.commitments.findIndex(c => c.id === id);
    if (idx === -1) return undefined;
    this.data.commitments[idx] = {
      ...this.data.commitments[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.commitments[idx];
  }

  // --- Unresolved Issues Tracker ---
  public getIssues(options?: { teamId?: string; meetingId?: string; status?: string }): Issue[] {
    let list = [...this.data.issues];
    if (options?.teamId) list = list.filter(i => i.teamId === options.teamId);
    if (options?.meetingId) list = list.filter(i => i.meetingId === options.meetingId);
    if (options?.status) list = list.filter(i => i.status === options.status);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public addIssue(iss: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>): Issue {
    const newIss: Issue = {
      id: `iss_${crypto.randomUUID().slice(0, 8)}`,
      ...iss,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.issues.push(newIss);
    this.save();
    return newIss;
  }

  public updateIssue(id: string, updates: Partial<Issue>): Issue | undefined {
    const idx = this.data.issues.findIndex(i => i.id === id);
    if (idx === -1) return undefined;
    this.data.issues[idx] = {
      ...this.data.issues[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.issues[idx];
  }

  // --- Decisions Log ---
  public getDecisions(meetingId?: string): Decision[] {
    if (meetingId) {
      return this.data.decisions.filter(d => d.meetingId === meetingId);
    }
    return this.data.decisions;
  }

  public addDecision(decision: Omit<Decision, 'id' | 'createdAt'>): Decision {
    const newDec: Decision = {
      id: `dec_${crypto.randomUUID().slice(0, 8)}`,
      ...decision,
      status: decision.status || 'AGREED',
      createdAt: new Date().toISOString(),
    };
    this.data.decisions.push(newDec);
    this.save();
    return newDec;
  }

  // --- What Changed Since Last Meeting ---
  public getSinceLastMeetingReport(currentMeetingId: string) {
    const current = this.getMeetingById(currentMeetingId);
    if (!current) return null;

    const previousMeetings = this.data.meetings
      .filter(m => m.teamId === current.teamId && m.id !== currentMeetingId && new Date(m.scheduledAt) < new Date(current.scheduledAt))
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

    const lastMeeting = previousMeetings[0];

    // Tasks completed
    const completedTasks = this.data.tasks.filter(t => t.status === 'COMPLETED');
    const inProgressTasks = this.data.tasks.filter(t => t.status === 'IN_PROGRESS');
    const overdueCommitments = this.data.commitments.filter(c => c.status === 'OVERDUE' || (c.deadline && new Date(c.deadline) < new Date() && c.status !== 'COMPLETED'));
    const unresolvedIssues = this.data.issues.filter(i => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
    const newDecisions = this.data.decisions.filter(d => lastMeeting ? d.meetingId === lastMeeting.id : true);

    return {
      lastMeetingTitle: lastMeeting?.title || 'Initial Planning Session',
      completedTasksCount: completedTasks.length,
      inProgressTasksCount: inProgressTasks.length,
      overdueCommitmentsCount: overdueCommitments.length,
      unresolvedIssuesCount: unresolvedIssues.length,
      newDecisionsCount: newDecisions.length,
      completedTasks: completedTasks.map(t => ({ title: t.title, assignedTo: this.getUserById(t.assignedTo)?.name || 'Team Member' })),
      inProgressTasks: inProgressTasks.map(t => ({ title: t.title, assignedTo: this.getUserById(t.assignedTo)?.name || 'Team Member' })),
      overdueCommitments: overdueCommitments.map(c => ({ person: c.person, commitment: c.commitment, deadline: c.deadline })),
      unresolvedIssues: unresolvedIssues.map(i => ({ issue: i.issue, owner: i.owner })),
      newDecisions: newDecisions.map(d => ({ decision: d.decision, context: d.context })),
    };
  }

  // --- Meeting Memories ---
  public getMeetingMemories(meetingId?: string): MeetingMemory[] {
    if (meetingId) {
      return this.data.meeting_memories.filter(m => m.meetingId === meetingId);
    }
    return this.data.meeting_memories;
  }

  public addMeetingMemory(memory: Omit<MeetingMemory, 'id' | 'createdAt'>): MeetingMemory {
    const newMem: MeetingMemory = {
      id: `mem_${crypto.randomUUID().slice(0, 8)}`,
      ...memory,
      createdAt: new Date().toISOString(),
    };
    this.data.meeting_memories.push(newMem);
    this.save();
    return newMem;
  }

  // --- MOM ---
  public getMeetingMom(meetingId: string): MeetingMom | undefined {
    return this.data.meeting_mom.find(m => m.meetingId === meetingId);
  }

  public saveMeetingMom(mom: Omit<MeetingMom, 'id' | 'createdAt'>): MeetingMom {
    const existingIdx = this.data.meeting_mom.findIndex(m => m.meetingId === mom.meetingId);
    if (existingIdx !== -1) {
      this.data.meeting_mom[existingIdx] = {
        ...this.data.meeting_mom[existingIdx],
        ...mom,
      };
      this.save();
      return this.data.meeting_mom[existingIdx];
    }
    const newMom: MeetingMom = {
      id: `mom_${crypto.randomUUID().slice(0, 8)}`,
      ...mom,
      createdAt: new Date().toISOString(),
    };
    this.data.meeting_mom.push(newMom);
    this.save();
    return newMom;
  }

  // --- Briefs ---
  public getMeetingBrief(meetingId: string): MeetingBrief | undefined {
    return this.data.meeting_briefs[meetingId];
  }

  public saveMeetingBrief(meetingId: string, brief: MeetingBrief): void {
    this.data.meeting_briefs[meetingId] = brief;
    this.save();
  }

  // --- Action Items ---
  public getActionItems(meetingId: string): ActionItem[] {
    return this.data.action_items.filter(a => a.meetingId === meetingId);
  }

  public addActionItem(item: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>): ActionItem {
    const newItem: ActionItem = {
      id: `act_${crypto.randomUUID().slice(0, 8)}`,
      ...item,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.action_items.push(newItem);
    this.save();
    return newItem;
  }

  public updateActionItem(id: string, updates: Partial<ActionItem>): ActionItem | undefined {
    const idx = this.data.action_items.findIndex(a => a.id === id);
    if (idx === -1) return undefined;
    this.data.action_items[idx] = {
      ...this.data.action_items[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.action_items[idx];
  }

  // --- Tasks ---
  public getTasks(options?: { userId?: string; meetingId?: string; status?: Task['status'] }): Task[] {
    let list = [...this.data.tasks];
    if (options?.userId) list = list.filter(t => t.assignedTo === options.userId);
    if (options?.meetingId) list = list.filter(t => t.meetingId === options.meetingId);
    if (options?.status) list = list.filter(t => t.status === options.status);
    return list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  public getTaskById(id: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  public createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const newTask: Task = {
      id: `tsk_${crypto.randomUUID().slice(0, 8)}`,
      ...task,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.tasks.push(newTask);

    this.createNotification({
      userId: newTask.assignedTo,
      type: 'TASK_ASSIGNED',
      title: 'New task assigned to you',
      message: `${newTask.title} (Due: ${newTask.dueDate ? new Date(newTask.dueDate).toLocaleDateString() : 'Unscheduled'})`,
      relatedTaskId: newTask.id,
      relatedMeetingId: newTask.meetingId || undefined,
    });

    this.save();
    return newTask;
  }

  public updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const idx = this.data.tasks.findIndex(t => t.id === id);
    if (idx === -1) return undefined;
    this.data.tasks[idx] = {
      ...this.data.tasks[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.tasks[idx];
  }

  public deleteTask(id: string): boolean {
    const prev = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    this.save();
    return this.data.tasks.length < prev;
  }

  // --- Notifications ---
  public getNotifications(userId: string): Notification[] {
    return this.data.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(n: Omit<Notification, 'id' | 'read' | 'createdAt'>): Notification {
    const notif: Notification = {
      id: `notif_${crypto.randomUUID().slice(0, 8)}`,
      ...n,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.unshift(notif);
    this.save();
    return notif;
  }

  public markNotificationAsRead(id: string, userId: string): boolean {
    const notif = this.data.notifications.find(n => n.id === id && n.userId === userId);
    if (notif) {
      notif.read = true;
      this.save();
      return true;
    }
    return false;
  }

  public markAllNotificationsAsRead(userId: string): void {
    this.data.notifications.filter(n => n.userId === userId).forEach(n => { n.read = true; });
    this.save();
  }

  // --- Chat ---
  public getChatSessions(userId: string): ChatSession[] {
    return this.data.chat_sessions
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  public getOrCreateChatSession(userId: string, sessionId?: string, title?: string): ChatSession {
    if (sessionId) {
      const existing = this.data.chat_sessions.find(s => s.id === sessionId && s.userId === userId);
      if (existing) return existing;
    }
    const newSession: ChatSession = {
      id: `sess_${crypto.randomUUID().slice(0, 8)}`,
      userId,
      title: title || 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.chat_sessions.unshift(newSession);
    this.save();
    return newSession;
  }

  public getChatMessages(sessionId: string): ChatMessage[] {
    return this.data.chat_messages
      .filter(m => m.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public addChatMessage(msg: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
    const newMsg: ChatMessage = {
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      ...msg,
      createdAt: new Date().toISOString(),
    };
    this.data.chat_messages.push(newMsg);

    const sess = this.data.chat_sessions.find(s => s.id === msg.sessionId);
    if (sess) {
      sess.updatedAt = new Date().toISOString();
      if (msg.role === 'user' && sess.title === 'New Conversation') {
        sess.title = msg.content.slice(0, 40) + (msg.content.length > 40 ? '...' : '');
      }
    }

    this.save();
    return newMsg;
  }

  public deleteChatSession(sessionId: string, userId: string): boolean {
    const session = this.data.chat_sessions.find(s => s.id === sessionId && s.userId === userId);
    if (!session) return false;

    this.data.chat_sessions = this.data.chat_sessions.filter(s => s.id !== sessionId);
    this.data.chat_messages = this.data.chat_messages.filter(m => m.sessionId !== sessionId);
    this.save();
    return true;
  }
}

export const db = new Database();
