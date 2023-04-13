import { Direction, IGlobalState, TILE_SIZE } from "../store/reducers";
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
  canvas.fillRect(state.wateringCan.x + 10, state.wateringCan.y + 10, 10, 10);
  canvas.strokeRect(state.wateringCan.x + 10, state.wateringCan.y + 10, 10, 10);
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

// Given a position and a direction, return the adjacent position in that direction.
// Return value represents a rectangle of TILE_SIZE by TILE_SIZE pixels by giving its
// top-left and bottom-right Coord values.
export function getFacingDetectionRect(pos: Coord, facing: Direction): any {
  switch (facing) {
    case Direction.Up:
      return {
        a: new Coord(pos.x, pos.y - TILE_SIZE),
        b: new Coord(pos.x + TILE_SIZE, pos.y),
      };
    case Direction.Down:
      return {
        a: new Coord(pos.x, pos.y + TILE_SIZE),
        b: new Coord(pos.x + TILE_SIZE, pos.y + (TILE_SIZE * 2)),
      };
    case Direction.Left:
      return {
        a: new Coord(pos.x - TILE_SIZE, pos.y),
        b: new Coord(pos.x, pos.y + TILE_SIZE),
      };
    case Direction.Right:
      return {
        a: new Coord(pos.x + TILE_SIZE, pos.y),
        b: new Coord(pos.x + (TILE_SIZE * 2), pos.y + TILE_SIZE),
      };
  }
}

// Current frame number is just current epoch quarter second.
export function computeCurrentFrame(): number {
  return  Math.floor(Date.now() / 42);  // Roughly 24 fps.
}
