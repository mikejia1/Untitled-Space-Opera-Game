// Reducers take in the current state and an action and return a new state.
// They are responsible for processing all game logic.

import { Direction, computeCurrentFrame, worldBoundaryColliders, tileRect } from "../../utils";
import { Coord, Plant, Gardener, Collider, INITIAL_PLANT_HEALTH, WateringCan, IGlobalState, InvisibleCollider } from "../classes";
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
  STOP_RIGHT,
  STOP_LEFT,
  STOP_UP,
  STOP_DOWN,
} from "../actions";
import { V_TILE_COUNT, H_TILE_COUNT, collisions } from "../data/collisions";

// Default gardener starting state.
function initialGardener(): Gardener {
  return new Gardener(new Coord(200, 150), Direction.Up, false);
}

// Create watering can for start of game.
function initialWateringCan(): WateringCan {
  return new WateringCan(new Coord(200, 150), false);
}

// Generate the game starting state.
function initialGameState(): IGlobalState {
  const avatar = new Image(192, 192);
  const background = new Image(400, 240);
  const wateringcan = new Image(16, 16);
  avatar.src = require('../images/gardenerwalkcycle.png');
  avatar.onload = () => {
      console.log("Walkcycle source image loaded.");
  };
  background.src = require('../images/Canvas.png');
  background.onload = () => {
      console.log("Background image loaded.");
  };
  wateringcan.src = require('../images/wateringcan.png');
  wateringcan.onload = () => {
      console.log("watering can image loaded.");
  };

  return {
    gardener: initialGardener(),
    score: 0,
    wateringCan: initialWateringCan(),
    plants: [new Plant(new Coord(200, 200), INITIAL_PLANT_HEALTH),
      new Plant(new Coord(150, 200), INITIAL_PLANT_HEALTH),
      new Plant(new Coord(300, 100), INITIAL_PLANT_HEALTH),
      new Plant(new Coord(50, 70), INITIAL_PLANT_HEALTH)],
    currentFrame: 0,
    gimage: avatar,
    backgroundImage: background,
    wateringCanImage: wateringcan,
    invisibleColliders: invisibleCollidersForMapBoundary(),
    muted: false,
    debugSettings: {
      showCollisionRects: true,   // Collision rectangles for colliders.
      showPositionRects: true,    // Position rectangles for paintables.
      showWateringRects: true,    // Watering interaction rectangles for plants.
      showFacingRects: true,      // Facing direction rectangle for gardener.
      showEquipRects: true,       // Equipping interaction rectangle for watering can.
    },
  }
}

// Return an array of invisible colliders based on store/data/collision.tsx
function invisibleCollidersForMapBoundary(): Collider[] {
  let all: Collider[] = [];
  for (let r = 0; r < V_TILE_COUNT; r++) {
    for (let c = 0; c < H_TILE_COUNT; c++) {
      let i = (r * H_TILE_COUNT) + c;
      if (collisions[i] != 179) continue;
      let ic = new InvisibleCollider(tileRect(r,c));
      all = [...all, ic];
    }
  }
  return all;
}

// All actions/index.ts setters are handled here
const gameReducer = (state = initialGameState(), action: any) => {
  switch (action.type) {
    case RIGHT:           return moveGardener(state, Direction.Right);
    case LEFT:            return moveGardener(state, Direction.Left);
    case UP:              return moveGardener(state, Direction.Up);
    case DOWN:            return moveGardener(state, Direction.Down);
    case STOP_RIGHT:      return stopGardener(state, Direction.Right);
    case STOP_LEFT:       return stopGardener(state, Direction.Left);
    case STOP_UP:         return stopGardener(state, Direction.Up);
    case STOP_DOWN:       return stopGardener(state, Direction.Down);
    case TOGGLE_EQUIP:    return toggleEquip(state);
    case USE_ITEM:        return utiliseItem(state);
    case RESET:           return initialGameState();
    case RESET_SCORE:     return { ...state, score: 0 };
    case INCREMENT_SCORE: return { ...state, score: state.score + 1 };
    case TICK:            return updateFrame(state);
    default:              return state;
  }
};

