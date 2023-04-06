//CanvasBoard takes input from keyboard and updates the visual representation.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  INCREMENT_SCORE,
  makeMove,
  DOWN,
  LEFT,
  RIGHT,
  UP,
  resetGame,
  RESET_SCORE,
  scoreUpdates,
} from "../store/actions";
import { IGlobalState } from "../store/reducers";
import {
  clearBoard,
  drawObject,
  generateRandomPosition,
  hasSnakeCollided,
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
  const snake1 = useSelector((state: IGlobalState) => state.gardener);

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
            dispatch(makeMove(0, -20, UP));
            break;
          case "s":
            dispatch(makeMove(0, 20, DOWN));
            break;
          case "a":
            dispatch(makeMove(-20, 0, LEFT));
            break;
          case "d":
            event.preventDefault();
            dispatch(makeMove(20, 0, RIGHT));
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
    drawObject(context, snake1, "#91C483");
    drawObject(
      context,
      generateRandomPosition(width - 20, height - 20),
      "#676FA3"
    ); //Draws object randomly
    window.addEventListener("keydown", handleKeyDownEvents);
  }, [context, dispatch, handleKeyDownEvents, height, snake1, width]);

  //check if object is consumed
  useEffect(() => {
    //Generate new object
    if (isConsumed) {
      const posi = generateRandomPosition(width - 20, height - 20);
      setPos(posi);
      setIsConsumed(false);

      //Increment the score
      dispatch(scoreUpdates(INCREMENT_SCORE));
    }
  }, [isConsumed, pos, height, width, dispatch]);

  useEffect(() => {
    //Draw on canvas each time
    setContext(canvasRef.current && canvasRef.current.getContext("2d"));
    clearBoard(context);
    drawObject(context, snake1, "#91C483");
    drawObject(context, pos, "#676FA3"); //Draws object randomly
    //drawing the rest of the objects

    //When the object is consumed
    if (snake1.x === pos?.x && snake1.y === pos?.y) {
      setIsConsumed(true);
    }

    /*
    if (
      hasSnakeCollided(snake1, snake1[0]) ||
      snake1[0].x >= width ||
      snake1[0].x <= 0 ||
      snake1[0].y <= 0 ||
      snake1[0].y >= height
    ) {
      //setGameEnded(true);
      //dispatch(stopGame());
      //window.removeEventListener("keypress", handleKeyEvents);
    } else setGameEnded(false);
    */
  }, [context, pos, snake1, height, width, dispatch, handleKeyDownEvents]);

  useEffect(() => {
    window.addEventListener("keypress", handleKeyDownEvents);

    return () => {
      window.removeEventListener("keypress", handleKeyDownEvents);
    };
  }, [handleKeyDownEvents]);

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
