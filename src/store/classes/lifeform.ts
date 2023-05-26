import { Death } from "../../entities/skeleton"
import { Paintable } from "./paintable"

// A Lifeform is a type of Paintable that can die.
export interface Lifeform extends Paintable {
    death: Death | null
}
