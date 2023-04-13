import { Coord } from './';
import { IGlobalState } from '../reducers';

// A Paintable has a position, so we can order the painting events to fake some 3D,
// and a paint method we can call to paint them on the canvas.
export interface Paintable {
    pos: Coord

    paint: (canvas: CanvasRenderingContext2D, state: IGlobalState) => void
}
