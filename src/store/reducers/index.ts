// Reducers take in the current state and an action and return a new state.
// They are responsible for processing all game logic.

import { Direction, computeCurrentFrame, introShipShiftValue, rectanglesOverlap, unitVector } from "../../utils";
import { GAMEOVER_RESTART_TIME, IGlobalState, activateAirlockButton, allCollidersFromState, initialGameState, resumeGameState, secondHomeEarth, updateAnimEventState } from "../classes";
import { MentalState, NonPlayer, Plant, ShieldButton, updateAirlockState, updateGardenerMoveState, updateNPCState, updatePlantState } from '../../entities';
import { Cat, updateCatState } from "../../entities/cat";
import { updateHeavenlyBodyState } from "../../entities/heavenlybody";
import {
  DOWN,
  INCREMENT_SCORE,
  LEFT,
  TICK,
  RESET,
  RESET_SCORE,
  RIGHT,
  TOGGLE_EQUIP,
  UP,
  USE_ITEM,
  STOP_WATERING,
  TOGGLE_FREEZE,
  STOP_RIGHT,
  STOP_LEFT,
  STOP_UP,
  STOP_DOWN,
  TOGGLE_DEBUG_CONTROL_COLLISION_RECTS,
  TOGGLE_DEBUG_CONTROL_POSITION_RECTS,
  TOGGLE_DEBUG_CONTROL_WATERING_RECTS,
  TOGGLE_DEBUG_CONTROL_FACING_RECTS,
  TOGGLE_DEBUG_CONTROL_EQUIP_RECTS,
  TOGGLE_DEBUG_CONTROL_INTERACTION_RECTS,
  TOGGLE_DEBUG_CONTROL_DISABLE_COLLISIONS,
  TOGGLE_GAME_AUDIO,
  ANY_KEY,
  TOGGLE_DEBUG_CONTROL_OXYGEN_DETAILS,
} from "../actions";
import { updateOxygenState } from "../../entities/oxygen";
import { Dialog, isDialogCurrentlyDisplayed, updateDialogState } from "../../scene/dialog";
import { CausaMortis } from "../../entities/skeleton";
import { updatePortalState } from "../../entities/portal";
import { GameScreen, updateAsteroids } from "../../scene";
import { getEvents } from "../classes/eventschedule";
// All actions/index.ts setters are handled here
const gameReducer = (state = initialGameState(computeCurrentFrame()), action: any) => {
  switch (action.type) {
    case RIGHT:                                   return newKeyDown(state, Direction.Right);
    case LEFT:                                    return newKeyDown(state, Direction.Left);
    case UP:                                      return newKeyDown(state, Direction.Up);
    case DOWN:                                    return newKeyDown(state, Direction.Down);
    case STOP_RIGHT:                              return newKeyUp(state, Direction.Right);
    case STOP_LEFT:                               return newKeyUp(state, Direction.Left);
    case STOP_UP:                                 return newKeyUp(state, Direction.Up);
    case STOP_DOWN:                               return newKeyUp(state, Direction.Down);
    case ANY_KEY:                                 return anyKeyDown(state);
    case TOGGLE_EQUIP:                            return toggleEquip(state);
    case USE_ITEM:                                return utiliseItem(state);
    case STOP_WATERING:                           return ceaseWatering(state);
    case TOGGLE_FREEZE:                           return toggleDrawStateFreeze(state);
    case RESET:                                   return initialGameState(computeCurrentFrame());
    case RESET_SCORE:                             return { ...state, score: 0 };
    case INCREMENT_SCORE:                         return { ...state, score: state.score + 1 };
    case TOGGLE_GAME_AUDIO:                       return toggleGameAudio(state);
    case TICK:                                    return updateFrame(state);
    case TOGGLE_DEBUG_CONTROL_OXYGEN_DETAILS:     return toggleDebugControlOxygenDetails(state);
    case TOGGLE_DEBUG_CONTROL_COLLISION_RECTS:    return toggleDebugControlCollisionRects(state);
    case TOGGLE_DEBUG_CONTROL_POSITION_RECTS:     return toggleDebugControlPositionRects(state);
    case TOGGLE_DEBUG_CONTROL_WATERING_RECTS:     return toggleDebugControlWateringRects(state);
    case TOGGLE_DEBUG_CONTROL_FACING_RECTS:       return toggleDebugControlFacingRects(state);
    case TOGGLE_DEBUG_CONTROL_EQUIP_RECTS:        return toggleDebugControlEquipRects(state);
    case TOGGLE_DEBUG_CONTROL_INTERACTION_RECTS:  return toggleDebugControlInteractionRects(state);
    case TOGGLE_DEBUG_CONTROL_DISABLE_COLLISIONS: return toggleDebugControlDisableCollisions(state);
    default:                                      return state;
  }
};


