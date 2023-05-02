import { Collider, ColliderType } from './';
import { Gardener, NonPlayer, WateringCan, Plant, INITIAL_PLANT_HEALTH } from '../../entities';
import { Coord, Direction, GardenerDirection, tileRect, worldBoundaryColliders } from '../../utils';

import { V_TILE_COUNT, H_TILE_COUNT, collisions, plants, buttons, ladders, MAP_TILE_SIZE } from "../data/positions";
import { InvisibleCollider } from "../../scene";

// Gardener images.
import basewalkstrip     from "../../entities/images/gardener/base_walk_strip8.png";
import basewateringstrip from "../../entities/images/gardener/base_watering_strip5.png";
import toolwateringstrip from "../../entities/images/gardener/tools_watering_strip5.png";

// Blast shield images.
import closedShield from "../../entities/images/shield/shield_32x160.png";
import topShield    from "../../entities/images/shield/shield_top_32x.png";
import bottomShield from "../../entities/images/shield/shield_bottom_32x.png";

// Other images.
import npcwalkcycle from "../../entities/images/nonplayer/npcwalkcycle.png";
import spacegarden  from "../images/space_garden.png";
import wateringcan  from "../../entities/images/wateringcan/wateringcan.png";
import spaceframes  from "../images/space_frames.png";
import shieldButton from "../../entities/images/button/button_32x32.png";

// Plant image.
import plantimage from "../../entities/images/plant/plants_16x16.png";
import { ShieldButton } from '../../entities/shieldbutton';

// Interface for full game state object.
export interface IGlobalState {
    gardener: Gardener;               // The gardener tending the garden. Controlled by the player.
    keysPressed: Direction[];         // The movement keys currently pressed by the player.
    score: number;                    // The current game score
    wateringCan: WateringCan;         // The watering can that the gardener uses to water plants
    plants: Plant[];                  // All the plants currently living
    npcs: NonPlayer[];                // The various crew people wandering around in the garden
    shieldButtons: ShieldButton[];    // The buttons that activate sections of the blast shield
    currentFrame: number;             // The current animation frame number (current epoch quarter second number)
    gardenerImages: any;              // Source images for gardener sprites.
    shieldImages: any;                // Source images for the blast shield image.
    shieldButtonImage: any;           // Source image for the shield button animation.
    npcimage: any;                    // The NPC walkcycle sprite source image.
    backgroundImage: any;             // The background image.
    wateringCanImage: any;            // The watering can image.
    deepSpaceImage: any;              // The deep space image frames x4.
    plantImage: any;                  // The plant image.
    invisibleColliders: Collider[];   // All Colliders that aren't visible.
    muted: boolean;                   // Enable / disable sounds.
    debugSettings: any;               // For configuring extra debug info and visualizations.
  }

 // Generate the game starting state.
