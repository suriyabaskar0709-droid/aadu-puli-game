export function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function createInitialBoardState() {
  return {
    pieces: {
      0: "tiger",
      3: "tiger",
      4: "tiger",
    },
    turn: "goat",
    goatsPlaced: 0,
    goatsKilled: 0,
    winner: null,
    updatedAt: Date.now(),
  };
}

export function createRoom(players = []) {
  return {
    roomId: generateRoomCode(),
    players: players || [],
    status: "waiting",
    createdAt: Date.now(),
    gameState: createInitialBoardState(),
    currentTurn: "goat",
    matchStarted: false,
  };
}
