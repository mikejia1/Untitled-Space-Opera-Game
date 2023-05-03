import { Coord, Rect } from '../../utils';
import { IGlobalState } from './';

// An Interactable has an interaction rectangle that dictates how close you
// need to be to interact with it.
export interface Interactable {
    interactionRect: () => Rect
}
