import { BlackHole } from "../scene";
import { IGlobalState } from "../store/classes";
import { randomInt } from "../utils";

export function updateHeavenlyBodyState(state: IGlobalState): IGlobalState {
    const f = state.currentFrame;
    let newBlackHole: BlackHole | null = state.blackHole;
    if (newBlackHole !== null) newBlackHole = newBlackHole.adjustPulseMagnitude();
    // Once the black hole has been around long enough to have passed by, clear it back to null.
    if ((newBlackHole !== null) && ((f - newBlackHole.startFrame) > 1000)) newBlackHole = null;
    // Maybe it's time for another planet to drift by.
    let newPlanet1 = state.planet1;
    let newPlanet2 = state.planet2;
    let newPlanet3 = state.planet3;
    let chance1 = (randomInt(0, 9999) < 100);
    let chance2 = (randomInt(0, 9999) < 100);
    let chance3 = (randomInt(0, 9999) < 100);
    // If black hole is too far down, don't spawn a new planet at the moment.
    let blackHoleFarAlready = (state.blackHole !== null) && (state.blackHole.driftDistance() > 400);
    if (!blackHoleFarAlready) {
        if ((newPlanet1 === null) && chance1) {
            let choice = randomInt(0, state.planets.length - 1);
            console.log("Welcome planet 1, type " + choice);
            newPlanet1 = state.planets[choice].randomizedClone();
        }
        if ((newPlanet2 === null) && chance2 && (newPlanet1 !== null) && ((f - newPlanet1.startFrame) > 150)) {
            let choice = randomInt(0, state.planets.length - 1);
            console.log("Welcome planet 2, type " + choice);
            newPlanet2 = state.planets[choice].randomizedClone();
        }
        if ((newPlanet3 === null) && chance3 && (newPlanet2 !== null) && ((f - newPlanet2.startFrame) > 150)) {
            let choice = randomInt(0, state.planets.length - 1);
            console.log("Welcome planet 3, type " + choice);
            newPlanet3 = state.planets[choice].randomizedClone();
        }
    }

    // Remove planets that have drifted out of view.
    if ((newPlanet1 !== null) && newPlanet1.isFinished()) {
        newPlanet1 = null;
        console.log("Goodbye planet 1!");
    }
    if ((newPlanet2 !== null) && newPlanet2.isFinished()) {
        newPlanet2 = null;
        console.log("Goodbye planet 2!");
    }
    if ((newPlanet3 !== null) && newPlanet3.isFinished()) {
        newPlanet3 = null;
        console.log("Goodbye planet 3!");
    }
    return { ...state, blackHole: newBlackHole, planet1: newPlanet1, planet2: newPlanet2, planet3: newPlanet3 };

}