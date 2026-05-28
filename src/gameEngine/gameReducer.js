export const initialGameState = {
  pieces: {},

  turn: "goat",

  goatsPlaced: 0,

  goatsKilled: 0,

  selected: null,

  winner: null,

  moveHistory: [],
};

export function gameReducer(state, action) {
  switch (action.type) {
    case "RESET_GAME":
      return {
        ...initialGameState,

        pieces: {
          0: "tiger",
          3: "tiger",
          4: "tiger",
        },
      };
    case "SET_TURN":
      return {
        ...state,

        turn: action.payload,
      };
    case "MOVE_PIECE":
      return {
        ...state,

        pieces: action.payload.pieces,

        moveHistory: [
          ...state.moveHistory,

          {
            from: action.payload.from,

            to: action.payload.to,

            piece: action.payload.piece,

            timestamp: Date.now(),
          },
        ],
      };
    default:
      return state;
  }
}
