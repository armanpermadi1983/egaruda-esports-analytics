import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";
import { PlayerMatchStats } from "@/types/player-stats";


// =========================================================
// COLLECTION
// =========================================================

const playerStatsCollection = collection(
  db,
  "playerStats"
);


// =========================================================
// CREATE PLAYER MATCH STATS
// =========================================================

export async function createPlayerMatchStats(
  stats: Omit<PlayerMatchStats, "id" | "createdAt">
) {
  const docRef = await addDoc(
    playerStatsCollection,
    {
      ...stats,
      createdAt: serverTimestamp(),
    }
  );

  return docRef.id;
}


// =========================================================
// GET ALL PLAYER MATCH STATS
// =========================================================

export async function getPlayerMatchStats(): Promise<
  PlayerMatchStats[]
> {
  const snapshot = await getDocs(
    playerStatsCollection
  );

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerMatchStats[];
}


// =========================================================
// GET STATS BY MATCH
// =========================================================

export async function getPlayerStatsByMatch(
  matchId: string
): Promise<PlayerMatchStats[]> {

  const q = query(
    playerStatsCollection,
    where("matchId", "==", matchId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerMatchStats[];
}


// =========================================================
// GET STATS BY PLAYER
// =========================================================

export async function getPlayerStatsByPlayer(
  playerId: string
): Promise<PlayerMatchStats[]> {

  const q = query(
    playerStatsCollection,
    where("playerId", "==", playerId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PlayerMatchStats[];
}


// =========================================================
// GET SINGLE PLAYER MATCH STATS
// =========================================================

export async function getPlayerMatchStatsById(
  statsId: string
): Promise<PlayerMatchStats | null> {

  const statsRef = doc(
    db,
    "playerStats",
    statsId
  );

  const snapshot = await getDoc(statsRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as PlayerMatchStats;
}


// =========================================================
// UPDATE PLAYER MATCH STATS
// =========================================================

export async function updatePlayerMatchStats(
  statsId: string,
  stats: Partial<
    Omit<PlayerMatchStats, "id" | "createdAt">
  >
) {

  const statsRef = doc(
    db,
    "playerStats",
    statsId
  );

  await updateDoc(
    statsRef,
    stats
  );
}