import {
  CallEffect,
  delay,
  put,
  PutEffect,
  takeLatest,
} from "redux-saga/effects";
import {
  DOWN,
  tick,
  TICK,
  LEFT,
  RESET,
  RIGHT,
  STOP_GAME,
  UP,
} from "../actions";
import {
  Coord,
} from "../reducers";

//dummy saga
export function* moveSaga(params: {
  type: string;
  payload: Coord;
  //how does this relate to the actions and reducers?
}): Generator<
  | PutEffect<{ type: string; payload: Coord }>
  | PutEffect<{ type: string; payload: string }>
  | CallEffect<true>
> {
  //this is the refresh loop!!
  console.log("moveSaga start");
  yield put({
      type: params.type.split("_")[1],
      payload: params.payload,
    });    
  console.log(params.type.split("_")[1]);
}

function* watcherSagas() {
  console.log("watcherSagas start");
  yield takeLatest(
    [RESET, STOP_GAME],
    moveSaga
  );
  console.log("watcherSagas end");
}

export default watcherSagas;
