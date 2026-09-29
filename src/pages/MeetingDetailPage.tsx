import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import type {
  ActionItem,
  Commitment,
  Decision,
  FollowUpMessage,
  Issue,
  Meeting,
  MeetingBrief,
  MeetingCompleteness,
  MeetingMemory,
  MeetingMom,
  MeetingTranscript,
  Recording,
  SinceLastMeetingReport,
  Task,
} from '../types/index.js';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  HelpCircle,
  ListTodo,
  MapPin,
  Mic,
  MessageSquare,
  Sparkles,
  Trash2,
  Users,
  Check,
  Send,
  AlertTriangle,
  RotateCcw,
  Copy,
  ExternalLink,
  Brain,
  Plus
} from 'lucide-react';
import { MeetingRecorder } from '../components/MeetingRecorder.js';

export function MeetingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<(Meeting & {
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
    memories?: MeetingMemory[];
  }) | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'prep' | 'recording' | 'transcript' | 'mom' | 'decisions' | 'actions' | 'tasks' | 'memories' | 'chat'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transcript state in tab
  const [editableTranscript, setEditableTranscript] = useState('');
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [transcriptCopied, setTranscriptCopied] = useState(false);

  // New memory modal
  const [showAddMemory, setShowAddMemory] = useState(false);
  const [newMemoryType, setNewMemoryType] = useState<string>('DECISION');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryImportance, setNewMemoryImportance] = useState<string>('HIGH');
  const [savingMemory, setSavingMemory] = useState(false);

  // Follow-Up Modal
  const [followUp, setFollowUp] = useState<FollowUpMessage | null>(null);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(false);
  const [copiedFollowUp, setCopiedFollowUp] = useState(false);

  // What Changed Report
  const [whatChangedReport, setWhatChangedReport] = useState<SinceLastMeetingReport | null>(null);
  const [loadingWhatChanged, setLoadingWhatChanged] = useState(false);

  // Inline Quick Chat for this meeting
  const [meetingChatInput, setMeetingChatInput] = useState('');
  const [meetingChatReplies, setMeetingChatReplies] = useState<Array<{ role: string; content: string }>>([
    { role: 'assistant', content: 'Ask anything about this meeting, its decisions, commitments, or responsible owners.' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);

  const loadMeeting = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getMeeting(id);
      setMeeting(data);
      setEditableTranscript(data.transcript || '');
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeeting();
  }, [id]);

  const handleGenerateFollowUp = async () => {
    if (!id) return;
    setGeneratingFollowUp(true);
    try {
      const result = await api.generateFollowUp(id);
      setFollowUp(result);
    } catch (err: any) {
      alert('Error generating follow-up: ' + err.message);
    } finally {
      setGeneratingFollowUp(false);
    }
  };

  const handleLoadWhatChanged = async () => {
    if (!id) return;
    setLoadingWhatChanged(true);
    try {
      const rep = await api.getWhatChanged(id);
      setWhatChangedReport(rep);
    } catch (err) {
      console.error('Failed to load what changed:', err);
    } finally {
      setLoadingWhatChanged(false);
    }
  };

  const handleSaveTranscript = async (approved: boolean = true) => {
    if (!id || !editableTranscript.trim()) return;
    setSavingTranscript(true);
    try {
      await api.saveTranscript(id, editableTranscript.trim(), approved);
      setMeeting(prev => prev ? { ...prev, transcript: editableTranscript.trim(), transcriptApproved: approved } : null);
    } catch (err: any) {
      alert('Failed to save transcript: ' + err.message);
    } finally {
      setSavingTranscript(false);
    }
  };

  const handleCreateMemory = async () => {
    if (!id || !newMemoryContent.trim()) return;
    setSavingMemory(true);
    try {
      const res = await fetch(`/api/meetings/${id}/memories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${api.getToken() || ''}`,
        },
        body: JSON.stringify({
          memoryType: newMemoryType,
          content: newMemoryContent.trim(),
          importance: newMemoryImportance,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setMeeting(prev => prev ? { ...prev, memories: [...(prev.memories || []), created] } : null);
        setNewMemoryContent('');
        setShowAddMemory(false);
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
    } finally {
      setSavingMemory(false);
    }
  };

  const handleSendMeetingChat = async () => {
    if (!meetingChatInput.trim() || chatLoading) return;
    const q = meetingChatInput.trim();
    setMeetingChatInput('');
    setMeetingChatReplies(prev => [...prev, { role: 'user', content: q }]);
    setChatLoading(true);

    try {
      const res = await api.sendMessage(`Regarding meeting "${meeting?.title}": ${q}`);
      setMeetingChatReplies(prev => [...prev, { role: 'assistant', content: res.message.content }]);
    } catch (err: any) {
      setMeetingChatReplies(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading meeting details & memory...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-600">Meeting not found</p>
        <Link to="/meetings" className="text-xs text-indigo-600 font-semibold hover:underline">
          Back to Meetings
        </Link>
      </div>
    );
  }

  // 10 Tabs (Section 38)
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'prep', label: 'Preparation' },
    { id: 'recording', label: 'Recording' },
    { id: 'transcript', label: 'Transcript' },
    { id: 'mom', label: 'MOM' },
    { id: 'decisions', label: `Decisions (${meeting.decisions?.length || 0})` },
    { id: 'actions', label: `Action Items (${meeting.actionItems?.length || 0})` },
    { id: 'tasks', label: `Tasks (${meeting.tasks?.length || 0})` },
    { id: 'memories', label: `Memories (${meeting.memories?.length || 0})` },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Navigation */}
      <div className="space-y-4">
        <Link
          to="/meetings"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Meetings
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{meeting.title}</h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                meeting.status === 'UPCOMING'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {meeting.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono tabular-nums">
                {new Date(meeting.scheduledAt).toLocaleString([], {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span>·</span>
              <span>{meeting.location || 'Google Meet'}</span>
              <span>·</span>
              <span>{meeting.duration || 30} mins</span>
              <span>·</span>
              <span>{meeting.participants?.length || 4} Participants</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/meetings/${meeting.id}/prep`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Prepare Me
            </Link>

            <Link
              to={`/meetings/${meeting.id}/mom`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              Generate / Review MOM
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Section 38) */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200 pb-px">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-indigo-600 text-indigo-600 font-bold bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Decisions</span>
              <div className="text-xl font-bold font-mono text-slate-900">{meeting.decisions?.length || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Action Items</span>
              <div className="text-xl font-bold font-mono text-slate-900">{meeting.actionItems?.length || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Commitments</span>
              <div className="text-xl font-bold font-mono text-slate-900">{meeting.commitments?.length || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500">Memories</span>
              <div className="text-xl font-bold font-mono text-slate-900">{meeting.memories?.length || 0}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Meeting Objective & Agenda</h3>
            <p className="text-sm text-slate-800 leading-relaxed">
              {meeting.description || 'Sprint alignment and deliverable review.'}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Participants ({meeting.participants?.length || 0})</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {meeting.participants?.map(p => (
                <div key={p.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <img src={p.user.avatar} alt={p.user.name} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-800 truncate">{p.user.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{p.user.jobTitle || p.user.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PREPARATION & WHAT CHANGED (Section 24, 25, 26) */}
      {activeTab === 'prep' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Meeting Continuity Engine</h3>
              <p className="text-xs text-slate-500">Compare state between past and upcoming meetings.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleLoadWhatChanged}
                disabled={loadingWhatChanged}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {loadingWhatChanged ? 'Calculating...' : 'What Changed Since Last Meeting?'}
              </button>
              <Link
                to={`/meetings/${meeting.id}/prep`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Open Full Prep Brief
              </Link>
            </div>
          </div>

          {whatChangedReport && (
            <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Since Last Meeting ({whatChangedReport.lastMeetingTitle})
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Actual Database Diffs</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <div className="text-xl font-bold font-mono text-emerald-400">{whatChangedReport.completedTasksCount}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Tasks Completed</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <div className="text-xl font-bold font-mono text-amber-400">{whatChangedReport.inProgressTasksCount}</div>
                  <div className="text-[11px] text-slate-400 mt-1">In Progress</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <div className="text-xl font-bold font-mono text-rose-400">{whatChangedReport.overdueCommitmentsCount}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Overdue Commitments</div>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                  <div className="text-xl font-bold font-mono text-indigo-400">{whatChangedReport.newDecisionsCount}</div>
                  <div className="text-[11px] text-slate-400 mt-1">New Decisions</div>
                </div>
              </div>
            </div>
          )}

          {meeting.brief && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Executive Summary</h4>
              <p className="text-sm text-slate-800 leading-relaxed">{meeting.brief.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RECORDING (Section 10 & 11) */}
      {activeTab === 'recording' && (
        <MeetingRecorder
          meetingId={meeting.id}
          initialTranscript={meeting.transcript}
          isTranscriptApproved={meeting.transcriptApproved}
          onTranscriptApproved={newTranscript => {
            setMeeting(prev => prev ? { ...prev, transcript: newTranscript, transcriptApproved: true } : null);
            setEditableTranscript(newTranscript);
          }}
          onTranscriptChange={newTranscript => {
            setMeeting(prev => prev ? { ...prev, transcript: newTranscript, transcriptApproved: false } : null);
            setEditableTranscript(newTranscript);
          }}
        />
      )}

      {/* TAB 4: TRANSCRIPT (Section 14) */}
      {activeTab === 'transcript' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Editable Meeting Transcript</h3>
                {meeting.transcriptApproved ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                    Approved for Official MOM ✓
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                    Unapproved Draft
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Version {meeting.transcriptVersion || 1} · {editableTranscript.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(editableTranscript);
                  setTranscriptCopied(true);
                  setTimeout(() => setTranscriptCopied(false), 2000);
                }}
                disabled={!editableTranscript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
              >
                {transcriptCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{transcriptCopied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={() => handleSaveTranscript(true)}
                disabled={savingTranscript || !editableTranscript.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{savingTranscript ? 'Saving...' : 'Approve Transcript'}</span>
              </button>
            </div>
          </div>

          <textarea
            value={editableTranscript}
            onChange={e => setEditableTranscript(e.target.value)}
            rows={14}
            className="w-full p-4 text-xs font-mono leading-relaxed border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            placeholder="No transcript available yet. Record audio or paste transcript here..."
          />

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Actions: Edit, Save, Copy, Search, Regenerate, Approve Transcript, Generate MOM</span>
            <button
              onClick={() => handleSaveTranscript(false)}
              disabled={savingTranscript || !editableTranscript.trim()}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
            >
              Save as Draft (Unapproved)
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: MOM & COMPLETENESS (Section 18 & 19) */}
      {activeTab === 'mom' && (
        <div className="space-y-6">
          {meeting.completeness && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Meeting Information Completeness
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Informational completeness metric of decisions, action items, owners, and deadlines.
                  </p>
                </div>
                <span className="text-lg font-bold font-mono text-indigo-600 tabular-nums">
                  {meeting.completeness.score}%
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${meeting.completeness.score}%` }}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 pt-1 font-mono">
                <div>✓ {meeting.completeness.decisionsIdentified} Decisions</div>
                <div>✓ {meeting.completeness.actionItemsIdentified} Action Items</div>
                <div>✓ {meeting.completeness.assignedActionItems} Assigned</div>
                <div>✓ {meeting.completeness.itemsWithDeadlines} With Deadlines</div>
              </div>
            </div>
          )}

          {meeting.mom ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">Minutes of Meeting</h3>
                    {meeting.mom.reviewed ? (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                        Approved Record ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                        AI Draft — Human Review Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generated with {meeting.mom.generatedByModel} on {new Date(meeting.mom.generatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateFollowUp}
                    disabled={generatingFollowUp}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-indigo-600" />
                    {generatingFollowUp ? 'Generating...' : 'Generate Follow-Up'}
                  </button>
                  <Link
                    to={`/meetings/${meeting.id}/mom`}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                  >
                    Review & Edit
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary</h4>
                  <p className="text-sm text-slate-800 leading-relaxed">{meeting.mom.summary}</p>
                </div>

                {meeting.mom.discussionPoints && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Discussion Points</h4>
                    <ul className="space-y-1.5 text-xs text-slate-700">
                      {meeting.mom.discussionPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">No Minutes of Meeting generated yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Record audio or approve transcript, then generate structured MOM.
              </p>
              <Link
                to={`/meetings/${meeting.id}/mom`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                Go to MOM Generator
              </Link>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: DECISIONS (Section 27) */}
      {activeTab === 'decisions' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Decisions Agreed in this Meeting ({meeting.decisions?.length || 0})
          </h3>
          <div className="divide-y divide-slate-100">
            {meeting.decisions?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No decisions recorded yet.</p>
            ) : (
              meeting.decisions?.map(d => (
                <div key={d.id} className="py-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{d.decision}</span>
                  </p>
                  {d.context && <p className="text-[11px] text-slate-500 pl-5">{d.context}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 7: ACTION ITEMS (Section 18 & 20) */}
      {activeTab === 'actions' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Action Items ({meeting.actionItems?.length || 0})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {meeting.actionItems?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 col-span-2">No action items extracted yet.</p>
            ) : (
              meeting.actionItems?.map(a => (
                <div key={a.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{a.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border bg-slate-100 text-slate-700">
                      {a.priority}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Owner: <span className="font-semibold text-slate-700">{a.suggestedName || 'Unassigned'}</span> · Due: {a.deadline}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: TASKS (Section 20 & 34) */}
      {activeTab === 'tasks' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Created Tasks ({meeting.tasks?.length || 0})
          </h3>
          <div className="divide-y divide-slate-100">
            {meeting.tasks?.length === 0 ? (
              <p className="text-xs text-slate-400 py-4">No tasks converted yet. Approve MOM to create tasks.</p>
            ) : (
              meeting.tasks?.map(t => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{t.title}</p>
                    <p className="text-[10px] text-slate-500">
                      Assignee: {t.assigneeName || 'Unassigned'} · Due: {new Date(t.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 9: MEMORIES (Section 22: Meeting Memory) */}
      {activeTab === 'memories' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Continuous Meeting Memories ({meeting.memories?.length || 0})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Long-term knowledge retained across meetings: decisions, commitments, preferences, and issues.
              </p>
            </div>

            <button
              onClick={() => setShowAddMemory(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Memory
            </button>
          </div>

          {/* Add Memory Modal / Inline Form */}
          {showAddMemory && (
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-3">
              <h4 className="text-xs font-bold text-indigo-900">Add New Meeting Memory</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Memory Type</label>
                  <select
                    value={newMemoryType}
                    onChange={e => setNewMemoryType(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  >
                    <option value="DECISION">DECISION</option>
                    <option value="COMMITMENT">COMMITMENT</option>
                    <option value="DISCUSSION">DISCUSSION</option>
                    <option value="ISSUE">ISSUE</option>
                    <option value="FOLLOW_UP">FOLLOW_UP</option>
                    <option value="PREFERENCE">PREFERENCE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Importance</label>
                  <select
                    value={newMemoryImportance}
                    onChange={e => setNewMemoryImportance(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                  >
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Memory Content</label>
                <textarea
                  value={newMemoryContent}
                  onChange={e => setNewMemoryContent(e.target.value)}
                  placeholder="Record long-term knowledge from this session..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowAddMemory(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateMemory}
                  disabled={savingMemory || !newMemoryContent.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  {savingMemory ? 'Saving...' : 'Save Memory'}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {(!meeting.memories || meeting.memories.length === 0) ? (
              <p className="text-xs text-slate-400 py-4 text-center">No persistent memories recorded yet.</p>
            ) : (
              meeting.memories.map(m => (
                <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      {m.memoryType}
                    </span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                      m.importance === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {m.importance}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed font-sans">{m.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 10: CHAT (Section 30 & 31) */}
      {activeTab === 'chat' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4 max-w-3xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Query This Meeting's Memory
          </h3>
          <div className="space-y-3 max-h-72 overflow-y-auto p-2">
            {meetingChatReplies.map((r, i) => (
              <div key={i} className={`p-3 rounded-xl text-xs ${
                r.role === 'user' ? 'bg-indigo-600 text-white ml-12' : 'bg-slate-50 border border-slate-200 text-slate-800 mr-12'
              }`}>
                {r.content}
              </div>
            ))}
            {chatLoading && (
              <div className="text-xs text-slate-400 italic">Thinking...</div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="text"
              value={meetingChatInput}
              onChange={e => setMeetingChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMeetingChat()}
              placeholder="Ask about decisions or commitments made in this session..."
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleSendMeetingChat}
              disabled={chatLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              Ask
            </button>
          </div>
        </div>
      )}

      {/* Follow-Up Modal (Section 29) */}
      {followUp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-indigo-600" />
                AI Generated Follow-Up Message
              </h3>
              <button onClick={() => setFollowUp(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Subject</label>
                <input
                  type="text"
                  value={followUp.subject}
                  onChange={e => setFollowUp({ ...followUp, subject: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">Message Body</label>
                <textarea
                  value={followUp.body}
                  onChange={e => setFollowUp({ ...followUp, body: e.target.value })}
                  rows={8}
                  className="w-full p-3 text-xs font-sans leading-relaxed border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">Ready to copy and share with participants</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${followUp.subject}\n\n${followUp.body}`);
                  setCopiedFollowUp(true);
                  setTimeout(() => setCopiedFollowUp(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
              >
                {copiedFollowUp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFollowUp ? 'Copied to Clipboard' : 'Copy Message'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
