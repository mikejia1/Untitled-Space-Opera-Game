//CanvasBoard takes input from keyboard and updates the visual representation.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  INCREMENT_SCORE,
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
  useItem,
  USE_ITEM,
} from "../store/actions";
import { IGlobalState, TILE_SIZE } from "../store/reducers";
import {
  clearBoard,
  computeCurrentFrame,
  drawState,
  generateRandomPosition,
  IObjectBody,
} from "../utils";
import Instruction from "./Instructions";

export interface ICanvasBoard {
  height: number;
  width: number;
}

const CanvasBoard = ({ height, width }: ICanvasBoard) => {
  //WTF is redux for?
  const dispatch = useDispatch();
  const gardener = useSelector((state: IGlobalState) => state.gardener);
  const itemEquipped = useSelector((state: IGlobalState) => state.itemEquipped);
  const state = useSelector((state: IGlobalState) => state);

  //pull global states into local states
  const [gameEnded, setGameEnded] = useState<boolean>(false);
  const [pos, setPos] = useState<IObjectBody>(
    generateRandomPosition(width - 20, height - 20)
  );
  const [isConsumed, setIsConsumed] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);

  const handleKeyDownEvents = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
          case "w":
            dispatch(makeMove(0, -TILE_SIZE, UP));
            break;
          case "s":
            dispatch(makeMove(0, TILE_SIZE, DOWN));
            break;
          case "a":
            dispatch(makeMove(-TILE_SIZE, 0, LEFT));
            break;
          case "d":
            dispatch(makeMove(TILE_SIZE, 0, RIGHT));
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
  }, [context, dispatch, handleKeyDownEvents, height, state, width]);

  // Paint the canvas and dispatch tick() to trigger next paint event.
  const animate = () => {
    console.log("Paint frame: ", state.currentFrame);

    //Draw on canvas each time
    setContext(canvasRef.current && canvasRef.current.getContext("2d"));
    clearBoard(context);
    drawState(context, state);

    //When the object is consumed
    if (gardener.x === pos?.x && gardener.y === pos?.y) {
      setIsConsumed(true);
    }
  };

  useEffect(animate, [context, state, dispatch, handleKeyDownEvents]);  

  useEffect(() => {
    window.addEventListener("keypress", handleKeyDownEvents);

    return () => {
      window.removeEventListener("keypress", handleKeyDownEvents);
    };
  }, [handleKeyDownEvents]);

  // Check whether time has reached a new frame. If so, paint the canvas.
  const paintCheck = (time: number) => {
    var f = computeCurrentFrame();
    if (f != state.currentFrame) {
      dispatch(tick());
    }
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
