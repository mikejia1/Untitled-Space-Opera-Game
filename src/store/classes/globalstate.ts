import { Gardener, WateringCan, Plant } from './';

// Interface for full game state object.
export interface IGlobalState {
    gardener: Gardener;            // The gardener tending the garden. Controlled by the player.
    score: number;                 // The current game score
    wateringCan: WateringCan;      // The watering can that the gardener uses to water plants
    plants: Plant[];               // All the plants currently living
    currentFrame: number;          // The current animation frame number (current epoch quarter second number)
    gimage: any;                   // The walkcycle sprite source image.
    backgroundImage: any;          // The background image.
    wateringCanImage: any;         // The watering can image.
  }
  