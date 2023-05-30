import { Colour, positionRect, outlineRect, shiftRect, shiftForTile, 
    computeBackgroundShift, drawClippedImage, Coord,
    CANVAS_RECT, randomInt, BACKGROUND_HEIGHT, BACKGROUND_WIDTH, STARFIELD_RECT, FPS, DRIFTER_COUNT } from '../utils';
import { MAP_TILE_SIZE } from '../store/data/positions';
import { Paintable, IGlobalState } from '../store/classes';
import { Tile } from '../scene';
import { act } from 'react-dom/test-utils';

// An upper bound on planet scale multipliers.
const SCALE_CAP = 1.5;

// Number of frames after planet start frame when the oribit diversion starts.
const ORBIT_DIVERSION_START_TIME = 60;

// Number of frames after planet start frame when the planet is in position for orbiting to begin.
const ORBIT_POSITION_REACH_TIME = ORBIT_DIVERSION_START_TIME + 450;

// A rotating planet that can drift by.
export class Planet implements Paintable {
    pos: Coord;                             // Only used when planet is in presence of a slingshotting planet. Position relative to slingshotting planet.
    relativeToSlingshotter: boolean;        // Whether or not this planet's motion is now to be computed relative to a slingshotting planet.
    startFrame: number;                     // The frame when the planet first appeared.
    size: number;                           // Width and height of the planet in source image.
    frames: number;                         // The number of frames in the planet animation.
    scale: number;                          // Scaling factor for sizing the planet.
    flipped: boolean;                       // Whether or not the planet is flipped horizontally.
    image: any;                             // The sprite sheet source image.
    angle: number;                          // 0 to 2*PI. Angle that planet moves away from radial centre.
    canSlingshot: boolean;                  // Whether or not this type of planet is eligible for slingshot.
    isSlingshotting: boolean;               // Whether or not this instance will actually slingshot.
    animationFrame: number;                 // The last animation frame that was painted.
    lastPaintFrame: number;                 // Frame number (time) when animationFrame was painted.
    spinSpeed: number;                      // Number of time frames between increments of animation frame number.
    originalSpinSpeed: number;              // SpinSpeed value assigned when planet instance was created.
    diversionStartPos: (Coord | null);      // The position of the planet when the orbit diversion began.
    diversionStartScale: (number | null);   // The scale of the planet when the orbit diversion began.
    slingshotTargetPos: Coord;              // Position (relative to background) we want to shift the planet to so we can orbit it.
    slingshotTargetSize: number;            // On-canvas size we want to expand the planet to so we can orbit it.
  
    constructor(
        pos: Coord, relativeToSlingshotter: boolean,
        startFrame: number, size: number, frames: number, scale: number, animationFrame: number,
        lastPaintFrame: number, spinSpeed: number, originalSpinSpeed: number, flipped: boolean,
        image: any, angle: number, canSlingshot: boolean, isSlingshotting: boolean,
        diversionStartPos: (Coord | null), diversionStartScale: (number | null),
        slingshotTargetPos: Coord, slingshotTargetSize: number
        ) {
        this.pos = pos;
        this.relativeToSlingshotter = relativeToSlingshotter;
        this.startFrame = startFrame;
        this.size = size;
        this.frames = frames;
        this.scale = scale;
        this.animationFrame = animationFrame;
        this.lastPaintFrame = lastPaintFrame;
        this.spinSpeed = spinSpeed;
        this.originalSpinSpeed = originalSpinSpeed;
        this.flipped = flipped;
        this.image = image;
        this.angle = angle;
        this.canSlingshot = canSlingshot;
        this.isSlingshotting = isSlingshotting;
        this.diversionStartPos = diversionStartPos;
        this.diversionStartScale = diversionStartScale;
        this.slingshotTargetPos = slingshotTargetPos;
        this.slingshotTargetSize = slingshotTargetSize;
    }