function anyKeyDown(state: IGlobalState): IGlobalState {
  if (state.gameover && state.currentFrame - state.gameoverFrame > GAMEOVER_RESTART_TIME ) {
    if (state.gameScreen === GameScreen.GAME_OVER) return initialGameState(computeCurrentFrame());
    return resumeGameState(state);
  }

  // In INTRO screen / view, pressing any key begins the ship/planet shit that will lead into PLAY screen / view.
  if ((state.gameScreen === GameScreen.INTRO) && (state.currentFrame < state.introShipShiftStart)) {
    return {
      ...state,
      introShipShiftStart: state.currentFrame,
    };
  }
  return state;
}

// Stop the gardener if the keyup direction matches the current gardener direction.
function newKeyUp(state: IGlobalState, direction: Direction): IGlobalState {
  var keysPressed = state.keysPressed;
  const index = keysPressed.indexOf(direction);
  if (index > -1) { // only splice array when item is found
    keysPressed.splice(index, 1); // 2nd parameter means remove one item only
  }
  // Only stop gardener if no keys are pressed.
  if (keysPressed.length === 0) {
    return { ...state, keysPressed: keysPressed, gardener: state.gardener.stop()}
  }
  // Update facing direction of gardener if new key is to the left or right.
  if (keysPressed[0] === Direction.Left || keysPressed[0] === Direction.Right) {
    return { ...state, keysPressed: keysPressed, gardener: state.gardener.changeFacingDirection(keysPressed[0])}
  }
  return {...state, keysPressed: keysPressed};
}

// Only move the gardener if the keypress changes the gardener direction.
function newKeyDown(state: IGlobalState, direction: Direction): IGlobalState {
  // This is a spurious keypress. Ignore it.
  if (ignoreKeyPress(direction, state.keysPressed)) {
    return state;
  }
  // Add the new keypress to the keysPressed array. New keypress must be first.
  const keys = [direction, ...state.keysPressed];
  // If keypress is to the left or right, update the gardener's facing direction.
  let gardener = state.gardener;
  if (direction === Direction.Left || direction === Direction.Right) {
    gardener = gardener.changeFacingDirection(direction);
  }
  gardener.moving = true;
  return {...state, keysPressed: keys, gardener: gardener};
}

function ignoreKeyPress(newDirection: Direction, keysPressed: Direction[]): boolean {
  // If key is the same as the current direction, ignore it.
  if (keysPressed[0] === newDirection) return true;
  return false;
}

// TODO: See if we can animate from within a saga instead of the way we're doing it now.
function updateFrame(state: IGlobalState): IGlobalState {
  let f = computeCurrentFrame();
  if (f === state.currentFrame) {
    return state;
  }

  // Get all the colliders as they exist now.
  state = {...state, currentFrame: f, colliderMap: allCollidersFromState(state)};
  
  state = updateGardenerMoveState(state);
 
  if (state.gardener.watering) state = utiliseItem(state);

  state = updateNPCState(state);

  state = updateCatState(state);

  state = updatePortalState(state);
  
  state = updateAirlockState(state);

  state = state.shieldDoors.updateState(state);

  // Some things only update in GameScreen.PLAY mode.
  if (state.gameScreen === GameScreen.PLAY) {

    state = updatePlantState(state);

    state = updateAnimEventState(state);

    state = updateAsteroids(state);

    state = updateOxygenState(state);

  };

  state = updateDialogState(state);

  state = updateHeavenlyBodyState(state);

  state = state.statusBar.updateStatusBarState(state);

  state = updateStarfieldDisplacement(state);

  state = updateGameScreen(state);

  return state;
}

