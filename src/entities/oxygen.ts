import { GameScreen } from "../scene";
import { IGlobalState } from "../store/classes";
import { MentalState, NonPlayer } from "./nonplayer";
import { MAX_PLANT_HEALTH, Plant } from "./plant";
import { CausaMortis } from "./skeleton";

export function updateOxygenState(state : IGlobalState): IGlobalState {
    let oxy = state.oxygen.level;
    let proR = 0;
    let conR = 0;
    state.plants.forEach(plant => {
        oxy += oxygenOutput(plant);
        proR += oxygenOutput(plant);
      });
    state.npcs.forEach(npc => {
        oxy -= oxygenConsumption(npc);
        conR += oxygenConsumption(npc);
      });
    if(!state.airlock.isAirtight(state)){
        oxy -= 0.05;
        conR += 0.05;
    }

    let gardener = state.gardener;
    let newLastNPCDeath = state.lastNPCDeath;
    let npcs : NonPlayer [] = [];
    if (oxy < 0){
        gardener.dieOf(CausaMortis.Asphyxiation, state.currentFrame);        
        state.npcs.forEach(npc => {
            npc.dieOf(CausaMortis.Asphyxiation, state.currentFrame + Math.floor(Math.random() * 2));
            newLastNPCDeath = state.currentFrame;
            npcs = [...npcs, npc];
        });
    }
    oxy = Math.min(oxy, 100);
    return {...state, 
        oxygen: {level: oxy, productionRate: proR, consumptionRate: conR}, 
        lastNPCDeath: newLastNPCDeath};
}

// Max pp == 0.008, with 32 plants max output == 0.256, 
// Realistically just max output is 0.18 since plants dehydrate after watering. 
function oxygenOutput(plant : Plant): number {
    let bonus = (plant.health == MAX_PLANT_HEALTH && plant.growthStage == 4) ? 3 : 0;
    return (plant.growthStage + bonus) * 0.001;
}

// 10 npcs, max consumption == 0.25
function oxygenConsumption(npc : NonPlayer): number {
    if(npc.mentalState == MentalState.Frazzled){
        return 0.02;
    }
    if(npc.mentalState == MentalState.Scared){
        return 0.02;
    }
    return 0.015;
}