    // Pick some random values for angle, scale, spin rate, etc.
    randomizedClone(state: IGlobalState) {
        let scale: number = randomInt(1500, 3500) / 1000;                           // Planet scale multiplier.
        let spinSpeed = randomInt(10, 30);                                          // Planet rotation speed.
        let startFrame = state.currentFrame;                                        // Spawning time of the planet.
        let angle = Math.random() * Math.PI * 2;                                    // Angle of recession from vanishing point.
        let flipped = ((randomInt(0, 99) % 2) === 0);                               // 50-50 chance of being flipped horizontally.
        let isSlingshotting = this.canSlingshot && ((randomInt(0, 99) < 50));       // Chance of doing a slingshot.
        if (currentlySlingshottingPlanet(state) !== null) isSlingshotting = false;  // One slingshot at a time.
        if (!state.slingshotAllowed) isSlingshotting = false;                       // Sometimes it's outright forbidden.
        let slingPos = this.slingshotTargetPos;
        let slingSiz = this.slingshotTargetSize;
        if (isSlingshotting) {
            slingPos = new Coord(-20, 80);      // Intended location for orbiting.
            slingSiz = 200;                     // Intended size for orbiting.
        }
        return new Planet(
            new Coord(0, 0),                    // Dummy position value (relative to slingshoter).
            false,                              // This planet is not initially moving relative to a slingshotting planet.
            startFrame,                         // Expected frame lifetime of planet.
            this.size, this.frames,             // Source image size and number of frames.
            scale,                              // Scale multiplier.
            randomInt(0, this.frames - 1),      // Random starting animation frame.
            state.currentFrame,                 // Time of last animation frame change.
            spinSpeed,                          // Rotation speed for the new instance of the planet.
            spinSpeed,                          // Original spin speed when planet instance was created (i.e. now).
            flipped, this.image,                // Horizontal flip, image.
            angle,                              // Direction to recede from vanishing point.
            this.canSlingshot,                  // Slingshot eligibility is preserved from template planet.
            isSlingshotting,                    // Whether or not this instance will slingshot.
            null,                               // No diversion start position yet.
            null,                               // No diversion start scale yet.
            slingPos,                           // Position (relative to background) where we want the planet so we can orbit.
            slingSiz);                          // Size we want for the planet when we orbit it.
    }

    // Paint the planet on the canvas.
    paint(canvas: CanvasRenderingContext2D, state: IGlobalState): void {
        // Determine where, on the canvas, the planet should be painted.
        let shift = this.computeShift(state);
        let cntr = this.paintCentre(state, shift);

        // Drop it into the black hole.
        let tweak = this.blackHoleTweak(cntr, state);
        cntr = cntr.plus(tweak.fall.x, tweak.fall.y);

        // Scale it, shake it, flip it.
        let sz = this.currentSize(state) * tweak.shrink;
        let dest = cntr.minus(sz/2, sz/2).toIntegers();
        let frame = this.animationFrame;
        let shake = state.screenShaker.shake(state.currentFrame, 0);
        let flipScale = this.flipped ? -1 : 1;
        let flipShift = this.flipped ? sz : 0;

        // Paint it.
        canvas.save();
        canvas.scale(flipScale, 1);
        let clipRect = {
            a: CANVAS_RECT.a.plus(shake.x, shake.y),
            b: CANVAS_RECT.b.plus(shake.x, shake.y),
        };
        if (this.flipped) clipRect = {
            a: new Coord(-1 * clipRect.b.x, clipRect.a.y),
            b: new Coord(-1 * clipRect.a.x, clipRect.b.y),
        };
        drawClippedImage(
            canvas,
            this.image,
            frame * this.size, 0,                       // Top-left corner of frame in source
            this.size, this.size,                       // Size of frame in source
            (dest.x * flipScale) - flipShift, dest.y,   // Position of sprite on canvas
            sz, sz,                                     // Sprite size on canvas
            clipRect);                                  // Paint only what's inside this rectangle

        /*
        // TODO: Remove this - this is just for debugging - to see which planets are meant to be slingshotting.
        if (this.isSlingshotting) {
            let r = {
                a: dest.minus(3, 3),
                b: dest.plus(3, 3),
            };
            outlineRect(canvas, r, Colour.COLLISION_RECT);
        }
        // TODO: Remove this as well.
        if (this.relativeToSlingshotter) {
            let sling = currentlySlingshottingPlanet(state);
            if (sling !== null) {
                let sdest = sling?.paintCentre(state, shift);
                canvas.strokeStyle = `rgba(255,0,0,1)`;
                canvas.beginPath();
                canvas.moveTo((dest.x * flipScale) - flipShift, dest.y);
                canvas.lineTo(sdest.x * flipScale, sdest.y);
                canvas.stroke();
            }
        }
        */

        canvas.restore();

    }

