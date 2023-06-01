import { BlackHole } from "../scene";
import { Planet, currentlySlingshottingPlanet } from "../scene/planet";
import { IGlobalState } from "../store/classes";
import { DOWNWARD_STARFIELD_DRIFT, DRIFTER_COUNT, MAX_DRIFTERS, SHAKER_NO_SHAKE, SHAKER_SUBTLE, randomInt } from "../utils";

export function updateHeavenlyBodyState(state: IGlobalState): IGlobalState {
    const f = state.currentFrame;
    let newBlackHole: BlackHole | null = state.blackHole;
    let newDrifters: (Planet | null)[] = state.drifters;

    // Update the black hole's pulse magnitude.
    if (newBlackHole !== null) newBlackHole = newBlackHole.adjustPulseMagnitude();
    // Once the black hole has been around long enough to have passed by, clear it back to null.
    if ((newBlackHole !== null) && ((f - newBlackHole.startFrame) > 1000)) newBlackHole = null;

    // Get current slingshot planet (if any) and check whether or not moving into orbit has begun yet.
    let sling = currentlySlingshottingPlanet(state);
    let orbitDiversionHappening = (sling !== null) && (sling.orbitDiversionHasBegun(state.currentFrame));

    // Let the planets rotate and do other things that change with time.
    for (let i = 0; i < DRIFTER_COUNT; i++) {
        let d = newDrifters[i];
        if (d === null) continue;
        newDrifters[i] = d.update(state);
    }

    // Remove planets when they're finished.
    for (let i = 0; i < DRIFTER_COUNT; i++) {
        let p: (Planet | null) = newDrifters[i];
        if (p === null) continue;
        // Remove planets that report themselves as finished.
        if (p.isFinished(state)) newDrifters[i] = null;
    }

    // Starfield drift.
    let newDriftSpeed = state.starfield.driftSpeed;
    let newDriftAngle = state.starfield.driftAngle;
    if ((sling !== null) && orbitDiversionHappening) {
       let prog = sling.orbitPositioningProgress(state) - sling.deorbitProgress(state);
       let downward = DOWNWARD_STARFIELD_DRIFT;
       let sideways = (sling.flipped ? -1 : 1) * 4.5 * Math.pow(prog, 2);
       let angle = Math.atan2(downward, sideways);
       let len = Math.sqrt((downward * downward) + (sideways * sideways));
       newDriftSpeed = len;
       newDriftAngle = angle;
    }

    // If we're currently slingshotting around a star, the light can get so intense that it shrivels the plants.
    if ((sling != null) && (sling.planetType === 6)) {
        // Current progress getting into orbit around the star. Range [0.0, 1.0].
        // 0 --> we haven't started moving into orbit position.
        // 1 --> we are fully in orbit position.
        let progressMovingIntoOrbit = sling.orbitPositioningProgress(state);

        // Current progress getting out of orbit around the star. Range [0.0, 1.0];
        // 0 --> we haven't started moving out of orbit yet.
        // 1 --> we are fully out of orbit. Slingshot maneuver is done.
        let progressMovingOutOfOrbit = sling.deorbitProgress(state);

        // Light intensity could be a function of (progressMovingIntoOrbit - progressMovingOutOfOrbit), for example.
        // Plants could be updated here, depending on the light intensity and shield doors.
    }

    // If we're currently doing a slingshot maneuver, let's shake the ship. Just a little.
    let newShaker = state.screenShaker;
    if (sling !== null) {
        let intensity = sling.orbitPositioningProgress(state) - sling.deorbitProgress(state);
        if (intensity > 0.75) newShaker = SHAKER_SUBTLE;
        else newShaker = SHAKER_NO_SHAKE;
    }

    return {
        ...state,
        blackHole:    newBlackHole,
        drifters:     newDrifters,
        screenShaker: newShaker,
        starfield: {
            ...state.starfield,
            driftSpeed: newDriftSpeed,
            driftAngle: newDriftAngle,
        },
    };
}
