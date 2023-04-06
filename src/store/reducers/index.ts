//Reducers take in the current state and an action and return a new state.
//They are responsible for processing all game logic.

import {
  DOWN,
  INCREMENT_SCORE,
  LEFT,
  RESET,
  RESET_SCORE,
  RIGHT,
  TOGGLE_EQUIP,
  UP,
  USE_ITEM,
} from "../actions";

// A coordinate on the grid.
export class Coord {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// An enum for the directions.
export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

export interface IGlobalState {
  gardener: Coord;
  score: number;
  facing: Direction;
  wateringCan: Coord;
  itemEquipped: boolean;
}

const globalState: IGlobalState = {
  gardener: new Coord(500, 300),
  score: 0,
  facing: Direction.Up,
  wateringCan: new Coord(300, 500),
  itemEquipped: false,
};

// Return gardener facing direction given current state and action.
function getFacingDirection(state: IGlobalState, action: any): Direction {
  switch (action.type) {
    case RIGHT:
      return Direction.Right;
    case LEFT:
      return Direction.Left;
    case UP:
      return Direction.Up;
    case DOWN:
      return Direction.Down;
  }
  return state.facing;
}

//All actions/index.ts setters are handled here
const gameReducer = (state = globalState, action: any) => {
  switch (action.type) {
    case RIGHT:
    case LEFT:
    case UP:
    case DOWN:{
      let pos = new Coord(state.gardener.x + action.payload[0], state.gardener.y + action.payload[1]);
      return {
        ...state,
        gardener: pos,
        wateringCan: state.itemEquipped ? pos : state.wateringCan,
        facing: getFacingDirection(state, action),
      };
    }
    case TOGGLE_EQUIP:
      if (state.itemEquipped) {
        return unequipItem(state);
      }
      return tryEquipItem(state);

    case USE_ITEM:
      if (state.itemEquipped) {
        return tryUseItem(state);
      }
      return state;

    case RESET:
      return {
        ...state,
        gardener: new Coord(500, 300),
        facing: Direction.Up,
      };

    case RESET_SCORE:
      return { ...state, score: 0 };

    case INCREMENT_SCORE:
      return {
        ...state,
        score: state.score + 1,
      };
    default:
      return state;
  }
};

// Drop the item we are carrying. We already know we are carrying it.
function unequipItem(state: IGlobalState): IGlobalState {
  return {
    ...state,
    itemEquipped: false,
    wateringCan: state.gardener,
  }
}

function tryEquipItem(state: IGlobalState): IGlobalState {
  if (!canEquip(state)) {
    return state;
  }
  return {
      ...state,
      itemEquipped: true,
      wateringCan: state.gardener,
  }
}

function canEquip(state: IGlobalState): boolean {
  return true;
}

function tryUseItem(state: IGlobalState): IGlobalState {
  return state;
}

export default gameReducer;
