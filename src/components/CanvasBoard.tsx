//CanvasBoard takes input from keyboard and updates the visual representation.
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  makeMove,
  stopWatering,
  toggleFreeze,
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
  toggleShowCollisionRects,
  toggleShowPositionRects,
  toggleShowWateringRects,
  toggleShowFacingRects,
  toggleShowEquipRects,
  toggleShowInteractionRects,
  toggleDisableCollisions,
  toggleGameAudio,
  anyKey,
  toggleShowOxygenDetails,
} from "../store/actions";
import { IGlobalState } from "../store/classes";
import { clearBoard, drawState } from "../utils";
import Instruction from "./Instructions";
import DebugControls from './DebugControls';
import { Grid, GridItem } from "@chakra-ui/react";

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
      dispatch(anyKey())
      switch (event.key) {
        case "w":
          dispatch(makeMove(STOP_UP));
          break;
        case "s":
          dispatch(makeMove(STOP_DOWN));
          break;
        case "a":
          dispatch(makeMove(STOP_LEFT));
          break;
        case "d":
          dispatch(makeMove(STOP_RIGHT));
          break;
        case "f":
          dispatch(stopWatering());
          break;
        case "p":
          dispatch(toggleFreeze());
          break;
      }
    },
    [dispatch]
  );
  const handleKeyDownEvents = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "w":
          dispatch(makeMove(UP));
          break;
        case "s":
          dispatch(makeMove(DOWN));
          break;
        case "a":
          dispatch(makeMove(LEFT));
          break;
        case "d":
          dispatch(makeMove(RIGHT));
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
  }, [context, dispatch, handleKeyDownEvents, handleKeyUpEvents, state]);

  // Toggle oxygen debug boolean.
  const oxygenDetailsDebug = useCallback(() => {
    dispatch(toggleShowOxygenDetails());
  }, [dispatch])

  // Toggle the showCollisionRects debug boolean.
  const collisionRectsDebug = useCallback(() => {
    dispatch(toggleShowCollisionRects());
  }, [dispatch])

  // Toggle the showPositionRects debug boolean.
  const positionRectsDebug = useCallback(() => {
    dispatch(toggleShowPositionRects());
  }, [dispatch])

  // Toggle the showWateringRects debug boolean.
  const wateringRectsDebug = useCallback(() => {
    dispatch(toggleShowWateringRects());
  }, [dispatch])

  // Toggle the showFacingRects debug boolean.
  const facingRectsDebug = useCallback(() => {
    dispatch(toggleShowFacingRects());
  }, [dispatch])

  // Toggle the showEquipRects debug boolean.
  const equipRectsDebug = useCallback(() => {
    dispatch(toggleShowEquipRects());
  }, [dispatch])

  // Toggle the showInteractionRects debug boolean.
  const interactionRectsDebug = useCallback(() => {
    dispatch(toggleShowInteractionRects());
  }, [dispatch])

  // Toggle the disableCollisions debug boolean.
  const disableCollisionsDebug = useCallback(() => {
    dispatch(toggleDisableCollisions());
  }, [dispatch])

  // Toggle audio on/off.
  const toggleSound = useCallback(() => {
    dispatch(toggleGameAudio());
  }, [context, dispatch])

  // Check whether audio is muted or not.
  const audioIsMuted = useCallback(() => {
    return state.muted;
  }, [state])

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
    <Grid templateColumns='repeat(2, 1fr)' gap={6}>
      <GridItem>
        <canvas
          ref={canvasRef}
          /*style={{
            border: `3px solid ${gameEnded ? "red" : "black"}`,
          }}*/
          width={width}
          height={height}
        />
      </GridItem>
      <GridItem>
        <Instruction resetBoard={resetBoard} />
        <br />
        <DebugControls
          oxygenDetailsDebug={oxygenDetailsDebug}
          collisionRectsDebug={collisionRectsDebug}
          positionRectsDebug={positionRectsDebug}
          wateringRectsDebug={wateringRectsDebug}
          facingRectsDebug={facingRectsDebug}
          equipRectsDebug={equipRectsDebug}
          interactionRectsDebug={interactionRectsDebug}
          disableCollisionsDebug={disableCollisionsDebug}
          toggleSound={toggleSound}
          isMuted={audioIsMuted}
        />
      </GridItem>
    </Grid>
  );
};

export default CanvasBoard;
