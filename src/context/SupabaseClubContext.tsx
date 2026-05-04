'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Player, Court, Match, Fee, PaymentMethod, MatchStatus, PlayerSnapshot, Session, SessionParticipation } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { RealtimeChannel } from '@supabase/supabase-js'

interface ClubContextType {
  players: Player[]
  courts: Court[]
  matches: Match[]
  fees: Fee[]
  paymentMethods: PaymentMethod[]
  sessions: Session[]
  sessionParticipations: SessionParticipation[]
  defaultWinningScore: number
  autoAdvanceEnabled: boolean
  addPlayer: (player: Omit<Player, 'id' | 'wins' | 'gamesPlayed' | 'partnerHistory' | 'status' | 'improvementScore' | 'totalPlayTimeMinutes' | 'lastAvailableAt'>) => Promise<void>
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>
  deletePlayer: (id: string) => Promise<void>
  addCourt: (name?: string) => Promise<string>
  deleteCourt: (id: string) => Promise<void>
  startMatch: (match: Omit<Match, 'id' | 'timestamp' | 'isCompleted' | 'status' | 'teamASnapshots' | 'teamBSnapshots'>) => Promise<void>
  startTimer: (courtId: string) => Promise<void>
  updateMatchScore: (matchId: string, teamAScore: number, teamBScore: number) => Promise<void>
  endMatch: (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => Promise<void>
  swapPlayer: (matchId: string, oldPlayerId: string, newPlayerId: string) => Promise<void>
  assignMatchToCourt: (matchId: string, courtId: string) => Promise<void>
  createCourtAndAssignMatch: (matchId: string) => Promise<void>
  updateFee: (fee: Omit<Fee, 'payments'>) => Promise<void>
  togglePayment: (date: string, playerId: string) => Promise<void>
  addPaymentMethod: (name: string, imageData: string) => Promise<void>
  deletePaymentMethod: (id: string) => Promise<void>
  setDefaultWinningScore: (score: number) => Promise<void>
  setAutoAdvanceEnabled: (enabled: boolean) => Promise<void>
  resetDailyBoard: () => Promise<void>
  wipeAllData: () => Promise<void>
  deleteMatch: (matchId: string) => Promise<void>
  createSession: (sessionDate: string) => Promise<string>
  addPlayerToSession: (sessionId: string, playerId: string) => Promise<void>
  ingestPlayersFromList: (names: string[], sessionDate: string) => Promise<{ newPlayersCount: number; existingPlayersCount: number }>
}

const ClubContext = createContext<ClubContextType | undefined>(undefined)

export function SupabaseClubProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([])
  const [courts, setCourts] = useState<Court[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [fees, setFees] = useState<Fee[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionParticipations, setSessionParticipations] = useState<SessionParticipation[]>([])
  const [defaultWinningScore, setDefaultWinningScoreState] = useState<number>(21)
  const [autoAdvanceEnabled, setAutoAdvanceEnabledState] = useState<boolean>(true)
  const [isLoaded, setIsLoaded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
    setupRealtimeSubscription()
  }, [])

