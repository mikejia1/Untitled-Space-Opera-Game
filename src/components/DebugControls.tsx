import { Box, Checkbox, Flex, Heading } from "@chakra-ui/react";

export interface IDebugControlsProps {
  collisionRectsDebug: () => void;
  positionRectsDebug: () => void;
  wateringRectsDebug: () => void;
}
const DebugControls = ({ collisionRectsDebug, positionRectsDebug, wateringRectsDebug }: IDebugControlsProps) => (
  <Box mt={3}>
    <Heading as="h6" size="lg">
      Debug Controls
    </Heading>
    <Flex flexDirection="row" mt={3}>
      <Flex flexDirection="column">
        <Checkbox onChange={() => collisionRectsDebug()}>Show collision rectangles</Checkbox>
        <Checkbox onChange={() => positionRectsDebug()}>Show position rectangles</Checkbox>
        <Checkbox onChange={() => wateringRectsDebug()}>Show watering rectangles</Checkbox>
      </Flex>
    </Flex>
  </Box>
);

export default DebugControls;
