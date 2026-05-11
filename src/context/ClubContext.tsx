'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Player, Court, Match, Fee, PaymentMethod, MatchStatus, PlayerSnapshot, Session, SessionRegisteredPlayer } from '@/lib/types';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { sendNotification } from '@/lib/notifications';
import { uploadQRCodeToSupabase, deleteQRCodeFromSupabase } from '@/supabase/storage';

interface ClubContextType {
  players: Player[];
  courts: Court[];
  matches: Match[];
  fees: Fee[];
  paymentMethods: PaymentMethod[];
  sessions: Session[];
  currentSession: Session | null;
  defaultWinningScore: number;
  autoAdvanceEnabled: boolean;
  addPlayer: (player: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes' | 'lastAvailableAt'>) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  addCourt: (name?: string) => string;
  deleteCourt: (id: string) => void;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => void;
  startTimer: (courtId: string) => void;
  updateMatchScore: (matchId: string, teamAScore: number, teamBScore: number) => void;
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  createCourtAndAssignMatch: (matchId: string) => void;
  updateFee: (fee: Omit<Fee, 'payments'>) => void;
  togglePayment: (date: string, playerId: string) => void;
  addPaymentMethod: (name: string, imageData: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  setDefaultWinningScore: (score: number) => void;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
  resetDailyBoard: () => void;
  wipeAllData: () => void;
  deleteMatch: (matchId: string) => void;
  createSession: (name: string) => Session;
  endSession: (sessionId: string) => void;
  getSession: (sessionId: string) => Session | null;
  getCurrentSession: () => Session | null;
  registerPlayerForSession: (sessionId: string, deviceId: string, name: string) => void;
  ingestPlayersFromList: (names: string[], sessionDate: string) => Promise<{ newPlayersCount: number; existingPlayersCount: number }>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PLAYERS: 'tbc_players',
  COURTS: 'tbc_courts',
  MATCHES: 'tbc_matches',
  FEES: 'tbc_fees',
  PAYMENT_METHODS: 'tbc_payment_methods',
  WINNING_SCORE: 'tbc_winning_score',
  AUTO_ADVANCE: 'tbc_auto_advance',
  SESSIONS: 'tbc_sessions',
  CURRENT_SESSION: 'tbc_current_session'
};

export function ClubProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [fees, setFees] = useState<Fee[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [defaultWinningScore, setDefaultWinningScoreState] = useState<number>(21);
  const [autoAdvanceEnabled, setAutoAdvanceEnabledState] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const load = (key: string, fallback: any) => {
      if (typeof window === 'undefined') return fallback;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    };

    const loadFromLocalStorage = () => {
      setPlayers(load(STORAGE_KEYS.PLAYERS, []));
      setCourts(load(STORAGE_KEYS.COURTS, []));
      setMatches(load(STORAGE_KEYS.MATCHES, []));
      setFees(load(STORAGE_KEYS.FEES, []));
      setPaymentMethods(load(STORAGE_KEYS.PAYMENT_METHODS, []));
      setSessions(load(STORAGE_KEYS.SESSIONS, []));
      setCurrentSession(load(STORAGE_KEYS.CURRENT_SESSION, null));
      setDefaultWinningScoreState(parseInt(localStorage.getItem(STORAGE_KEYS.WINNING_SCORE) || '21'));

      const savedAutoAdvance = localStorage.getItem(STORAGE_KEYS.AUTO_ADVANCE);
      setAutoAdvanceEnabledState(savedAutoAdvance !== null ? JSON.parse(savedAutoAdvance) : true);
    };

    const loadFromFirebase = async () => {
      try {
        // Dynamic import Firebase to avoid build issues
        const { db } = await import('@/firebase/config');
        const { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } = await import('firebase/firestore');

        // Load players from Firebase
        const playersSnapshot = await getDocs(collection(db, 'players'));
        const firebasePlayers = playersSnapshot.docs.map(doc => doc.data() as Player);
        if (firebasePlayers.length > 0) {
          setPlayers(firebasePlayers);
          localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(firebasePlayers));
        }

        // Load courts from Firebase
        const courtsSnapshot = await getDocs(collection(db, 'courts'));
        const firebaseCourts = courtsSnapshot.docs.map(doc => doc.data() as Court);
        if (firebaseCourts.length > 0) {
          setCourts(firebaseCourts);
          localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(firebaseCourts));
        }

        // Load matches from Firebase
        const matchesSnapshot = await getDocs(collection(db, 'matches'));
        const firebaseMatches = matchesSnapshot.docs.map(doc => doc.data() as Match);
        if (firebaseMatches.length > 0) {
          setMatches(firebaseMatches);
          localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(firebaseMatches));
        }

        // Load sessions from Firebase
        const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
        const firebaseSessions = sessionsSnapshot.docs.map(doc => doc.data() as Session);
        if (firebaseSessions.length > 0) {
          setSessions(firebaseSessions);
          localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(firebaseSessions));
        }

