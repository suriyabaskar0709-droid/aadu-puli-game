import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  onSnapshot,
} from "firebase/firestore";

import { app } from "./firebaseConfig";

const db = getFirestore(app);

export async function createRoomInFirestore(room) {
  await setDoc(doc(db, "rooms", room.roomId), room);
  return room;
}

export async function getRoomFromFirestore(roomId) {
  const roomRef = doc(db, "rooms", roomId);
  const snapshot = await getDoc(roomRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data();
}

export async function joinRoomInFirestore(roomId, player) {
  const roomRef = doc(db, "rooms", roomId);

  await updateDoc(roomRef, {
    players: arrayUnion(player),
    status: "playing",
    matchStarted: true,
  });
}

export function listenToRoom(roomId, callback, onError) {
  return onSnapshot(
    doc(db, "rooms", roomId),
    (snapshot) => {
      if (!snapshot.exists()) {
        return;
      }
      callback(snapshot.data());
    },
    (error) => {
      console.error("Firestore listener error:", error);
      if (onError) onError(error);
    },
  );
}

export async function updateGameState(roomId, gameState) {
  const roomRef = doc(db, "rooms", roomId);

  await updateDoc(roomRef, {
    gameState: {
      ...gameState,
      updatedAt: Date.now(),
    },
  });
}
