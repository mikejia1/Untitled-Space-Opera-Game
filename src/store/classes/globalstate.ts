import { AnimEvent, AnimEventType, Collider, ColliderType, SUPERNOVA_DELAY } from './';
import { Gardener, NonPlayer, WateringCan, Plant, INITIAL_PLANT_HEALTH, Airlock, AirlockState, randomOffScreenPos } from '../../entities';
import { Coord, Shaker, Direction, FPS, GardenerDirection, computeCurrentFrame, tileRect, worldBoundaryColliders, SHAKER_NO_SHAKE } from '../../utils';
import { V_TILE_COUNT, H_TILE_COUNT, collisions, plants, buttons, ladders, MAP_TILE_SIZE } from "../data/positions";
import { BlackHole, InvisibleCollider } from "../../scene";
import { Planet, makePlanet } from '../../scene/planet';
import { ShieldButton } from '../../entities/shieldbutton';
import { ShieldDoor, initialShieldDoor } from '../../entities/shielddoor';
import { Cat } from '../../entities/cat';
import { Dialog } from '../../scene/dialog';
import { Railing } from '../../scene/railing';

// Gardener images.
import basewalkstrip             from "../../entities/images/gardener/base_walk_strip8.png";
import basewateringstrip         from "../../entities/images/gardener/base_watering_strip5.png";
import toolwateringstrip         from "../../entities/images/gardener/tools_watering_strip5.png";
import gardenerslainstrip        from "../../entities/images/gardener/gardener_slain.png"; 
import gardenerchokestrip        from "../../entities/images/gardener/gardener_choke.png";

// Blast shield images.
import closedShield      from "../../entities/images/shield/shield_32x160.png";
import topShield         from "../../entities/images/shield/shield_top_32x.png";
import bottomShield      from "../../entities/images/shield/shield_bottom_32x.png";
import blackTopShield    from "../../entities/images/shield/black_shield_top_32x.png";
import blackBottomShield from "../../entities/images/shield/black_shield_bottom_32x.png";

// NPC images.
import skeleton             from "../../entities/images/skeleton/skeleton_death.png";
import ghost                from "../../entities/images/skeleton/ghost_48px_20f.png";
import npcwalkcycle         from "../../entities/images/nonplayer/npcwalkcycle.png";
import frazzlednpcwalkcycle from "../../entities/images/nonplayer/frazzled_npcwalkcycle.png";
import scarednpcwalkcycle   from "../../entities/images/nonplayer/scared_npcwalkcycle.png";
import npcslainstrip        from "../../entities/images/nonplayer/npc_slain.png"; 
import npcchokestrip        from "../../entities/images/nonplayer/npc_choke.png";

// Cat images.
import catswalkcycle        from "../../entities/images/cats/cat_walk_cycle_40p_15f.png";
import catattack            from "../../entities/images/cats/cats_attack_40p_4f.png";
import catdeath             from "../../entities/images/cats/cats_melt_40p_12f.png";

// Ship interior images.
import spacegarden          from "../images/space_garden.png";
import spacegardenimpact    from "../images/space_garden_impact.png";
import airlockrailing       from "../images/air_lock_railing.png";

// Other images.
import gameoverImg          from "../images/gameover.png";
import replayPrompt         from "../images/replay_prompt.png";
import blackHoleImg         from "../images/drifting_planets/planet_black_hole_256px_30f.png";
import wateringcan          from "../../entities/images/wateringcan/wateringcan.png";
import spaceframes          from "../images/space_frames.png";
import shieldButton         from "../../entities/images/button/button_32x32.png";
import airlockDoors         from "../../entities/images/airlock/airlock_doors_64x64.png";
import dialogBox            from "../images/dialog.png";

// Plant image.
import plantimage       from "../../entities/images/plant/plants_16x16.png";
import plantcoinsprite  from "../../entities/images/plant/coin_generation_16x32p_8f.png";

// Coin image.
import coinimage        from "../../entities/images/coin/coin_16p_8f.png";

// Drifting planet images.
import crateredPlanetImg from "../images/drifting_planets/planet_cratered_256px_60f.png";
import dryPlanetImg from      "../images/drifting_planets/planet_dry_256px_60f.png";
import gasRingPlanetImg from  "../images/drifting_planets/planet_gas_ring_128px_40f.png";
import icePlanetImg from      "../images/drifting_planets/planet_ice_256px_60f.png";
import islandPlanetImg from   "../images/drifting_planets/planet_island_256px_60f.png";
import lavaPlanetImg from     "../images/drifting_planets/planet_lava_256px_60f.png";
import starPlanetImg from     "../images/drifting_planets/planet_star_256px_30f.png";
import wetPlanetImg from      "../images/drifting_planets/planet_wet_256px_60f.png";