    // Get the position where the centre of the planet should be painted on the canvas (before black hole adjustment).
    paintCentre(state: IGlobalState, shift: Coord): Coord {
        return this.spaceCentre(state).plus(shift.x, shift.y).toIntegers();
    }

    // Return a position and scale adjustment, allowing the planet to "fall" into the black hole.
    blackHoleTweak(paintPos: Coord, state: IGlobalState): any {
        if (state.blackHole !== null) {
            let bhPos = state.blackHole.paintPosition(state.blackHole.computeShift(state));
            let sz = this.size * this.currentScale(state);
            let dst = state.blackHole.driftDistance();
            let travel = Math.min(Math.max(dst - 20, 0) / 150, 1);
            let shrink = 1.0 - travel;
            shrink *= shrink;
            let finalDest = bhPos.plus(256, 256).minus(sz * 0.5 * shrink, sz * 0.5 * shrink);
            return {
                fall: finalDest.minus(paintPos.x, paintPos.y).times(travel),
                shrink: shrink,
            };
        }
        // No black hole => a zero-effecct tweak.
        return {
            fall: new Coord(0, 0),
            shrink: 1.0,
        };
    }

    // Check to see if the planet has drifted far enough that we can stop painting it.
    isFinished(state: IGlobalState): boolean {
        if (state.blackHole !== null) return false;
        let p = this.spaceCentre(state);
        let sz = this.currentSize(state);
        if (p.x < -(sz/2)) {
            console.log("Off to the left p.x " + p.x + " sz " + sz);
            return true;
        }
        if (p.x > (BACKGROUND_WIDTH + (sz/2))) {
            console.log("Off to the right p.x " + p.x + " sz " + sz);
            return true;
        }
        if (p.y < -(sz/2)) {
            console.log("Off the top p.y " + p.y + " sz " + sz);
            return true;
        }
        if (p.y > (BACKGROUND_HEIGHT + (sz/2))) {
            console.log("Off the bottom p.y " + p.y + " sz " + sz);
            return true;
        }
        return false;
    }

    // Calculate curent planet scale. Ignores slingshotting or this or any other planet.
    standardScaleCalculation(frame: number): number {
        let t = frame - this.startFrame;
        t = t / (12 * FPS);
        t *= t;
        return Math.min(this.scale * t, SCALE_CAP);
    }

    // Calculate scale of a planet that is slingshotting.
    currentSlingshotterScale(state: IGlobalState): number {
        // If the orbit diversion has started, the planet's size expands to the target size.
        if (this.orbitDiversionHasBegun(state.currentFrame)) {
            if (this.diversionStartScale !== null) {
                let delta = this.orbitDiversionScaleDelta(state);
                return this.diversionStartScale + delta;
            }
        }

        // Before orbit diversion has started, stick with standard scale calculation.
        return this.standardScaleCalculation(state.currentFrame);
    }

    // Calculate scale of a planet that is present while another planet is slingshotting.
    slingshotAdjacentScale(state: IGlobalState, sling: Planet): number {
        // If the orbit diversion has started, scale proportional to the scale change of the slingshotter (sling).
        if (sling.orbitDiversionHasBegun(state.currentFrame)) {
            if (sling.diversionStartScale !== null) {
                let actual = sling.currentScale(state);
                let wouldHaveBeen = sling.diversionStartScale;
                let changeFactor = actual / wouldHaveBeen;
                return Math.min(SCALE_CAP, this.scale * changeFactor);
            }
        }

        // Before orbit diversion has started, stick with standard scale calculation.
        return this.standardScaleCalculation(state.currentFrame);
    }

    // Determine the current scale factor for the planet.
    currentScale(state: IGlobalState): number {
        // If this planet is slingshotting, there's a special scale calculation for that.
        if (this.isSlingshotting) return this.currentSlingshotterScale(state);

        // If another planet is currently slingshotting, there's a special scale calculation for that.
        let sling = currentlySlingshottingPlanet(state);
        if (sling !== null) return this.slingshotAdjacentScale(state, sling);

        // Otherwise, use the "standard" scale calculation.
        return this.standardScaleCalculation(state.currentFrame);
    }

    // Determine the current size of the planet.
    currentSize(state: IGlobalState): number {
        return this.size * this.currentScale(state);
    }

