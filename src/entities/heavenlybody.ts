import { BlackHole } from "../scene";
import { Planet, currentlySlingshottingPlanet } from "../scene/planet";
import { IGlobalState } from "../store/classes";
import { DRIFTER_COUNT, randomInt } from "../utils";

export function updateHeavenlyBodyState(state: IGlobalState): IGlobalState {
    const f = state.currentFrame;
    let newBlackHole: BlackHole | null = state.blackHole;
    let newDrifters: (Planet | null)[] = state.drifters;

    // Update the black hole's pulse magnitude.
    if (newBlackHole !== null) newBlackHole = newBlackHole.adjustPulseMagnitude();
    // Once the black hole has been around long enough to have passed by, clear it back to null.
    if ((newBlackHole !== null) && ((f - newBlackHole.startFrame) > 1000)) newBlackHole = null;

    // Maybe it's time for another planet to drift by.
    // No spawning if black hole has moved some distance.
    // No spawning if an existing planet is slingshotting and has started orbit diversion.
    let blackHoleFarAlready = (state.blackHole !== null) && (state.blackHole.driftDistance() > 400);
    let sling = currentlySlingshottingPlanet(state);
    let orbitDiversionHappening = (sling !== null) && (sling.orbitDiversionHasBegun(state.currentFrame));
    if ((!blackHoleFarAlready) && (!orbitDiversionHappening)) {
        for (let i = 0; i < DRIFTER_COUNT; i++) {
            let p = newDrifters[i];
            let spawnNow = (randomInt(0, 9999) < 200);
            if (p === null && spawnNow) {
                let choice = randomInt(0, state.planets.length - 1);
                p = state.planets[choice].randomizedClone(state);
                newDrifters[i] = p;
            }
            // Remove planet if it has drifted out of view.
            if ((p !== null) && p.isFinished(state)) newDrifters[i] = null;
        }
    }

    // Let the planets rotate.
    for (let i = 0; i < DRIFTER_COUNT; i++) {
        let d = newDrifters[i];
        if (d === null) continue;
        newDrifters[i] = d.update(state);
    }

    // Starfield drift.
    let newDriftSpeed = state.starfield.driftSpeed;
    if ((sling !== null) && orbitDiversionHappening) {
        newDriftSpeed = 4.5 * sling.orbitPositioningProgress(state);
    }

    return {
        ...state,
        blackHole:  newBlackHole,
        drifters:   newDrifters,
        starfield: {
            ...state.starfield,
            driftSpeed: newDriftSpeed,
        },
    };
}
