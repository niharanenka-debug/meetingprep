import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import type { ActionItem, Decision, Meeting, MeetingMom, TaskPriority } from '../types/index.js';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Edit2,
  FileText,
  HelpCircle,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
  Users,
  X
} from 'lucide-react';

const SAMPLE_DEMO_TRANSCRIPT = `We discussed the API integration.
Rahul confirmed that API testing will be completed by Monday.
Ayesha will finish the dashboard prototype by Friday.
The team decided to use REST APIs.
Maroof will prepare deployment documentation by Wednesday.`;

export function MOMReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, users } = useAuth();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [mom, setMom] = useState<MeetingMom | null>(null);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [creatingTasks, setCreatingTasks] = useState<boolean>(false);
  const [tasksCreatedCount, setTasksCreatedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editing state for an action item
  const [editingItem, setEditingItem] = useState<ActionItem | null>(null);

  const fetchMeetingData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api.getMeeting(id);
      setMeeting(data);
      setTranscript(data.transcript || '');
      if (data.mom) {
        setMom(data.mom);
      }
      if (data.actionItems) {
        setActionItems(data.actionItems);
      }
      if (data.decisions) {
        setDecisions(data.decisions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingData();
  }, [id]);

  const handleGenerateMOM = async () => {
    if (!id) return;
    if (!transcript.trim()) {
      setError('Please provide meeting transcript or discussion notes first.');
      return;
    }

    setGenerating(true);
    setError(null);
    setTasksCreatedCount(null);

    try {
      const result = await api.generateMOM(id, transcript);
      setMom(result.mom);
      setActionItems(result.actionItems);
      setDecisions(result.decisions);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Minutes of Meeting');
    } finally {
      setGenerating(false);
    }
  };

  const handleLoadSampleTranscript = () => {
    setTranscript(SAMPLE_DEMO_TRANSCRIPT);
  };

  const handleUpdateItemStatus = async (itemId: string, newStatus: ActionItem['status']) => {
    if (!id) return;
    try {
      const updated = await api.updateActionItem(id, itemId, { status: newStatus, needsConfirmation: false });
      setActionItems(prev => prev.map(item => (item.id === itemId ? updated : item)));
    } catch (err) {
      console.error('Failed to update action item:', err);
    }
  };

  const handleSaveItemEdit = async () => {
    if (!id || !editingItem) return;
    try {
      const updated = await api.updateActionItem(id, editingItem.id, {
        title: editingItem.title,
        description: editingItem.description,
        assignedTo: editingItem.assignedTo,
        deadline: editingItem.deadline,
        priority: editingItem.priority,
        needsConfirmation: false,
      });
      setActionItems(prev => prev.map(item => (item.id === editingItem.id ? updated : item)));
      setEditingItem(null);
    } catch (err) {
      console.error('Failed to save edited item:', err);
    }
  };

  const handleCreateAllTasks = async () => {
    if (!id) return;
    setCreatingTasks(true);
    setError(null);
    try {
      const res = await api.approveMOM(id, actionItems.filter(i => i.status !== 'REJECTED'));
      setTasksCreatedCount(res.createdTasksCount);
      // Refresh items
      const updatedMtg = await api.getMeeting(id);
      setActionItems(updatedMtg.actionItems || []);
    } catch (err: any) {
      setError(err.message || 'Failed to create tasks');
    } finally {
      setCreatingTasks(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading meeting & transcript...</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-sm text-slate-600">Meeting not found</p>
        <Link to="/meetings" className="text-xs text-indigo-600 font-semibold hover:underline">
          Back to Meetings
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="space-y-3">
        <Link
          to={`/meetings/${meeting.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Meeting Details
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">
                MOM & Task Extraction Agent
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">Steps 4, 5 & 6</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Minutes of Meeting: {meeting.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to={`/meetings/${meeting.id}/prep`}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            >
              View Prep Brief
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-xl">
          {error}
        </div>
      )}

      {/* Step 4: Meeting Transcript Input Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Meeting Transcript / Notes
            </h2>
            <p className="text-xs text-slate-500">
              Paste raw audio transcripts or team conversation notes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLoadSampleTranscript}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Load Hackathon Sample Transcript
          </button>
        </div>

        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Paste meeting conversation or notes here...
Example:
We discussed the API integration.
Rahul confirmed that API testing will be completed by Monday.
Ayesha will finish the dashboard prototype by Friday.
The team decided to use REST APIs.
Maroof will prepare deployment documentation by Wednesday."
          rows={5}
          className="w-full p-4 text-xs font-mono leading-relaxed border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
        />

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-slate-400 font-mono">
            {transcript.split(/\s+/).filter(Boolean).length} words
          </span>

          <button
            onClick={handleGenerateMOM}
            disabled={generating || !transcript.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Analyzing Transcript & Extracting Action Items...' : 'Generate MOM & Extract Actions'}
          </button>
        </div>
      </div>

      {/* Generating State */}
      {generating && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-8 text-center space-y-3 animate-pulse">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <h3 className="text-sm font-bold text-indigo-900">Mistral AI Analysis in Progress...</h3>
          <p className="text-xs text-indigo-700 max-w-md mx-auto">
            Extracting decisions, discussion consensus, milestone deadlines, and individual task ownership for Rahul, Ayesha, and Maroof with confidence scoring.
          </p>
        </div>
      )}

      {/* Tasks Created Success Banner */}
      {tasksCreatedCount !== null && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-900">
                {tasksCreatedCount} Individual Tasks Created & Dispatched!
              </h3>
              <p className="text-xs text-emerald-700">
                Tasks assigned to responsible owners with deadline notifications sent. Switch personas to verify individual views.
              </p>
            </div>
          </div>
          <Link
            to="/tasks"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap shadow-xs"
          >
            Go to Task Board
          </Link>
        </div>
      )}

      {/* Step 5: Document-Style Minutes of Meeting (MOM) */}
      {mom && !generating && (
        <div className="space-y-8">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Document Header */}
            <div className="p-8 border-b border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500 font-semibold">
                  Official Record · Minutes of Meeting
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Generated via {mom.generatedByModel || 'Mistral AI'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">{meeting.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1 font-medium">
                <span>Date: {new Date(meeting.scheduledAt).toLocaleDateString()}</span>
                <span>·</span>
                <span>Location: {meeting.location || 'Virtual'}</span>
                <span>·</span>
                <span>
                  Participants: {meeting.participants?.map(p => p.user.name).join(', ') || 'Maroof, Ayesha, Rahul, Sarah'}
                </span>
              </div>
            </div>

            {/* Document Body */}
            <div className="p-8 space-y-8">
              {/* Executive Summary */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Executive Summary
                </h3>
                <p className="text-sm text-slate-800 leading-relaxed">
                  {mom.summary}
                </p>
              </div>

              {/* Discussion Points */}
              {mom.discussionPoints && mom.discussionPoints.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Discussion Points
                  </h3>
                  <ul className="space-y-2">
                    {mom.discussionPoints.map((point, i) => (
                      <li key={i} className="text-xs text-slate-700 flex items-start gap-2.5 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Decisions */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Decisions Agreed Upon ({decisions.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {decisions.map(d => (
                    <div key={d.id} className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-1">
                      <div className="text-xs font-semibold text-emerald-900 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{d.decision}</span>
                      </div>
                      {d.context && (
                        <p className="text-[11px] text-emerald-700 pl-5">
                          {d.context}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step 6: Action Items & Individual Task Creation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600" />
                  Review & Create Individual Tasks ({actionItems.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm AI confidence and assignment before converting into persistent tasks.
                </p>
              </div>

              <button
                onClick={handleCreateAllTasks}
                disabled={creatingTasks || actionItems.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap self-start sm:self-auto"
              >
                <CheckCircle2 className={`w-4 h-4 ${creatingTasks ? 'animate-spin' : ''}`} />
                {creatingTasks ? 'Creating Tasks & Notifying...' : 'Create All Tasks'}
              </button>
            </div>

            {/* Action Items Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actionItems.map(item => {
                const isConfirmed = item.status === 'CONFIRMED' || item.status === 'CONVERTED';
                const isRejected = item.status === 'REJECTED';
                const assignedUser = item.assignedTo ? users.find(u => u.id === item.assignedTo) : undefined;
                const confidencePct = Math.round(item.confidence * 100);

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-5 space-y-4 transition-all flex flex-col justify-between ${
                      isRejected
                        ? 'opacity-50 bg-slate-50 border-slate-200'
                        : isConfirmed
                        ? 'bg-white border-emerald-300 ring-1 ring-emerald-200'
                        : item.needsConfirmation
                        ? 'bg-amber-50/40 border-amber-300'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {item.title}
                        </h4>
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border shrink-0 ${
                            item.priority === 'HIGH' || item.priority === 'CRITICAL'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Assignee & Deadline */}
                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500">Assignee:</span>
                          <span className="font-semibold text-slate-800">
                            {assignedUser?.name || item.suggestedName || (
                              <span className="text-amber-600 font-bold">Unassigned (Confirm)</span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-500">Due:</span>
                          <span className="font-mono text-slate-800 font-semibold">{item.deadline}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-slate-500">AI Confidence:</span>
                          <span className={`font-mono font-semibold ${
                            confidencePct >= 90 ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {confidencePct}%
                          </span>
                        </div>
                      </div>

                      {item.needsConfirmation && (
                        <div className="text-[10px] text-amber-700 bg-amber-100/60 p-2 rounded-lg flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>AI is uncertain about assignment. Please confirm.</span>
                        </div>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setEditingItem(item)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs flex items-center gap-1"
                        title="Edit task details"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleUpdateItemStatus(item.id, 'REJECTED')}
                          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                            isRejected ? 'text-slate-400' : 'text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Reject deliverable"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleUpdateItemStatus(item.id, 'CONFIRMED')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                            isConfirmed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>{isConfirmed ? 'Confirmed' : 'Confirm'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Action Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Deliverable</h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={e => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
                <select
                  value={editingItem.assignedTo || ''}
                  onChange={e => setEditingItem({ ...editingItem, assignedTo: e.target.value || null })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Unassigned --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.jobTitle || u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline</label>
                  <input
                    type="text"
                    value={editingItem.deadline}
                    onChange={e => setEditingItem({ ...editingItem, deadline: e.target.value })}
                    placeholder="Monday / Date"
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editingItem.priority}
                    onChange={e => setEditingItem({ ...editingItem, priority: e.target.value as TaskPriority })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveItemEdit}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
