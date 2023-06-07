import { Box, Checkbox, Flex, Heading } from "@chakra-ui/react";

export interface IDebugControlsProps {
  oxygenDetailsDebug: () => void;
  collisionRectsDebug: () => void;
  positionRectsDebug: () => void;
  wateringRectsDebug: () => void;
  facingRectsDebug: () => void;
  equipRectsDebug: () => void;
  interactionRectsDebug: () => void;
  disableCollisionsDebug: () => void;
  toggleSound: () => void;
  isMuted: () => boolean;
}
const DebugControls = ({
  oxygenDetailsDebug, collisionRectsDebug, positionRectsDebug, wateringRectsDebug, facingRectsDebug,
    equipRectsDebug, interactionRectsDebug, disableCollisionsDebug, toggleSound, isMuted,
    }: IDebugControlsProps) => (
  <Box mt={3}>
    <Heading as="h6" size="lg">
      Debug Controls
    </Heading>
    <Flex flexDirection="row" mt={3}>
      <Flex flexDirection="column">
        <Checkbox onChange={() => oxygenDetailsDebug()}>Show oxygen details</Checkbox>
        <Checkbox onChange={() => collisionRectsDebug()}>Show collision rectangles</Checkbox>
        <Checkbox onChange={() => positionRectsDebug()}>Show position rectangles</Checkbox>
        <Checkbox onChange={() => wateringRectsDebug()}>Show watering rectangles</Checkbox>
        <Checkbox onChange={() => facingRectsDebug()}>Show facing rectangles</Checkbox>
        <Checkbox onChange={() => equipRectsDebug()}>Show equip rectangles</Checkbox>
        <Checkbox onChange={() => interactionRectsDebug()}>Show interaction rectangles</Checkbox>
        <Checkbox onChange={() => disableCollisionsDebug()}>Disables collisions</Checkbox>
        <Checkbox isChecked={isMuted()} onChange={() => toggleSound()}>Mute audio</Checkbox>
      </Flex>
    </Flex>
  </Box>
);

export default DebugControls;
