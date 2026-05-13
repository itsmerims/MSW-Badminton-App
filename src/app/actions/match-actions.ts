'use server'

import { db } from '@/firebase/config'
import { collection, getDocs, query, where, doc, setDoc, updateDoc, addDoc, limit as fbLimit } from 'firebase/firestore'
import { revalidatePath } from 'next/cache'

export async function createQuickMatch() {
  // Get available players
  const playersSnap = await getDocs(query(collection(db, 'players'), where('status', '==', 'available')))
  const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

  // Get available courts
  const courtsSnap = await getDocs(query(collection(db, 'courts'), where('status', '==', 'available')))
  const courts = courtsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[]

  if (players.length < 4) {
    return { error: 'Need at least 4 available players' }
  }

  const selectedPlayers = players.slice(0, 4)
  const targetCourt = courts[0]

  const teamA = [selectedPlayers[0].id, selectedPlayers[1].id]
  const teamB = [selectedPlayers[2].id, selectedPlayers[3].id]

  const matchId = Math.random().toString(36).substr(2, 9)
  const matchData = {
    id: matchId,
    teamA,
    teamB,
    teamASnapshots: selectedPlayers.slice(0, 2).map(p => ({ id: p.id, name: p.name, skillLevel: p.skillLevel })),
    teamBSnapshots: selectedPlayers.slice(2, 4).map(p => ({ id: p.id, name: p.name, skillLevel: p.skillLevel })),
    courtId: targetCourt?.id || null,
    timestamp: new Date().toISOString(),
    isCompleted: false,
    status: 'ongoing'
  }

  await setDoc(doc(db, 'matches', matchId), matchData)

  // Update player statuses
  for (const id of [...teamA, ...teamB]) {
    await updateDoc(doc(db, 'players', id), { status: 'playing', lastAvailableAt: null })
  }

  // Update court status
  if (targetCourt) {
    await updateDoc(doc(db, 'courts', targetCourt.id), { status: 'occupied', currentMatchId: matchId })
  }

  revalidatePath('/')
  revalidatePath('/courts')

  return { success: true, matchId, courtId: targetCourt?.id }
}

export async function createManualMatch(teamA: string[], teamB: string[], courtId?: string) {
  if (teamA.length !== 2 || teamB.length !== 2) {
    return { error: 'Each team must have exactly 2 players' }
  }

  // Get player details for snapshots
  const allIds = [...teamA, ...teamB]
  const playersData: any[] = []
  for (const id of allIds) {
    const snap = await getDocs(query(collection(db, 'players'), where('id', '==', id)))
    if (!snap.empty) playersData.push({ id: snap.docs[0].id, ...snap.docs[0].data() })
  }

  const teamASnapshots = teamA.map(id => {
    const p = playersData.find(pd => pd.id === id)
    return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 }
  })

  const teamBSnapshots = teamB.map(id => {
    const p = playersData.find(pd => pd.id === id)
    return { id, name: p?.name || 'Unknown', skillLevel: p?.skillLevel || 3 }
  })

  // If courtId is not provided, find an available court
  let targetCourtId = courtId
  if (!targetCourtId) {
    const courtsSnap = await getDocs(query(collection(db, 'courts'), where('status', '==', 'available')))
    if (!courtsSnap.empty) {
      targetCourtId = courtsSnap.docs[0].id
    }
  }

  const matchId = Math.random().toString(36).substr(2, 9)
  const matchData = {
    id: matchId,
    teamA,
    teamB,
    teamASnapshots,
    teamBSnapshots,
    courtId: targetCourtId || null,
    timestamp: new Date().toISOString(),
    isCompleted: false,
    status: targetCourtId ? 'ongoing' : 'queued'
  }

  await setDoc(doc(db, 'matches', matchId), matchData)

  // Update player statuses
  for (const id of [...teamA, ...teamB]) {
    await updateDoc(doc(db, 'players', id), { status: 'playing', lastAvailableAt: null })
  }

  // Update court status
  if (targetCourtId) {
    await updateDoc(doc(db, 'courts', targetCourtId), { status: 'occupied', currentMatchId: matchId })
  }

  revalidatePath('/')
  revalidatePath('/courts')

  return { success: true, matchId, courtId: targetCourtId }
}
