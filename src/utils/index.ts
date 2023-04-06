import { Coord, Direction, IGlobalState, TILE_SIZE } from "../store/reducers";

export const clearBoard = (context: CanvasRenderingContext2D | null) => {
  if (context) {
    context.clearRect(0, 0, 1000, 600);
  }
};

export interface IObjectBody {
  x: number;
  y: number;
}

/*
export const drawObject = (
  context: CanvasRenderingContext2D | null,
  object: Coord,
  fillColor: string,
  strokeStyle = 
) => {
  if (context) { 
    context.fillStyle = fillColor;
    context.strokeStyle = strokeStyle;
    context?.fillRect(object.x, object.y, 20, 20);
    context?.strokeRect(object.x, object.y, 20, 20);
  }
};
*/

export const drawState = (
  context: CanvasRenderingContext2D | null,
  state: IGlobalState
) => {
  if (!context) {
    return;
  }
  // Plants.
  state.plants.forEach(function (plant) {
    context.fillStyle = "#00FF00"; // Green
    context.strokeStyle = "#146356"; // Dark grey-ish maybe.
    let psize = plant.health > 20 ? TILE_SIZE : (plant.health / 20 * TILE_SIZE);
    context?.fillRect(plant.pos.x + 10 - (psize / 2), plant.pos.y + 10 - (psize / 2), psize, psize);
    context?.strokeRect(plant.pos.x + 10 - (psize / 2), plant.pos.y + 10 - (psize / 2), psize, psize);
  });

  // Gardener.
  context.fillStyle = "#FFA500"; // Orange
  context.strokeStyle = "#146356"; // Dark grey-ish maybe.
  context?.fillRect(state.gardener.x, state.gardener.y, 20, 20);
  context?.strokeRect(state.gardener.x, state.gardener.y, 20, 20);

  // Watering Can. 
  context.fillStyle = "#808080"; // Grey
  context?.fillRect(state.wateringCan.x + 10, state.wateringCan.y + 10, 10, 10);
  context?.strokeRect(state.wateringCan.x + 10, state.wateringCan.y + 10, 10, 10);
};

function randomNumber(min: number, max: number) {
  let random = Math.random() * max;
  return random - (random % 20);
}
export const generateRandomPosition = (width: number, height: number) => {
  return new Coord(randomNumber(0, width), randomNumber(0, height));
};

export const hasSnakeCollided = (
  snake: IObjectBody[],
  currentHeadPos: IObjectBody
) => {
  let flag = false;
  snake.forEach((pos: IObjectBody, index: number) => {
    if (
      pos.x === currentHeadPos.x &&
      pos.y === currentHeadPos.y &&
      index !== 0
    ) {
      flag = true;
    }
  });

  return flag;
};

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
