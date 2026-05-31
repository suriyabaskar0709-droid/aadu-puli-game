export function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createRoom() {
  return {
    roomId: generateRoomCode(),

    players: [],

    status: "waiting",

    createdAt: Date.now(),
  };
}