// Stop the gardener if the keyup direction matches the current gardener direction.
function stopGardener(state: IGlobalState, direction: Direction): IGlobalState {
  //Only stop gardener if the keyup direction matches the current gardener direction.
  if(state.gardener.moving && state.gardener.facing === direction) {
    return { ...state, gardener: state.gardener.stop()}
  }
  return state;
}

// Only move the gardener if the keypress changes the gardener direction.
function moveGardener(state: IGlobalState, direction: Direction): IGlobalState {
  // This is a spurious keypress. Ignore it.
  if(state.gardener.moving && state.gardener.facing === direction) {
    return state;
  }
  return moveGardenerOnFrame(state, direction);
}

// Move the gardener according to the direction given. Triggered on TICK or on new keypress direction.
// This will be aborted if the would-be new position overlaps with a plant.
function moveGardenerOnFrame(state: IGlobalState, direction: Direction): IGlobalState {
  // Would-be new post-move gardener.
  let newGar = state.gardener.changeFacingDirection(direction).move();
  // If new gardener is in collision with anything, we abort the move.
  if (collisionDetected(state, newGar)) {
    console.log("Bump!");
    if (!state.muted) playBumpSound();
    return {
      ...state,
      gardener: state.gardener.changeFacingDirection(direction),
      currentFrame: computeCurrentFrame(),
    }
  }
  // All clear. Commit the move to the global state.
  return {
    ...state,
    gardener: newGar,
    // Watering can moves with gardener if the item is equipped.
    wateringCan: state.wateringCan.isEquipped ? state.wateringCan.moveWithGardener(newGar) : state.wateringCan,
    currentFrame: computeCurrentFrame(),
  }
}

// Play the sound corresponding to the gardener bumping into a collider.
function playBumpSound(): void {
  try {
    let boing = new Audio(require('../sounds/boing.mp3'));
    let playPromise = boing.play();
    // In browsers that don’t yet support this functionality, playPromise won’t be defined.
    if (playPromise !== undefined) {
      playPromise.then(function() {}).catch(function(error) {
        console.log("Bump sound failure: ", error);
      });
    }
  } catch (error) {
    console.log("Audio error: ", error);
  }
}

// TODO: See if we can animate from within a saga instead of the way we're doing it now.
function updateFrame(state: IGlobalState): IGlobalState {
  let f = computeCurrentFrame();
  if (f === state.currentFrame) {
    return state;
  }
  // Allow fruits to grow, and move the gardener if it is moving.
  let newState = growFruits(state, f);
  if (newState.gardener.moving) {
    return moveGardenerOnFrame(newState, newState.gardener.facing);
  }
  return {
    ...newState,
    currentFrame: f,
  }
}

// Check all plants to see if any will grow their fruits. Return state unchanged
// if no fruit growth occurred, otherwise return updated state.
function growFruits(state: IGlobalState, frame: number): IGlobalState {
  let grewAny = false;
  let newPlants: Plant[] = [];
  state.plants.forEach(plant => {
    let result = plant.growFruits(frame);
    if (result.didGrow) newPlants = [ ...newPlants, result.newPlant ];
    else newPlants = [ ...newPlants, plant ];
    grewAny = grewAny || result.didGrow;
  });
  if (grewAny) return { ...state, plants: newPlants };
  return state;
}

// Check whether the given gardener overlaps (collides) with anything it shouldn't.
function collisionDetected(state: IGlobalState, gar: Gardener): boolean {
  // Gather all colliders into one array.
  let colliders: Array<Collider> = [];
  state.plants.forEach(plant => colliders.push(plant));
  worldBoundaryColliders().forEach(col => colliders.push(col));
  state.invisibleColliders.forEach(ic => colliders.push(ic));
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
  let faceRect = state.gardener.facingDetectionRect();
  let rect = state.wateringCan.equipRect();
  return rectanglesOverlap(faceRect, rect);
}

// Use currently equipped item, if possible.
// Note: Named "utilise" instead of "use" because "useItem" exists elsewhere.
function utiliseItem(state: IGlobalState): IGlobalState {
  if (!state.gardener.itemEquipped) {
    return state;
  }
  var newPlants: Plant[] = [];
  let faceRect = state.gardener.facingDetectionRect();
  let alreadyAbsorbed = false;
  for (let i = 0; i < state.plants.length; i++) {
    let plant = state.plants[i];
    let plantRect = plant.wateringRect();
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
