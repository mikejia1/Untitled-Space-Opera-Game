import { Rect, rectanglesOverlap } from '../../utils';
import { rectToString } from '../../utils/rect';
import { IGlobalState } from './globalstate';

// Colliders have types.
// By default, all types collide.
// Exceptions must be listed explicitly in ColliderExceptions.
export enum ColliderType {
    GardenerCo      = "Gardener",       // A gardener
    NPCNormalCo     = "NPCNormal",      // An NPC in normal mental state
    NPCFrazzledCo   = "NPCFrazzled",    // An NPC in frazzled mental state
    WallCo          = "Wall",           // A wall or other solid obstacle
    GardenerWallCo  = "GardenerWall",   // A wall that blocks the gardener by not the NPCs
    PlantCo         = "Plant",          // A plant
    LadderCo        = "Ladder",         // A ladder
    CatCo           = "Cat",            // A murderous feline
    NoneCo          = "None",           // Collides with nothing (hard-coded - i.e. not using exceptions, below)
};

export interface StrSet {
    [key: string]: boolean | undefined
};

// A constant for quick lookup of collider exceptions.
// All exceptions should appear twice here.
export function ColliderExceptions(col: Collider): StrSet {
    switch (col.colliderType) {
        case ColliderType.GardenerCo:     return { Ladder: true, Plant: true };
        case ColliderType.NPCNormalCo:    return { GardenerWall: true };
        case ColliderType.NPCFrazzledCo:  return { Plant: true };
        case ColliderType.WallCo:         return { };
        case ColliderType.GardenerWallCo: return { NPCNormal: true };
        case ColliderType.PlantCo:        return { NPCFrazzled: true, Gardener: true };
        case ColliderType.LadderCo:       return { Gardener: true };
        case ColliderType.CatCo:          return { };
        case ColliderType.NoneCo:         return { };
    }
};

// A Collider has a collisionRect method that returns a rectangle to use when
// checking for collisions.
export interface Collider {
    colliderId: number;
    colliderType: ColliderType;

    collisionRect: () => Rect
}

// Get all the colliders from a state.
export function allCollidersFromState(state: IGlobalState): Map<number, Collider> {
    let map = new Map<number, Collider>();
    state.plants.forEach(plant => map.set(plant.colliderId, plant));
    state.invisibleColliders.forEach(ic => map.set(ic.colliderId, ic));
    state.npcs.forEach(npc => map.set(npc.colliderId, npc));
    map.set(state.gardener.colliderId, state.gardener);
    map.set(state.railing.colliderId, state.railing);
    return map;
}

// Check whether the given collider overlaps (collides) with any other collider (excluding itself).
export function collisionDetected(state: IGlobalState, collider: Collider): boolean {
    if (state.debugSettings.collisionsDisabled) return false;
    if (collider.colliderType === ColliderType.NoneCo) return false;  // Hard-coded exception for type NoneCo.
    let colliders = state.colliderMap;
    let cRect = collider.collisionRect();
  
    // Check all colliders and stop if and when any collision is found.
    let ids = Array.from(colliders.keys());
    for (let i = 0; i < ids.length; i++) {
      let colliderId = ids[i];
      // Don't check collisions with self.
      if (colliderId === collider.colliderId) continue;
      let co = colliders.get(colliderId);
      if (co === undefined) continue; // Will never happen.
      if (co.colliderType === ColliderType.NoneCo) continue;  // Hard-coded exception for NoneCo.
      // Ignore collisions if there's an explicit exception for this pair of collider types.
      let exceptions = ColliderExceptions(collider);
      let expt = exceptions[co.colliderType.toString()];
      if (expt === true) continue;
      if (rectanglesOverlap(cRect, co.collisionRect())) return true;
    };
  
    // No collisions detected.
    return false;
}

// Check whether the given collider overlaps (collides) with any other colliders (excluding itself), but
// return all such colliders.
export function detectCollisions(state: IGlobalState, colliders: Map<number, Collider>, collider: Collider): Collider[] {
    let allFound: Collider[] = [];
    if (state.debugSettings.collisionsDisabled) return allFound;
    let cRect = collider.collisionRect();
  
    // Check all colliders.
    let ids = Array.from(colliders.keys());
    for (let i = 0; i < ids.length; i++) {
      let colliderId = ids[i];
      // Don't check collisions with self.
      if (colliderId === collider.colliderId) continue;
      let co = colliders.get(colliderId);
      if (co === undefined) continue; // Will never happen.
      // Ignore collisions if there's an explicit exception for this pair of collider types.
      let exceptions = ColliderExceptions(collider);
      let expt = exceptions[co.colliderType.toString()];
      if (expt === true) continue;
      if (rectanglesOverlap(cRect, co.collisionRect())) allFound = [...allFound, co];
    }
    return allFound;
  }
  

// From a list of Colliders, get the collider IDs of those that are NPCs, as a set.
export function getBumpedNPCs(colliders: Collider[]): Set<number> {
    let npcs = new Set<number>();
    colliders.forEach(c => {
      if ((c.colliderType === ColliderType.NPCNormalCo) || (c.colliderType === ColliderType.NPCFrazzledCo)) npcs.add(c.colliderId);
    });
    return npcs;
  }
  
// Play the sound corresponding to the gardener bumping into a collider.
export function playBumpSound(): void {
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