        // Load current session from Firebase
        const currentSessionDoc = await getDoc(doc(db, 'current_session', 'active'));
        if (currentSessionDoc.exists()) {
          const firebaseCurrentSession = currentSessionDoc.data() as Session;
          setCurrentSession(firebaseCurrentSession);
          localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(firebaseCurrentSession));
        }

      } catch (error) {
        console.error('Firebase load error:', error);
        // Fallback to localStorage if Firebase fails
        loadFromLocalStorage();
      }
    };

    // Check if localStorage has data, if not try to load from Firebase
    const hasLocalData = localStorage.getItem(STORAGE_KEYS.PLAYERS) &&
                        localStorage.getItem(STORAGE_KEYS.COURTS);

    if (hasLocalData) {
      loadFromLocalStorage();
    } else {
      loadFromFirebase().then(() => {
        // If Firebase also has no data, load empty state
        loadFromLocalStorage();
      });
    }

    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(players));
    localStorage.setItem(STORAGE_KEYS.COURTS, JSON.stringify(courts));
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    localStorage.setItem(STORAGE_KEYS.FEES, JSON.stringify(fees));
    localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    localStorage.setItem(STORAGE_KEYS.CURRENT_SESSION, JSON.stringify(currentSession));
    localStorage.setItem(STORAGE_KEYS.WINNING_SCORE, defaultWinningScore.toString());
    localStorage.setItem(STORAGE_KEYS.AUTO_ADVANCE, JSON.stringify(autoAdvanceEnabled));
  }, [players, courts, matches, fees, paymentMethods, sessions, currentSession, defaultWinningScore, autoAdvanceEnabled, isLoaded]);

  // Firebase sync: Local storage is source of truth, Firebase is backup
  useEffect(() => {
    if (!isLoaded) return;

    const syncToFirebase = async () => {
      try {
        // Dynamic import Firebase to avoid build issues
        const { db } = await import('@/firebase/config');
        const { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } = await import('firebase/firestore');

        // Sync players
        const playersRef = collection(db, 'players');
        const playersSnapshot = await getDocs(playersRef);
        const existingPlayerIds = new Set(playersSnapshot.docs.map(doc => doc.id));

        for (const player of players) {
          const playerRef = doc(db, 'players', player.id);
          await setDoc(playerRef, player, { merge: true });
          existingPlayerIds.delete(player.id);
        }

        // Delete players that no longer exist locally
        for (const id of existingPlayerIds) {
          await deleteDoc(doc(db, 'players', id));
        }

        // Sync courts
        const courtsRef = collection(db, 'courts');
        const courtsSnapshot = await getDocs(courtsRef);
        const existingCourtIds = new Set(courtsSnapshot.docs.map(doc => doc.id));

        for (const court of courts) {
          const courtRef = doc(db, 'courts', court.id);
          await setDoc(courtRef, court, { merge: true });
          existingCourtIds.delete(court.id);
        }

        for (const id of existingCourtIds) {
          await deleteDoc(doc(db, 'courts', id));
        }

        // Sync matches
        const matchesRef = collection(db, 'matches');
        const matchesSnapshot = await getDocs(matchesRef);
        const existingMatchIds = new Set(matchesSnapshot.docs.map(doc => doc.id));

        for (const match of matches) {
          const matchRef = doc(db, 'matches', match.id);
          await setDoc(matchRef, match, { merge: true });
          existingMatchIds.delete(match.id);
        }

        for (const id of existingMatchIds) {
          await deleteDoc(doc(db, 'matches', id));
        }

        // Sync sessions
        const sessionsRef = collection(db, 'sessions');
        const sessionsSnapshot = await getDocs(sessionsRef);
        const existingSessionIds = new Set(sessionsSnapshot.docs.map(doc => doc.id));

        for (const session of sessions) {
          const sessionRef = doc(db, 'sessions', session.id);
          await setDoc(sessionRef, session, { merge: true });
          existingSessionIds.delete(session.id);
        }

        for (const id of existingSessionIds) {
          await deleteDoc(doc(db, 'sessions', id));
        }

        // Sync current session
        if (currentSession) {
          await setDoc(doc(db, 'current_session', 'active'), currentSession);
        }

      } catch (error) {
        console.error('Firebase sync error:', error);
      }
    };

    // Debounce sync to avoid too many writes
    const timeoutId = setTimeout(syncToFirebase, 2000);
    return () => clearTimeout(timeoutId);
  }, [players, courts, matches, sessions, currentSession, isLoaded]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addPlayer = (data: any) => {
    const newPlayer: Player = {
      ...data,
      id: generateId(),
      wins: 0,
      gamesPlayed: 0,
      partnerHistory: [],
      status: 'available',
      improvementScore: 0,
      totalPlayTimeMinutes: 0,
      lastAvailableAt: Date.now(),
      sessionId: currentSession?.id
    };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const addCourt = (name?: string) => {
    const courtNumbers = courts
      .map(c => parseInt(c.name.replace('Court ', '')))
      .filter(n => !isNaN(n));
    const nextNum = courtNumbers.length > 0 ? Math.max(...courtNumbers) + 1 : 1;

    const id = generateId();
    const newCourt: Court = {
      id,
      name: name ? `Court ${name}` : `Court ${nextNum}`,
      status: 'available',
      currentMatchId: null,
      sessionId: currentSession?.id
    };
    setCourts(prev => [...prev, newCourt]);
    return id;
  };

  const deleteCourt = (id: string) => {
    const court = courts.find(c => c.id === id);
    if (court?.currentMatchId) {
      deleteMatch(court.currentMatchId);
    }
    setCourts(prev => prev.filter(c => c.id !== id));
  };

  const startMatch = (matchData: any) => {
    const newMatchId = generateId();
    let targetCourtId = matchData.courtId;

    if (!targetCourtId) {
      const availableCourt = courts.find(c => c.status === 'available');
      if (availableCourt) {
        targetCourtId = availableCourt.id;
      }
    }

    const teamASnapshots: PlayerSnapshot[] = matchData.teamA.map((id: string) => {
      const p = players.find(player => player.id === id);
      return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
    });

    const teamBSnapshots: PlayerSnapshot[] = matchData.teamB.map((id: string) => {
      const p = players.find(player => player.id === id);
      return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };
    });

    const newMatch: Match = {
      ...matchData,
      id: newMatchId,
      teamASnapshots,
      teamBSnapshots,
      timestamp: new Date().toISOString(),
      isCompleted: false,
      status: 'ongoing',
      sessionId: currentSession?.id
    };

    if (targetCourtId) {
      newMatch.courtId = targetCourtId;
    }

    setMatches(prev => [newMatch, ...prev]);

    if (targetCourtId) {
      setCourts(prev => prev.map(c =>
        c.id === targetCourtId
          ? { ...c, status: 'occupied', currentMatchId: newMatchId }
          : c
      ));
    }

    setPlayers(prev => prev.map(p =>
      [...matchData.teamA, ...matchData.teamB].includes(p.id)
        ? { ...p, status: 'playing' }
        : p
    ));

    // Send notifications to registered players
    if (currentSession?.registeredPlayers) {
      const allPlayerIds = [...matchData.teamA, ...matchData.teamB];
      allPlayerIds.forEach(playerId => {
        const player = players.find(p => p.id === playerId);
        if (player) {
          const registeredPlayer = currentSession.registeredPlayers?.find(rp => rp.name === player.name);
          if (registeredPlayer) {
            sendNotification({
              title: "It's Your Turn!",
              body: `You've been selected for a match. Court ${targetCourtId ? courts.find(c => c.id === targetCourtId)?.name : 'Queue'}`,
              icon: '/favicon.ico'
            });
          }
        }
      });
    }
  };

  const updateMatchScore = (matchId: string, teamAScore: number, teamBScore: number) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, teamAScore, teamBScore } : m));
  };

  const endMatch = (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    const court = courts.find(c => c.id === courtId);
    if (!court?.currentMatchId) return;

    const match = matches.find(m => m.id === court.currentMatchId);
    if (!match) return;

    const startTime = match.startTime ? new Date(match.startTime) : null;
    const playDuration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0;

    // Update the match state
    setMatches(prev => prev.map(m => 
      m.id === court.currentMatchId 
        ? { ...m, isCompleted: status === 'completed', status, winner, teamAScore, teamBScore, endTime: new Date().toISOString() } 
        : m
    ));

    // Free the court
    setCourts(prev => prev.map(c => 
      c.id === courtId ? { ...c, status: 'available', currentMatchId: null } : c
    ));

    // Update the players
    setPlayers(prev => prev.map(p => {
      if (![...match.teamA, ...match.teamB].includes(p.id)) return p;

      if (status === 'cancelled') {
        return { ...p, status: 'available', lastAvailableAt: Date.now() };
      }

      const isTeamA = match.teamA.includes(p.id);
      const partnerId = isTeamA ? match.teamA.find(id => id !== p.id) : match.teamB.find(id => id !== p.id);
      const newHistory = partnerId ? [partnerId, ...p.partnerHistory].slice(0, 5) : p.partnerHistory;
      
      let won = false;
      if (winner) {
        won = (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA);
      } else if (teamAScore !== undefined && teamBScore !== undefined) {
        won = (teamAScore > teamBScore && isTeamA) || (teamBScore > teamAScore && !isTeamA);
      }

      return {
        ...p,
        status: 'available',
        lastAvailableAt: Date.now(),
        wins: (p.wins || 0) + (won ? 1 : 0),
        gamesPlayed: (p.gamesPlayed || 0) + 1,
        partnerHistory: newHistory,
        improvementScore: Math.max(0, (p.improvementScore || 0) + (won ? 5 : -2)),
        totalPlayTimeMinutes: (p.totalPlayTimeMinutes || 0) + playDuration
      };
    }));

    // Trigger Auto-Advance if enabled
    if (autoAdvanceEnabled && status === 'completed') {
      autoAdvanceToCourt(courtId);
    }
  };

  const autoAdvanceToCourt = (targetCourtId: string) => {
    setMatches(prevMatches => {
      const queue = prevMatches
        .filter(m => !m.isCompleted && !m.courtId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (queue.length === 0) return prevMatches;

      const nextMatch = queue[0];
      
      // Update the match with the new court assignment
      const updatedMatches = prevMatches.map(m => 
        m.id === nextMatch.id ? { ...m, courtId: targetCourtId, status: 'ongoing' as MatchStatus } : m
      );

      // We need to update courts too, but since we are inside setMatches, 
      // we'll rely on the side effect or direct state call if possible.
      // In React state updates, it's cleaner to handle this together.
      
      return updatedMatches;
    });

    // Separately update the court state
    setCourts(prevCourts => {
      // Find the first available match in the queue (re-calculate for consistency)
      const nextMatchInQueue = matches
        .filter(m => !m.isCompleted && !m.courtId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

      if (!nextMatchInQueue) return prevCourts;

      return prevCourts.map(c => 
        c.id === targetCourtId 
          ? { ...c, status: 'occupied', currentMatchId: nextMatchInQueue.id } 
          : c
      );
    });
  };

  const deleteMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    setPlayers(prev => prev.map(p => 
      [...match.teamA, ...match.teamB].includes(p.id)
        ? { ...p, status: 'available', lastAvailableAt: Date.now() }
        : p
    ));

    if (match.courtId) {
      setCourts(prev => prev.map(c => 
        c.id === match.courtId ? { ...c, status: 'available', currentMatchId: null } : c
      ));
    }

    setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  const swapPlayer = (matchId: string, oldPlayerId: string, newPlayerId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const p = players.find(player => player.id === newPlayerId);
    const newSnapshot = { id: newPlayerId, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 };

    const isTeamA = match.teamA.includes(oldPlayerId);
    const newTeamA = isTeamA ? match.teamA.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamA;
    const newTeamB = !isTeamA ? match.teamB.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamB;

    const newTeamASnapshots = isTeamA ? match.teamASnapshots?.map(s => s.id === oldPlayerId ? newSnapshot : s) : match.teamASnapshots;
    const newTeamBSnapshots = !isTeamA ? match.teamBSnapshots?.map(s => s.id === oldPlayerId ? newSnapshot : s) : match.teamBSnapshots;

    setMatches(prev => prev.map(m => m.id === matchId ? { 
      ...m, 
      teamA: newTeamA, 
      teamB: newTeamB, 
      teamASnapshots: newTeamASnapshots, 
      teamBSnapshots: newTeamBSnapshots 
    } : m));
    
    setPlayers(prev => prev.map(p => {
      if (p.id === oldPlayerId) return { ...p, status: 'available', lastAvailableAt: Date.now() };
      if (p.id === newPlayerId) return { ...p, status: 'playing' };
      return p;
    }));
  };

  const assignMatchToCourt = (matchId: string, courtId: string) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, courtId, status: 'ongoing' } : m));
    setCourts(prev => prev.map(c => 
      c.id === courtId 
        ? { ...c, status: 'occupied', currentMatchId: matchId } 
        : c
    ));
  };

  const createCourtAndAssignMatch = (matchId: string) => {
    const newCourtId = addCourt();
    assignMatchToCourt(matchId, newCourtId);
  };

  const startTimer = (courtId: string) => {
    const court = courts.find(c => c.id === courtId);
    if (court?.currentMatchId) {
      setMatches(prev => prev.map(m => 
        m.id === court.currentMatchId 
          ? { ...m, startTime: new Date().toISOString() } 
          : m
      ));
    }
  };

  const updateFee = (data: any) => {
    setFees(prev => {
      const exists = prev.find(f => f.id === data.id);
      if (exists) return prev.map(f => f.id === data.id ? { ...f, ...data } : f);
      return [...prev, { ...data, payments: {} }];
    });
  };

  const togglePayment = (date: string, playerId: string) => {
    setFees(prev => {
      const fee = prev.find(f => f.id === date);
      if (!fee) {
        // Create fee if it doesn't exist with player payment set to true
        const newFee: Fee = {
          id: date,
          shuttleFee: 0,
          courtFee: 0,
          entranceFee: 0,
          payments: { [playerId]: true }
        };
        return [...prev, newFee];
      }
      // Toggle existing fee
      return prev.map(f => {
        if (f.id !== date) return f;
        const payments = { ...f.payments };
        payments[playerId] = !payments[playerId];
        return { ...f, payments };
      });
    });
  };

  const addPaymentMethod = async (name: string, imageData: string) => {
    const id = generateId();
    try {
      // Upload to Supabase storage
      const imageUrl = await uploadQRCodeToSupabase(id, imageData);
      const newMethod: PaymentMethod = { id, name, imageUrl };
      setPaymentMethods(prev => [...prev, newMethod]);
    } catch (error) {
      console.error('Failed to upload QR code to Supabase:', error);
      // Fallback to localStorage if Supabase fails
      const newMethod: PaymentMethod = { id, name, imageUrl: imageData };
      setPaymentMethods(prev => [...prev, newMethod]);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      // Delete from Supabase storage
      await deleteQRCodeFromSupabase(id);
    } catch (error) {
      console.error('Failed to delete QR code from Supabase:', error);
    }
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  };

  const setDefaultWinningScore = (score: number) => {
    setDefaultWinningScoreState(score);
  };

  const setAutoAdvanceEnabled = (enabled: boolean) => {
    setAutoAdvanceEnabledState(enabled);
  };

  const resetDailyBoard = () => {
    setMatches(prev => prev.map(m => !m.isCompleted ? { ...m, isCompleted: true, status: 'cancelled' } : m));
    setPlayers(prev => prev.map(p => ({
      ...p,
      status: 'available',
      wins: 0,
      gamesPlayed: 0,
      totalPlayTimeMinutes: 0,
      partnerHistory: [],
      lastAvailableAt: Date.now()
    })));
    setCourts(prev => prev.map(c => ({ ...c, status: 'available', currentMatchId: null })));
  };

  const createSession = (name: string): Session => {
    const sessionId = generateId();
    const newSession: Session = {
      id: sessionId,
      name,
      createdAt: new Date().toISOString(),
      is_active: true,
      registeredPlayers: []
    };

    console.log('[createSession] Creating session:', newSession);
    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);

    // Optional: Try to sync with Supabase (graceful failure)
    try {
      // Supabase sync would go here if needed
      console.log('[createSession] Session created locally');
    } catch (error) {
      console.warn('[createSession] Supabase sync failed, using local storage only');
    }

    return newSession;
  };

  const endSession = (sessionId: string) => {
    console.log('[endSession] Ending session:', sessionId);

    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, is_active: false } : s
    ));

    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      // Clear session state (matches, courts) but preserve players for rankings
      setMatches([]);
      setCourts([]);
      console.log('[endSession] Session state cleared (preserving players for rankings)');
    }
  };

  const getSession = (sessionId: string): Session | null => {
    return sessions.find(s => s.id === sessionId) || null;
  };

  const getCurrentSession = (): Session | null => {
    return currentSession;
  };

  const registerPlayerForSession = (sessionId: string, deviceId: string, name: string) => {
    console.log('[registerPlayerForSession] Registering player:', { sessionId, deviceId, name });

    const registeredPlayer: SessionRegisteredPlayer = {
      deviceId,
      name,
      joinedAt: new Date().toISOString()
    };

    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        const existing = s.registeredPlayers?.find(p => p.deviceId === deviceId);
        if (existing) return s; // Already registered
        return {
          ...s,
          registeredPlayers: [...(s.registeredPlayers || []), registeredPlayer]
        };
      }
      return s;
    }));

    // Add player to the system with default skill level 3
    addPlayer({ name, skillLevel: 3 });
  };

  const ingestPlayersFromList = async (names: string[], sessionDate: string): Promise<{ newPlayersCount: number; existingPlayersCount: number }> => {
    console.log('[ingestPlayersFromList] Ingesting players:', { names, sessionDate });

    let newPlayersCount = 0;
    let existingPlayersCount = 0;

    const sessionTimestamp = new Date(sessionDate).getTime();
    const validTimestamp = !isNaN(sessionTimestamp) ? sessionTimestamp : Date.now();

    // First, count existing players by first name
    const firstNameCounts: Record<string, number> = {};
    for (const player of players) {
      const firstName = player.name.split(' ')[0].toLowerCase();
      firstNameCounts[firstName] = (firstNameCounts[firstName] || 0) + 1;
    }

    // Count incoming names by first name
    const incomingFirstNameCounts: Record<string, number> = {};
    for (const name of names) {
      const firstName = name.split(' ')[0].toLowerCase();
      incomingFirstNameCounts[firstName] = (incomingFirstNameCounts[firstName] || 0) + 1;
    }

    for (const fullName of names) {
      const nameParts = fullName.trim().split(' ').filter(n => n.length > 0);
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

      // Check if this first name has duplicates (existing + incoming)
      const existingCount = firstNameCounts[firstName.toLowerCase()] || 0;
      const incomingCount = incomingFirstNameCounts[firstName.toLowerCase()] || 0;
      const hasDuplicates = (existingCount + incomingCount) > 1;

      // Determine the display name
      let displayName = firstName;
      if (hasDuplicates && lastName) {
        const initial = lastName.charAt(0).toUpperCase();
        displayName = `${firstName} ${initial}.`;
      }

      // Check if player already exists (case-insensitive on display name)
      const existingPlayer = players.find(p => p.name.toLowerCase() === displayName.toLowerCase());

      if (existingPlayer) {
        existingPlayersCount++;
        // Update lastAvailableAt for existing players
        updatePlayer(existingPlayer.id, { lastAvailableAt: validTimestamp });
      } else {
        newPlayersCount++;
        // Add new player with default skill level 3
        addPlayer({
          name: displayName,
          skillLevel: 3,
          lastAvailableAt: validTimestamp
        });
      }
    }

    console.log('[ingestPlayersFromList] Complete:', { newPlayersCount, existingPlayersCount });
    return { newPlayersCount, existingPlayersCount };
  };

  const wipeAllData = () => {
    setPlayers([]);
    setCourts([]);
    setMatches([]);
    setFees([]);
    setPaymentMethods([]);
    setSessions([]);
    setCurrentSession(null);
    setDefaultWinningScoreState(21);
    setAutoAdvanceEnabledState(true);
    localStorage.clear();
    console.log('[wipeAllData] All data cleared from localStorage');
  };

  if (!isLoaded) {
    return <SplashScreen />;
  }

  return (
    <ClubContext.Provider value={{
      players: players.filter(p => !p.sessionId || p.sessionId === currentSession?.id),
      courts: courts.filter(c => !c.sessionId || c.sessionId === currentSession?.id),
      matches: matches.filter(m => !m.sessionId || m.sessionId === currentSession?.id),
      fees, paymentMethods, sessions, currentSession, defaultWinningScore, autoAdvanceEnabled,
      addPlayer, updatePlayer, deletePlayer, addCourt, deleteCourt,
      startMatch, startTimer, updateMatchScore, endMatch, swapPlayer, assignMatchToCourt, createCourtAndAssignMatch, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData, deleteMatch, setDefaultWinningScore, setAutoAdvanceEnabled,
      createSession, endSession, getSession, getCurrentSession, registerPlayerForSession, ingestPlayersFromList
    }}>
      {children}
    </ClubContext.Provider>
  );
}

export function useClub() {
  const context = useContext(ClubContext);
  if (context === undefined) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
}
