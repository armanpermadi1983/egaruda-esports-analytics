import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/firestore";

export interface AiCacheData {
  id: string;
  type: "player" | "chemistry" | "monthly";
  analysis: string;
  matchCount: number;
  updatedAt?: any;
}

export async function getAiCache(id: string): Promise<AiCacheData | null> {
  const cacheRef = doc(db, "aiCache", id);
  const snapshot = await getDoc(cacheRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as AiCacheData;
}

export async function setAiCache(
  id: string,
  type: "player" | "chemistry" | "monthly",
  analysis: string,
  matchCount: number
): Promise<void> {
  const cacheRef = doc(db, "aiCache", id);
  await setDoc(cacheRef, {
    type,
    analysis,
    matchCount,
    updatedAt: serverTimestamp(),
  });
}

// Helpers to generate consistent IDs

export function getPlayerCacheId(playerId: string, comparePlayerId?: string): string {
  if (comparePlayerId) {
    // Sort IDs to ensure A-vs-B is the same as B-vs-A
    const sorted = [playerId, comparePlayerId].sort();
    return `compare_${sorted[0]}_${sorted[1]}`;
  }
  return `player_${playerId}`;
}

export function getChemistryCacheId(playerAId: string, playerBId: string): string {
  const sorted = [playerAId, playerBId].sort();
  return `chemistry_${sorted[0]}_${sorted[1]}`;
}

export function getMonthlyCacheId(monthYear: string): string {
  return `monthly_${monthYear}`;
}