// Interface for full game state object.
export interface IGlobalState {
    gameover: boolean;                  // Is the game over?
    gardener: Gardener;                 // The gardener tending the garden. Controlled by the player.
    keysPressed: Direction[];           // The movement keys currently pressed by the player.
    score: number;                      // The current game score
    oxygen: number;                     // The current oxygen level
    wateringCan: WateringCan;           // The watering can that the gardener uses to water plants
    plants: Plant[];                    // All the plants currently living
    npcs: NonPlayer[];                  // The various crew people wandering around in the garden
    cats: Cat[];                        // Murderous cats on a rampage
    shieldButtons: ShieldButton[];      // The buttons that activate sections of the blast shield
    airlockButton: ShieldButton;        // The button that opens the airlock
    shieldDoors: ShieldDoor;            // The blast shield that protects the garden
    airlock: Airlock;                   // The airlock that opens up into the void
    railing: Railing;                   // The railing right above the air lock
    currentFrame: number;               // The current animation frame number (current epoch quarter second number)
    gameoverFrame: number;              // The frame number when the game ended
    pendingEvents: AnimEvent[];         // Queue of one-off event animations to draw
    activeEvents: AnimEvent[];          // Queue of one-off event animations to draw
    dialogs: Dialog[];                  // Dialogs to display
    skeleton: any;                      // The skeleton death animation.
    ghost: any;                         // The ghost animation.
    catImages: any;                     // Source images for cat sprites.
    gardenerImages: any;                // Source images for gardener sprites.
    shieldImages: any;                  // Source images for the blast shield image.
    shieldButtonImage: any;             // Source image for the shield button animation.
    airlockDoorImage: any;              // Source image for the airlock doors.
    npcImages: any;                     // The NPC walkcycle sprite source images.
    backgroundImages: any;              // The background image.
    wateringCanImage: any;              // The watering can image.
    plantImages: any;                   // The plant image.
    coinImage: any;                     // The coin image.
    gameOverImage: any,                 // The game over image
    replayImage: any,                   // The replay prompt image
    blackHoleImage: any,                // Images containing animation frames for the black hole
    dialogImage: any,                   // The dialog box image
    invisibleColliders: Collider[];     // All Colliders that aren't visible.
    muted: boolean;                     // Enable / disable sounds.
    screenShaker: Shaker;               // For causing the screen to shake at key moments.
    blackHole: BlackHole | null;        // The black hole in view, or null if none in view.
    planet1: Planet | null;             // One of the planets drifting by. Null if none.
    planet2: Planet | null;             // One of the planets drifting by. Null if none.
    planet3: Planet | null;             // One of the planets drifting by. Null if none.
    planets: Planet[];                  // The full list of available drifting planets.
    randomCabinFeverAllowed: boolean;   // Whether or not NPCs can now develop cabin fever at random.
    lastNPCDeath: number;               // Frame number of the last time an NPC died.
    debugSettings: any;                 // For configuring extra debug info and visualizations.
    colliderMap: Map<number, Collider>; // Map of collider IDs to colliders.
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
  let npcs = gridOfNPCs(colliderId, new Coord(200, 250), 25, 2, 2, 6);
  colliderId += npcs.length;

  // Create a bunch of cats. 
  let cats = gridOfCats(colliderId, new Coord(200, 300), 25, 2, 2);
  colliderId += cats.length;

  // Create the buttons that activate the sections of the blast shield.
  let shieldButtons = createShieldButtons();
  let airlockButton = new ShieldButton(0, new Coord(148, 234), 0, false);
  
  // Create gardener.
  let gardener = initialGardener(colliderId);
  colliderId++;

  // Railing perfectly aligns with the "fake" one in the background image.
  let railing = new Railing(new Coord(165, 231), colliderId);
  colliderId++;

