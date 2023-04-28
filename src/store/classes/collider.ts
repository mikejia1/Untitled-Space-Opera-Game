import { Rect } from '../../utils';

const GARDENER  = "Gardener";
const NPC       = "NPC";
const WALL      = "Wall";
const PLANT     = "Plant";
const LADDER    = "Ladder";

// Colliders have types.
// By default, all types collide.
// Exceptions must be listed explicitly in ColliderExceptions.
export enum ColliderType {
    GardenerCo  = "Gardener", // A gardener
    NPCCo       = "NPC",      // An NPC
    WallCo      = "Wall",     // A wall or other solid obstacle
    PlantCo     = "Plant",    // A plant
    LadderCo    = "Ladder",   // A ladder
};

export interface StrSet {
    [key: string]: boolean | undefined
};

// A constant for quick lookup of collider exceptions.
// All exceptions should appear twice here.
export function ColliderExceptions(col: Collider): StrSet {
    switch (col.colliderType) {
        case ColliderType.GardenerCo:   return { LADDER: true };
        case ColliderType.NPCCo:        return { };
        case ColliderType.WallCo:       return { };
        case ColliderType.PlantCo:      return { };
        case ColliderType.LadderCo:     return { GARDENER: true };
    }
};

// A Collider has a collisionRect method that returns a rectangle to use when
// checking for collisions.
export interface Collider {
    colliderId: number;
    colliderType: ColliderType;

    collisionRect: () => Rect
}