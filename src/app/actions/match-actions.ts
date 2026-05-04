'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createQuickMatch() {
  const supabase = await createClient()
  
  // Get available players and courts
  const [playersRes, courtsRes] = await Promise.all([
    supabase.from('players').select('*').eq('status', 'available'),
    supabase.from('courts').select('*').eq('status', 'available')
  ])

  if (playersRes.error) throw new Error('Failed to fetch players')
  if (courtsRes.error) throw new Error('Failed to fetch courts')

  const players = playersRes.data || []
  const courts = courtsRes.data || []

  if (players.length < 4) {
    return { error: 'Need at least 4 available players' }
  }

  // Simple deterministic matchmaking (first 4 available players)
  const selectedPlayers = players.slice(0, 4)
  const targetCourt = courts[0]

  const teamA = [selectedPlayers[0].id, selectedPlayers[1].id]
  const teamB = [selectedPlayers[2].id, selectedPlayers[3].id]

  // Create match
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .insert({
      team_a: teamA,
      team_b: teamB,
      team_a_snapshots: selectedPlayers.slice(0, 2).map(p => ({ id: p.id, name: p.name, skillLevel: p.skill_level })),
      team_b_snapshots: selectedPlayers.slice(2, 4).map(p => ({ id: p.id, name: p.name, skillLevel: p.skill_level })),
      court_id: targetCourt?.id || null,
      timestamp: new Date().toISOString(),
      is_completed: false,
      status: 'ongoing'
    })
    .select()
    .single()

  if (matchError) throw new Error('Failed to create match')

  // Update player statuses
  await supabase
    .from('players')
    .update({ status: 'playing', last_available_at: null })
    .in('id', [...teamA, ...teamB])

  // Update court status if court assigned
  if (targetCourt) {
    await supabase
      .from('courts')
      .update({ status: 'occupied', current_match_id: matchData.id })
      .eq('id', targetCourt.id)
  }

  revalidatePath('/')
  revalidatePath('/courts')
  
  return { success: true, matchId: matchData.id, courtId: targetCourt?.id }
}

export async function createManualMatch(teamA: string[], teamB: string[], courtId?: string) {
  const supabase = await createClient()

  if (teamA.length !== 2 || teamB.length !== 2) {
    return { error: 'Each team must have exactly 2 players' }
  }

  // Get player details for snapshots
  const { data: playersData, error: playersError } = await supabase
    .from('players')
    .select('*')
    .in('id', [...teamA, ...teamB])

  if (playersError) throw new Error('Failed to fetch players')

  const teamASnapshots = teamA.map(id => {
    const p = playersData?.find(pd => pd.id === id)
    return { id, name: p?.name || 'Unknown', skillLevel: p?.skill_level || 3 }
  })

  const teamBSnapshots = teamB.map(id => {
    const p = playersData?.find(pd => pd.id === id)
    return { id, name: p?.name || 'Unknown', skillLevel: p?.skill_level || 3 }
  })

  // If courtId is not provided, find an available court
  let targetCourtId = courtId
  if (!targetCourtId) {
    const { data: availableCourt } = await supabase
      .from('courts')
      .select('*')
      .eq('status', 'available')
      .limit(1)
      .single()
    targetCourtId = availableCourt?.id
  }

  // Create match
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .insert({
      team_a: teamA,
      team_b: teamB,
      team_a_snapshots: teamASnapshots,
      team_b_snapshots: teamBSnapshots,
      court_id: targetCourtId || null,
      timestamp: new Date().toISOString(),
      is_completed: false,
      status: targetCourtId ? 'ongoing' : 'queued'
    })
    .select()
    .single()

  if (matchError) throw new Error('Failed to create match')

  // Update player statuses
  await supabase
    .from('players')
    .update({ status: 'playing', last_available_at: null })
    .in('id', [...teamA, ...teamB])

  // Update court status if court assigned
  if (targetCourtId) {
    await supabase
      .from('courts')
      .update({ status: 'occupied', current_match_id: matchData.id })
      .eq('id', targetCourtId)
  }

  revalidatePath('/')
  revalidatePath('/courts')
  
  return { success: true, matchId: matchData.id, courtId: targetCourtId }
}