    // Standard calculation of planet's centre in space (i.e. relative to background). Ignores background shift and slingshotting.
    standardSpaceCentreCalculation(frame: number): Coord {
        const RADIAL_CENTRE: Coord = new Coord(BACKGROUND_WIDTH / 2, ((STARFIELD_RECT.a.y + STARFIELD_RECT.b.y) / 2) * 1.5);
        let t = frame - this.startFrame;
        t = t / (5 * FPS);
        t *= t;
        let d = t * 200;
        let x = Math.sin(this.angle) * d;
        let y = Math.cos(this.angle) * d;
        return RADIAL_CENTRE.plus(x,y);
    }

    // Modify a value in range [0, 1] so that it eases in and out - i.e. an S-shaped curve.
    easeInAndOut(val: number): number {
        return 1 / (1 + Math.pow(val / (1 - val), -3));
    }

    // A measure of progress toward moving from diversionStartPos to slingshotTargetPos, in range [0, 1].
    orbitPositioningProgress(state: IGlobalState): number {
        let a = this.startFrame + ORBIT_DIVERSION_START_TIME;
        let b = this.startFrame + ORBIT_POSITION_REACH_TIME;
        let prog = (state.currentFrame - a) / (b - a);
        return this.easeInAndOut(Math.max(0, Math.min(1, prog)));
    }

    // The current position delta of the planet since orbit diversion began.
    orbitDiversionDelta(state: IGlobalState): Coord {
        if (this.diversionStartPos === null) return new Coord(0, 0);    // Just for safety.
        let progress = this.orbitPositioningProgress(state);
        return this.slingshotTargetPos.minus(this.diversionStartPos.x, this.diversionStartPos.y).times(progress);
    }

    // The current scale delta of the planet since orbit diversion began.
    orbitDiversionScaleDelta(state: IGlobalState): number {
        if (this.diversionStartScale === null) return 0;                // Just for safety.
        let progress = this.orbitPositioningProgress(state);
        return ((this.slingshotTargetSize / this.size) - this.diversionStartScale) * progress;
    }

    // Calculate space centre of a planet that is slingshotting.
    currentSlingshotterSpaceCentre(state: IGlobalState): Coord {
        // If the orbit diversion has started the planet's location shifts to the orbit position.
        if (this.orbitDiversionHasBegun(state.currentFrame) && (this.diversionStartPos !== null)) {
            let delta = this.orbitDiversionDelta(state);
            return this.diversionStartPos.plus(delta.x, delta.y);
        }

        // Before orbit diversion has started, stick with standard space centre calculation.
        return this.standardSpaceCentreCalculation(state.currentFrame);
    }

    // Calculate space centre of a planet that is present while another planet is slingshotting.
    slingshotAdjacentSpaceCentre(state: IGlobalState, sling: Planet): Coord {
        // If the orbit diversion has started, move planet together with sling.
        if (sling.orbitDiversionHasBegun(state.currentFrame)) {
            if (sling.diversionStartScale !== null && sling.diversionStartPos) {
                let actualSlingScale = sling.currentScale(state);
                let wouldHaveBeenSlingScale = sling.diversionStartScale;
                let scaleFactor = actualSlingScale / wouldHaveBeenSlingScale;
                let rel = this.pos.times(scaleFactor);
                let delta = sling.orbitDiversionDelta(state);
                return sling.diversionStartPos.plus(delta.x, delta.y).plus(rel.x, rel.y);
            }
        }

        // Before orbit diversion has started, stick with standard space centre calculation.
        return this.standardSpaceCentreCalculation(state.currentFrame);
    }

    // Position of the centre of the planet in space. Does not include background shift. (i.e. relative to background, not canvas).
    spaceCentre(state: IGlobalState): Coord {
        // If this planet is slingshotting, there's a special space centre calculation for that.
        if (this.isSlingshotting) return this.currentSlingshotterSpaceCentre(state);

        // If another planet is currently slingshotting, there's a special space centre calculation for that.
        let sling = currentlySlingshottingPlanet(state);
        if (sling !== null) return this.slingshotAdjacentSpaceCentre(state, sling);

        // Otherwise, use the "standard" space centre calculation.
        return this.standardSpaceCentreCalculation(state.currentFrame);
    }