  const loadData = async () => {
    try {
      const [playersRes, courtsRes, matchesRes, feesRes, paymentMethodsRes, settingsRes, sessionsRes, sessionParticipationsRes] = await Promise.all([
        supabase.from('players').select('*'),
        supabase.from('courts').select('*'),
        supabase.from('matches').select('*').order('timestamp', { ascending: false }),
        supabase.from('fees').select('*'),
        supabase.from('payment_methods').select('*'),
        supabase.from('settings').select('*'),
        supabase.from('sessions').select('*').order('session_date', { ascending: false }),
        supabase.from('session_participation').select('*')
      ])

      if (playersRes.data) {
        setPlayers(playersRes.data.map(p => ({
          id: p.id,
          name: p.name,
          skillLevel: p.skill_level,
          wins: p.wins,
          gamesPlayed: p.games_played,
          partnerHistory: p.partner_history || [],
          status: p.status,
          improvementScore: p.improvement_score,
          totalPlayTimeMinutes: p.total_play_time_minutes,
          lastAvailableAt: p.last_available_at ? new Date(p.last_available_at).getTime() : undefined
        })))
      }

      if (courtsRes.data) {
        setCourts(courtsRes.data.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          currentMatchId: c.current_match_id
        })))
      }

      if (matchesRes.data) {
        setMatches(matchesRes.data.map(m => ({
          id: m.id,
          teamA: m.team_a,
          teamB: m.team_b,
          teamASnapshots: m.team_a_snapshots,
          teamBSnapshots: m.team_b_snapshots,
          teamAScore: m.team_a_score,
          teamBScore: m.team_b_score,
          courtId: m.court_id,
          timestamp: m.timestamp,
          startTime: m.start_time,
          endTime: m.end_time,
          isCompleted: m.is_completed,
          status: m.status,
          winner: m.winner
        })))
      }

      if (feesRes.data) {
        setFees(feesRes.data.map(f => ({
          id: f.id,
          shuttleFee: f.fee_type === 'shuttle' ? f.amount : 0,
          courtFee: f.fee_type === 'court' ? f.amount : 0,
          entranceFee: f.fee_type === 'entrance' ? f.amount : 0,
          qrCodeUrl: undefined,
          payments: { [f.player_id]: f.is_paid }
        })))
      }

      if (paymentMethodsRes.data) {
        setPaymentMethods(paymentMethodsRes.data.map(pm => ({
          id: pm.id,
          name: pm.name,
          imageUrl: pm.image_url
        })))
      }

      if (settingsRes.data) {
        const winningScore = settingsRes.data.find(s => s.key === 'default_winning_score')
        const autoAdvance = settingsRes.data.find(s => s.key === 'auto_advance_enabled')

        if (winningScore) setDefaultWinningScoreState(parseInt(winningScore.value))
        if (autoAdvance) setAutoAdvanceEnabledState(autoAdvance.value === 'true')
      }

      if (sessionsRes.data) {
        setSessions(sessionsRes.data.map(s => ({
          id: s.id,
          sessionDate: s.session_date,
          createdAt: new Date(s.created_at)
        })))
      }

      if (sessionParticipationsRes.data) {
        setSessionParticipations(sessionParticipationsRes.data.map(sp => ({
          id: sp.id,
          sessionId: sp.session_id,
          playerId: sp.player_id,
          createdAt: new Date(sp.created_at)
        })))
      }

      setIsLoaded(true)
    } catch (error) {
      console.error('Error loading data:', error)
      setIsLoaded(true)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue'
        },
        (payload) => {
          console.log('Queue change:', payload)
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const generateId = () => crypto.randomUUID()

  const addPlayer = async (data: any) => {
    const newPlayer: Player = {
      ...data,
      id: generateId(),
      wins: 0,
      gamesPlayed: 0,
      partnerHistory: [],
      status: 'available',
      improvementScore: 0,
      totalPlayTimeMinutes: 0,
      lastAvailableAt: Date.now()
    }

    const { error } = await supabase.from('players').insert({
      id: newPlayer.id,
      name: newPlayer.name,
      skill_level: newPlayer.skillLevel,
      wins: newPlayer.wins,
      games_played: newPlayer.gamesPlayed,
      partner_history: newPlayer.partnerHistory,
      status: newPlayer.status,
      improvement_score: newPlayer.improvementScore,
      total_play_time_minutes: newPlayer.totalPlayTimeMinutes,
      last_available_at: newPlayer.lastAvailableAt ? new Date(newPlayer.lastAvailableAt).toISOString() : null
    })

    if (!error) {
      setPlayers(prev => [...prev, newPlayer])
    }
  }

  const updatePlayer = async (id: string, updates: Partial<Player>) => {
    const { error } = await supabase.from('players').update({
      name: updates.name,
      skill_level: updates.skillLevel,
      wins: updates.wins,
      games_played: updates.gamesPlayed,
      partner_history: updates.partnerHistory,
      status: updates.status,
      improvement_score: updates.improvementScore,
      total_play_time_minutes: updates.totalPlayTimeMinutes,
      last_available_at: updates.lastAvailableAt ? new Date(updates.lastAvailableAt).toISOString() : null
    }).eq('id', id)

    if (!error) {
      setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p))
    }
  }

  const deletePlayer = async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id)
    if (!error) {
      setPlayers(prev => prev.filter(p => p.id !== id))
    }
  }

  const addCourt = async (name?: string) => {
    const courtNumbers = courts
      .map(c => parseInt(c.name.replace('Court ', '')))
      .filter(n => !isNaN(n))
    const nextNum = courtNumbers.length > 0 ? Math.max(...courtNumbers) + 1 : 1

    const id = generateId()
    const newCourt: Court = {
      id,
      name: name ? `Court ${name}` : `Court ${nextNum}`,
      status: 'available',
      currentMatchId: null
    }

    const { error } = await supabase.from('courts').insert(newCourt)
    if (!error) {
      setCourts(prev => [...prev, newCourt])
    }
    return id
  }

  const deleteCourt = async (id: string) => {
    const court = courts.find(c => c.id === id)
    if (court?.currentMatchId) {
      await deleteMatch(court.currentMatchId)
    }
    const { error } = await supabase.from('courts').delete().eq('id', id)
    if (!error) {
      setCourts(prev => prev.filter(c => c.id !== id))
    }
  }

  const startMatch = async (matchData: any) => {
    const newMatchId = generateId()
    let targetCourtId = matchData.courtId

    if (!targetCourtId) {
      const availableCourt = courts.find(c => c.status === 'available')
      if (availableCourt) {
        targetCourtId = availableCourt.id
      }
    }

    const teamASnapshots: PlayerSnapshot[] = matchData.teamA.map((id: string) => {
      const p = players.find(player => player.id === id)
      return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 }
    })

    const teamBSnapshots: PlayerSnapshot[] = matchData.teamB.map((id: string) => {
      const p = players.find(player => player.id === id)
      return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 }
    })

    const newMatch: Match = {
      ...matchData,
      id: newMatchId,
      courtId: targetCourtId,
      teamASnapshots,
      teamBSnapshots,
      timestamp: new Date().toISOString(),
      isCompleted: false,
      status: 'ongoing'
    }

    const { error } = await supabase.from('matches').insert({
      id: newMatch.id,
      team_a: newMatch.teamA,
      team_b: newMatch.teamB,
      team_a_snapshots: newMatch.teamASnapshots,
      team_b_snapshots: newMatch.teamBSnapshots,
      team_a_score: newMatch.teamAScore,
      team_b_score: newMatch.teamBScore,
      court_id: newMatch.courtId,
      timestamp: newMatch.timestamp,
      start_time: newMatch.startTime,
      end_time: newMatch.endTime,
      is_completed: newMatch.isCompleted,
      status: newMatch.status,
      winner: newMatch.winner
    })

    if (!error) {
      setMatches(prev => [newMatch, ...prev])

      if (targetCourtId) {
        await supabase.from('courts').update({ status: 'occupied', current_match_id: newMatchId }).eq('id', targetCourtId)
        setCourts(prev => prev.map(c =>
          c.id === targetCourtId
            ? { ...c, status: 'occupied', currentMatchId: newMatchId }
            : c
        ))
      }

      const playerUpdates = [...matchData.teamA, ...matchData.teamB].map(id =>
        supabase.from('players').update({ status: 'playing', last_available_at: null }).eq('id', id)
      )
      await Promise.all(playerUpdates)
      setPlayers(prev => prev.map(p =>
        [...matchData.teamA, ...matchData.teamB].includes(p.id)
          ? { ...p, status: 'playing', lastAvailableAt: undefined }
          : p
      ))
    }
  }

  const updateMatchScore = async (matchId: string, teamAScore: number, teamBScore: number) => {
    const { error } = await supabase.from('matches').update({ team_a_score: teamAScore, team_b_score: teamBScore }).eq('id', matchId)
    if (!error) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, teamAScore, teamBScore } : m))
    }
  }

  const endMatch = async (courtId: string, status: MatchStatus, winner?: 'teamA' | 'teamB', teamAScore?: number, teamBScore?: number) => {
    const court = courts.find(c => c.id === courtId)
    if (!court?.currentMatchId) return

    const match = matches.find(m => m.id === court.currentMatchId)
    if (!match) return

    const startTime = match.startTime ? new Date(match.startTime) : null
    const playDuration = startTime ? Math.floor((Date.now() - startTime.getTime()) / 60000) : 0

    const { error } = await supabase.from('matches').update({
      is_completed: status === 'completed',
      status,
      winner,
      team_a_score: teamAScore,
      team_b_score: teamBScore,
      end_time: new Date().toISOString()
    }).eq('id', court.currentMatchId)

    if (!error) {
      setMatches(prev => prev.map(m =>
        m.id === court.currentMatchId
          ? { ...m, isCompleted: status === 'completed', status, winner, teamAScore, teamBScore, endTime: new Date().toISOString() }
          : m
      ))

      await supabase.from('courts').update({ status: 'available', current_match_id: null }).eq('id', courtId)
      setCourts(prev => prev.map(c =>
        c.id === courtId ? { ...c, status: 'available', currentMatchId: null } : c
      ))

      const playerUpdates = [...match.teamA, ...match.teamB].map(playerId => {
        const p = players.find(player => player.id === playerId)
        if (!p) return null

        if (status === 'cancelled') {
          return supabase.from('players').update({ status: 'available', last_available_at: new Date().toISOString() }).eq('id', playerId)
        }

        const isTeamA = match.teamA.includes(playerId)
        const partnerId = isTeamA ? match.teamA.find(id => id !== playerId) : match.teamB.find(id => id !== playerId)
        const newHistory = partnerId ? [partnerId, ...p.partnerHistory].slice(0, 5) : p.partnerHistory

        let won = false
        if (winner) {
          won = (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA)
        } else if (teamAScore !== undefined && teamBScore !== undefined) {
          won = (teamAScore > teamBScore && isTeamA) || (teamBScore > teamAScore && !isTeamA)
        }

        return supabase.from('players').update({
          status: 'available',
          last_available_at: new Date().toISOString(),
          wins: (p.wins || 0) + (won ? 1 : 0),
          games_played: (p.gamesPlayed || 0) + 1,
          partner_history: newHistory,
          improvement_score: Math.max(0, (p.improvementScore || 0) + (won ? 5 : -2)),
          total_play_time_minutes: (p.totalPlayTimeMinutes || 0) + playDuration
        }).eq('id', playerId)
      }).filter(Boolean)

      await Promise.all(playerUpdates)

      setPlayers(prev => prev.map(p => {
        if (![...match.teamA, ...match.teamB].includes(p.id)) return p

        if (status === 'cancelled') {
          return { ...p, status: 'available', lastAvailableAt: Date.now() }
        }

        const isTeamA = match.teamA.includes(p.id)
        const partnerId = isTeamA ? match.teamA.find(id => id !== p.id) : match.teamB.find(id => id !== p.id)
        const newHistory = partnerId ? [partnerId, ...p.partnerHistory].slice(0, 5) : p.partnerHistory

        let won = false
        if (winner) {
          won = (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA)
        } else if (teamAScore !== undefined && teamBScore !== undefined) {
          won = (teamAScore > teamBScore && isTeamA) || (teamBScore > teamAScore && !isTeamA)
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
        }
      }))

      if (autoAdvanceEnabled && status === 'completed') {
        autoAdvanceToCourt(courtId)
      }
    }
  }

  const autoAdvanceToCourt = async (targetCourtId: string) => {
    const queue = matches
      .filter(m => !m.isCompleted && !m.courtId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    if (queue.length === 0) return

    const nextMatch = queue[0]

    await supabase.from('matches').update({ court_id: targetCourtId, status: 'ongoing' }).eq('id', nextMatch.id)
    setMatches(prev => prev.map(m =>
      m.id === nextMatch.id ? { ...m, courtId: targetCourtId, status: 'ongoing' as MatchStatus } : m
    ))

    await supabase.from('courts').update({ status: 'occupied', current_match_id: nextMatch.id }).eq('id', targetCourtId)
    setCourts(prev => prev.map(c =>
      c.id === targetCourtId
        ? { ...c, status: 'occupied', currentMatchId: nextMatch.id }
        : c
    ))
  }

  const deleteMatch = async (matchId: string) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return

    const playerUpdates = [...match.teamA, ...match.teamB].map(id =>
      supabase.from('players').update({ status: 'available', last_available_at: new Date().toISOString() }).eq('id', id)
    )
    await Promise.all(playerUpdates)

    if (match.courtId) {
      await supabase.from('courts').update({ status: 'available', current_match_id: null }).eq('id', match.courtId)
    }

    const { error } = await supabase.from('matches').delete().eq('id', matchId)
    if (!error) {
      setPlayers(prev => prev.map(p =>
        [...match.teamA, ...match.teamB].includes(p.id)
          ? { ...p, status: 'available', lastAvailableAt: Date.now() }
          : p
      ))

      if (match.courtId) {
        setCourts(prev => prev.map(c =>
          c.id === match.courtId ? { ...c, status: 'available', currentMatchId: null } : c
        ))
      }

      setMatches(prev => prev.filter(m => m.id !== matchId))
    }
  }

  const swapPlayer = async (matchId: string, oldPlayerId: string, newPlayerId: string) => {
    const match = matches.find(m => m.id === matchId)
    if (!match) return

    const p = players.find(player => player.id === newPlayerId)
    const newSnapshot = { id: newPlayerId, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 }

    const isTeamA = match.teamA.includes(oldPlayerId)
    const newTeamA = isTeamA ? match.teamA.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamA
    const newTeamB = !isTeamA ? match.teamB.map(id => id === oldPlayerId ? newPlayerId : id) : match.teamB

    const newTeamASnapshots = isTeamA ? match.teamASnapshots?.map(s => s.id === oldPlayerId ? newSnapshot : s) : match.teamASnapshots
    const newTeamBSnapshots = !isTeamA ? match.teamBSnapshots?.map(s => s.id === oldPlayerId ? newSnapshot : s) : match.teamBSnapshots

    const { error } = await supabase.from('matches').update({
      team_a: newTeamA,
      team_b: newTeamB,
      team_a_snapshots: newTeamASnapshots,
      team_b_snapshots: newTeamBSnapshots
    }).eq('id', matchId)

    if (!error) {
      setMatches(prev => prev.map(m => m.id === matchId ? {
        ...m,
        teamA: newTeamA,
        teamB: newTeamB,
        teamASnapshots: newTeamASnapshots,
        teamBSnapshots: newTeamBSnapshots
      } : m))

      await supabase.from('players').update({ status: 'available', last_available_at: new Date().toISOString() }).eq('id', oldPlayerId)
      await supabase.from('players').update({ status: 'playing', last_available_at: null }).eq('id', newPlayerId)

      setPlayers(prev => prev.map(p => {
        if (p.id === oldPlayerId) return { ...p, status: 'available', lastAvailableAt: Date.now() }
        if (p.id === newPlayerId) return { ...p, status: 'playing', lastAvailableAt: undefined }
        return p
      }))
    }
  }

  const assignMatchToCourt = async (matchId: string, courtId: string) => {
    await supabase.from('matches').update({ court_id: courtId, status: 'ongoing' }).eq('id', matchId)
    await supabase.from('courts').update({ status: 'occupied', current_match_id: matchId }).eq('id', courtId)

    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, courtId, status: 'ongoing' } : m))
    setCourts(prev => prev.map(c =>
      c.id === courtId
        ? { ...c, status: 'occupied', currentMatchId: matchId }
        : c
    ))
  }

  const createCourtAndAssignMatch = async (matchId: string) => {
    const newCourtId = await addCourt()
    await assignMatchToCourt(matchId, newCourtId)
  }

  const startTimer = async (courtId: string) => {
    const court = courts.find(c => c.id === courtId)
    if (court?.currentMatchId) {
      await supabase.from('matches').update({ start_time: new Date().toISOString() }).eq('id', court.currentMatchId)
      setMatches(prev => prev.map(m =>
        m.id === court.currentMatchId
          ? { ...m, startTime: new Date().toISOString() }
          : m
      ))
    }
  }

  const updateFee = async (data: any) => {
    const { error } = await supabase.from('fees').upsert({
      id: data.id,
      player_id: data.playerId || data.id,
      amount: data.shuttleFee + data.courtFee + data.entranceFee,
      is_paid: false,
      status: 'pending',
      fee_type: 'shuttle',
      date: new Date().toISOString().split('T')[0]
    })
    if (!error) {
      setFees(prev => {
        const exists = prev.find(f => f.id === data.id)
        if (exists) return prev.map(f => f.id === data.id ? { ...f, ...data } : f)
        return [...prev, { ...data, payments: {} }]
      })
    }
  }

  const togglePayment = async (date: string, playerId: string) => {
    const fee = fees.find(f => f.id === date)
    if (!fee) return

    const payments = { ...fee.payments }
    payments[playerId] = !payments[playerId]

    const { error } = await supabase.from('fees').update({ is_paid: payments[playerId] }).eq('id', date)
    if (!error) {
      setFees(prev => prev.map(f => {
        if (f.id !== date) return f
        return { ...f, payments }
      }))
    }
  }

  const addPaymentMethod = async (name: string, imageData: string) => {
    const newMethod: PaymentMethod = { id: generateId(), name, imageUrl: imageData }
    const { error } = await supabase.from('payment_methods').insert(newMethod)
    if (!error) {
      setPaymentMethods(prev => [...prev, newMethod])
    }
  }

  const deletePaymentMethod = async (id: string) => {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (!error) {
      setPaymentMethods(prev => prev.filter(pm => pm.id !== id))
    }
  }

  const setDefaultWinningScore = async (score: number) => {
    setDefaultWinningScoreState(score)
    await supabase.from('settings').update({ value: score.toString() }).eq('key', 'default_winning_score')
  }

  const setAutoAdvanceEnabled = async (enabled: boolean) => {
    setAutoAdvanceEnabledState(enabled)
    await supabase.from('settings').update({ value: enabled.toString() }).eq('key', 'auto_advance_enabled')
  }

  const resetDailyBoard = async () => {
    await Promise.all([
      supabase.from('matches').update({ is_completed: true, status: 'cancelled' }).eq('is_completed', false),
      supabase.from('players').update({
        status: 'available',
        wins: 0,
        games_played: 0,
        total_play_time_minutes: 0,
        partner_history: [],
        last_available_at: new Date().toISOString()
      }),
      supabase.from('courts').update({ status: 'available', current_match_id: null })
    ])

    setMatches(prev => prev.map(m => !m.isCompleted ? { ...m, isCompleted: true, status: 'cancelled' } : m))
    setPlayers(prev => prev.map(p => ({
      ...p,
      status: 'available',
      wins: 0,
      gamesPlayed: 0,
      totalPlayTimeMinutes: 0,
      partnerHistory: [],
      lastAvailableAt: Date.now()
    })))
    setCourts(prev => prev.map(c => ({ ...c, status: 'available', currentMatchId: null })))
  }

  const wipeAllData = async () => {
    await Promise.all([
      supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('courts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('fees').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('payment_methods').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    ])

    setPlayers([])
    setCourts([])
    setMatches([])
    setFees([])
    setPaymentMethods([])
    setSessions([])
    setSessionParticipations([])
    setDefaultWinningScoreState(21)
    setAutoAdvanceEnabledState(true)
  }

  const createSession = async (sessionDate: string): Promise<string> => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ session_date: sessionDate })
      .select()
      .single()

    if (error) throw error
    const newSession: Session = {
      id: data.id,
      sessionDate: data.session_date,
      createdAt: new Date(data.created_at)
    }
    setSessions(prev => [newSession, ...prev])
    return data.id
  }

  const addPlayerToSession = async (sessionId: string, playerId: string) => {
    const { error } = await supabase
      .from('session_participation')
      .select()
      .eq('session_id', sessionId)
      .eq('player_id', playerId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Record doesn't exist, insert it
      const { error: insertError } = await supabase
        .from('session_participation')
        .insert({ session_id: sessionId, player_id: playerId })

      if (insertError) throw insertError
      loadData()
    } else if (error) {
      throw error
    }
    // If record exists, do nothing (already linked)
  }

  const ingestPlayersFromList = async (names: string[], sessionDate: string) => {
    try {
      // Create or get session
      let sessionId = sessions.find(s => s.sessionDate === sessionDate)?.id
      if (!sessionId) {
        sessionId = await createSession(sessionDate)
      }

      // Parse names and handle uniqueness - filter empty lines and duplicates
      const uniqueNames = [...new Set(names.map(n => n.trim()).filter(n => n.length > 0))]
      const nameMap = new Map<string, { firstName: string; lastName: string; fullName: string }>()
      const firstNameCount = new Map<string, number>()

      uniqueNames.forEach(name => {
        const trimmed = name.trim()
        if (!trimmed) return

        const parts = trimmed.split(' ')
        const firstName = parts[0]
        const lastName = parts.slice(1).join(' ')
        const fullName = trimmed

        nameMap.set(fullName, { firstName, lastName, fullName })
        firstNameCount.set(firstName, (firstNameCount.get(firstName) || 0) + 1)
      })

      // Check database for existing players by full_name
      const fullNamesToCheck = Array.from(nameMap.keys())
      const { data: existingDbPlayers, error: queryError } = await supabase
        .from('players')
        .select('id, name, full_name')
        .in('full_name', fullNamesToCheck)

      if (queryError) {
        console.error('Error querying existing players:', queryError)
        throw queryError
      }

      const existingPlayersMap = new Map(existingDbPlayers?.map(p => [p.full_name, p]) || [])

      // Generate display names with uniqueness check
      const playersToUpsert: { full_name: string; display_name: string; name: string }[] = []
      let existingPlayersCount = 0
      const playersToLink: string[] = []

      for (const [fullName, nameData] of nameMap) {
        const { firstName, lastName } = nameData
        let displayName = firstName

        // If duplicate first name, append surname initial
        if ((firstNameCount.get(firstName) || 0) > 1 && lastName) {
          displayName = `${firstName} ${lastName.charAt(0)}.`
        }

        // Check if player already exists in database by full_name
        const existingDbPlayer = existingPlayersMap.get(fullName)
        if (existingDbPlayer) {
          // Link existing player to session
          playersToLink.push(existingDbPlayer.id)
          existingPlayersCount++
        } else {
          // Mark for upsert
          playersToUpsert.push({
            full_name: fullName,
            display_name: displayName,
            name: displayName // Use display_name as the main name field for now
          })
        }
      }

      // Link existing players to session (ignore duplicates)
      if (playersToLink.length > 0) {
        for (const playerId of playersToLink) {
          await addPlayerToSession(sessionId, playerId)
        }
      }

      // Batch upsert new players using upsert to handle duplicates
      let newPlayersCount = 0

      if (playersToUpsert.length > 0) {
        const { data: newPlayers, error } = await supabase
          .from('players')
          .upsert(playersToUpsert.map(p => ({
            name: p.name,
            full_name: p.full_name,
            display_name: p.display_name,
            skill_level: 3,
            wins: 0,
            games_played: 0,
            partner_history: [],
            status: 'available',
            improvement_score: 0,
            total_play_time_minutes: 0
          })), {
            onConflict: 'full_name',
            ignoreDuplicates: false
          })
          .select()

        if (error) throw error

        newPlayersCount = newPlayers?.length || 0

        // Link new players to session
        if (newPlayers) {
          for (const player of newPlayers) {
            await addPlayerToSession(sessionId, player.id)
          }
        }

        loadData()
      }

      return { newPlayersCount, existingPlayersCount }
    } catch (error: any) {
      // 1. Log properties individually as strings
      console.error('Error Code:', error.code);
      console.error('Error Message:', error.message);
      console.error('Error Details:', error.details);

      // 2. Force full serialization for the console
      console.log('JSON Error:', JSON.stringify(error, null, 2));

      throw error;
    }
  }

  if (!isLoaded) {
    return <SplashScreen />
  }

  return (
    <ClubContext.Provider value={{
      players, courts, matches, fees, paymentMethods, sessions, sessionParticipations, defaultWinningScore, autoAdvanceEnabled,
      addPlayer, updatePlayer, deletePlayer, addCourt, deleteCourt,
      startMatch, startTimer, updateMatchScore, endMatch, swapPlayer, assignMatchToCourt, createCourtAndAssignMatch, updateFee, togglePayment,
      addPaymentMethod, deletePaymentMethod, resetDailyBoard, wipeAllData, deleteMatch, setDefaultWinningScore, setAutoAdvanceEnabled,
      createSession, addPlayerToSession, ingestPlayersFromList
    }}>
      {children}
    </ClubContext.Provider>
  )
}

export function useSupabaseClub() {
  const context = useContext(ClubContext)
  if (context === undefined) {
    throw new Error('useSupabaseClub must be used within a SupabaseClubProvider')
  }
  return context
}
