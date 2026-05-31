import {
  SET_TURN,
  MOVE_PIECE,
  SET_WINNER,
  SET_GOATS_KILLED,
  SET_GOATS_PLACED,
  RESET_GAME,
} from "./gameTypes";

export const resetGameAction = () => ({
  type: RESET_GAME,
});

export const setTurnAction = (turn) => ({
  type: SET_TURN,
  payload: turn,
});

export const setWinnerAction = (winner) => ({
  type: SET_WINNER,
  payload: winner,
});

export const setGoatsKilledAction = (count) => ({
  type: SET_GOATS_KILLED,
  payload: count,
});

export const setGoatsPlacedAction = (count) => ({
  type: SET_GOATS_PLACED,
  payload: count,
});

export const movePieceAction = (pieces, from, to, piece) => ({
  type: MOVE_PIECE,

  payload: {
    pieces,
    from,
    to,
    piece,
  },
});