// Update the current GameScreen (state.gameScreen) if it's time.
function updateGameScreen(state: IGlobalState): IGlobalState {
  switch (state.gameScreen) {
    case GameScreen.INTRO:
      if (introShipShiftValue(state) <= 0) {    // If the transition from INTRO to PLAY is done
        let now = state.currentFrame;           // The current time. Official beginning of game.
        return {
          ...state,
          gameScreen: GameScreen.PLAY,          // Switch GameScreen to PLAY.
          gameStartTime: now,                   // The game officially begins now.
          pendingEvents: getEvents(now),        // Schedule the full game AnimEvents.
          bigEarth: null,                       // Get rid of the big Earth.
        };
      } else return state;
    case GameScreen.PLAY:
      return state;
    case GameScreen.CONTINUE:
      return state;
    case GameScreen.GAME_OVER:
      return state;
    case GameScreen.OUTRO:                      // If we're in the OUTRO
      if (state.bigEarth === null) {            // And we haven't create the big Earth (II) yet
        return {
          ...state,
          bigEarth: secondHomeEarth(state),     // Create it
        };
      } else return state;
  }
}

// Update the displacement of the starfield.
function updateStarfieldDisplacement(state: IGlobalState): IGlobalState {
  let delta = unitVector(state.starfield.driftAngle).times(state.starfield.driftSpeed);
  return {
    ...state,
    starfield: {
      ...state.starfield,
      pos: state.starfield.pos.plus(delta.x, delta.y),
      //driftAngle: state.starfield.driftAngle + ((Math.random() - 0.5) * 0.4),
    },
  };
}

// Toggle debug control showCollisionRects from False to True or vice versa.
function toggleDebugControlOxygenDetails(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showOxygenDetails: !state.debugSettings.showOxygenDetails,
    },
  };
}

// Toggle debug control showCollisionRects from False to True or vice versa.
function toggleDebugControlCollisionRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showCollisionRects: !state.debugSettings.showCollisionRects,
    },
  };
}

// Toggle debug control showPositionRects from False to True or vice versa.
function toggleDebugControlPositionRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showPositionRects: !state.debugSettings.showPositionRects,
    },
  };
}

// Toggle debug control showWateringRects from False to True or vice versa.
function toggleDebugControlWateringRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showWateringRects: !state.debugSettings.showWateringRects,
    },
  };
}

// Toggle debug control showFacingRects from False to True or vice versa.
function toggleDebugControlFacingRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showFacingRects: !state.debugSettings.showFacingRects,
    },
  };
}

// Toggle debug control showEquipRects from False to True or vice versa.
function toggleDebugControlEquipRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showEquipRects: !state.debugSettings.showEquipRects,
    },
  };
}

// Toggle debug control showInteractionRects from False to True or vice versa.
function toggleDebugControlInteractionRects(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      showInteractionRects: !state.debugSettings.showInteractionRects,
    },
  };
}

// Toggle debug control disableCollisions from False to True or vice versa.
function toggleDebugControlDisableCollisions(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      collisionsDisabled: !state.debugSettings.collisionsDisabled,
    },
  };
}

// Change state's "muted" property from false to true or vice versa.
function toggleGameAudio(state: IGlobalState): IGlobalState {
  return {
    ...state,
    muted: !state.muted,
  };
}

// Attempt to equip item or drop current item/ skip dialog.
function toggleEquip(state: IGlobalState): IGlobalState {
  if (isDialogCurrentlyDisplayed(state)) {
    console.log("currently showing dialog");
    let dialogs : Dialog[] = state.dialogs;
    if(dialogs[0].skipAnimation) { 
      console.log("animation skipped, dismissing dialog");
      dialogs.shift();
      // Bring forward any stale dialogs so that their text animation doesn't get skipped.
      if(dialogs.length > 0 && dialogs[0].startFrame < state.currentFrame) dialogs[0].startFrame = state.currentFrame;
    }
    else {
      dialogs[0].skipAnimation = true;
    }
    return {...state, dialogs:dialogs};
  }
  if (state.gardener.itemEquipped) {
    return {
      ...state,
      gardener: state.gardener.setItemEquipped(false),
      wateringCan: state.wateringCan.layOnTheGround(),
    }
  }
  if (!canEquip(state)) {
    return state;
  }
  return {
      ...state,
      gardener: state.gardener.setItemEquipped(true),
      wateringCan: state.wateringCan.moveWithGardener(state.gardener),
  }
}

