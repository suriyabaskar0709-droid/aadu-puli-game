export function buildMoveEvent({ roomId, playerId, from, to, piece }) {
  return {
    type: "MOVE_PIECE",

    roomId,

    playerId,

    from,

    to,

    piece,

    timestamp: Date.now(),
  };
}
