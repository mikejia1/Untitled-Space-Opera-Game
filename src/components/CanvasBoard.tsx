//CanvasBoard takes input from keyboard and updates the visual representation.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  makeMove,
  tick,
  DOWN,
  LEFT,
  RIGHT,
  UP,
  resetGame,
  RESET_SCORE,
  scoreUpdates,
  toggleEquip,
  USE_ITEM,
  STOP_UP,
  STOP_DOWN,
  STOP_LEFT,
  STOP_RIGHT,
} from "../store/actions";
import { IGlobalState, MOVE_HORZ, MOVE_VERT } from "../store/reducers";
import { clearBoard, drawState } from "../utils";
import Instruction from "./Instructions";

// Width and height of the 2D canvas;
export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 600;

export interface ICanvasBoard {
  height: number;
  width: number;
}

const CanvasBoard = ({ height, width }: ICanvasBoard) => {
  const dispatch = useDispatch();
  const state = useSelector((state: IGlobalState) => state);

  // Pull global states into local states
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  const handleKeyUpEvents = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
          case "w":
            dispatch(makeMove(0, -MOVE_VERT, STOP_UP));
            break;
          case "s":
            dispatch(makeMove(0, MOVE_VERT, STOP_DOWN));
            break;
          case "a":
            dispatch(makeMove(-MOVE_HORZ, 0, STOP_LEFT));
            break;
          case "d":
            dispatch(makeMove(MOVE_HORZ, 0, STOP_RIGHT));
            break;
        }
      },
    [dispatch]
  );
  const handleKeyDownEvents = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
          case "w":
            dispatch(makeMove(0, -MOVE_VERT, UP));
            break;
          case "s":
            dispatch(makeMove(0, MOVE_VERT, DOWN));
            break;
          case "a":
            dispatch(makeMove(-MOVE_HORZ, 0, LEFT));
            break;
          case "d":
            dispatch(makeMove(MOVE_HORZ, 0, RIGHT));
            break;
          case "e":
            dispatch(toggleEquip());
            break;
          case "f":
            dispatch({
              type: USE_ITEM
            });
            break;
        }
      },
    [dispatch]
  );

  const resetBoard = useCallback(() => {
    window.removeEventListener("keydown", handleKeyDownEvents);
    dispatch(resetGame());
    dispatch(scoreUpdates(RESET_SCORE));
    clearBoard(context);
    drawState(context, state);
    window.addEventListener("keydown", handleKeyDownEvents);
    window.addEventListener("keyup", handleKeyUpEvents);
  }, [context, dispatch, handleKeyDownEvents, handleKeyUpEvents, height, state, width]);

  // Paint the canvas and dispatch tick() to trigger next paint event.
  const animate = () => {
    //Draw on canvas each time
    setContext(canvasRef.current && canvasRef.current.getContext("2d"));
    clearBoard(context);
    drawState(context, state);
  };

  useEffect(animate, [context, state, dispatch, handleKeyDownEvents, handleKeyUpEvents]);  

  useEffect(() => {
    window.addEventListener("keypress", handleKeyDownEvents);
    window.addEventListener("keyup", handleKeyUpEvents);

    return () => {
      window.removeEventListener("keypress", handleKeyDownEvents);
      window.removeEventListener("keyup", handleKeyUpEvents);
    };
  }, [handleKeyDownEvents, handleKeyUpEvents]);

  // Every time the browser is ready for a new animation frame, dispatch tick().
  const paintCheck = (time: number) => {
    dispatch(tick());
    requestAnimationFrame(paintCheck);
  }

  // Kick off the paintCheck tight loop, above.
  useEffect(() => {
    var ref = requestAnimationFrame(paintCheck);
    return () => cancelAnimationFrame(ref);
  }, []); // Make sure the effect runs only once

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          border: `3px solid ${gameEnded ? "red" : "black"}`,
        }}
        width={width}
        height={height}
      />
      <Instruction resetBoard={resetBoard} />
    </>
  );
};

export default CanvasBoard;
