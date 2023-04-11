import { Direction, IGlobalState, TILE_SIZE } from "../store/reducers";
import { Coord } from "../store/classes";

export const clearBoard = (canvas: CanvasRenderingContext2D | null) => {
  if (canvas) {
    canvas.clearRect(0, 0, 1000, 600);
  }
};

/*
export interface IObjectBody {
  x: number;
  y: number;
}
*/

// Paint the scene, given a canvas and the current game state.
export const drawState = (
  canvas: CanvasRenderingContext2D | null,
  state: IGlobalState
) => {
  if (!canvas) {
    return;
  }

  // Plants.
  state.plants.forEach(plant => plant.paint(canvas));

  // Gardener.
  state.gardener.paint(canvas);

  // Watering Can. 
  canvas.fillStyle = "#808080"; // Grey
  canvas.fillRect(state.wateringCan.x + 10, state.wateringCan.y + 10, 10, 10);
  canvas.strokeRect(state.wateringCan.x + 10, state.wateringCan.y + 10, 10, 10);
};

function randomNumber(min: number, max: number) {
  let random = Math.random() * max;
  return random - (random % 20);
}

export const generateRandomPosition = (width: number, height: number) => {
  return new Coord(randomNumber(0, width), randomNumber(0, height));
};

// Given a position and a direction, return the adjacent position in that direction.
export function getFacingCoord(pos: Coord, facing: Direction): Coord {
  switch (facing) {
    case Direction.Up:
      return new Coord(pos.x, pos.y - TILE_SIZE);
    case Direction.Down:
      return new Coord(pos.x, pos.y + TILE_SIZE);
    case Direction.Left:
      return new Coord(pos.x - TILE_SIZE, pos.y);
    case Direction.Right:
      return new Coord(pos.x + TILE_SIZE, pos.y);
  }
}

// Current frame number is just current epoch quarter second.
export function computeCurrentFrame(): number {
  return  Math.floor(Date.now() / 250);
}
