import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/firebase/firestore";
import { Player } from "@/types/player";

const playersCollection = collection(db, "players");

export async function createPlayer(
  player: Omit<Player, "id" | "createdAt" | "updatedAt">
) {
  const docRef = await addDoc(playersCollection, {
    ...player,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function getPlayers(): Promise<Player[]> {
  const q = query(
    playersCollection,
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Player[];
}

export async function getPlayer(
  playerId: string
): Promise<Player | null> {

  const playerRef = doc(
    db,
    "players",
    playerId
  );

  const snapshot = await getDoc(playerRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Player;
}