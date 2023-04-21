import { Tile, InvisibleCollider, IGlobalState, Paintable, WrapSector } from "../store/classes";
import { MAP_TILE_SIZE } from "../store/data/collisions";
import { TypedPriorityQueue } from "./priorityqueue";
import {
  BACKGROUND_WIDTH, BACKGROUND_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, Direction, ALL_DIRECTIONS,
  Colour, TILE_HEIGHT, TILE_WIDTH,
 } from "./constants";
 import { Coord } from './coord';
 import { Rect } from './rect';

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
  let firstShift = CANVAS_CENTRE.minus(state.gardener.pos.x, state.gardener.pos.y);
  if (firstShift.x >= 0) return firstShift.minus(BACKGROUND_WIDTH, 0);
  return firstShift;
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
  canvas.drawImage(state.backgroundImage, shift.x, shift.y);
  //outlineRect(canvas, {a: new Coord(shift.x, shift.y), b: new Coord(shift.x + BACKGROUND_WIDTH - 1, shift.y + BACKGROUND_HEIGHT - 1)}, "#000000");
  if (shift.x >= 0) {
    let reshift = shift.minus(BACKGROUND_WIDTH, 0);
    canvas.drawImage(state.backgroundImage, reshift.x, reshift.y);
  } else if ((shift.x + BACKGROUND_WIDTH) < CANVAS_WIDTH) {
    let reshift = shift.plus(BACKGROUND_WIDTH, 0);
    canvas.drawImage(state.backgroundImage, reshift.x, reshift.y);
  }
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
  let rightRect = shiftRect(leftRect, BACKGROUND_WIDTH, 0);
  if (rectanglesOverlap(CANVAS_RECT, rightRect)) return rightRect;
  return leftRect;
}

// Two invisible colliders to stop gardener and NPCs from wandering beyond top and bottom edges of world.
export function worldBoundaryColliders(nextColliderId: number): InvisibleCollider[] {
  return [
    // Above background image.
    new InvisibleCollider(
      nextColliderId,
      {
        a: new Coord(-500, -500),
        b: new Coord(BACKGROUND_WIDTH + 500, -1),
      }),
    // Below background image.
    new InvisibleCollider(
      nextColliderId + 1,
      {
        a: new Coord(-500, BACKGROUND_HEIGHT),
        b: new Coord(BACKGROUND_WIDTH + 500, BACKGROUND_HEIGHT + 500),
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
    a: obj.pos.plus(0, -TILE_HEIGHT),
    b: obj.pos.plus(TILE_WIDTH, 0),
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