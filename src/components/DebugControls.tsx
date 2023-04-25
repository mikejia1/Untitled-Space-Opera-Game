import { Box, Checkbox, Flex, Heading } from "@chakra-ui/react";

export interface IDebugControlsProps {
  collisionRectsDebug: () => void;
  positionRectsDebug: () => void;
}
const DebugControls = ({ collisionRectsDebug, positionRectsDebug }: IDebugControlsProps) => (
  <Box mt={3}>
    <Heading as="h6" size="lg">
      Debug Controls
    </Heading>
    <Flex flexDirection="row" mt={3}>
      <Flex flexDirection="column">
        <Checkbox onChange={() => collisionRectsDebug()}>Show collision rectangles</Checkbox>
        <Checkbox onChange={() => positionRectsDebug()}>Show position rectangles</Checkbox>
      </Flex>
    </Flex>
  </Box>
);

export default DebugControls;