  return {
    gameover: false,
    gardener: gardener,
    keysPressed: [],
    score: 0,
    oxygen: 100,
    wateringCan: initialWateringCan(),
    plants: allPlants,
    npcs: npcs,
    cats: [],
    shieldButtons: shieldButtons,
    airlockButton: airlockButton,
    shieldDoors: initialShieldDoor(),
    airlock: new Airlock(),
    railing: railing,
    currentFrame: 0,
    gameoverFrame: 0,
    pendingEvents: getEvents(),
    activeEvents: [],
    dialogs: welcomeDialog(npcs),
    gardenerImages: {
      walkingBase:        loadImage("Base walk strip", basewalkstrip),
      wateringBase:       loadImage("Base watering strip", basewateringstrip),
      waterPouring:       loadImage("Tool watering strip", toolwateringstrip),
      slainDeath:         loadImage("Slain death strip", gardenerslainstrip),
      chokeDeath:         loadImage("Suffocation death strip", gardenerchokestrip),
    },
    skeleton:       loadImage("Skeleton death", skeleton),
    ghost:          loadImage("Ghost wabble cycle", ghost),
    catImages:       {
      run:      loadImage("Cat walk cycle", catswalkcycle),
      death:    loadImage("Cat death strip", catdeath),
      attack:   loadImage("Cat attack strip", catattack),
    },
    npcImages:       {
      normalWalkCycle:    loadImage("Normal NPC walk cycle", npcwalkcycle),
      frazzledWalkCycle:  loadImage("Frazzled NPC walk cycle", frazzlednpcwalkcycle),
      scaredWalkCycle:    loadImage("Scared NPC walk cycle", scarednpcwalkcycle),
      slainDeath:         loadImage("Slain death strip", npcslainstrip),
      chokeDeath:         loadImage("Suffocation death strip", npcchokestrip),
    },
    backgroundImages:{
      default:        loadImage("Space garden", spacegarden),
      impact:         loadImage("Space garden impact", spacegardenimpact),
      deepSpace:      loadImage("Space frames", spaceframes),
      airLockRailing: loadImage("Air lock railing", airlockrailing),
    },
    wateringCanImage: loadImage("Watering can", wateringcan),
    shieldImages: {
      closed:         loadImage("Closed shield", closedShield),
      top:            loadImage("Top shield", topShield),
      bottom:         loadImage("Bottom shield", bottomShield),
      blackTop:       loadImage("Black top shield", blackTopShield),
      blackBottom:    loadImage("Black bottom shield", blackBottomShield),
    },
    dialogImage:        loadImage("Dialog box", dialogBox),
    shieldButtonImage:  loadImage("Shield button", shieldButton),
    airlockDoorImage:   loadImage("Airlock doors", airlockDoors),
    plantImages:  {
      base: loadImage("Plant image", plantimage),
      coinGeneration: loadImage("Coin generation", plantcoinsprite),
    },
    coinImage: loadImage("Coin image", coinimage),
    gameOverImage:      loadImage("Game over", gameoverImg),
    replayImage:        loadImage("Replay prompt", replayPrompt),
    blackHoleImage:     loadImage("Black hole", blackHoleImg),
    invisibleColliders: [worldBoundaries, features, ladders].flat(),
    muted: true,
    screenShaker:     SHAKER_NO_SHAKE,  // Initially, the screen is not shaking.
    blackHole:        null,             // Initially, there's no black hole in view.
    planet1:          null,             // Start with no planets drifting by.
    planet2:          null,
    planet3:          null,
    planets:          [
      makePlanet(256, 60, loadImage("Cratered planet", crateredPlanetImg)),   // Cratered planet.
      makePlanet(256, 60, loadImage("Dry planet",      dryPlanetImg)),        // Dry planet.
      makePlanet(384, 40, loadImage("Gas ring planet", gasRingPlanetImg)),    // Gas ring planet. (actually 384 pixels).
      makePlanet(256, 60, loadImage("Ice planet",      icePlanetImg)),        // Ice planet.
      makePlanet(256, 60, loadImage("Island planet",   islandPlanetImg)),     // Island planet.
      makePlanet(256, 60, loadImage("Lava planet",     lavaPlanetImg)),       // Lava planet.
      makePlanet(512, 30, loadImage("Star planet",     starPlanetImg)),       // Star planet (yes, a star - actually 512 pixels).
      makePlanet(256, 60, loadImage("Wet planet",      wetPlanetImg)),        // Wet planet.
    ],
    randomCabinFeverAllowed: false, // No random cabin fever, initially.
    lastNPCDeath: 0,                // Dummy value for initialization.
    debugSettings: {
      showCollisionRects: false,    // Collision rectangles for colliders.
      showPositionRects: false,     // Position rectangles for paintables.
      showWateringRects: false,     // Watering interaction rectangles for plants.
      showFacingRects: false,       // Facing direction rectangle for gardener.
      showEquipRects: false,        // Equipping interaction rectangle for watering can.
      showInteractionRects: false,  // Interaction rectangles.
      collisionsDisabled: false,    // Disable collision checks - Gardener can walk through anything.
      freeze: false,                // When true, drawState becomes a no-opp.
    },
    colliderMap: new Map<number, Collider>(),
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
      let plant: Plant = new Plant(colliderId++, new Coord(c*MAP_TILE_SIZE, r*MAP_TILE_SIZE+6), INITIAL_PLANT_HEALTH, plants[i]-baseValue+1);
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
function gridOfNPCs(colliderId: number, pos: Coord, spacing: number, cols: number, rows: number, numOffScreen: number): NonPlayer[] {
  let all: NonPlayer[] = [];
  let lastColliderId: number = 0;
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      lastColliderId = colliderId + (rows * col) + row;
      let npc = new NonPlayer({
        colliderId: lastColliderId,
        pos: pos.plus(col * spacing, row * spacing),
        id: (rows * col) + row,
      });
      all = [...all, npc];
    }
  }
  for (let i = 0; i < numOffScreen; i++) {
    let npc = new NonPlayer({
      colliderId: lastColliderId + i + 1,
      pos: randomOffScreenPos(),
      id: (rows * cols) + i,
      isOffScreen: true,
      invisible: true,
    });
    all = [...all, npc];
  }
  return all;
}

