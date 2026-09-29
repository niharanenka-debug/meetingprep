import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { api } from '../api/client.js';
import type { Team, User } from '../types/index.js';
import {
  auth,
  isFirebaseConfigured,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  type FirebaseUser,
} from '../lib/firebase.js';

interface AuthContextType {
  user: User | null;
  users: User[];
  teams: Team[];
  selectedTeam: Team | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (name: string, email: string, password?: string, jobTitle?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  setSelectedTeam: (team: Team | null) => void;
  refreshUsers: () => Promise<void>;
  isFirebaseActive: boolean;
  isDemoAuthEnabled: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isDemoAuthEnabled = import.meta.env.VITE_DEMO_AUTH_ENABLED === 'true';
  const firebaseSyncs = useRef(new Map<string, Promise<void>>());

  const refreshUsers = async () => {
    try {
      const list = await api.getUsers();
      setUsers(list);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  const loadTeams = async () => {
    try {
      const teamList = await api.getTeams();
      setTeams(teamList);
      setSelectedTeam(teamList[0] || null);
    } catch (teamErr) {
      setTeams([]);
      setSelectedTeam(null);
      console.warn('Failed to load teams:', teamErr);
    }
  };

  const syncFirebaseUser = (firebaseUser: FirebaseUser): Promise<void> => {
    const existingSync = firebaseSyncs.current.get(firebaseUser.uid);
    if (existingSync) return existingSync;

    const sync = (async () => {
      setLoading(true);
      try {
        api.setToken(await firebaseUser.getIdToken(), 'firebase');
        const backendUser = await api.getMe();
        setUser(backendUser);
        await Promise.all([loadTeams(), refreshUsers()]);
      } catch (error) {
        api.clearToken();
        setUser(null);
        throw error;
      } finally {
        setLoading(false);
      }
    })();

    firebaseSyncs.current.set(firebaseUser.uid, sync);
    void sync.then(
      () => firebaseSyncs.current.delete(firebaseUser.uid),
      () => firebaseSyncs.current.delete(firebaseUser.uid)
    );
    return sync;
  };

  const loadInitialData = async () => {
    setLoading(true);
    try {
      if (isDemoAuthEnabled) await refreshUsers();
      if (api.getToken()) {
        try {
          const backendUser = await api.getMe();
          setUser(backendUser);
          await loadTeams();
        } catch {
          api.clearToken();
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      void loadInitialData();
      return;
    }

    let active = true;
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      if (!active) return;
      if (!firebaseUser) {
        if (api.getTokenSource() === 'app' && isDemoAuthEnabled) {
          try {
            setUser(await api.getMe());
            await loadTeams();
          } catch {
            api.clearToken();
            setUser(null);
            setTeams([]);
            setSelectedTeam(null);
          }
        } else {
          api.clearToken();
          setUser(null);
          setTeams([]);
          setSelectedTeam(null);
        }
        if (isDemoAuthEnabled) await refreshUsers();
        if (active) setLoading(false);
        return;
      }

      try {
        await syncFirebaseUser(firebaseUser);
      } catch (error) {
        console.error('Failed to sync Firebase user with the backend:', error);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password?: string) => {
    if (isFirebaseConfigured && auth) {
      if (!password) throw new Error('Enter your password to sign in.');
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password);
      await syncFirebaseUser(credentials.user);
      return;
    }

    if (!isDemoAuthEnabled) {
      throw new Error('Firebase Authentication is not configured and demo authentication is disabled.');
    }
    const res = await api.login(email.trim(), password);
    setUser(res.user);
    await loadTeams();
  };

  const register = async (name: string, email: string, password?: string, jobTitle?: string) => {
    if (isFirebaseConfigured && auth) {
      if (!password) throw new Error('Enter a password to create your account.');
      const credentials = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await syncFirebaseUser(credentials.user);
      return;
    }

    if (!isDemoAuthEnabled) {
      throw new Error('Firebase Authentication is not configured and demo authentication is disabled.');
    }
    const res = await api.register(name, email, password, jobTitle);
    setUser(res.user);
    await refreshUsers();
    await loadTeams();
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseConfigured && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      throw new Error('Password reset is available when Firebase Authentication is configured.');
    }
  };

  const logout = async () => {
    try {
      if (isFirebaseConfigured && auth) await firebaseSignOut(auth);
    } catch (error) {
      console.warn('Firebase sign-out failed:', error);
    } finally {
      api.clearToken();
      setUser(null);
      setTeams([]);
      setSelectedTeam(null);
    }
  };

  const switchUser = async (userId: string) => {
    if (!isDemoAuthEnabled) throw new Error('Demo persona switching is disabled.');
    setLoading(true);
    try {
      const res = await api.switchUser(userId);
      setUser(res.user);
      const teamList = await api.getTeams();
      setTeams(teamList);
      if (teamList.length > 0) {
        setSelectedTeam(teamList[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        teams,
        selectedTeam,
        loading,
        login,
        register,
        resetPassword,
        logout,
        switchUser,
        setSelectedTeam,
        refreshUsers,
        isFirebaseActive: isFirebaseConfigured,
        isDemoAuthEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
