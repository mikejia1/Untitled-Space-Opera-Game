//Actions for the game. Constraint logic is performed here, and if action is illegal, it is ignored.
export const RIGHT = "RIGHT";
export const LEFT = "LEFT";
export const UP = "UP";
export const DOWN = "DOWN";
export const STOP_RIGHT = "STOP_RIGHT";
export const STOP_LEFT = "STOP_LEFT";
export const STOP_UP = "STOP_UP";
export const STOP_DOWN = "STOP_DOWN";
export const ANY_KEY = "ANY_KEY";
export const RESET = "RESET";
export const STOP_GAME = "STOP_GAME";
export const INCREMENT_SCORE = "INCREMENT_SCORE";
export const RESET_SCORE = "RESET_SCORE";
export const TOGGLE_EQUIP = "TOGGLE_EQUIP";
export const USE_ITEM = "USE_ITEM";
export const TICK = "TICK";
export const STOP_WATERING = "STOP_WATERING";
export const TOGGLE_FREEZE = "TOGGLE_FREEZE";
export const TOGGLE_GAME_AUDIO = "TOGGLE_GAME_AUDIO";


export const TOGGLE_DEBUG_CONTROL_OXYGEN_DETAILS = "TOGGLE_DEBUG_CONTROL_OXYGEN_DETAILS";
export const TOGGLE_DEBUG_CONTROL_COLLISION_RECTS = "TOGGLE_DEBUG_CONTROL_COLLISION_RECTS";
export const TOGGLE_DEBUG_CONTROL_POSITION_RECTS = "TOGGLE_DEBUG_CONTROL_POSITION_RECTS";
export const TOGGLE_DEBUG_CONTROL_WATERING_RECTS = "TOGGLE_DEBUG_CONTROL_WATERING_RECTS";
export const TOGGLE_DEBUG_CONTROL_FACING_RECTS = "TOGGLE_DEBUG_CONTROL_FACING_RECTS";
export const TOGGLE_DEBUG_CONTROL_EQUIP_RECTS = "TOGGLE_DEBUG_CONTROL_EQUIP_RECTS";
export const TOGGLE_DEBUG_CONTROL_INTERACTION_RECTS = "TOGGLE_DEBUG_CONTROL_INTERACTION_RECTS";
export const TOGGLE_DEBUG_CONTROL_DISABLE_COLLISIONS = "TOGGLE_DEBUG_CONTROL_DISABLE_COLLISIONS";

export const makeMove = (move: string) => ({
  type: move,
});

export const anyKey = () => ({
  type: ANY_KEY,
});

export const stopWatering = () => ({
  type: STOP_WATERING
});

export const toggleFreeze = () => ({
  type: TOGGLE_FREEZE
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

export const toggleShowOxygenDetails= () => ({
  type: TOGGLE_DEBUG_CONTROL_OXYGEN_DETAILS
});

export const toggleShowCollisionRects = () => ({
  type: TOGGLE_DEBUG_CONTROL_COLLISION_RECTS
});

export const toggleShowPositionRects = () => ({
  type: TOGGLE_DEBUG_CONTROL_POSITION_RECTS
});

export const toggleShowWateringRects = () => ({
  type: TOGGLE_DEBUG_CONTROL_WATERING_RECTS
});

export const toggleShowFacingRects = () => ({
  type: TOGGLE_DEBUG_CONTROL_FACING_RECTS
});

export const toggleShowEquipRects = () => ({
  type: TOGGLE_DEBUG_CONTROL_EQUIP_RECTS
});

export const toggleShowInteractionRects = () => ({
  type: TOGGLE_DEBUG_CONTROL_INTERACTION_RECTS
});

export const toggleDisableCollisions = () => ({
  type: TOGGLE_DEBUG_CONTROL_DISABLE_COLLISIONS
});

export const toggleGameAudio = () => ({
  type: TOGGLE_GAME_AUDIO
});

// An animation loop event that updates state.currentFrame.
export const tick = () => ({type: TICK});