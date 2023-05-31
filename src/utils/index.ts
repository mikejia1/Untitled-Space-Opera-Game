import { ColliderType, IGlobalState, Paintable } from "../store/classes";
import { H_TILE_COUNT, MAP_TILE_SIZE, V_TILE_COUNT } from "../store/data/positions";
import { TypedPriorityQueue } from "./priorityqueue";
import {
  BACKGROUND_WIDTH, BACKGROUND_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT, Direction, ALL_DIRECTIONS,
  ALL_DIR8S, Colour, ENTITY_RECT_HEIGHT, ENTITY_RECT_WIDTH, FPS, Dir8,
 } from "./constants";
 import { Coord } from './coord';
 import { Rect } from './rect';
 import { Tile, WrapSector, InvisibleCollider } from '../scene';
import { drawAnimationEvent } from "./drawevent";
import { Dialog } from "../scene/dialog";
import { Lifeform } from "../store/classes/lifeform";
import { Planet } from "../scene/planet";

export * from './coord';
export * from './constants';
export * from './priorityqueue';
export * from './rect';
export * from './shaker';

// The coord that would place the Gardener at the centre of the canvas.
export const CANVAS_CENTRE = new Coord(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

// The rectangle that is the visible pixel range on the canvas.
export const CANVAS_RECT = {
  a: new Coord(0,0),
  b: new Coord(CANVAS_WIDTH-1, CANVAS_HEIGHT-1),
};

// The clipping rectangle for the starfield. Used to clip the shield doors,
// preventing them from being drawn so far down that they're visible through
// the air lock.
export const STARFIELD_RECT = {
  a: new Coord(0,0),
  b: new Coord(CANVAS_WIDTH-1, 145),  // Y coord here is the key value.
};

// The clipping rectangle for the ship interior. Used to clip the shield shadows,
// preventing them from being drawn on anything outside the ship interior.
export const SHIP_INTERIOR_RECT = {
  a: new Coord(0, 145),
  b: new Coord(CANVAS_WIDTH-1, BACKGROUND_HEIGHT-1),
};

export const clearBoard = (canvas: CanvasRenderingContext2D | null) => {
  if (canvas) {
    canvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
};

// Use a priority queue based on y coordinate to paint all paintables that are NOT BEHIND the ship.
// i.e. the paintables that are NOT behind the air lock doors.
function drawPaintablesNotBehindShip(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
  // Put all paintable objects into a heap-based priority queue.
  // They'll come out sorted by ascending y coordinate for faking 3D.
  let pq = new TypedPriorityQueue<Paintable>(
    function (a: Paintable, b: Paintable) {
      return a.pos.y < b.pos.y;
    }
  );

  // Put all paintables into the priority queue, except those that are behind the ship.
  state.plants.forEach(plant => pq.add(plant));
  state.npcs.forEach(npc => {
    if (npc.death === null || npc.death.ejectionScaleFactor === null) pq.add(npc);
  });
  state.cats.forEach(cat => {
    if (cat.death === null || cat.death.ejectionScaleFactor === null) pq.add(cat);
  });
  if (state.gardener.death === null || state.gardener.death.ejectionScaleFactor === null) pq.add(state.gardener);
  state.shieldButtons.forEach(sb => pq.add(sb));
  pq.add(state.airlockButton);
  pq.add(state.wateringCan);
  pq.add(state.railing);
  
  while (!pq.isEmpty()) {
    let ptbl = pq.poll();
    if (ptbl === undefined) continue;
    ptbl.paint(canvas, state);
  }
}

// Use a priority queue based on air lock ejection scale to paint all life forms that are BEHIND the ship.
// i.e. the life forms that are behind the air lock doors.
function drawLifeformsBehindShip(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
  // Put all life forms into a heap-based priority queue.
  // They'll come out sorted by ascending ejection scale factor for faking depth.
  let pq = new TypedPriorityQueue<Lifeform>(
    function (a: Lifeform, b: Lifeform) {
      let sa = (a.death !== null && a.death.ejectionScaleFactor !== null) ? a.death.ejectionScaleFactor : 1;
      let sb = (b.death !== null && b.death.ejectionScaleFactor !== null) ? b.death.ejectionScaleFactor : 1;
      return sa < sb;
    }
  );

  // Put all life forms into the priority queue, except those that are NOT behind the ship.
  state.npcs.forEach(npc => {
    if (npc.death !== null && npc.death.ejectionScaleFactor !== null) pq.add(npc);
  });
  state.cats.forEach(cat => {
    if (cat.death !== null && cat.death.ejectionScaleFactor !== null) pq.add(cat);
  });
  if (state.gardener.death !== null && state.gardener.death.ejectionScaleFactor !== null) pq.add(state.gardener);
  
  while (!pq.isEmpty()) {
    let ptbl = pq.poll();
    if (ptbl === undefined) continue;
    ptbl.paint(canvas, state);
  }
}

// Paint the scene, given a canvas and the current game state.
export const drawState = (
  canvas: CanvasRenderingContext2D | null,
  state: IGlobalState
) => {
  if (!canvas) return;
  if (state.debugSettings.freeze) return;

  canvas.save();
  //canvas.scale(0.5, 0.5);     // Uncomment for god's eye view.
  //canvas.translate(100, 100); // Same here.

  let shift = computeBackgroundShift(state, 0); // A no-delta shift.
  drawBackground(state, shift, canvas);
  
  // Draw portal.
  if(state.portal !== null) {
    state.portal.paint(canvas, state);
  }

  drawPaintablesNotBehindShip(canvas, state);

  // Shield shadows and shade.
  state.shieldDoors.paintShadows(canvas, state);
  drawAmbientShade(state, canvas);

  // Draw dialog.
  if (state.dialogs.length > 0) {
    state.dialogs[0].paint(canvas, state);
  }

  // Draw status bar. 
  state.statusBar.paint(canvas, state);

  drawAnimationEvent(state, shift, canvas);

  // Extra debug display.
  if (state.debugSettings.showCollisionRects) {
    state.invisibleColliders.forEach(ic => outlineRect(canvas, shiftForVisibleRect(ic.collisionRect(), shift), Colour.COLLISION_RECT));
  }

  canvas.restore();
};

// Draw a semi-transparent black rectangle over the canvas to convey global ambient shade from the shield doors.
function drawAmbientShade(state: IGlobalState, canvas: CanvasRenderingContext2D): void {
  let alpha: number = state.shieldDoors.ambientShadeFactor * 0.5;
  canvas.save();
  canvas.fillStyle = `rgba(0,0,0,${alpha})`;
  canvas.rect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.fill();
  canvas.restore();
}

// Compute a displacement that would shift the background to the "right" place. In tile.ts this
// corresponds to the background being placed in WrapSector.Middle. This includes any screen shake.
export function computeBackgroundShift(state: IGlobalState, deltaCap: number): Coord {
  let shift = new Coord(0,0);

  // Let the screenShaker do its thing.
  let shake = state.screenShaker.shake(state.currentFrame, deltaCap);
  shift = shift.plus(shake.x, shake.y);

  return shift.toIntegers();
}

// Compute a displacement that would shift the background to the "right" place. In tile.ts this
// corresponds to the background being placed in WrapSector.Middle. This is without any screen shake.
export function computeBackgroundShiftWithoutShake(state: IGlobalState): Coord {
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

// Returns true if the second rectangle is completely contained within the first rectangle.
export function rectangleContained(outer: Rect, inner: Rect): boolean {
  return (outer.a.x <= inner.a.x) && (outer.a.y <= inner.a.y) && (outer.b.x >= inner.b.x) && (outer.b.y >= inner.b.y);
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
  drawShiftedBackground(state, canvas, shift);
  // A ring-world background image wider than the canvas. 
  if (BACKGROUND_WIDTH > CANVAS_WIDTH) {
    if (shift.x >= 0) {
      let reshift = shift.minus(BACKGROUND_WIDTH, 0);
      drawShiftedBackground(state, canvas, reshift);
    } else if ((shift.x + BACKGROUND_WIDTH) < CANVAS_WIDTH) {
      let reshift = shift.plus(BACKGROUND_WIDTH, 0);
      drawShiftedBackground(state, canvas, reshift);
    }
  } else {
    // A narrow bounded map that is not wider than the canvas.
      drawShiftedBackground(state, canvas, shift);
  }
}

function drawShiftedBackground(state: IGlobalState, canvas: CanvasRenderingContext2D, shift: Coord) {
  // Draw the starfield visible through the ship's window.
  drawStarfield(state, canvas, shift);
  // Draw objects that are in space, visible through the window.
  drawSpaceObjects(state, canvas);
  // Draw the blast shield.
  state.shieldDoors.paint(canvas, state);
  // Draw life forms that are being expelled through the air lock.
  drawLifeformsBehindShip(canvas, state);
  // Draw the airlock doors.
  state.airlock.paint(canvas, state, shift);
  // Draw the static background of the ship interior.
  canvas.drawImage(state.backgroundImages.default, shift.x, shift.y);
}

// Draw objects that are in space, visible through the window.
function drawSpaceObjects(state: IGlobalState, canvas: CanvasRenderingContext2D) {
  if (state.blackHole !== null) state.blackHole.paint(canvas, state);

  // Put all drifters into a heap-based priority queue.
  // They'll come out sorted by decreasing start frame.
  let pq = new TypedPriorityQueue<Planet>(
    function (a: Planet, b: Planet) {
      if (a.startFrame === b.startFrame) return a.angle > b.angle;  // Break ties, otherwise ordering can change randomly.
      return a.startFrame > b.startFrame;
    }
  );
  state.drifters.forEach(d => {
    if (d !== null) pq.add(d);
  });
  while (!pq.isEmpty()) {
    let d = pq.poll();
    d?.paint(canvas, state);
  }
}

// Draw the starfield seen through the window of the ship.
function drawStarfield(state: IGlobalState, canvas: CanvasRenderingContext2D, shift: Coord) {
  let h = H_TILE_COUNT*MAP_TILE_SIZE;
  let v = V_TILE_COUNT*MAP_TILE_SIZE;
  let deepSpaceFrame = Math.floor(state.currentFrame % 24 / 6);
  let dest = state.starfield.pos.mod(h, v).plus(shift.x, shift.y).toIntegers();
  // Starfield southeast of drifted position of top-left corner.
  canvas.drawImage(
    state.backgroundImages.deepSpace, // Sprite source image
    deepSpaceFrame * h, 0,            // Top-left corner of frame in source
    h, v,                             // Size of frame in source
    dest.x,                           // X position of top-left corner on canvas
    dest.y,                           // Y position of top-left corner on canvas
    h, v);                            // Sprite size on canvas
  // Starfield southwest of drifted position of top-left corner.
  canvas.drawImage(
    state.backgroundImages.deepSpace, // Sprite source image
    deepSpaceFrame * h, 0,            // Top-left corner of frame in source
    h, v,                             // Size of frame in source
    dest.x - h,                       // X position of top-left corner on canvas
    dest.y,                           // Y position of top-left corner on canvas
    h, v);                            // Sprite size on canvas
  // Starfield northeast of drifted position of top-left corner.
  canvas.drawImage(
    state.backgroundImages.deepSpace, // Sprite source image
    deepSpaceFrame * h, 0,            // Top-left corner of frame in source
    h, v,                             // Size of frame in source
    dest.x,                           // X position of top-left corner on canvas
    dest.y - v,                       // Y position of top-left corner on canvas
    h, v);                            // Sprite size on canvas
  // Starfield northwest of drifted position of top-left corner.
  canvas.drawImage(
    state.backgroundImages.deepSpace, // Sprite source image
    deepSpaceFrame * h, 0,            // Top-left corner of frame in source
    h, v,                             // Size of frame in source
    dest.x - h,                       // X position of top-left corner on canvas
    dest.y - v,                       // Y position of top-left corner on canvas
    h, v);                            // Sprite size on canvas  
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomDirection(): Direction {
  return ALL_DIRECTIONS[randomInt(0, ALL_DIRECTIONS.length - 1)];
}

export function randomDir8(): Dir8 {
  return ALL_DIR8S[randomInt(0, ALL_DIR8S.length - 1)];
}

export function adjacentRandomDir8(d: Dir8): Dir8 {
  switch (d) {
    case Dir8.Up:         return Math.random() < 0.5 ? Dir8.UpLeft : Dir8.UpRight;
    case Dir8.UpRight:    return Math.random() < 0.5 ? Dir8.Up : Dir8.Right;
    case Dir8.Right:      return Math.random() < 0.5 ? Dir8.UpRight : Dir8.DownRight;
    case Dir8.DownRight:  return Math.random() < 0.5 ? Dir8.Right : Dir8.Down;
    case Dir8.Down:       return Math.random() < 0.5 ? Dir8.DownRight : Dir8.DownLeft;
    case Dir8.DownLeft:   return Math.random() < 0.5 ? Dir8.Down : Dir8.Left;
    case Dir8.Left:       return Math.random() < 0.5 ? Dir8.DownLeft : Dir8.UpLeft;
    case Dir8.UpLeft:     return Math.random() < 0.5 ? Dir8.Left : Dir8.Up;
  };
}

export function adjacentDir8Indicies(d: Dir8): number[] {
  switch (d) {
    case Dir8.Up:         return [7,1];
    case Dir8.UpRight:    return [0,2];
    case Dir8.Right:      return [1,3];
    case Dir8.DownRight:  return [2,4];
    case Dir8.Down:       return [3,5];
    case Dir8.DownLeft:   return [4,6];
    case Dir8.Left:       return [5,7];
    case Dir8.UpLeft:     return [6,0];
  };
}

export function randLeftOrRight(): Dir8 {
  return (randomInt(0, 99) < 50) ? Dir8.Left : Dir8.Right;
}

// Return an [x,y] deltas array for a given Dir8, horizontal speed, and vertical speed.
const RT2 = 1.41421356237;
export function dir8ToDeltas(d: Dir8, h: number, v: number): number[] {
  switch (d) {
    case Dir8.Up:         return [ 0,       -v      ];
    case Dir8.UpRight:    return [ h / RT2, -v / RT2];
    case Dir8.Right:      return [ h,        0      ];
    case Dir8.DownRight:  return [ h / RT2,  v / RT2];
    case Dir8.Down:       return [ 0,        v      ];
    case Dir8.DownLeft:   return [-h / RT2,  v / RT2];
    case Dir8.Left:       return [-h,        0      ];
    case Dir8.UpLeft:     return [-h / RT2, -v / RT2];
  };
}

// Return true iff given Direction is within 45 degrees of given Dir8.
export function directionCloseToDir8(direction: Direction, dir8: Dir8): boolean {
  switch (direction) {
    case Direction.Up:    return (dir8 === Dir8.UpLeft    || dir8 === Dir8.Up     || dir8 === Dir8.UpRight);
    case Direction.Right: return (dir8 === Dir8.UpRight   || dir8 === Dir8.Right  || dir8 === Dir8.DownRight);
    case Direction.Down:  return (dir8 === Dir8.DownRight || dir8 === Dir8.Down   || dir8 === Dir8.DownLeft);
    case Direction.Left:  return (dir8 === Dir8.DownLeft  || dir8 === Dir8.Left   || dir8 === Dir8.UpLeft);
  }
}

// Convert a Direction to equivalent Dir8.
function directionToDir8(direction: Direction): Dir8 {
  switch (direction) {
    case Direction.Up:    return Dir8.Up;
    case Direction.Down:  return Dir8.Down;
    case Direction.Left:  return Dir8.Left;
    case Direction.Right: return Dir8.Right;
  };
}

// Return the index of a Dir8 in the ALL_DIR8S array.
export function dir8ToIndex(d: Dir8): number {
  //[Dir8.Up, Dir8.UpRight, Dir8.Right, Dir8.DownRight, Dir8.Down, Dir8.DownLeft, Dir8.Left, Dir8.UpLeft];
  switch (d) {
    case Dir8.Up:         return 0;
    case Dir8.UpRight:    return 1;
    case Dir8.Right:      return 2;
    case Dir8.DownRight:  return 3;
    case Dir8.Down:       return 4;
    case Dir8.DownLeft:   return 5;
    case Dir8.Left:       return 6;
    case Dir8.UpLeft:     return 7;
  }
}

// Check if an array of 2 Direction values includes two given Direction values, regardless of order.
function includesBoth(dirs: Direction[], d1: Direction, d2: Direction): boolean {
  return dirs.includes(d1) && dirs.includes(d2);
}

// Return the Dir8 that results from the given array of Direction values (correspond to direction keys currently being pressed).
export function directionsToDir8(directions: Direction[]): Dir8 {
  if (directions.length === 1) return directionToDir8(directions[0]);
  const diag = directions.slice(0, 2);
  if (oppositeDirection(diag[0]) === diag[1]) return directionToDir8(directions[0]);
  if (includesBoth(diag, Direction.Up, Direction.Right))    return Dir8.UpRight;
  if (includesBoth(diag, Direction.Down, Direction.Right))  return Dir8.DownRight;
  if (includesBoth(diag, Direction.Up, Direction.Left))     return Dir8.UpLeft;
  if (includesBoth(diag, Direction.Down, Direction.Left))   return Dir8.DownLeft;
  return directionToDir8(diag[0]); // Should never reach this.
}

// Get the direction (Up/Down/Left/Right) of first relative to second.
export function directionOfFirstRelativeToSecond(first: Paintable | Coord, second: Paintable | Coord): Direction {
  let pos1: Coord = (first instanceof Coord) ? first : first.pos;
  let pos2: Coord = (second instanceof Coord) ? second : second.pos;
  let upness    = pos2.y - pos1.y;
  let downness  = -upness;
  let leftness  = pos2.x - pos1.x;
  let rightness = -leftness;
  let vertness  = Math.max(upness, downness);
  let horzness  = Math.max(leftness, rightness);
  if (vertness > horzness) {
    if (upness > downness) return Direction.Up;
    return Direction.Down;
  }
  if (leftness > rightness) return Direction.Left;
  return Direction.Right;
}

export function directionName(d: Direction): string {
  switch (d) {
    case Direction.Up:    return "up";
    case Direction.Down:  return "down";
    case Direction.Left:  return "left";
    case Direction.Right: return "right";
  }
}

export function oppositeDirection(d: Direction): Direction {
  switch (d) {
    case Direction.Up:    return Direction.Down;
    case Direction.Down:  return Direction.Up;
    case Direction.Left:  return Direction.Right;
    case Direction.Right: return Direction.Left;
  }
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

// Given a rectangle, return a new one that is stretched by factors x and y (horz, vert) away from top-left corner.
export function stretchRect(rect: Rect, x: number, y: number): Rect {
  return {
    a: rect.a,
    b: new Coord(
      rect.a.x + ((rect.b.x - rect.a.x) * x),
      rect.a.y + ((rect.b.y - rect.a.y) * y)),
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
      },
      ColliderType.WallCo),
    // Below background image.
    new InvisibleCollider(
      nextColliderId + 1,
      {
        a: new Coord(-thickness, BACKGROUND_HEIGHT),
        b: new Coord(BACKGROUND_WIDTH + thickness, BACKGROUND_HEIGHT + thickness),
      },
      ColliderType.WallCo),
  ];

  // For ring-world maps that are wider than the canvas, the above boundaries are all that are needed.
  if (BACKGROUND_WIDTH > CANVAS_WIDTH) return boundaries;

  // For non-ring-world maps with width narrower than canvas width, there are left and right boundaries too.
  // There are basic ones that affect the gardener but not the NPCs, and there are special ones that wall
  // off little off-screen wander zones for NPCs.
  let top = 195;                    // Top of each off-screen holding zone.
  let bot = BACKGROUND_HEIGHT - 35; // Bottom of each off-screen holding zone.
  let wid = 30;                     // Width of each off-screen holding zone.
  let deb = 0;                      // Debug value to widen rectangles, making them visible on canvas.
  let thk = 20;                     // Thickness of the special rectangles.
  return [
    ...boundaries,
    // Gardener-only boundary on the left.
    new InvisibleCollider(
      nextColliderId + 2,
      {
        a: new Coord(-thickness, -thickness),
        b: new Coord(-1, BACKGROUND_HEIGHT + thickness),
      },
      ColliderType.GardenerWallCo),
    // Gardener-only boundary on the right.
    new InvisibleCollider(
      nextColliderId + 3,
      {
        a: new Coord(BACKGROUND_WIDTH, -thickness),
        b: new Coord(BACKGROUND_WIDTH + thickness, BACKGROUND_HEIGHT + thickness),
      },
      ColliderType.GardenerWallCo),
    // Boundary for NPC off-screen wandering on the left.
    new InvisibleCollider(  // Top edge.
      nextColliderId + 4,
      {
        a: new Coord(-deb -wid, top - thk),
        b: new Coord(+deb   -1, top),
      },
      ColliderType.WallCo
    ),
    new InvisibleCollider(  // Bottom edge.
      nextColliderId + 5,
      {
        a: new Coord(-deb -wid, bot),
        b: new Coord(+deb   -1, bot + thk),
      },
      ColliderType.WallCo
    ),
    new InvisibleCollider(  // Left edge.
      nextColliderId + 6,
      {
        a: new Coord(-deb -wid - thk, top - thk),
        b: new Coord(+deb -wid,       bot + thk),
      },
      ColliderType.WallCo
    ),
    // Boundary for NPC off-screen wandering on the right.
    new InvisibleCollider(  // Top edge.
      nextColliderId + 7,
      {
        a: new Coord(-deb +BACKGROUND_WIDTH,       top - thk),
        b: new Coord(+deb +BACKGROUND_WIDTH + wid, top),
      },
      ColliderType.WallCo
    ),
    new InvisibleCollider(  // Bottom edge.
      nextColliderId + 8,
      {
        a: new Coord(-deb +BACKGROUND_WIDTH,       bot),
        b: new Coord(+deb +BACKGROUND_WIDTH + wid, bot + thk),
      },
      ColliderType.WallCo
    ),
    new InvisibleCollider(  // Right edge.
      nextColliderId + 9,
      {
        a: new Coord(-deb +BACKGROUND_WIDTH + wid,       top - thk),
        b: new Coord(+deb +BACKGROUND_WIDTH + wid + thk, bot + thk),
      },
      ColliderType.WallCo
    ),
  ];
  }

// Paint a Rect on a canvas with a given colour.
export function outlineRect(canvas: CanvasRenderingContext2D, rect: Rect, colour: string): void {
  canvas.lineWidth = 1;
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

// Draw an image on the canvas in such a way that it will be clipped within
// a given destination rectangle.
export function drawClippedImage(
  canvas: CanvasRenderingContext2D, img: any,
  srcX: number, srcY: number,
  srcW: number, srcH: number,
  dstX: number, dstY: number,
  dstW: number, dstH: number,
  clipRect: Rect): void {
    // Compute the non-clipped destination Rect for the image.
    let destRect: Rect = {
      a: new Coord(dstX, dstY),
      b: new Coord(dstX + dstW - 1, dstY + dstH - 1),
    };
    // If clipRect and destRect don't overlap, there's nothing to draw.
    if (!rectanglesOverlap(destRect, clipRect)) return;
    // Get the overlap rectangle representing the only region to be painted.
    let overlap: Rect = computeRectOverlap(destRect, clipRect);
    // Get the source rectangle.
    let srcRect = {
      a: new Coord(srcX, srcY),
      b: new Coord(srcX + srcW - 1, srcY + srcH - 1),
    };
    let clippedSrcRect = computeCorrespondingRect(srcRect, destRect, overlap);
    canvas.drawImage(
      img,
      clippedSrcRect.a.x, clippedSrcRect.a.y,
      clippedSrcRect.b.x - clippedSrcRect.a.x + 1, clippedSrcRect.b.y - clippedSrcRect.a.y + 1,
      overlap.a.x, overlap.a.y,
      overlap.b.x - overlap.a.x + 1, overlap.b.y - overlap.a.y + 1);
}

// Compute the rectangle that is the overlap between two rectangles a and b.
// Note: only call this if you already know the rectangles overlap.
export function computeRectOverlap(u: Rect, v: Rect): Rect {
  return {
    a: new Coord(Math.max(u.a.x, v.a.x), Math.max(u.a.y, v.a.y)),
    b: new Coord(Math.min(u.b.x, v.b.x), Math.min(u.b.y, v.b.y)),
  };
}

// Given three rectangles, a, b, c, where a is the source rectangle in a source image, b is
// the corresponding destination rectangle on a canvas, and c is clipped version of b, return
// the rectangle that is a clipped version of a that does the *same* clipping in the source image.
export function computeCorrespondingRect(a: Rect, b: Rect, c: Rect): Rect {
  let destW = b.b.x - b.a.x + 1;
  let destH = b.b.y - b.a.y + 1;
  let srcW = a.b.x - a.a.x + 1;
  let srcH = a.b.y - a.a.y + 1;
  let topLeft = new Coord(
    a.a.x + (srcW * ((c.a.x - b.a.x) / destW)),
    a.a.y + (srcH * ((c.a.y - b.a.y) / destH)));
  let botRight = new Coord(
    a.b.x + (srcW * ((c.b.x - b.b.x) / destW)),
    a.b.y + (srcH * ((c.b.y - b.b.y) / destH)));
  return {
    a: topLeft,
    b: botRight,
  };
}
