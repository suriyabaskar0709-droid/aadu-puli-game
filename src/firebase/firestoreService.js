import { getFirestore, doc, setDoc } from "firebase/firestore";

import { app } from "./firebaseConfig";

const db = getFirestore(app);

export async function createRoomInFirestore(room) {
  await setDoc(doc(db, "rooms", room.roomId), room);

  return room;
}
