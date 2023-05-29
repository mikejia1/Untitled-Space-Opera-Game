import { BlackHole } from "../scene";
import { Planet, indexToPlanetRange } from "../scene/planet";
import { IGlobalState } from "../store/classes";
import { randomInt } from "../utils";

export function updateHeavenlyBodyState(state: IGlobalState): IGlobalState {
    const f = state.currentFrame;
    let newBlackHole: BlackHole | null = state.blackHole;
    if (newBlackHole !== null) newBlackHole = newBlackHole.adjustPulseMagnitude();
    // Once the black hole has been around long enough to have passed by, clear it back to null.
    if ((newBlackHole !== null) && ((f - newBlackHole.startFrame) > 1000)) newBlackHole = null;

    // Maybe it's time for another planet to drift by.
    let newPlanets: (Planet|null)[] = [state.backgroundPlanet, state.midgroundPlanet, state.foregroundPlanet];
    let blackHoleFarAlready = (state.blackHole !== null) && (state.blackHole.driftDistance() > 400);
    for (let i = 0; i < 3; i++) {
        // If black hole is too far down, don't spawn a new planet at the moment.
        if (blackHoleFarAlready) continue;
        let p = newPlanets[i];
        let chance = (randomInt(0, 9999) < 200);
        if (p === null && chance) {
            let choice = randomInt(0, state.planets.length - 1);
            p = state.planets[choice].randomizedClone(state, indexToPlanetRange(i));
            newPlanets[i] = p;
        }
        // Remove planet if it has drifted out of view.
        if ((p !== null) && p.isFinished(state)) newPlanets[i] = null;
    }

    return {
        ...state,
        blackHole:          newBlackHole,
        backgroundPlanet:   newPlanets[0],
        midgroundPlanet:    newPlanets[1],
        foregroundPlanet:   newPlanets[2],
    };
}