// Create a grid of NPCs with top-left one at given position, and with given spacing.
function gridOfCats(colliderId: number, pos: Coord, spacing: number, cols: number, rows: number): Cat[] {
  let all: Cat[] = [];
  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      let cat = new Cat({
        colliderId: colliderId + (rows * col) + row,
        pos: pos.plus(col * spacing, row * spacing), 
        color: ( col * cols + row ) % 5,
        id: (rows * col) + row,
      });
      all = [...all, cat];
    }
  }
  return all;
}

// Default gardener starting state.
function initialGardener(colliderId: number): Gardener {
  return new Gardener(colliderId, new Coord(200, 220), GardenerDirection.Right, false, false, false, null);
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
    let pulse1: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_1,     f + delay - (16 * FPS))
    let shake1: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_1,        f + delay - (15 * FPS));
    let pulse2: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_2,     f + delay - (12 * FPS));
    let shake2: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_2,        f + delay - (11 * FPS));
    let pulse3: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_3,     f + delay - (8 * FPS));
    let shake3: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_3,        f + delay - (7 * FPS));
    let pulse4: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_4,     f + delay - (1.15 * FPS));
    let shake4: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_4,        f + delay - (3 * FPS));
    let pulse5: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_3,     f + delay - (0.2 * FPS));
    let shake5: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_3,        f + delay);
    let pulse6: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_2,     f + delay + (2 * FPS));
    let shake6: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_2,        f + delay + (1 * FPS));
    let pulse7: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_LEVEL_1,     f + delay + (3 * FPS));
    let shake7: AnimEvent = new AnimEvent(AnimEventType.SHAKE_LEVEL_1,        f + delay + (2 * FPS));
    let pulseStop: AnimEvent = new AnimEvent(AnimEventType.BH_PULSE_STOP,     f + delay + (4 * FPS));
    let shakeStop: AnimEvent = new AnimEvent(AnimEventType.SHAKE_STOP,        f + delay + (3 * FPS));

    return [
      enterBH,
      alarm1, alarm2, alarm3,
      supernova,
      shake1, shake2, shake3, shake4, shake5, shake6, shake7, shakeStop,
      pulse1, pulse2, pulse3, pulse4, pulse5, pulse6, pulse7, pulseStop,
    ];
}

export function activateAirlockButton(globalState: IGlobalState): IGlobalState {
  console.log("Activating airlock button");
  let airlock: Airlock = globalState.airlock.activate(globalState);
  let airlockButton: ShieldButton;
  if (airlock.state == AirlockState.OPENING){
    airlockButton = globalState.airlockButton.startAlarm(globalState);
  }
  else {
    airlockButton = globalState.airlockButton.activate(globalState);   
  }
  return {
    ...globalState,
    airlockButton: airlockButton,
    airlock: airlock,
  };
}

export function welcomeDialog(npcs : NonPlayer[]): Dialog[] {
  let dialogs : Dialog[] = [];
  dialogs = [...dialogs, new Dialog("Good you're finally awake!", computeCurrentFrame() + 5*FPS, npcs[0].id)];
  dialogs = [...dialogs, new Dialog("There's no time to explain! Water the\n plants or we'll all die!!", computeCurrentFrame() + 5*FPS, npcs[1].id)];
  dialogs = [...dialogs, new Dialog("Press 'e' to pick up the watering can.\nIt's on the upper deck.", computeCurrentFrame() + 5*FPS, npcs[2].id)];
  return dialogs;
}