// Check whether or not an item can be equipped right now.
function canEquip(state: IGlobalState): boolean {
  // Rectangle for the direction the gardener is facing.
  let faceRect = state.gardener.facingDetectionRect(false); // Facing rect with no pulsating stretch factor.
  let rect = state.wateringCan.equipRect();
  return rectanglesOverlap(faceRect, rect);
}

// Use currently equipped item, if equipped, other use item that is nearby (like a button).
// Note: Named "utilise" instead of "use" because "useItem" exists elsewhere.
function utiliseItem(state: IGlobalState): IGlobalState {
  if (!state.gardener.itemEquipped) {
    return utiliseNearbyItem(state);
  }
  var newPlants: Plant[] = [];
  var newNPCs: NonPlayer[] = [];
  let faceRect = state.gardener.facingDetectionRect(true, state.currentFrame);  // Facing rect that is stretched to match pulsating water.

  // Water a single plant if close enough.
  let alreadyAbsorbed = false;
  for (let i = 0; i < state.plants.length; i++) {
    let plant = state.plants[i];
    let plantRect = plant.wateringRect();
    if (!alreadyAbsorbed && rectanglesOverlap(faceRect, plantRect)) {
      newPlants = [...newPlants, plant.absorbWater()];
      alreadyAbsorbed = true;
    } else newPlants = [...newPlants, plant];
  }

  // Cure a single NPC of cabin fever if close enough.
  let alreadyCured = false;
  for (let i = 0; i < state.npcs.length; i++) {
    let npc = state.npcs[i];
    if (npc.mentalState !== MentalState.Frazzled) {
      newNPCs = [...newNPCs, npc];
      continue;
    }
    let npcRect = npc.interactionRect();
    if (!alreadyCured && rectanglesOverlap(faceRect, npcRect)) {
      newNPCs = [...newNPCs, npc.cureCabinFever()];
    } else newNPCs = [...newNPCs, npc];
  }

  // Melt a single cat if close enough.
  let cats : Cat[] = [];
  let alreadyMelted = false;
  state.cats.forEach(cat => {
    if (!alreadyMelted && rectanglesOverlap(faceRect, cat.collisionRect())) {
      cat.dieOf(CausaMortis.Liquification, state.currentFrame);
    }
    cats = [...cats, cat];
  });

  let s = {
    ...state,
    plants: newPlants,
    npcs: newNPCs,
    gardener: state.gardener.setWatering(true),
  };
  return {
    ...s,
    colliderMap: allCollidersFromState(s),
  }
}

function utiliseNearbyItem(state: IGlobalState): IGlobalState {
  // Check for nearby airlock buttons.
  if (rectanglesOverlap(state.gardener.interactionRect(), state.airlockButton.interactionRect())) {
    return activateAirlockButton(state);
  }
  // Check for nearby shield buttons.
  let sb = getNearbyShieldButton(state);
  if (sb === undefined) {
    console.log("Nothing to interact with");
    return state;
  }
  return activateShieldButton(sb, state);
}

function getNearbyShieldButton(state: IGlobalState): ShieldButton | undefined {
  for (let i = 0; i < state.shieldButtons.length; i++) {
    let sb = state.shieldButtons[i];
    if (rectanglesOverlap(state.gardener.interactionRect(), sb.interactionRect())) return sb;
  }
  return undefined;
}

function activateShieldButton(sb: ShieldButton, state: IGlobalState): IGlobalState {
  console.log("Activating shield button");
  let newButtons: ShieldButton[] = [];
  state.shieldButtons.forEach(b => {
    if (b.index === sb.index) newButtons = [...newButtons, b.activate(state)];
    else newButtons = [...newButtons, b];
  });
  let newShield = state.shieldDoors.triggerDoor(sb.index);
  return {
    ...state,
    shieldButtons: newButtons,
    shieldDoors: newShield,
  };
}

// Set the gardener's "watering" boolean to false.
function ceaseWatering(state: IGlobalState): IGlobalState {
  return {
    ...state,
    gardener: state.gardener.setWatering(false),
  };
}

function toggleDrawStateFreeze(state: IGlobalState): IGlobalState {
  return {
    ...state,
    debugSettings: {
      ...state.debugSettings,
      freeze: !state.debugSettings.freeze,
    },
  }
}

export default gameReducer;
