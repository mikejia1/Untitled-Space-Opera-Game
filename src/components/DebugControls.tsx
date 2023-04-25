import { Box, Checkbox, Flex, Heading } from "@chakra-ui/react";

export interface IDebugControlsProps {
  collisionRectsDebug: () => void;
  positionRectsDebug: () => void;
  wateringRectsDebug: () => void;
  facingRectsDebug: () => void;
  equipRectsDebug: () => void;
  disableCollisionsDebug: () => void;
}
const DebugControls = ({ collisionRectsDebug, positionRectsDebug, wateringRectsDebug, facingRectsDebug, equipRectsDebug, disableCollisionsDebug }: IDebugControlsProps) => (
  <Box mt={3}>
    <Heading as="h6" size="lg">
      Debug Controls
    </Heading>
    <Flex flexDirection="row" mt={3}>
      <Flex flexDirection="column">
        <Checkbox onChange={() => collisionRectsDebug()}>Show collision rectangles</Checkbox>
        <Checkbox onChange={() => positionRectsDebug()}>Show position rectangles</Checkbox>
        <Checkbox onChange={() => wateringRectsDebug()}>Show watering rectangles</Checkbox>
        <Checkbox onChange={() => facingRectsDebug()}>Show facing rectangles</Checkbox>
        <Checkbox onChange={() => equipRectsDebug()}>Show equip rectangles</Checkbox>
        <Checkbox onChange={() => disableCollisionsDebug()}>Disables collisions</Checkbox>
      </Flex>
    </Flex>
  </Box>
);

export default DebugControls;
