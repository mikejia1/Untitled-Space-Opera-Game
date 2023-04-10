import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";
import gameReducer from "./reducers";
import watcherSagas from "./sagas";
import fooSagas from "./sagas";
const sagaMiddleware = createSagaMiddleware();

const store = createStore(gameReducer, applyMiddleware(sagaMiddleware));

console.log("Starting first sagas");
sagaMiddleware.run(watcherSagas);
//console.log("Starting second sagas");
//sagaMiddleware.run(fooSagas);
export default store;