export function initialGameState(): IGlobalState {
  // Ensure all colliders get a unique ID.
  let colliderId = 0;

  // Create invisible colliders for map features with unique collider Ids and increment colliderId accordingly.
  let features = invisibleCollidersForMapFeatures(colliderId);
  colliderId += features.length;

  let ladders = invisibleCollidersForLadders(colliderId);
  colliderId += ladders.length;

  // Create plants from initial plant positions. 
  let allPlants = createPlants(colliderId);
  colliderId += allPlants.length;

  // Create invisible colliders for world boundaries with unique collider Ids and increment colliderId accordingly.
  let worldBoundaries = worldBoundaryColliders(colliderId);
  colliderId += worldBoundaries.length;

  // Create a bunch of NPCs and increment colliderId accordingly.
  let npcs = gridOfNPCs(colliderId, new Coord(200, 250), 25, 2, 2);
  colliderId += npcs.length;

  // Create the buttons that activate the sections of the blast shield.
  let shieldButtons = createShieldButtons();

  return {
    gardener: initialGardener(colliderId++),
    keysPressed: [],
    score: 0,
    wateringCan: initialWateringCan(),
    plants: allPlants,
    npcs: npcs,
    shieldButtons: shieldButtons,
    currentFrame: 0,
    gardenerImages: {
      walkingBase:  loadImage("Base walk strip", basewalkstrip),
      wateringBase: loadImage("Base watering strip", basewateringstrip),
      waterPouring: loadImage("Tool watering strip", toolwateringstrip),
    },
    npcimage:         loadImage("NPC walk cycle", npcwalkcycle),
    backgroundImage:  loadImage("Space garden", spacegarden),
    wateringCanImage: loadImage("Watering can", wateringcan),
    deepSpaceImage:   loadImage("Space frames", spaceframes),
    shieldImages: {
      closed:         loadImage("Closed shield", closedShield),
      top:            loadImage("Top shield", topShield),
      bottom:         loadImage("Bottom shield", bottomShield),
    },
    shieldButtonImage: loadImage("Shield button", shieldButton),
    plantImage:       loadImage("Plant image", plantimage),
    invisibleColliders: [worldBoundaries, features, ladders].flat(),
    muted: true,
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

function loadImage(title: string, resource: string) {
  const img = new Image();
  img.src = resource;
  img.onload = () => {
      console.log("Image loaded: " + title);
  };
  return img;
} 

// Return an array of invisible colliders based on store/data/collision.tsx
function invisibleCollidersForMapFeatures(nextColliderId: number): Collider[] {
  let all: Collider[] = [];
  for (let r = 0; r < V_TILE_COUNT; r++) {
    for (let c = 0; c < H_TILE_COUNT; c++) {
      let i = (r * H_TILE_COUNT) + c;
      if (collisions[i] == 0) continue;
      let ic = new InvisibleCollider(nextColliderId + all.length, tileRect(r,c), ColliderType.WallCo);
      all = [...all, ic];
    }
  }
  return all;
}

// Return an array of invisible colliders based on ladder data in store/data/collisions.tsx
function invisibleCollidersForLadders(nextColliderId: number): Collider[] {
    let all: Collider[] = [];
  for (let r = 0; r < V_TILE_COUNT; r++) {
    for (let c = 0; c < H_TILE_COUNT; c++) {
      let i = (r * H_TILE_COUNT) + c;
      if (ladders[i] == 0) continue;
      let ic = new InvisibleCollider(nextColliderId + all.length, tileRect(r,c), ColliderType.LadderCo);
      all = [...all, ic];
    }
  }
  return all;
}

function createPlants(colliderId: number): Plant[] {
  let all: Plant[] = [];
  // Plant array 1D array where non-zero values are plant types.
  const baseValue = Math.max( ...plants)-3;
  console.log("base value: " + baseValue);
  for (let r = 0; r < V_TILE_COUNT; r++) {
    for (let c = 0; c < H_TILE_COUNT; c++) {
      let i = (r * H_TILE_COUNT) + c;
      if (plants[i] == 0) continue;
      // Shift the vertical position of plants by 4 pixels to better align with dirt patch. Give size type based on non-zero value in plants.
      let plant: Plant = new Plant(colliderId++, new Coord(c*MAP_TILE_SIZE, r*MAP_TILE_SIZE+6), INITIAL_PLANT_HEALTH, plants[i]-baseValue);
      all = [...all, plant];
    }
  }
  return all;
}

function createShieldButtons(): ShieldButton[] {
    let all: ShieldButton[] = [];
    for (let r = 0; r < V_TILE_COUNT; r++) {
      for (let c = 0; c < H_TILE_COUNT; c++) {
        let i = (r * H_TILE_COUNT) + c;
        if (buttons[i] == 0) continue;
        let sb: ShieldButton = new ShieldButton(new Coord(c*MAP_TILE_SIZE, r*MAP_TILE_SIZE));
        all = [...all, sb];
      }
    }
    return all;  
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

// Default gardener starting state.
function initialGardener(colliderId: number): Gardener {
  return new Gardener(colliderId, new Coord(200, 220), GardenerDirection.Right, false, false, false);
}

// Create watering can for start of game.
function initialWateringCan(): WateringCan {
  return new WateringCan(new Coord(200, 150), false);
}

