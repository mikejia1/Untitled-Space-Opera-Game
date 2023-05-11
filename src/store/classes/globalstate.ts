import { AnimEvent, AnimEventType, Collider, ColliderType, SUPERNOVA_DELAY } from './';
import { Gardener, NonPlayer, WateringCan, Plant, INITIAL_PLANT_HEALTH } from '../../entities';
import { Coord, Shaker, Direction, FPS, GardenerDirection, computeCurrentFrame, tileRect, worldBoundaryColliders, SHAKER_NO_SHAKE } from '../../utils';

import { V_TILE_COUNT, H_TILE_COUNT, collisions, plants, buttons, ladders, MAP_TILE_SIZE } from "../data/positions";
import { BlackHole, InvisibleCollider } from "../../scene";

// Gardener images.
import basewalkstrip     from "../../entities/images/gardener/base_walk_strip8.png";
import basewateringstrip from "../../entities/images/gardener/base_watering_strip5.png";
import toolwateringstrip from "../../entities/images/gardener/tools_watering_strip5.png";

// Blast shield images.
import closedShield from "../../entities/images/shield/shield_32x160.png";
import topShield    from "../../entities/images/shield/shield_top_32x.png";
import bottomShield from "../../entities/images/shield/shield_bottom_32x.png";

// Other images.
import skeleton           from "../../entities/images/skeleton/skeleton_death.png";
import npcwalkcycle       from "../../entities/images/nonplayer/npcwalkcycle.png";
import spacegardenimpact  from "../images/space_garden_impact.png";
import spacegarden        from "../images/space_garden.png";
import gameoverImg        from "../images/gameover.png";
import replayPrompt       from "../images/replay_prompt.png";
import blackHoleImg       from "../images/drifting_planets/planet_black_hole_256px_30f.png";
import wateringcan        from "../../entities/images/wateringcan/wateringcan.png";
import spaceframes        from "../images/space_frames.png";
import shieldButton       from "../../entities/images/button/button_32x32.png";

// Plant image.
import plantimage from "../../entities/images/plant/plants_16x16.png";
import { ShieldButton } from '../../entities/shieldbutton';
import { ShieldDoor, initialShieldDoor } from '../../entities/shielddoor';

