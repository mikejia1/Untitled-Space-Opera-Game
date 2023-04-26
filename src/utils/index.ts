import { IGlobalState, Paintable } from "../store/classes";
import { H_TILE_COUNT, MAP_TILE_SIZE, V_TILE_COUNT } from "../store/data/positions";
import { TypedPriorityQueue } from "./priorityqueue";
import {
  BACKGROUND_WIDTH, BACKGROUND_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, Direction, ALL_DIRECTIONS,
  Colour, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH,
 } from "./constants";
 import { Coord } from './coord';
 import { Rect } from './rect';
 import { Tile, WrapSector, InvisibleCollider } from '../scene';

export * from './coord';
export * from './constants';
export * from './priorityqueue';
export * from './rect';

export const FPS = 24;

// The coord that would place the Gardener at the centre of the canvas.
export const CANVAS_CENTRE = new Coord(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

// The rectangle that is the visible pixel range on the canvas.
export const CANVAS_RECT = {
  a: new Coord(0,0),
  b: new Coord(CANVAS_WIDTH-1, CANVAS_HEIGHT-1),
};

export const clearBoard = (canvas: CanvasRenderingContext2D | null) => {
  if (canvas) {
    canvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
};

// Paint the scene, given a canvas and the current game state.
export const drawState = (
  canvas: CanvasRenderingContext2D | null,
  state: IGlobalState
) => {
  if (!canvas) return;

  // Put all paintable objects into a heap-based priority queue.
  // They'll come out sorted by ascending y coordinate for faking 3D.
  let pq = new TypedPriorityQueue<Paintable>(
    function (a: Paintable, b: Paintable) {
      return a.pos.y < b.pos.y;
    }
  );
  let shift = computeBackgroundShift(state);
  console.log("shift: "+shift.toString());
  drawBackground(state, shift, canvas);
  state.plants.forEach(plant => pq.add(plant));
  state.npcs.forEach(npc => pq.add(npc));
  pq.add(state.gardener);
  pq.add(state.wateringCan);
  while (!pq.isEmpty()) {
    let ptbl = pq.poll();
    if (ptbl === undefined) continue;
    ptbl.paint(canvas, state);
  }

  // Extra debug display.
  if (state.debugSettings.showCollisionRects) {
    state.invisibleColliders.forEach(ic => outlineRect(canvas, shiftForVisibleRect(ic.collisionRect(), shift), Colour.COLLISION_RECT));
  }
};

// Compute a displacement that would shift the background to the "right" place. In tile.ts this
// corresponds to the background being placed in WrapSector.Middle.
export function computeBackgroundShift(state: IGlobalState): Coord {
  let shift = CANVAS_CENTRE.minus(state.gardener.pos.x, state.gardener.pos.y);

  // Make an adjustment to the vertical shift so that as the gardener climbs the ladder and heads to the base of the
  // starfield view window, the full starfield window comes into view. This only applies to the map that existed on
  // April 25th, 2023.
  shift = new Coord(shift.x, remapRange(shift.y, -37, -85, 0, -85));

  // Prevent top of background image from dropping below top of canvas.
  if (shift.y > 0) shift = shift.minus(0, shift.y);
  // Prevent bottom of background image from rising above bottom of canvas.
  if (shift.y + BACKGROUND_HEIGHT < CANVAS_HEIGHT) shift = shift.plus(0, CANVAS_HEIGHT - (shift.y + BACKGROUND_HEIGHT));

  // Wrap-around logic for wide background ring-world type maps.
  if (BACKGROUND_WIDTH > CANVAS_WIDTH) {
    if (shift.x >= 0) return shift.minus(BACKGROUND_WIDTH, 0).toIntegers();
    return shift.toIntegers();
  }

  // Non-wrap-around logic for narrow background bounded maps.
  const padding = (CANVAS_WIDTH - BACKGROUND_WIDTH) / 2;
  // Prevent left edge of background image from moving farther right than the padding amount.
  if (shift.x > padding) shift = shift.minus(shift.x - padding, 0);
  // Prevent right edge of background image from moving farther left than the padding amount.
  if ((shift.x + BACKGROUND_WIDTH) < (CANVAS_WIDTH - padding)) shift = shift.plus((CANVAS_WIDTH - padding) - (shift.x + BACKGROUND_WIDTH), 0);
  return shift.toIntegers();
}

// Given a value (val), if it falls within the range [inA, inB] then linearly remap it to the range [outA, outB].
export function remapRange(val: number, inA: number, inB: number, outA: number, outB: number): number {
  let pos = (val - inA) / (inB - inA);
  if (val > inA) return outA;
  if ((pos < 0) || (pos > 1)) return val;
  return outA + ((outB - outA) * pos);
}

// Compute a displacement that would shift a given tile into the correct place to make it visible.
export function shiftForTile(tile: Tile, state: IGlobalState, shift: Coord): Coord {
  let ws = tile.sector(state, shift);
  switch (ws) {
    case WrapSector.Left:   return shift;
    case WrapSector.Right:  return shift.plus(BACKGROUND_WIDTH, 0);
  }
}

// Given two rectangles, check if they overlap.
export function rectanglesOverlap(rect1: any, rect2: any): boolean {
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

// Paint the background onto the canvas.
// First paint it in the WrapSector.Middle or "normal" position/sector.
// If any of the WrapSector.Left copy of the world should be visible, paint a copy there as well.
// If any of the WrapSector.Right copy of the world should be visible, paint a copy there as well.
function drawBackground(state: IGlobalState, shift: Coord, canvas: CanvasRenderingContext2D): void {
  drawDeepSpaceFrame(state, canvas, shift);
  canvas.drawImage(state.backgroundImage, shift.x, shift.y);
  //outlineRect(canvas, {a: new Coord(shift.x, shift.y), b: new Coord(shift.x + BACKGROUND_WIDTH - 1, shift.y + BACKGROUND_HEIGHT - 1)}, "#000000");
  // A ring-world background image wider than the canvas. 
  if (BACKGROUND_WIDTH > CANVAS_WIDTH) {
    if (shift.x >= 0) {
      let reshift = shift.minus(BACKGROUND_WIDTH, 0);
      drawDeepSpaceFrame(state, canvas, reshift);
      canvas.drawImage(state.backgroundImage, reshift.x, reshift.y);
    } else if ((shift.x + BACKGROUND_WIDTH) < CANVAS_WIDTH) {
      let reshift = shift.plus(BACKGROUND_WIDTH, 0);
      drawDeepSpaceFrame(state, canvas, reshift);
      canvas.drawImage(state.backgroundImage, reshift.x, reshift.y);  
    }
  } else {
    // A narrow bounded map that is not wider than the canvas.
    drawDeepSpaceFrame(state, canvas, shift);
    canvas.drawImage(state.backgroundImage, shift.x, shift.y);  
  }
}

function drawDeepSpaceFrame(state: IGlobalState, canvas: CanvasRenderingContext2D, shift: Coord){
  let frame = Math.floor(state.currentFrame % 24 / 6);
  canvas.drawImage(
    state.deepSpaceImage,                                     // Sprite source image
    frame * MAP_TILE_SIZE * H_TILE_COUNT, 0,                  // Top-left corner of frame in source
    H_TILE_COUNT*MAP_TILE_SIZE, V_TILE_COUNT*MAP_TILE_SIZE,   // Size of frame in source
    shift.x,                                                  // X position of top-left corner on canvas
    shift.y,                                                  // Y position of top-left corner on canvas
    H_TILE_COUNT*MAP_TILE_SIZE, V_TILE_COUNT*MAP_TILE_SIZE);  // Sprite size on canvas
}

function randomNumber(min: number, max: number) {
  let random = Math.random() * max;
  return random - (random % 20);
}
/*
export const generateRandomPosition = (width: number, height: number) => {
  return new Coord(randomNumber(0, width), randomNumber(0, height));
};
*/

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomDirection(): Direction {
  return ALL_DIRECTIONS[randomInt(0, ALL_DIRECTIONS.length - 1)];
}

// Current frame number is just current epoch quarter second.
export function computeCurrentFrame(): number {
  return  Math.floor(Date.now() * FPS / 1000); 
}

// Given a rectangle, return a new one that is shifted by a given x and y delta.
export function shiftRect(rect: Rect, deltaX: number, deltaY: number): Rect {
  return {
    a: rect.a.plus(deltaX, deltaY),
    b: rect.b.plus(deltaX, deltaY),
  };
}

// Given a rectangle, return a new one that is shifted to be in the correct WrapSector for visibility on canvas.
export function shiftForVisibleRect(rect: Rect, shift: Coord): Rect {
  let leftRect = {
    a: rect.a.plus(shift.x, shift.y),
    b: rect.b.plus(shift.x, shift.y),
  };
  // For non-ring-world bounded maps, always return the leftRect.
  if (CANVAS_WIDTH >= BACKGROUND_WIDTH) return leftRect;
  // For ring-world wrap-around maps, it depends which rect would actually be visible.
  let rightRect = shiftRect(leftRect, BACKGROUND_WIDTH, 0);
  if (rectanglesOverlap(CANVAS_RECT, rightRect)) return rightRect;
  return leftRect;
}

// Two invisible colliders to stop gardener and NPCs from wandering beyond top and bottom edges of world.
export function worldBoundaryColliders(nextColliderId: number): InvisibleCollider[] {
  const thickness = 5;
  let boundaries = [
    // Above background image.
    new InvisibleCollider(
      nextColliderId,
      {
        a: new Coord(-thickness, -thickness),
        b: new Coord(BACKGROUND_WIDTH + thickness, -1),
      }),
    // Below background image.
    new InvisibleCollider(
      nextColliderId + 1,
      {
        a: new Coord(-thickness, BACKGROUND_HEIGHT),
        b: new Coord(BACKGROUND_WIDTH + thickness, BACKGROUND_HEIGHT + thickness),
      }),
  ];

  // For ring-world maps that are wider than the canvas, the above boundaries are all that are needed.
  if (BACKGROUND_WIDTH > CANVAS_WIDTH) return boundaries;

  // For non-ring-world maps with width narrower than canvas width, there are left and right boundaries too.
  return [
    ...boundaries,
    new InvisibleCollider(
      nextColliderId + 2,
      {
        a: new Coord(-thickness, -thickness),
        b: new Coord(-1, BACKGROUND_HEIGHT + thickness),
      }),
    new InvisibleCollider(
      nextColliderId + 3,
      {
        a: new Coord(BACKGROUND_WIDTH, -thickness),
        b: new Coord(BACKGROUND_WIDTH + thickness, BACKGROUND_HEIGHT + thickness),
      }),
  ];
  }

// Paint a Rect on a canvas with a given colour.
export function outlineRect(canvas: CanvasRenderingContext2D, rect: Rect, colour: string): void {
  canvas.strokeStyle = colour;
  canvas.strokeRect(rect.a.x, rect.a.y, rect.b.x - rect.a.x + 1, rect.b.y - rect.a.y + 1);
}

// Painted a filled Rect on a canvas with a given colour.
export function fillRect(canvas: CanvasRenderingContext2D, rect: Rect, colour: string): void {
  canvas.fillStyle = colour;
  canvas.fillRect(rect.a.x, rect.a.y, rect.b.x - rect.a.x + 1, rect.b.y - rect.a.y + 1);
}

// Rectangle of dimensions TILE_WIDTH x TILE_HEIGHT at a Paintable's position.
export function positionRect(obj: Paintable): Rect {
  return {
    a: obj.pos.plus(0, -ENTITY_RECT_HEIGHT),
    b: obj.pos.plus(ENTITY_RECT_WIDTH, 0),
  };
}

// Rectangle corresponding to a given row and column on the map.
// See collisions.tsx for map and tile dimensions.
export function tileRect(row: number, col: number): Rect {
  return {
    a: new Coord(col * MAP_TILE_SIZE, row * MAP_TILE_SIZE),
    b: new Coord((col + 1) * MAP_TILE_SIZE, (row + 1) * MAP_TILE_SIZE),
  };
}

export function rectToString(rect: Rect): string {
  return "{ " + rect.a.toString() + " " + rect.b.toString() + " }";
}