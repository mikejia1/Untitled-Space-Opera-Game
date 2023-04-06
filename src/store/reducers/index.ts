//Reducers take in the current state and an action and return a new state.
//They are responsible for processing all game logic.

import { getFacingCoord } from "../../utils";
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

// The number of pixels wide/tall a single spot on the grid occupies.
export const TILE_SIZE = 20;

// A coordinate on the grid.
export class Coord {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  equals(other: Coord): boolean {
    return this.x === other.x && this.y === other.y;
  }
}

// An enum for the directions.
export enum Direction {
  Up,
  Down,
  Left,
  Right,
}

// A plant that needs watering to grow.
export class Plant {
  pos: Coord;
  health: number;

  constructor(pos: Coord, initialHealth: number) {
    this.pos = pos;
    this.health = initialHealth;
  }

  absorbWater() {
    this.health += 3;
  }
}

export interface IGlobalState {
  gardener: Coord;
  score: number;
  facing: Direction;
  wateringCan: Coord;
  plants: Plant[];
  itemEquipped: boolean;
}

const globalState: IGlobalState = {
  gardener: new Coord(500, 300),
  score: 0,
  facing: Direction.Up,
  wateringCan: new Coord(300, 500),
  plants: [new Plant(new Coord(100, 100), 10)],
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

// Attempt to use the watering can. We already know we have it equipped.
function tryUseItem(state: IGlobalState): IGlobalState {
  console.log("Trying to use item");
  //var newPlants: Plant[] = [];
  let waterDest = getFacingCoord(state.gardener, state.facing);
  state.plants.forEach(function (plant) {
    if (waterDest.equals(plant.pos)) {
      console.log("Absorbing water");
      plant.absorbWater();
    }
    //newPlants = [...newPlants, plant];
  });
  return {
    ...state,
    plants: state.plants,
  };
}

export default gameReducer;