// Interface for full game state object.
export interface IGlobalState {
    gameover: boolean;                // Is the game over?
    gardener: Gardener;               // The gardener tending the garden. Controlled by the player.
    keysPressed: Direction[];         // The movement keys currently pressed by the player.
    score: number;                    // The current game score
    wateringCan: WateringCan;         // The watering can that the gardener uses to water plants
    plants: Plant[];                  // All the plants currently living
    npcs: NonPlayer[];                // The various crew people wandering around in the garden
    shieldButtons: ShieldButton[];    // The buttons that activate sections of the blast shield
    shieldDoors: ShieldDoor;          // The blast shield that protects the garden
    currentFrame: number;             // The current animation frame number (current epoch quarter second number)
    gameOverFrame: number;            // The frame number when the game ended
    pendingEvents: AnimEvent[];       // Queue of one-off event animations to draw
    activeEvents: AnimEvent[];        // Queue of one-off event animations to draw
    skeleton: any;                    // The skeleton death animation.
    gardenerImages: any;              // Source images for gardener sprites.
    shieldImages: any;                // Source images for the blast shield image.
    shieldButtonImage: any;           // Source image for the shield button animation.
    npcimage: any;                    // The NPC walkcycle sprite source image.
    backgroundImages: any;            // The background image.
    wateringCanImage: any;            // The watering can image.
    plantImage: any;                  // The plant image.
    gameOverImage: any,               // The game over image
    replayImage: any,                 // The replay prompt image
    blackHoleImage: any,              // Images containing animation frames for the black hole
    invisibleColliders: Collider[];   // All Colliders that aren't visible.
    muted: boolean;                   // Enable / disable sounds.
    screenShaker: Shaker;             // For causing the screen to shake at key moments.
    blackHole: BlackHole | null;      // The black hole in view, or null if none in view.
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
    gameover: false,
    gardener: initialGardener(colliderId++),
    keysPressed: [],
    score: 0,
    wateringCan: initialWateringCan(),
    plants: allPlants,
    npcs: npcs,
    shieldButtons: shieldButtons,
    shieldDoors: initialShieldDoor(),
    currentFrame: 0,
    gameOverFrame: 0,
    pendingEvents: getEvents(),
    activeEvents: [],
    gardenerImages: {
      walkingBase:  loadImage("Base walk strip", basewalkstrip),
      wateringBase: loadImage("Base watering strip", basewateringstrip),
      waterPouring: loadImage("Tool watering strip", toolwateringstrip),
    },
    skeleton:         loadImage("Skeleton death", skeleton),
    npcimage:         loadImage("NPC walk cycle", npcwalkcycle),
    backgroundImages:{
      default:      loadImage("Space garden", spacegarden),
      impact:       loadImage("Space garden impact", spacegardenimpact),
      deepSpace:    loadImage("Space frames", spaceframes),
    },
    wateringCanImage: loadImage("Watering can", wateringcan),
    shieldImages: {
      closed:         loadImage("Closed shield", closedShield),
      top:            loadImage("Top shield", topShield),
      bottom:         loadImage("Bottom shield", bottomShield),
    },
    shieldButtonImage: loadImage("Shield button", shieldButton),
    plantImage:       loadImage("Plant image", plantimage),
    gameOverImage:    loadImage("Game over", gameoverImg),
    replayImage:      loadImage("Replay prompt", replayPrompt),
    blackHoleImage:   loadImage("Black hole", blackHoleImg),
    invisibleColliders: [worldBoundaries, features, ladders].flat(),
    muted: true,
    screenShaker:     SHAKER_NO_SHAKE,  // Initially, the screen is not shaking.
    blackHole:        null,             // Initially, there's no black hole in view.
    debugSettings: {
      showCollisionRects: false,    // Collision rectangles for colliders.
      showPositionRects: false,     // Position rectangles for paintables.
      showWateringRects: false,     // Watering interaction rectangles for plants.
      showFacingRects: false,       // Facing direction rectangle for gardener.
      showEquipRects: false,        // Equipping interaction rectangle for watering can.
      showInteractionRects: false,  // Interaction rectangles.
      collisionsDisabled: false,    // Disable collision checks - Gardener can walk through anything.
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
    let f = computeCurrentFrame();
    let buttonIndex = 0;
    let all: ShieldButton[] = [];
    for (let r = 0; r < V_TILE_COUNT; r++) {
      for (let c = 0; c < H_TILE_COUNT; c++) {
        let i = (r * H_TILE_COUNT) + c;
        if (buttons[i] == 0) continue;
        let sb: ShieldButton = new ShieldButton(buttonIndex, new Coord(c*MAP_TILE_SIZE, r*MAP_TILE_SIZE), f, false);
        buttonIndex += 1;
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

function getEvents(): AnimEvent[] {
  return [...createSupernovaEvents(SUPERNOVA_DELAY)];
}

// Setup the timed schedule of all events associated with a dangerous supernova encounter.
function createSupernovaEvents(delay: number): AnimEvent[] {
    let f = computeCurrentFrame();
    let enterBH: AnimEvent = new AnimEvent(AnimEventType.BLACK_HOLE_APPEARS,  f + delay - (16 * FPS));
    let alarm1: AnimEvent = new AnimEvent(AnimEventType.ALARM_1,              f + delay - (15 * FPS));
    let alarm2: AnimEvent = new AnimEvent(AnimEventType.ALARM_2,              f + delay - (15 * FPS));
    let alarm3: AnimEvent = new AnimEvent(AnimEventType.ALARM_3,              f + delay - (15 * FPS));
    let supernova: AnimEvent = new AnimEvent(AnimEventType.IMPACT,            f + delay);
    let shake1: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_1,        f + delay - (15 * FPS));
    let shake2: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_2,        f + delay - (11 * FPS));
    let shake3: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_3,        f + delay - (7 * FPS));
    let shake4: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_4,        f + delay - (3 * FPS));
    let shake5: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_3,        f + delay);
    let shake6: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_2,        f + delay + (1 * FPS));
    let shake7: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_1,        f + delay + (2 * FPS));
    let shakeStop: AnimEvent = new AnimEvent(AnimEventType.SHAKE_STOP,        f + delay + (3 * FPS));

    return [enterBH, alarm1, alarm2, alarm3, supernova, shake1, shake2, shake3, shake4, shake5, shake6, shake7, shakeStop];
}
