import { IGlobalState } from "../store/classes";
import { MentalState, NonPlayer } from "./nonplayer";
import { Plant } from "./plant";
import { CausaMortis } from "./skeleton";

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

    let gardener = state.gardener;
    let npcs : NonPlayer [] = [];
    if (oxy < 0){
        gardener.dieOf(CausaMortis.Asphyxiation, state.currentFrame);        
        state.npcs.forEach(npc => {
            npc.dieOf(CausaMortis.Asphyxiation, state.currentFrame);
            npcs = [...npcs, npc];
        });
    }
    return {...state, oxygen: oxy};
}

function oxygenOutput(plant : Plant): number {
    return plant.growthStage * plant.growthStage * plant.health * 0.003;
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
