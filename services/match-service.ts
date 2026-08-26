import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";
import { Match } from "@/types/match";

const matchesCollection = collection(db, "matches");

// =========================================================
// CREATE MATCH
// =========================================================

export async function createMatch(
  match: Omit<Match, "id" | "createdAt">
) {
  const docRef = await addDoc(matchesCollection, {
    ...match,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

// =========================================================
// GET ALL MATCHES
// =========================================================

export async function getMatches(): Promise<Match[]> {
  const q = query(
    matchesCollection,
    orderBy("matchDate", "desc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Match[];
}

// =========================================================
// GET SINGLE MATCH
// =========================================================

export async function getMatch(
  matchId: string
): Promise<Match | null> {
  const matchRef = doc(
    db,
    "matches",
    matchId
  );

  const snapshot = await getDoc(matchRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Match;
}

// =========================================================
// UPDATE SCREENSHOTS
// =========================================================

export async function updateMatchScreenshots(
  matchId: string,
  screenshotUrls: string[]
) {
  const matchRef = doc(
    db,
    "matches",
    matchId
  );

  await updateDoc(matchRef, {
    screenshotUrls,
  });
}