import { IGlobalState, TILE_HEIGHT, TILE_WIDTH } from "../store/reducers";
import { Coord, Rect, InvisibleCollider } from "../store/classes";
import { Paintable } from "../store/classes/paintable";
import { TypedPriorityQueue } from "../store/classes/priorityqueue";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "../components/CanvasBoard";

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
  state.plants.forEach(plant => pq.add(plant));
  pq.add(state.gardener);
  pq.add(state.wateringCan);
  while (!pq.isEmpty()) {
    let ptbl = pq.poll();
    if (ptbl === undefined) continue;
    ptbl.paint(canvas, state);
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
  return  Math.floor(Date.now() / 42);  // Roughly 24 fps.
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
