import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  FileText,
  User,
  Plus,
  Compass,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import type { Commitment, DashboardMetrics, Decision, Issue, Meeting, Task } from '../types/index.js';
import { CreateMeetingModal } from '../components/CreateMeetingModal.js';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [myCommitments, setMyCommitments] = useState<Commitment[]>([]);
  const [unresolvedIssues, setUnresolvedIssues] = useState<Issue[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
  const [followUpRadar, setFollowUpRadar] = useState<any>(null);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardData();
      setMetrics(data.metrics);
      setUpcomingMeetings(data.upcomingMeetings);
      setPendingTasks(data.pendingTasks);
      setMyCommitments(data.myCommitments);
      setUnresolvedIssues(data.unresolvedIssues);
      setRecentDecisions(data.recentDecisions);
      setFollowUpRadar(data.followUpRadar);
      setAiInsight(data.aiInsight);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const toggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    try {
      await api.updateTask(task.id, { status: nextStatus });
      setPendingTasks(prev =>
        prev.map(t => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">Reviewing your meeting history & commitments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.jobTitle || 'Team Member'} · Project Alpha Workspace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/assistant"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
          >
            <Sparkles className="w-4 h-4 text-indigo-600" />
            Ask Assistant
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </button>
        </div>
      </div>

      {/* AI Meeting Assistant Insight Section */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Your Meeting Assistant
            </div>
            <p className="text-base text-slate-100 leading-relaxed font-normal">
              {aiInsight || 'You have upcoming meetings with past decisions waiting for verification.'}
            </p>
          </div>
          {upcomingMeetings.length > 0 && (
            <Link
              to={`/meetings/${upcomingMeetings[0].id}/prep`}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs whitespace-nowrap shrink-0"
            >
              <span>Prepare Me for Next Meeting</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Upcoming Meetings</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics?.upcomingMeetingsCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics?.meetingsThisWeekCount || 0} this week
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">My Commitments</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics?.pendingCommitmentsCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {metrics?.overdueCommitmentsCount || 0} overdue
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Unresolved Issues</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics?.unresolvedIssuesCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Open technical blockers
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Decisions Memory</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold font-mono tabular-nums text-slate-900">
            {metrics?.decisionsCount || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Committed to memory
          </div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Upcoming Meetings + Follow-Up Radar */}
        <div className="lg:col-span-2 space-y-8">
          {/* Follow-Up Radar Card (Section 27) */}
          {followUpRadar && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-600" />
                  <h2 className="text-base font-bold text-slate-900">Follow-Up Radar</h2>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Actionable items requiring touchpoints</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Overdue commitments */}
                <div className="space-y-2 p-3.5 rounded-lg bg-rose-50/50 border border-rose-200">
                  <div className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Overdue Commitments</span>
                  </div>
                  {followUpRadar.overdueCommitments.length === 0 ? (
                    <p className="text-xs text-rose-700/80">No commitments overdue!</p>
                  ) : (
                    followUpRadar.overdueCommitments.map((c: any) => (
                      <Link
                        key={c.id}
                        to={`/meetings/${c.meetingId}`}
                        className="block text-xs text-rose-900 hover:underline font-medium truncate"
                      >
                        • {c.title}
                      </Link>
                    ))
                  )}
                </div>

                {/* Upcoming deadlines */}
                <div className="space-y-2 p-3.5 rounded-lg bg-amber-50/50 border border-amber-200">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Upcoming Deadlines</span>
                  </div>
                  {followUpRadar.upcomingDeadlines.length === 0 ? (
                    <p className="text-xs text-amber-700/80">No approaching deadlines.</p>
                  ) : (
                    followUpRadar.upcomingDeadlines.map((t: any) => (
                      <Link
                        key={t.id}
                        to={`/tasks`}
                        className="block text-xs text-amber-900 hover:underline font-medium truncate"
                      >
                        • {t.title} ({new Date(t.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })})
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Meetings Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Upcoming Meetings</h2>
                <p className="text-xs text-slate-500">Sessions ready for AI memory retrieval and briefing</p>
              </div>
              <Link to="/meetings" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                View All
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {upcomingMeetings.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No upcoming meetings scheduled
                </div>
              ) : (
                upcomingMeetings.map(mtg => (
                  <div key={mtg.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/meetings/${mtg.id}`}
                          className="font-semibold text-sm text-slate-900 hover:text-indigo-600 transition-colors"
                        >
                          {mtg.title}
                        </Link>
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {mtg.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="font-mono tabular-nums">
                          {new Date(mtg.scheduledAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>·</span>
                        <span>{mtg.location}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/meetings/${mtg.id}/prep`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 whitespace-nowrap"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Prepare Me
                      </Link>
                      <Link
                        to={`/meetings/${mtg.id}/mom`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        MOM & Notes
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Historical Decisions Memory */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Historical Decisions Memory</h2>
                <p className="text-xs text-slate-500">Decisions remembered across all past team meetings</p>
              </div>
              <Link to="/decisions" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Full Log
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {recentDecisions.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No decisions recorded yet.
                </div>
              ) : (
                recentDecisions.map(dec => (
                  <div key={dec.id} className="py-3.5 space-y-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                        {dec.decision}
                      </p>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                        {new Date(dec.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {dec.context && (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Context: {dec.context}
                      </p>
                    )}
                    <div className="text-[10px] text-indigo-600 font-medium pt-0.5">
                      Source: {dec.meetingTitle || 'Team Meeting'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: User Tasks & Commitments */}
        <div className="space-y-8">
          {/* My Commitments */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">My Commitments</h3>
              <Link to="/commitments" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                All
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {myCommitments.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">No active commitments for {user?.name}.</p>
              ) : (
                myCommitments.map(c => (
                  <div key={c.id} className="py-3 space-y-1">
                    <p className="text-xs font-semibold text-slate-900">{c.commitment}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Due: {c.deadline ? new Date(c.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Next Sprint'}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Assigned Tasks */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">My Tasks</h2>
                <p className="text-xs text-slate-500">Tasks assigned directly to you</p>
              </div>
              <Link to="/tasks" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                Task Board
              </Link>
            </div>

            <div className="divide-y divide-slate-100 mt-2">
              {pendingTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No pending tasks for {user?.name}! All clear.
                </div>
              ) : (
                pendingTasks.map(task => {
                  const isDone = task.status === 'COMPLETED';
                  return (
                    <div key={task.id} className="py-3 flex items-start gap-3">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-indigo-600'
                        }`}
                      >
                        {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="font-mono tabular-nums">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                          <span>·</span>
                          <span className={`font-semibold ${
                            task.priority === 'HIGH' || task.priority === 'CRITICAL' ? 'text-rose-600' : 'text-slate-600'
                          }`}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      <CreateMeetingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => loadData()}
      />
    </div>
  );
}
