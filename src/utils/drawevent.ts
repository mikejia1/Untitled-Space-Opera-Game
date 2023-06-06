import { paintSkeletonDeath } from "../entities/skeleton";
import { AnimEvent, AnimEventType, IGlobalState } from "../store/classes";
import { MAP_TILE_SIZE, H_TILE_COUNT, V_TILE_COUNT } from "../store/data/positions";
import { CANVAS_WIDTH, CANVAS_HEIGHT, FPS, GardenerDirection, Dir8 } from "./constants";
import { Coord } from "./coord";

export function drawAnimationEvent(state: IGlobalState, shift: Coord, canvas: CanvasRenderingContext2D): void {
    if (state.activeEvents.length === 0) {
      return;
    }
    for(let i = 0; i < state.activeEvents.length; i++){
        let anim: AnimEvent = state.activeEvents[i];
        if(anim.event === AnimEventType.IMPACT){
        drawImpactEvent(anim, state, shift, canvas);
        }
        if(anim.event === AnimEventType.GAMEOVER_REPLAY_FRAME){
        drawGameoverEvent(anim, state, shift, canvas);
        }
    }
  }

function drawImpactEvent(anim: AnimEvent, state: IGlobalState, shift: Coord, canvas: CanvasRenderingContext2D): void {
    const frameCount = state.currentFrame - anim.startTime;
    console.log("Draw supernova animation");
    let impactFrame = 0;
    if(!state.gameover && frameCount > 5) return;
    
    if (frameCount === 1 || frameCount === 2 || frameCount === 5 || frameCount === 6 ||frameCount > 8){
      impactFrame = 1;
    }
    // SUPERNOVA IMPACT
    if (frameCount < 24){
      canvas.drawImage(
        state.backgroundImages.impact,                            // Sprite source image
        impactFrame * MAP_TILE_SIZE * H_TILE_COUNT, 0,                      // Top-left corner of frame in source
        H_TILE_COUNT*MAP_TILE_SIZE, V_TILE_COUNT*MAP_TILE_SIZE,   // Size of frame in source
        shift.x,                                                  // X position of top-left corner on canvas
        shift.y,                                                  // Y position of top-left corner on canvas
        H_TILE_COUNT*MAP_TILE_SIZE, V_TILE_COUNT*MAP_TILE_SIZE);  // Sprite size on canvas
      
      state.npcs.forEach((npc) => {
        let newPos = npc.pos.plus(shift.x, shift.y);
        let flip = (npc.facing === Dir8.Left);
        if (npc.death !== null) paintSkeletonDeath(canvas, state, newPos, flip, npc.death);
      });
      let gardener = state.gardener;
      let newPos = gardener.pos.plus(shift.x, shift.y);
      let flip = (gardener.facing === GardenerDirection.Left);
      if (gardener.death !== null) paintSkeletonDeath(canvas, state, newPos, flip, gardener.death);

      //fade back from white
      let opacity = frameCount/24;
      canvas.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
      canvas.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    // FADE OUT WHITE
    else if (frameCount < 48) { 
      //fade back from white
      let opacity = (24 - (frameCount-24))/24;
      canvas.fillStyle = "rgba(255, 255, 255, " + opacity + ")";
      canvas.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    else{
      //remove event from pending
      anim.finished = true;
    }
  }
  function drawGameoverEvent(anim: AnimEvent, state: IGlobalState, shift: Coord, canvas: CanvasRenderingContext2D): void {
    const frameCount = state.currentFrame - anim.startTime;
    // FADE TO BLACK
    if (frameCount > 3.5*FPS){
        let opacity = Math.min((frameCount - 2.5*FPS)/2, 18)/18;
        canvas.fillStyle = "rgba(0, 0, 0, " + opacity + ")";
        canvas.fillRect(0,0, CANVAS_WIDTH, CANVAS_HEIGHT);
        //draw game over text
        
        if (frameCount > 4*FPS){
            canvas.drawImage(
                state.gameOverImage,                                      // Sprite source image
                Math.floor((CANVAS_WIDTH - state.gameOverImage.width)/2), // X position of top-left corner on canvas
                170,                                                      // Y position of top-left corner on canvas
            );
        }
        if (frameCount > 5*FPS){
            canvas.drawImage(
                state.replayImage,                                      // Sprite source image
                Math.floor((CANVAS_WIDTH - state.replayImage.width)/2), // X position of top-left corner on canvas
                ((frameCount % 30) > 15) ? 200 : 202,                   // Y position of top-left corner on canvas
            );
        }

        //*/
    }
  }
  
