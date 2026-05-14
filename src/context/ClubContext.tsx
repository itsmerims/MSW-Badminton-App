'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Player, Court, Match, Fee, PaymentMethod, MatchStatus, PlayerSnapshot, Session, SessionRegisteredPlayer, SessionStatus } from '@/lib/types';
import { SplashScreen } from '@/components/layout/SplashScreen';
import { sendNotification } from '@/lib/notifications';
import { isOnline as checkOnline, setupOfflineListeners, saveToLocalStorage, loadFromLocalStorage } from '@/lib/offline';

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
  isPlayer: boolean;
  isOnline: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  addPlayer: (player: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes' | 'lastAvailableAt'>) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
  addCourt: (name?: string) => string;
  deleteCourt: (id: string) => void;
  updateCourt: (id: string, name: string) => void;
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => void;
  startTimer: (courtId: string) => void;
  updateMatchScore: (matchId: string, teamAScore: number, teamBScore: number) => void;
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => void;
  completeMatch: (matchId: string, teamAScore: number, teamBScore: number) => Promise<{ winner: 'teamA' | 'teamB' | null }>;
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => void;
  assignMatchToCourt: (matchId: string, courtId: string) => void;
  createCourtAndAssignMatch: (matchId: string) => void;
  updateFee: (fee: Omit<Fee, 'payments'>) => void;
  togglePayment: (date: string, playerId: string) => void;
  addPaymentMethod: (name: string, imageData: string) => Promise<void>;
  deletePaymentMethod: (id: string) => Promise<void>;
  refreshPaymentMethodsFromSupabase: () => Promise<void>;
  refreshSessionsFromSupabase: () => Promise<void>;
  setDefaultWinningScore: (score: number) => void;
  setAutoAdvanceEnabled: (enabled: boolean) => void;
  resetDailyBoard: () => void;
  wipeAllData: () => void;
  deleteMatch: (matchId: string) => void;
  createSession: (name: string) => Session;
  endSession: (sessionId: string) => void;
  restoreSession: (sessionId: string) => Promise<void>;
  getSession: (sessionId: string) => Session | null;
  getCurrentSession: () => Session | null;
  selectSession: (sessionId: string) => void;
  registerPlayerForSession: (sessionId: string, deviceId: string, name: string) => void;
  importPlayerToSession: (playerId: string, sessionId: string) => Promise<void>;
  ingestPlayersFromList: (names: string[], sessionDate: string) => Promise<{ newPlayersCount: number; existingPlayersCount: number }>;
  getPlayerCountForSession: (sessionId: string) => number;
  saveSessionFee: (perPlayerFee: number) => Promise<void>;
  saveCalculatorData: (data: Session['calculatorData']) => Promise<void>;
  setPlayerResting: (id: string) => void;
  setPlayerAvailable: (id: string) => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PLAYERS: 'tbc_players',
  COURTS: 'tbc_courts',
  MATCHES: 'tbc_matches',
  FEES: 'tbc_fees',
  PAYMENT_METHODS: 'tbc_payment_methods',
  SESSIONS: 'tbc_sessions',
  WINNING_SCORE: 'tbc_winning_score',
  AUTO_ADVANCE: 'tbc_auto_advance',
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
  const [isOnline, setIsOnline] = useState(checkOnline());
  const unsubscribeRefs = useRef<Array<() => void>>([]);

  // Undo/Redo state
  const [history, setHistory] = useState<Array<{ players: Player[]; courts: Court[]; matches: Match[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Save state snapshot for undo/redo
  const saveStateSnapshot = () => {
    const snapshot = {
      players: [...players],
      courts: [...courts],
      matches: [...matches],
    };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      // Keep only last 50 snapshots to prevent memory issues
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  };

  const undo = () => {
    if (!canUndo) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    const snapshot = history[newIndex];
    setPlayers(snapshot.players);
    setCourts(snapshot.courts);
    setMatches(snapshot.matches);
  };

  const redo = () => {
    if (!canRedo) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    const snapshot = history[newIndex];
    setPlayers(snapshot.players);
    setCourts(snapshot.courts);
    setMatches(snapshot.matches);
  };

  // Real-time Firestore listeners
  useEffect(() => {
    if (!isLoaded) return;

    let cancelled = false;

    const setupListeners = async () => {
      try {
        const { db } = await import('@/firebase/config');
        const { subscribeToSessions } = await import('@/firebase/firestore/session-service');
        const { subscribeToPlayers } = await import('@/firebase/firestore/player-service');

        if (cancelled) return;

        const unsubSessions = subscribeToSessions(db, (firebaseSessions) => {
          if (firebaseSessions.length > 0) {
            setSessions(firebaseSessions);
            localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(firebaseSessions));
          }
        });

        const unsubPlayers = subscribeToPlayers(db, (firebasePlayers) => {
          if (firebasePlayers.length > 0) {
            setPlayers(firebasePlayers);
            localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(firebasePlayers));
          }
        });

        unsubscribeRefs.current.push(unsubSessions, unsubPlayers);
      } catch (e) {
        console.error('[Real-time listeners] Setup error:', e);
      }
    };

    setupListeners();

    return () => {
      cancelled = true;
      unsubscribeRefs.current.forEach(unsub => unsub());
      unsubscribeRefs.current = [];
    };
  }, [isLoaded]);

  // Offline mode listeners
  useEffect(() => {
    const cleanup = setupOfflineListeners(
      () => {
        setIsOnline(true);
        sendNotification('You are back online');
      },
      () => {
        setIsOnline(false);
        // Save current state to localStorage when going offline
        saveToLocalStorage('tbc_players_offline', players);
        saveToLocalStorage('tbc_matches_offline', matches);
        saveToLocalStorage('tbc_courts_offline', courts);
        saveToLocalStorage('tbc_sessions_offline', sessions);
        sendNotification('You are offline. Changes will be saved locally.');
      }
    );
    return cleanup;
  }, [players, matches, courts, sessions]);

  useEffect(() => {
    const load = (key: string, fallback: any) => {
      if (typeof window === 'undefined') return fallback;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    };

    const loadFromLocalStorage = () => {
      const loadedSessions = load(STORAGE_KEYS.SESSIONS, []);
      setSessions(loadedSessions);

      if (loadedSessions.length > 0) {
        // Prefer the explicitly selected session (stored by selectSession / handleEnterSession)
        const savedSessionId = localStorage.getItem('tbc_current_session_id');
        const savedSession = savedSessionId
          ? loadedSessions.find((s: Session) => s.id === savedSessionId) ?? null
          : null;
        const lastActiveSession =
          savedSession ||
          loadedSessions.find((s: Session) => s.status === 'active') ||
          loadedSessions[loadedSessions.length - 1];
        setCurrentSession(lastActiveSession);
      }

      setPlayers(load(STORAGE_KEYS.PLAYERS, []));
      setCourts(load(STORAGE_KEYS.COURTS, []));
      setMatches(load(STORAGE_KEYS.MATCHES, []));
      setFees(load(STORAGE_KEYS.FEES, []));
      setPaymentMethods(load(STORAGE_KEYS.PAYMENT_METHODS, []));
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

        // Load payment methods from Firebase
        const paymentMethodsSnapshot = await getDocs(collection(db, 'payment_methods'));
        const firebasePaymentMethods = paymentMethodsSnapshot.docs.map(doc => doc.data() as PaymentMethod);
        if (firebasePaymentMethods.length > 0) {
          setPaymentMethods(firebasePaymentMethods);
          localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(firebasePaymentMethods));
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
    localStorage.setItem(STORAGE_KEYS.WINNING_SCORE, defaultWinningScore.toString());
    localStorage.setItem(STORAGE_KEYS.AUTO_ADVANCE, JSON.stringify(autoAdvanceEnabled));
  }, [players, courts, matches, fees, paymentMethods, sessions, defaultWinningScore, autoAdvanceEnabled, isLoaded]);

  // Firebase sync: Local storage is source of truth, Firebase is backup
  useEffect(() => {
    if (!isLoaded) return;

    const syncToFirebase = async () => {
      try {
        // Dynamic import Firebase to avoid build issues
        const { db } = await import('@/firebase/config');
        const { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc } = await import('firebase/firestore');
        const { stripUndefined } = await import('@/lib/utils');

        // Sync players
        const playersRef = collection(db, 'players');
        const playersSnapshot = await getDocs(playersRef);
        const existingPlayerIds = new Set(playersSnapshot.docs.map(doc => doc.id));

        for (const player of players) {
          const playerRef = doc(db, 'players', player.id);
          await setDoc(playerRef, stripUndefined(player), { merge: true });
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
          await setDoc(courtRef, stripUndefined(court), { merge: true });
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
          await setDoc(matchRef, stripUndefined(match), { merge: true });
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
          await setDoc(sessionRef, stripUndefined(session), { merge: true });
          existingSessionIds.delete(session.id);
        }

        for (const id of existingSessionIds) {
          await deleteDoc(doc(db, 'sessions', id));
        }

        // Sync payment methods
        const paymentMethodsRef = collection(db, 'payment_methods');
        const paymentMethodsSnapshot = await getDocs(paymentMethodsRef);
        const existingPaymentMethodIds = new Set(paymentMethodsSnapshot.docs.map(doc => doc.id));

        for (const method of paymentMethods) {
          const methodRef = doc(db, 'payment_methods', method.id);
          await setDoc(methodRef, stripUndefined(method), { merge: true });
          existingPaymentMethodIds.delete(method.id);
        }

        for (const id of existingPaymentMethodIds) {
          await deleteDoc(doc(db, 'payment_methods', id));
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
    saveStateSnapshot();
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
      sessionId: currentSession?.id,
      sessionIds: currentSession?.id ? [currentSession.id] : [],
    };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const updatePlayer = (id: string, updates: Partial<Player>) => {
    saveStateSnapshot();
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePlayer = (id: string) => {
    saveStateSnapshot();
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const addCourt = (name?: string) => {
    saveStateSnapshot();
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
    saveStateSnapshot();
    const court = courts.find(c => c.id === id);
    if (court?.currentMatchId) {
      deleteMatch(court.currentMatchId);
    }
    setCourts(prev => prev.filter(c => c.id !== id));
  };

  const updateCourt = (id: string, name: string) => {
    saveStateSnapshot();
    const formattedName = `Court ${name}`;
    setCourts(prev => prev.map(c => 
      c.id === id ? { ...c, name: formattedName } : c
    ));
  };

  const startMatch = (matchData: any) => {
    saveStateSnapshot();
    const newMatchId = generateId();
    let targetCourtId = matchData.courtId || null;

    // Only auto-assign to a court if courtId was NOT explicitly provided.
    // When courtId is explicitly undefined (queue flow), skip auto-assign.
    const explicitlyQueued = 'courtId' in matchData && matchData.courtId === undefined;
    if (!targetCourtId && !explicitlyQueued) {
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
      status: targetCourtId ? 'ongoing' : 'ongoing',
      sessionId: currentSession?.id
    };

    // Only set courtId if we actually have one; remove any undefined courtId from spread
    if (targetCourtId) {
      newMatch.courtId = targetCourtId;
    } else {
      delete newMatch.courtId;
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
        ? { ...p, status: targetCourtId ? 'playing' : 'in-queue' }
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
    saveStateSnapshot();
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
    // Find the next queued match
    const nextMatchInQueue = matches
      .filter(m => !m.isCompleted && !m.courtId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

    if (!nextMatchInQueue) return;

    // Update the match with the court assignment
    setMatches(prevMatches =>
      prevMatches.map(m =>
        m.id === nextMatchInQueue.id ? { ...m, courtId: targetCourtId, status: 'ongoing' as MatchStatus } : m
      )
    );

    // Update the court state
    setCourts(prevCourts =>
      prevCourts.map(c =>
        c.id === targetCourtId
          ? { ...c, status: 'occupied', currentMatchId: nextMatchInQueue.id }
          : c
      )
    );

    // Transition players from 'in-queue' to 'playing'
    const allPlayerIds = [...nextMatchInQueue.teamA, ...nextMatchInQueue.teamB];
    setPlayers(prev => prev.map(p =>
      allPlayerIds.includes(p.id) ? { ...p, status: 'playing' } : p
    ));
  };

  const deleteMatch = (matchId: string) => {
    saveStateSnapshot();
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    const playerIds = [...match.teamA, ...match.teamB];
    
    setPlayers(prev => prev.map(p => 
      playerIds.includes(p.id)
        ? { ...p, status: 'available' as PlayerStatus, lastAvailableAt: Date.now() }
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
    saveStateSnapshot();
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
    const match = matches.find(m => m.id === matchId);
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, courtId, status: 'ongoing' } : m));
    setCourts(prev => prev.map(c => 
      c.id === courtId 
        ? { ...c, status: 'occupied', currentMatchId: matchId } 
        : c
    ));
    // Transition players from 'in-queue' to 'playing' when assigned to court
    if (match) {
      const allPlayerIds = [...match.teamA, ...match.teamB];
      setPlayers(prev => prev.map(p =>
        allPlayerIds.includes(p.id) ? { ...p, status: 'playing' } : p
      ));
    }
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
      // Store the image data URL directly in Firestore (no external storage needed)
      const newMethod: PaymentMethod = { id, name, imageUrl: imageData };
      setPaymentMethods(prev => [...prev, newMethod]);

      // Save metadata to Firestore
      const { db } = await import('@/firebase/config');
      const { savePaymentMethod } = await import('@/firebase/firestore/storage-service');
      await savePaymentMethod(db, newMethod);
    } catch (error) {
      console.error('Failed to save QR code:', error);
      // Fallback to localStorage
      const newMethod: PaymentMethod = { id, name, imageUrl: imageData };
      setPaymentMethods(prev => [...prev, newMethod]);
    }
  };

  const deletePaymentMethodAction = async (id: string) => {
    try {
      // Delete metadata from Firestore
      const { db } = await import('@/firebase/config');
      const { deletePaymentMethod: deleteDoc } = await import('@/firebase/firestore/storage-service');
      await deleteDoc(db, id);
    } catch (error) {
      console.error('Failed to delete QR code:', error);
    }
    setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
  };

  const refreshPaymentMethods = async () => {
    try {
      // Load payment methods from Firestore
      const { db } = await import('@/firebase/config');
      const { getPaymentMethods } = await import('@/firebase/firestore/storage-service');
      const methods = await getPaymentMethods(db);
      if (methods.length > 0) {
        setPaymentMethods(methods);
        localStorage.setItem(STORAGE_KEYS.PAYMENT_METHODS, JSON.stringify(methods));
      }
    } catch (error) {
      console.error('Failed to refresh payment methods:', error);
    }
  };

  const refreshSessions = async () => {
    try {
      const { db } = await import('@/firebase/config');
      const { getSessionsFromFirebase } = await import('@/firebase/firestore/storage-service');
      const { getPlayers: getPlayersFromFirestore } = await import('@/firebase/firestore/player-service');

      // Fetch both sessions and players in parallel
      const [firebaseSessions, firebasePlayers] = await Promise.all([
        getSessionsFromFirebase(db),
        getPlayersFromFirestore(db),
      ]);

      // --- Update sessions ---
      if (firebaseSessions.length > 0) {
        setSessions(firebaseSessions);
        localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(firebaseSessions));

        // Keep currentSession in sync: if it exists in the refreshed list, use the
        // updated document; otherwise keep what we have.
        setCurrentSession(prev => {
          if (!prev) return prev;
          const updated = firebaseSessions.find(s => s.id === prev.id);
          return updated ?? prev;
        });
      }

      // --- Update players (brings sessionId assignments up to date) ---
      if (firebasePlayers.length > 0) {
        setPlayers(firebasePlayers);
        localStorage.setItem(STORAGE_KEYS.PLAYERS, JSON.stringify(firebasePlayers));
      }
    } catch (error) {
      console.error('[refreshSessions] Failed to refresh from Firebase:', error);
    }
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
      status: 'active',
      registeredPlayers: []
    };

    console.log('[createSession] Creating session:', newSession);
    setSessions(prev => [...prev, newSession]);
    setCurrentSession(newSession);

    // Sync to Firestore
    import('@/firebase/config').then(({ db }) =>
      import('@/firebase/firestore/session-service').then(({ createSessionDoc }) =>
        createSessionDoc(db, newSession).catch(e => console.error('[createSession] Firestore sync error:', e))
      )
    );

    return newSession;
  };

  const endSession = (sessionId: string) => {
    console.log('[endSession] Ending session (soft-delete to completed):', sessionId);

    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, status: 'completed' } : s
    ));

    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setMatches([]);
      setCourts([]);
      console.log('[endSession] Session state cleared (preserving players for rankings)');
    }

    // Sync to Firestore
    import('@/firebase/config').then(({ db }) =>
      import('@/firebase/firestore/session-service').then(({ endSession: endSessionFirestore }) =>
        endSessionFirestore(db, sessionId).catch(e => console.error('[endSession] Firestore sync error:', e))
      )
    );
  };

  const restoreSession = async (sessionId: string): Promise<void> => {
    console.log('[restoreSession] Restoring session:', sessionId);
    const session = sessions.find(s => s.id === sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found.`);
    if (session.status !== 'completed') throw new Error(`Session ${sessionId} is not completed.`);

    setSessions(prev => prev.map(s =>
      s.id === sessionId ? { ...s, status: 'active' } : s
    ));
    setCurrentSession({ ...session, status: 'active' });

    try {
      const { db } = await import('@/firebase/config');
      const { restoreSession: restoreFirestore } = await import('@/firebase/firestore/session-service');
      await restoreFirestore(db, sessionId);
    } catch (e) {
      console.error('[restoreSession] Firestore sync error:', e);
    }
  };

  const importPlayerToSession = async (playerId: string, sessionId: string): Promise<void> => {
    console.log('[importPlayerToSession]', { playerId, sessionId });

    // Update local state
    setPlayers(prev => prev.map(p =>
      p.id === playerId ? {
        ...p,
        sessionId,
        sessionIds: [...(p.sessionIds || []), sessionId],
        status: 'available',
        lastAvailableAt: Date.now(),
      } : p
    ));

    try {
      const { db } = await import('@/firebase/config');
      const { importPlayerToSession: importFirestore } = await import('@/firebase/firestore/player-service');
      await importFirestore(db, playerId, sessionId);
    } catch (e) {
      console.error('[importPlayerToSession] Firestore sync error:', e);
    }
  };

  const completeMatchAction = async (matchId: string, teamAScore: number, teamBScore: number): Promise<{ winner: 'teamA' | 'teamB' | null }> => {
    console.log('[completeMatch] Completing match:', { matchId, teamAScore, teamBScore });

    const match = matches.find(m => m.id === matchId);
    if (!match) throw new Error(`Match ${matchId} not found.`);

    // Determine winner
    let winner: 'teamA' | 'teamB' | null = null;
    if (teamAScore > teamBScore) winner = 'teamA';
    else if (teamBScore > teamAScore) winner = 'teamB';

    const winningPlayerIds = winner === 'teamA' ? match.teamA : winner === 'teamB' ? match.teamB : [];

    // Update match locally
    setMatches(prev => prev.map(m =>
      m.id === matchId ? {
        ...m, isCompleted: true, status: 'completed', teamAScore, teamBScore, winner,
        endTime: new Date().toISOString(),
      } : m
    ));

    // Free the court locally
    if (match.courtId) {
      setCourts(prev => prev.map(c =>
        c.id === match.courtId ? { ...c, status: 'available', currentMatchId: null } : c
      ));
    }

    // Update players locally
    const allPlayerIds = [...match.teamA, ...match.teamB];
    setPlayers(prev => prev.map(p => {
      if (!allPlayerIds.includes(p.id)) return p;
      const won = winningPlayerIds.includes(p.id);
      return {
        ...p,
        status: 'available',
        lastAvailableAt: Date.now(),
        wins: (p.wins || 0) + (won ? 1 : 0),
        gamesPlayed: (p.gamesPlayed || 0) + 1,
      };
    }));

    // Firestore atomic transaction
    try {
      const { db } = await import('@/firebase/config');
      const { completeMatch: completeMatchFirestore } = await import('@/firebase/firestore/match-service');
      await completeMatchFirestore(db, matchId, teamAScore, teamBScore);
    } catch (e) {
      console.error('[completeMatch] Firestore transaction error:', e);
    }

    if (autoAdvanceEnabled && match.courtId) {
      autoAdvanceToCourt(match.courtId);
    }

    return { winner };
  };

  const saveSessionFee = async (perPlayerFee: number): Promise<void> => {
    if (!currentSession) throw new Error('No active session.');

    setSessions(prev => prev.map(s =>
      s.id === currentSession.id ? { ...s, perPlayerFee } : s
    ));
    setCurrentSession(prev => prev ? { ...prev, perPlayerFee } : prev);

    try {
      const { db } = await import('@/firebase/config');
      const { saveSessionFee: saveFirestore } = await import('@/firebase/firestore/session-service');
      await saveFirestore(db, currentSession.id, perPlayerFee);
    } catch (e) {
      console.error('[saveSessionFee] Firestore sync error:', e);
    }
  };

  const saveCalculatorData = async (data: Session['calculatorData']): Promise<void> => {
    if (!currentSession) return;

    setSessions(prev => prev.map(s =>
      s.id === currentSession.id ? { ...s, calculatorData: data } : s
    ));
    setCurrentSession(prev => prev ? { ...prev, calculatorData: data } : prev);

    try {
      const { db } = await import('@/firebase/config');
      const { saveCalculatorData: saveFirestore } = await import('@/firebase/firestore/session-service');
      await saveFirestore(db, currentSession.id, data);
    } catch (e) {
      console.error('[saveCalculatorData] Firestore sync error:', e);
    }
  };

  const setPlayerResting = (id: string) => {
    updatePlayer(id, { status: 'resting' });
  };

  const setPlayerAvailable = (id: string) => {
    updatePlayer(id, { status: 'available', lastAvailableAt: Date.now() });
  };

  const getSession = (sessionId: string): Session | null => {
    return sessions.find(s => s.id === sessionId) || null;
  };

  const selectSession = (sessionId: string): void => {
    const session = sessions.find(s => s.id === sessionId) || null;
    setCurrentSession(session);
    if (session) {
      // Persist the chosen session so it survives a refresh
      localStorage.setItem('tbc_current_session_id', sessionId);
    }
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

    // Count first names ONLY within this incoming batch.
    // Existing players in the database are intentionally excluded here — a player
    // already stored as "John D." should not force a fresh "John Smith" to become
    // "John S." just because they happen to share a first name across sessions.
    const incomingFirstNameCounts: Record<string, number> = {};
    for (const name of names) {
      const first = name.trim().split(' ')[0].toLowerCase();
      incomingFirstNameCounts[first] = (incomingFirstNameCounts[first] || 0) + 1;
    }

    // Build the display name for a raw input name.
    // A surname initial is added ONLY when this batch contains multiple people
    // with the same first name.
    const buildDisplayName = (fullName: string): string => {
      const parts = fullName.trim().split(' ').filter(n => n.length > 0);
      const first = parts[0];
      const secondWord = parts.length > 1 ? parts[1] : '';
      const key = first.toLowerCase();

      if ((incomingFirstNameCounts[key] ?? 0) > 1 && secondWord) {
        return `${first} ${secondWord.charAt(0).toUpperCase()}.`;
      }
      return first;
    };

    for (const fullName of names) {
      // Parse skill level from name format "Name - X" where X is a number
      let parsedName = fullName.trim();
      let parsedSkillLevel = 3; // default skill level
      
      const skillLevelMatch = parsedName.match(/-(\d+)\s*$/);
      if (skillLevelMatch) {
        const skillLevel = parseInt(skillLevelMatch[1]);
        if (skillLevel >= 1 && skillLevel <= 7) {
          parsedSkillLevel = skillLevel;
          // Remove the skill level suffix from the name
          parsedName = parsedName.replace(/-\d+\s*$/, '').trim();
        }
      }
      
      const displayName = buildDisplayName(parsedName);
      const incomingFirst = parsedName.split(' ')[0].toLowerCase();

      // 1. Check Firebase for existing player by display name
      let existingPlayer: Player | undefined;
      let existingPlayerId: string | undefined;

      try {
        const { db } = await import('@/firebase/config');
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        
        const playersRef = collection(db, 'players');
        const q = query(playersRef, where('name', '==', displayName));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const playerData = querySnapshot.docs[0].data() as Player;
          existingPlayerId = querySnapshot.docs[0].id;
          existingPlayer = { ...playerData, id: existingPlayerId };
        }
      } catch (e) {
        console.error('[ingestPlayersFromList] Error checking Firebase for existing player:', e);
      }

      // 2. If not found in Firebase, check local state by display name
      if (!existingPlayer) {
        existingPlayer = players.find(
          p => p.name.toLowerCase() === displayName.toLowerCase()
        );
      }

      // 3. When this is the only person with that first name in the batch, also
      //    try matching by first name alone in local state. This handles the case where the player
      //    was previously stored with an initial (e.g. "John B.") because there
      //    was another John at the time — they should be renamed back to "John".
      if (!existingPlayer && (incomingFirstNameCounts[incomingFirst] ?? 0) === 1) {
        existingPlayer = players.find(
          p => p.name.split(' ')[0].toLowerCase() === incomingFirst
        );
      }

      if (existingPlayer) {
        existingPlayersCount++;
        const updates: Partial<Player> = { lastAvailableAt: validTimestamp, status: 'available' };
        // Rename if the display name has changed (e.g. initial added/removed).
        if (existingPlayer.name !== displayName) {
          updates.name = displayName;
        }
        // Assign the player to the current session if they aren't already in it.
        if (currentSession?.id && existingPlayer.sessionId !== currentSession.id) {
          updates.sessionId = currentSession.id;
          updates.sessionIds = [
            ...new Set([...(existingPlayer.sessionIds || []), currentSession.id]),
          ];
        }
        
        // Use the Firebase ID if we found it there, otherwise use local ID
        const playerIdToUpdate = existingPlayerId || existingPlayer.id;
        updatePlayer(playerIdToUpdate, updates);

        // Sync the session assignment to Firestore.
        if (currentSession?.id) {
          try {
            const { db } = await import('@/firebase/config');
            const { importPlayerToSession: importFirestore } = await import('@/firebase/firestore/player-service');
            await importFirestore(db, playerIdToUpdate, currentSession.id);
          } catch (e) {
            console.error('[ingestPlayersFromList] Firestore session import error:', e);
          }
        }
      } else {
        newPlayersCount++;
        addPlayer({
          name: displayName,
          skillLevel: parsedSkillLevel,
          lastAvailableAt: validTimestamp,
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
      fees, paymentMethods, sessions, currentSession, defaultWinningScore, autoAdvanceEnabled, isPlayer: false, isOnline,
      canUndo, canRedo, undo, redo,
      addPlayer, updatePlayer, deletePlayer, addCourt, deleteCourt, updateCourt,
      startMatch, startTimer, updateMatchScore, endMatch, completeMatch: completeMatchAction, swapPlayer, assignMatchToCourt, createCourtAndAssignMatch, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod: deletePaymentMethodAction, refreshPaymentMethodsFromSupabase: refreshPaymentMethods, refreshSessionsFromSupabase: refreshSessions, resetDailyBoard, wipeAllData, deleteMatch, setDefaultWinningScore, setAutoAdvanceEnabled,
      createSession, endSession, restoreSession, getSession, getCurrentSession, selectSession, registerPlayerForSession, importPlayerToSession, ingestPlayersFromList, saveSessionFee,
      saveCalculatorData, setPlayerResting, setPlayerAvailable,
      getPlayerCountForSession: (sessionId: string) => players.filter(p => p.sessionId === sessionId).length,
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
