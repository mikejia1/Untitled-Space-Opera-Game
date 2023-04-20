// Reducers take in the current state and an action and return a new state.
// They are responsible for processing all game logic.

import { Direction, computeCurrentFrame, worldBoundaryColliders, tileRect, rectanglesOverlap, randomInt, ALL_DIRECTIONS } from "../../utils";
import { Coord, Plant, Gardener, Collider, INITIAL_PLANT_HEALTH, WateringCan, IGlobalState, InvisibleCollider, NonPlayer } from "../classes";
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
function initialGardener(colliderId: number): Gardener {
  return new Gardener(colliderId, new Coord(200, 150), Direction.Up, false);
}

// Create watering can for start of game.
function initialWateringCan(): WateringCan {
  return new WateringCan(new Coord(200, 150), false);
}

// Generate the game starting state.
function initialGameState(): IGlobalState {
  const avatar = new Image(192, 192);
  const npcimage = new Image(192, 192);
  const background = new Image(400, 240);
  const wateringcan = new Image(16, 16);
  avatar.src = require('../images/gardenerwalkcycle.png');
  avatar.onload = () => {
      console.log("Gardener walkcycle source image loaded.");
  };
  npcimage.src = require('../images/npcwalkcycle.png');
  npcimage.onload = () => {
      console.log("NPC walkcycle source image loaded.")
  };
  background.src = require('../images/GardenMap100x30.png');
  background.onload = () => {
      console.log("Background image loaded.");
  };
  wateringcan.src = require('../images/wateringcan.png');
  wateringcan.onload = () => {
      console.log("watering can image loaded.");
  };

  // Ensure all colliders get a unique ID.
  let colliderId = 0;

  // Create invisible colliders for map features with unique collider Ids and increment colliderId accordingly.
  let features = invisibleCollidersForMapFeatures(colliderId);
  colliderId += features.length;

  // Create invisible colliders for world boundaries with unique collider Ids and increment colliderId accordingly.
  let worldBoundaries = worldBoundaryColliders(colliderId);
  colliderId += worldBoundaries.length;

  // Create a bunch of NPCs and increment colliderId accordingly.
  let npcs = gridOfNPCs(colliderId, new Coord(300, 150), 25, 10, 10);
  colliderId += npcs.length;

  return {
    gardener: initialGardener(colliderId++),
    score: 0,
    wateringCan: initialWateringCan(),
    plants: [
      new Plant(colliderId++, new Coord(200, 200), INITIAL_PLANT_HEALTH),
      new Plant(colliderId++, new Coord(150, 200), INITIAL_PLANT_HEALTH),
      new Plant(colliderId++, new Coord(300, 100), INITIAL_PLANT_HEALTH),
      new Plant(colliderId++, new Coord(50, 70), INITIAL_PLANT_HEALTH)],
    npcs: npcs,
    currentFrame: 0,
    gimage: avatar,
    npcimage: npcimage,
    backgroundImage: background,
    wateringCanImage: wateringcan,
    invisibleColliders: [...worldBoundaries, ...features],  // Map features and world boundaries both contribute invisible colliders.
    muted: false,
    debugSettings: {
      showCollisionRects: false,   // Collision rectangles for colliders.
      showPositionRects: false,    // Position rectangles for paintables.
      showWateringRects: false,    // Watering interaction rectangles for plants.
      showFacingRects: false,      // Facing direction rectangle for gardener.
      showEquipRects: false,       // Equipping interaction rectangle for watering can.
      collisionsDisabled: false,   // Disable collision checks - Gardener can walk through anything.
    },
  }
}

// Create a grid of NPCs with top-left one at given position, and with given spacing.
function gridOfNPCs(colliderId: number, pos: Coord, spacing: number, cols: number, rows: number): NonPlayer[] {
  let all: NonPlayer[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      let npc = new NonPlayer({
        colliderId: colliderId + (row * cols) + col,
        pos: pos.plus(col * spacing, row * spacing), 
      });
      all = [...all, npc];
    }
  }
  return all;
}

