import { Coord, Rect, InvisibleCollider, IGlobalState, Paintable, TypedPriorityQueue } from "../store/classes";
import { MAP_TILE_SIZE } from "../store/data/collisions";
import { Colour, CANVAS_HEIGHT, CANVAS_WIDTH, TILE_HEIGHT, TILE_WIDTH } from "../utils";

export * from './constants';

export const FPS = 24;

export const clearBoard = (canvas: CanvasRenderingContext2D | null) => {
  if (canvas) {
    canvas.clearRect(0, 0, 1000, 600);
  }
};

// Paint the scene, given a canvas and the current game state.
export const drawState = (
  canvas: CanvasRenderingContext2D | null,
  state: IGlobalState
) => {
  if (!canvas) return;

  // Put all paintable objects into a heap-based priority queue.
  // They'll come out sorted by ascending y coordinate for taking 3D.
  let pq = new TypedPriorityQueue<Paintable>(
    function (a: Paintable, b: Paintable) {
      return a.pos.y < b.pos.y;
    }
  );
  canvas.drawImage(state.backgroundImage, 0,0);
  state.plants.forEach(plant => pq.add(plant));
  pq.add(state.gardener);
  pq.add(state.wateringCan);
  while (!pq.isEmpty()) {
    let ptbl = pq.poll();
    if (ptbl === undefined) continue;
    ptbl.paint(canvas, state);
  }

  // Extra debug display.
  if (state.debugSettings.showCollisionRects) {
    state.invisibleColliders.forEach(ic => outlineRect(canvas, ic.collisionRect(), Colour.COLLISION_RECT));
  }
};

function randomNumber(min: number, max: number) {
  let random = Math.random() * max;
  return random - (random % 20);
}
/*
export const generateRandomPosition = (width: number, height: number) => {
  return new Coord(randomNumber(0, width), randomNumber(0, height));
};
*/

// Current frame number is just current epoch quarter second.
export function computeCurrentFrame(): number {
  return  Math.floor(Date.now() * FPS / 1000); 
}

// Given a rectangle, return a new one that is shifted by a given x and y delta.
export function shiftRect(rect: Rect, deltaX: number, deltaY: number): Rect {
  return {
    a: rect.a.plus(deltaX, deltaY),
    b: rect.b.plus(deltaX, deltaY),
  }
}

// Four invisible colliders to stop gardener from wandering beyond edge of canvas.
export function worldBoundaryColliders(): InvisibleCollider[] {
  return [
    new InvisibleCollider({a: new Coord(-50, 0), b: new Coord(CANVAS_WIDTH, -1)}),                           // Above canvas
    new InvisibleCollider({a: new Coord(0, CANVAS_HEIGHT), b: new Coord(CANVAS_WIDTH, CANVAS_HEIGHT + 50)}), // Below canvas
    new InvisibleCollider({a: new Coord(-50, 0), b: new Coord(0, CANVAS_HEIGHT)}),                           // Left of canvas
    new InvisibleCollider({a: new Coord(CANVAS_WIDTH, 0), b: new Coord(CANVAS_WIDTH + 50, CANVAS_HEIGHT)}),  // Right of canvas
  ];
}

// Paint a Rect on a canvas with a given colour.
export function outlineRect(canvas: CanvasRenderingContext2D, rect: Rect, colour: string): void {
  canvas.strokeStyle = colour;
  canvas?.strokeRect(rect.a.x, rect.a.y, rect.b.x - rect.a.x + 1, rect.b.y - rect.a.y + 1);
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