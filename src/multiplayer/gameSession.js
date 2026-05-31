import { initialGameState } from "../gameEngine/initialGameState";

export function createGameSession() {
  return {
    roomId: null,

    players: [],

    status: "local",

    gameState: {
      ...initialGameState,
    },
  };
}
