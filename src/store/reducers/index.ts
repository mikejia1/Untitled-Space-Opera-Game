//Reducers take in the current state and an action and return a new state.
//They are responsible for processing all game logic.

import {
  DOWN,
  INCREMENT_SCORE,
  ISnakeCoord,
  LEFT,
  RESET,
  RESET_SCORE,
  RIGHT,
  UP,
} from "../actions";

export interface IGlobalState {
  snake: ISnakeCoord[] | [];
  disallowedDirection: string;
  score: number;
}

const globalState: IGlobalState = {
  snake: [
    { x: 500, y: 300 },
  ],
  disallowedDirection: "",
  score: 0,
};

//All actions/index.ts setters are handled here
const gameReducer = (state = globalState, action: any) => {
  switch (action.type) {
    case RIGHT:
    case LEFT:
    case UP:
    case DOWN:{
      let newSnake = [...state.snake];
      newSnake = [{
        x: state.snake[0].x + action.payload[0],
        y: state.snake[0].y + action.payload[1],
      }, ...newSnake];
      newSnake.pop();

      return {
        ...state,
        snake: newSnake,
      };
    }

    case RESET:
      return {
        ...state,
        snake: [
          { x: 500, y: 300 },
        ],
        disallowedDirection: ""
      };

    case RESET_SCORE:
      return { ...state, score: 0 };

    case INCREMENT_SCORE:
      return {
        ...state,
        score: state.score + 1,
      };
    default:
      return state;
  }
};

export default gameReducer;