    // Update the planet for the current frame.
    update(state: IGlobalState): Planet {
        // Animation frame update
        let t = (state.currentFrame - this.lastPaintFrame);
        let animationFrame  = (t >= this.spinSpeed) ? ((this.animationFrame + 1) % this.frames) : this.animationFrame;
        let lastFrameUpdate = (t >= this.spinSpeed) ? state.currentFrame : this.lastPaintFrame;

        // Rotation speed update.
        let spin = this.spinSpeed;
        t = (state.currentFrame - this.startFrame);
        let diversionStarted = this.orbitDiversionHasBegun(state.currentFrame);
        if (diversionStarted) spin = Math.max(1, Math.floor(this.originalSpinSpeed * 0.1));

        // If orbit diversion just started, record current position and scale as starting position and scale.
        let dsp: (Coord | null) = this.diversionStartPos;
        let dss: (number | null) = this.diversionStartScale;
        if (diversionStarted) {
            if (dsp === null) dsp = this.spaceCentre(state);
            if (dss === null) dss = this.currentScale(state);
        }

        // If a planet is not currently relative to a slingshotter, and there's a
        // slingshotter that has just started orbit diversion, switch the planet to relative
        // and record its current position and scale.
        let newPos = this.pos;
        let newScale = this.scale;
        let newRelative = this.relativeToSlingshotter;
        if ((!this.isSlingshotting) && (!this.relativeToSlingshotter)) {
            let sling = currentlySlingshottingPlanet(state);
            if ((sling !== null) && (sling.orbitDiversionHasBegun(state.currentFrame))) {
                let loc = this.standardSpaceCentreCalculation(state.currentFrame);
                let cen = sling.spaceCentre(state);
                newPos = loc.minus(cen.x, cen.y);
                newScale = this.standardScaleCalculation(state.currentFrame);
                newRelative = true;
            }
        }

        // Updated version of planet.
        return new Planet(
            newPos, newRelative,
            this.startFrame, this.size, this.frames, newScale, animationFrame, lastFrameUpdate, spin, this.originalSpinSpeed,
            this.flipped, this.image, this.angle, this.canSlingshot, this.isSlingshotting,
            dsp, dss, this.slingshotTargetPos, this.slingshotTargetSize);
    }

    // Check whether the ship has started to deviate (or should start to deviate)
    // from its usual motion to approach and orbit planet, for the given time.
    orbitDiversionHasBegun(frame: number): boolean {
        if (!this.isSlingshotting) return false;
        let t = (frame - this.startFrame);
        return t > ORBIT_DIVERSION_START_TIME;
    }

    // Compute a displacement that will place the planet at the correct place on the canvas.
    // Using no-delta shake to keep planet aligned with starfield and ship shake for good clipping.
    computeShift(state: IGlobalState): Coord {
        return shiftForTile(this.closestTile(), state, computeBackgroundShift(state, 0));
    }

    // Determine the grid tile that is the closest approximation to the watering can's position.
    closestTile(): Tile {
        return new Tile(
            Math.floor(this.pos.x / MAP_TILE_SIZE),
            Math.floor(this.pos.y / MAP_TILE_SIZE));
    }
}

// Make a new planet. Used for making a "template". Create instances using randomizeClone.
export function makePlanet(size: number, frames: number, image: any, canSlingshot: boolean): Planet {
    return new Planet(
        new Coord(0, 0),    // Dummy position value.
        false,              // Not realtive to a slingshotter.
        0,                  // Start frame
        size,               // Sprite size in source image
        frames,             // Number of frames in source image
        1,                  // Scale multiplier
        0,                  // Last animation frame painted
        0,                  // Time that last animation frame was painted
        1,                  // Spin / rotation speed of planet
        1,                  // Original spin / rotation speed.
        false,              // Whether or ot it is flipped horizontally
        image,              // Source image
        0,                  // Angle of recession from vanishing point
        canSlingshot,       // Whether or not a planet of this type is eligible for slingshot maneuver
        false,              // Whether or not the planet instance is currently slingshotting
        new Coord(0, 0),    // Dummy value for diversionStartPos
        1,                  // Dummy value for diversionStartScale
        new Coord(0, 0),    // Dummy value for slingshotTargetPos
        1);                 // Dummy value for slingshotTargetSize
}

// Return the planet that is currently slingshotting, or null if no plant is currently slingshotting.
export function currentlySlingshottingPlanet(state: IGlobalState): (Planet | null) {
    for (let i = 0; i < DRIFTER_COUNT; i++) {
        let p = state.drifters[i];
        if (p === null) continue;
        if (p.isSlingshotting) return p;
    }
    return null;
}