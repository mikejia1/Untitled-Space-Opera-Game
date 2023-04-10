//Actions for the game. Constraint logic is performed here, and if action is illegal, it is ignored.
export const RIGHT = "RIGHT";
export const LEFT = "LEFT";
export const UP = "UP";
export const DOWN = "DOWN";

export const RESET = "RESET";
export const STOP_GAME = "STOP_GAME";
export const INCREMENT_SCORE = "INCREMENT_SCORE";
export const RESET_SCORE = "RESET_SCORE";
export const TOGGLE_EQUIP = "TOGGLE_EQUIP";
export const USE_ITEM = "USE_ITEM";
export const TICK = "TICK";

export const makeMove = (dx: number, dy: number, move: string) => ({
  type: move,
  payload: [dx, dy]
});

export const resetGame = () => ({
  type: RESET
});

export const stopGame = () => ({
  type: STOP_GAME
});

export const scoreUpdates = (type: string) => ({
  type
});

export const toggleEquip = () => ({
  type: TOGGLE_EQUIP
})

export const useItem = () => ({
  type: USE_ITEM
});

// An animation loop event that updates state.currentFrame.
export const tick = () => ({type: TICK});