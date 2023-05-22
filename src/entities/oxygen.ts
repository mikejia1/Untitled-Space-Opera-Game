import { IGlobalState } from "../store/classes";
import { MentalState, NonPlayer } from "./nonplayer";
import { Plant } from "./plant";

export function updateOxygenState(state : IGlobalState): IGlobalState {
    let oxy = state.oxygen;
    state.plants.forEach(plant => {
        oxy += oxygenOutput(plant);
      });
    state.npcs.forEach(npc => {
        oxy -= oxygenConsumption(npc);
      });
    if(!state.airlock.isAirtight(state)){
        oxy -= 0.5;
    }
    return {...state, oxygen: oxy};
}

function oxygenOutput(plant : Plant): number {
    return plant.growthStage * plant.growthStage * plant.health * 0.001;
}

function oxygenConsumption(npc : NonPlayer): number {
    if(npc.mentalState == MentalState.Frazzled){
        return 0.05;
    }
    if(npc.mentalState == MentalState.Scared){
        return 0.12;
    }
    return 0.1;
}