// Return an array of invisible colliders based on store/data/collision.tsx
function invisibleCollidersForMapFeatures(nextColliderId: number): Collider[] {
  let all: Collider[] = [];
  for (let r = 0; r < V_TILE_COUNT; r++) {
    for (let c = 0; c < H_TILE_COUNT; c++) {
      let i = (r * H_TILE_COUNT) + c;
      if (collisions[i] !== 689) continue;
      let ic = new InvisibleCollider(nextColliderId + all.length, tileRect(r,c));
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
  // Only stop gardener if the keyup direction matches the current gardener direction.
  if (state.gardener.moving && state.gardener.facing === direction) {
    return { ...state, gardener: state.gardener.stop()}
  }
  return state;
}

// Only move the gardener if the keypress changes the gardener direction.
function moveGardener(state: IGlobalState, direction: Direction): IGlobalState {
  // This is a spurious keypress. Ignore it.
  if (state.gardener.moving && state.gardener.facing === direction) {
    return state;
  }

  // Get all the colliders as they exist now.
  let allColliders = allCollidersFromState(state);

  return moveGardenerOnFrame(state, direction, allColliders);
}

// Move the gardener according to the direction given. Triggered on TICK or on new keypress direction.
// This will be aborted if the would-be new position overlaps with a plant.
function moveGardenerOnFrame(state: IGlobalState, direction: Direction, allColliders: Map<number, Collider>): IGlobalState {
  // Would-be new post-move gardener.
  let newGar = state.gardener.changeFacingDirection(direction).move();

  // If new gardener is in collision with anything, we abort the move.
  if (collisionDetected(state, allColliders, newGar)) {
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
  // Allow fruits to grow.
  let newState = growFruits(state, f);

  // Get all the colliders as they exist now.
  let allColliders = allCollidersFromState(newState);

  // Allow gardener to move.
  let gardenerMoving = newState.gardener.moving;
  if (gardenerMoving) {
    newState = moveGardenerOnFrame(newState, newState.gardener.facing, allColliders);
    allColliders.set(newState.gardener.colliderId, newState.gardener);
  }

  // Allow NPCs to move.
  let newNPCs: NonPlayer[] = [];
  newState.npcs.forEach(npc => {
    // Get a new version of the npc - one that has taken its next step.
    let newNPC = moveNPC(newState, npc);

    // Allow the NPC to consider adopting a new movement (forced = false).
    newNPC = considerNewNPCMovement(newNPC, false);

    // If this new NPC is in collision with anything, revert back to original npc
    // and force it to choose a new movement.
    if (collisionDetected(newState, allColliders, newNPC)) {
      newNPC = considerNewNPCMovement(npc, true);
    }

    // Update the NPC array. Update the colliders so that subsequent NPCs will
    // check collisions against up-to-date locations of their peers.
    newNPCs = [...newNPCs, newNPC];
    allColliders.set(newNPC.colliderId, newNPC);
  });

  return {
    ...newState,
    currentFrame: f,
    npcs: newNPCs,
  }
}

// Allow an NPC to randomly choose a new movement. If the NPC is not currently moving, wait for
// its stationaryCountdown to reach zero before adopting a new movement.
function considerNewNPCMovement(npc: NonPlayer, forced: boolean): NonPlayer {
  // Whether or not the NPC will adopt a new movement.
  let change = false;

  // If NPC is currently stationery, adopt new movement when the countdown reaches zero,
  // otherwise adopt new movement with some small probability.
  if (!npc.moving) {
    if (npc.stationeryCountdown === 0) change = true;
  } else {
    change = (Math.random() < 0.02);
  }
  change = change || forced;

  // If no new movement is being adopted, return NPC unchanged.
  if (!change) return npc;

  // New movement is to be adopted. Choose new direction *or* choose to remain stationery for a while.
  let choice = randomInt(0, 4);
  if (choice === 4) {
    let countdown = 30 + randomInt(0, 200);
    return new NonPlayer({
      clone: npc,
      moving: false,
      stationeryCountdown: countdown,
    });
  }
  return new NonPlayer({
    clone: npc,
    moving: true,
    facing: ALL_DIRECTIONS[choice],
  });
}

/*
// Return new array of colliders but with one particular one replaced with an updated version of itself.
// TODO: This should be done with a map/dict instead for O(1) time instead of O(n). For now, it's fine.
function replaceCollider(colliders: Collider[], collider: Collider): Collider[] {
  let updated: Collider[] = [];
  colliders.forEach(co => {
    if (co.colliderId !== collider.colliderId) updated = [...updated, co];
    else updated = [...updated, collider];
  });
  return updated;
}
*/

// "Move" the NPC. In quotes because NPCs sometimes stand still and that's handled here too.
function moveNPC(state: IGlobalState, npc: NonPlayer): NonPlayer {
  if (!npc.moving) {
    return new NonPlayer({
      clone: npc,
      stationeryCountdown: Math.max(0, npc.stationeryCountdown - 1),
    });
  }
  return npc.move();
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

// Check whether the given collider overlaps (collides) with any other collider (excluding itself).
function collisionDetected(state: IGlobalState, colliders: Map<number, Collider>, collider: Collider): boolean {
  if (state.debugSettings.collisionsDisabled) return false;
  let cRect = collider.collisionRect();

  // Check all colliders and stop if and when any collision is found.
  let ids = Array.from(colliders.keys());
  for (let i = 0; i < ids.length; i++) {
    let colliderId = ids[i];
    // Don't check collisions with self.
    if (colliderId === collider.colliderId) continue;
    let co = colliders.get(colliderId);
    if (co === undefined) continue; // Will never happen.
    if (rectanglesOverlap(cRect, co.collisionRect())) return true;    
  };

  // No collisions detected.
  return false;
}

// Get all the colliders from a state.
function allCollidersFromState(state: IGlobalState): Map<number, Collider> {
  let map = new Map<number, Collider>();
  state.plants.forEach(plant => map.set(plant.colliderId, plant));
  state.invisibleColliders.forEach(ic => map.set(ic.colliderId, ic));
  state.npcs.forEach(npc => map.set(npc.colliderId, npc));
  map.set(state.gardener.colliderId, state.gardener);
  return map;
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
