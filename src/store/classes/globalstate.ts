import { Collider } from './';
import { Gardener, NonPlayer, WateringCan, Plant } from '../../entities';
import { Direction } from '../../utils';

// Interface for full game state object.
export interface IGlobalState {
    gardener: Gardener;               // The gardener tending the garden. Controlled by the player.
    keysPressed: Direction[];         // The movement keys currently pressed by the player.
    score: number;                    // The current game score
    wateringCan: WateringCan;         // The watering can that the gardener uses to water plants
    plants: Plant[];                  // All the plants currently living
    npcs: NonPlayer[];                // The various crew people wandering around in the garden
    currentFrame: number;             // The current animation frame number (current epoch quarter second number)
    gardenerImages: any;              // Source images for gardener sprites.
    npcimage: any;                    // The NPC walkcycle sprite source image.
    backgroundImage: any;             // The background image.
    wateringCanImage: any;            // The watering can image.
    deepSpaceImage: any;              // The deep space image frames x4.
    shieldImage: any;                 // The blast shield image.
    invisibleColliders: Collider[];   // All Colliders that aren't visible.
    muted: boolean;                   // Enable / disable sounds.
    debugSettings: any;               // For configuring extra debug info and visualizations.
  }
