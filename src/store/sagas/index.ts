import {
  CallEffect,
  delay,
  put,
  PutEffect,
  takeLatest,
} from "redux-saga/effects";
import {
  DOWN,
  ISnakeCoord,
  LEFT,
  MOVE_DOWN,
  MOVE_LEFT,
  MOVE_RIGHT,
  MOVE_STOP,
  MOVE_UP,
  RESET,
  RIGHT,
  setDisDirection,
  STOP_GAME,
  UP,
} from "../actions";

export function* moveSaga(params: {
  type: string;
  payload: ISnakeCoord;
  //how does this relate to the actions and reducers?
}): Generator<
  | PutEffect<{ type: string; payload: ISnakeCoord }>
  | PutEffect<{ type: string; payload: string }>
  | CallEffect<true>
> {
  //this is the refresh loop!!
  yield put({
      type: params.type.split("_")[1],
      payload: params.payload,
    });    
    console.log(params.type.split("_")[1]);
}

function* watcherSagas() {
  yield takeLatest(
    [MOVE_RIGHT, MOVE_LEFT, MOVE_UP, MOVE_DOWN, MOVE_STOP, RESET, STOP_GAME],
    moveSaga
  );
}

export default watcherSagas;
