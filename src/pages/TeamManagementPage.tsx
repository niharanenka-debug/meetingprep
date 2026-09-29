import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import type { Team, TeamMember, User } from '../types/index.js';
import { Mail, Plus, Shield, UserCheck, Users } from 'lucide-react';

export function TeamManagementPage() {
  const { user, selectedTeam, users } = useAuth();
  const [teamDetails, setTeamDetails] = useState<(Team & { members: TeamMember[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedTeam) {
      setLoading(true);
      api.getTeam(selectedTeam.id).then(t => {
        setTeamDetails(t);
      }).catch(err => {
        console.error('Failed to load team:', err);
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [selectedTeam?.id]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Team & Workspace Management
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Active Workspace: <strong>{selectedTeam?.name || 'Project Alpha'}</strong>
        </p>
      </div>

      {/* Team Description Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-2">
        <h2 className="text-sm font-bold text-slate-900">About {selectedTeam?.name}</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          {selectedTeam?.description || 'Core engineering team building enterprise services.'}
        </p>
      </div>

      {/* Team Members List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Active Team Members ({users.length})
            </h3>
            <p className="text-xs text-slate-500">
              Users with access to Project Alpha meetings, MOMs, and commitments.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {users.map(u => {
            const isCurrentUser = u.id === user?.id;
            return (
              <div key={u.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatar}
                    alt={u.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-200"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{u.name}</span>
                      {isCurrentUser && (
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-semibold">
                          Current Persona
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{u.jobTitle || 'Team Member'}</span>
                      <span>·</span>
                      <span className="font-mono text-[11px]">{u.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                    u.role === 'ADMIN'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {u.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
