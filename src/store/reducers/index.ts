// Reducers take in the current state and an action and return a new state.
// They are responsible for processing all game logic.

import { computeCurrentFrame, worldBoundaryColliders } from "../../utils";
import { Coord, Plant, Gardener, Collider, INITIAL_PLANT_HEALTH, GARDENER_HEIGHT } from "../classes";
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
  STOP,
} from "../actions";

// The number of pixels wide/tall a single spot on the grid occupies.
export const TILE_WIDTH = 20;
export const TILE_HEIGHT = 5;
// The number of pixels left/right/up/down that the gardener moves on WASD input.
export const MOVE_HORZ = 5;
export const MOVE_VERT = 5;

// An enum for the directions.
export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

// Interface for full game state object.
export interface IGlobalState {
  gardener: Gardener;            // The gardener tending the garden. Controlled by the player.
  score: number;                 // The current game score
  wateringCan: Coord;            // The watering can that the gardener uses to water plants
  plants: Plant[];               // All the plants currently living
  currentFrame: number;          // The current animation frame number (current epoch quarter second number)
  gimage: any;                   // The walkcycle sprite source image.
}

// Generate the game starting state.
function initialGameState(): IGlobalState {
  const image = new Image(192, 192);
  image.src = require('../images/gardenerwalkcycle.png');
  image.onload = () => {
      console.log("Walkcycle source image loaded.");
  };

  return {
    gardener: Gardener.initialState(),
    score: 0,
    wateringCan: new Coord(300, 500),
    plants: [new Plant(new Coord(200, 200), INITIAL_PLANT_HEALTH)],
    currentFrame: 0,
    gimage: image,
  }
}

// Game starts in state provided by initialGameState function.
const globalState: IGlobalState = initialGameState();

// All actions/index.ts setters are handled here
const gameReducer = (state = globalState, action: any) => {
  switch (action.type) {
    case RIGHT:
    case LEFT:
    case UP:
    case DOWN:
    case STOP:            return moveGardener(state, action);
    case TOGGLE_EQUIP:    return toggleEquip(state);
    case USE_ITEM:        return utiliseItem(state);
    case RESET:           return initialGameState();
    case RESET_SCORE:     return { ...state, score: 0 };
    case INCREMENT_SCORE: return { ...state, score: state.score + 1 };
    case TICK:            return tickCheck(state);
    default:              return state;
  }
};

// TODO: See if we can animate from within a saga instead of the way we're doing it now.

// Check whether or not the current frame number should change. If not, return the
// state unchanged.
function tickCheck(state: IGlobalState): IGlobalState {
  let f = computeCurrentFrame();
  if (f != state.currentFrame) {
    return {
      ...state,
      currentFrame: f,
    };
  }
  return state;
}

// Move the gardener according to move action LEFT, RIGHT, UP, or DOWN.
// This will be aborted if the would-be new position overlaps with a plant.
function moveGardener(state: IGlobalState, action: any): IGlobalState {
  // Would-be new post-move gardener.
  let newGar = state.gardener.move(action);
  // If new gardener is in collision with anything, we abort the move.
  if (collisionDetected(state, newGar)) {
    console.log("Bump!");
    // If you can't move because of a collision, you still change your facing direction.
    return {
      ...state,
      gardener: state.gardener.changeFacingDirection(action),
    };
  }
  // All clear. Commit the move to the global state.
  return {
    ...state,
    gardener: newGar,
    // Watering can moves with gardener if the item is equipped.
    wateringCan: newGar.itemEquipped ? newGar.pos : state.wateringCan,
  }
}

// Check whether the given gardener overlaps (collides) with anything it shouldn't.
function collisionDetected(state: IGlobalState, gar: Gardener): boolean {
  // Gather all colliders into one array.
  let colliders: Array<Collider> = [];
  state.plants.forEach(plant => colliders.push(plant));
  worldBoundaryColliders().forEach(col => colliders.push(col));
  let gRect = gar.collisionRect();

  // Check all colliders and stop if and when any collision is found.
  for (let i = 0; i < colliders.length; i++) {
    if (rectanglesOverlap(gRect, colliders[i].collisionRect())) return true;
  }

  // No collisions detected.
  return false;
}

// Given two rectangles (via their bottom-left and top-right coordinates), check if they overlap.
function rectanglesOverlap(rect1: any, rect2: any): boolean {
  let a = rect1.a;
  let b = rect1.b;
  let c = rect2.a;
  let d = rect2.b;
  if (Math.max(a.x, b.x) < Math.min(c.x, d.x)) return false;
  if (Math.min(a.x, b.x) > Math.max(c.x, d.x)) return false;
  if (Math.max(a.y, b.y) < Math.min(c.y, d.y)) return false;
  if (Math.min(a.y, b.y) > Math.max(c.y, d.y)) return false;
  return true;
}

// Attempt to equip item or drop current item.
function toggleEquip(state: IGlobalState): IGlobalState {
  if (state.gardener.itemEquipped) {
    return {
      ...state,
      gardener: state.gardener.setItemEquipped(false),
      wateringCan: state.gardener.pos,
    }
  }
  if (!canEquip(state)) {
    return state;
  }
  return {
      ...state,
      gardener: state.gardener.setItemEquipped(true),
      wateringCan: state.gardener.pos,
  }
}

// Check whether or not an item can be equipped right now.
function canEquip(state: IGlobalState): boolean {
  return true;
}

// Use currently equipped item, if possible.
// Note: Named "utilise" instead of "use" because "useItem" exists elsewhere.
function utiliseItem(state: IGlobalState): IGlobalState {
  if (!state.gardener.itemEquipped) {
    return state;
  }
  var newPlants: Plant[] = [];
  let faceRect = state.gardener.getFacingDetectionRect();
  let alreadyAbsorbed = false;
  for (let i = 0; i < state.plants.length; i++) {
    let plant = state.plants[i];
    let plantRect = plant.collisionRect();
    if (!alreadyAbsorbed && rectanglesOverlap(faceRect, plantRect)) {
      newPlants = [...newPlants, plant.absorbWater()];
      alreadyAbsorbed = true;
    } else {
      newPlants = [...newPlants, plant];
    }
  }

  return {
    ...state,
    plants: newPlants,
  };
}

export default gameReducer;
