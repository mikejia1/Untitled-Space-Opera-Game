import { Direction, IGlobalState, TILE_WIDTH, TILE_HEIGHT } from "../store/reducers";
import { Coord } from "../store/classes";
import { Paintable } from "../store/classes/paintable";
import { TypedPriorityQueue } from "../store/classes/priorityqueue";

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
  while (!pq.isEmpty()) {
    let ptbl = pq.poll();
    if (ptbl === undefined) continue;
    ptbl.paint(canvas, state);
  }

  // TODO: Should the watering can be a special case?

  // Watering Can. 
  canvas.fillStyle = "#808080"; // Grey
  canvas.fillRect(  state.wateringCan.x + 10, state.wateringCan.y + 10 - (TILE_HEIGHT * 2), 10, 10);
  canvas.strokeRect(state.wateringCan.x + 10, state.wateringCan.y + 10 - (TILE_HEIGHT * 2), 10, 10);
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
export function shiftRect(rect: any, deltaX: number, deltaY: number): any {
  return {
    a: rect.a.plus(deltaX, deltaY),
    b: rect.b.plus(deltaX, deltaY),
  }
}