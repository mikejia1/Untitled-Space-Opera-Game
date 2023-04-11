// Reducers take in the current state and an action and return a new state.
// They are responsible for processing all game logic.

import { computeCurrentFrame, getFacingCoord } from "../../utils";
import { Coord, Plant, Gardener } from "../classes";
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
} from "../actions";

// The number of pixels wide/tall a single spot on the grid occupies.
export const TILE_SIZE = 20;

// An enum for the directions.
export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

// Interface for full game state object.
export interface IGlobalState {
  gardener: Gardener;     // The gardener tending the garden. Controlled by the player.
  score: number;          // The current game score
  wateringCan: Coord;     // The watering can that the gardener uses to water plants
  plants: Plant[];        // All the plants currently living
  currentFrame: number;   // The current animation frame number (current epoch quarter second number)
}

// Generate the game starting state.
function initialGameState(): IGlobalState {
  return {
    gardener: Gardener.initialState(),
    score: 0,
    wateringCan: new Coord(300, 500),
    plants: [new Plant(new Coord(100, 100), 10)],
    currentFrame: 0,  
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
    case DOWN:            return moveGardener(state, action);
    case TOGGLE_EQUIP:    return toggleEquip(state);
    case USE_ITEM:        return utiliseItem(state);
    case RESET:           return initialGameState();
    case RESET_SCORE:     return { ...state, score: 0 };
    case INCREMENT_SCORE: return { ...state, score: state.score + 1 };
    case TICK:            return { ...state, currentFrame: computeCurrentFrame() };
    default:              return state;
  }
};

// Move the gardener according to move action LEFT, RIGHT, UP, or DOWN.
function moveGardener(state: IGlobalState, action: any): IGlobalState {
  let newGar = state.gardener.move(action);
  return {
    ...state,
    gardener: newGar,
    // Watering can moves with gardener if the item is equipped.
    wateringCan: newGar.itemEquipped ? newGar.pos : state.wateringCan,
  }
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
  let waterDest = getFacingCoord(state.gardener.pos, state.gardener.facing);
  state.plants.forEach(function (plant) {
    if (waterDest.equals(plant.pos)) {
      newPlants = [...newPlants, plant.absorbWater()];
    } else {
      newPlants = [...newPlants, plant];
    }
  });
  return {
    ...state,
    plants: newPlants,
  };
}

export default gameReducer;
