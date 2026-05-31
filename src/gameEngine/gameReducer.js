import {
  SET_TURN,
  MOVE_PIECE,
  SET_WINNER,
  SET_GOATS_KILLED,
  SET_GOATS_PLACED,
  RESET_GAME,
} from "./gameTypes";
import { initialGameState } from "./initialGameState";

export function gameReducer(state, action) {
  switch (action.type) {
    case RESET_GAME:
      return {
        ...initialGameState,

        pieces: {
          0: "tiger",
          3: "tiger",
          4: "tiger",
        },
      };
    case SET_TURN:
      return {
        ...state,

        turn: action.payload,
      };
    case MOVE_PIECE:
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
    case SET_WINNER:
      return {
        ...state,
        winner: action.payload,
      };

    case SET_GOATS_KILLED:
      return {
        ...state,
        goatsKilled: action.payload,
      };

    case SET_GOATS_PLACED:
      return {
        ...state,
        goatsPlaced: action.payload,
      };
    default:
      return state;
  }
}
