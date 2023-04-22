import { Box, Checkbox, Flex, Heading } from "@chakra-ui/react";

export interface IDebugControlsProps {
  collisionRectsDebug: () => void;
}
const DebugControls = ({ collisionRectsDebug }: IDebugControlsProps) => (
  <Box mt={3}>
    <Heading as="h6" size="lg">
      Debug Controls
    </Heading>
    <Flex flexDirection="row" mt={3}>
      <Flex flexDirection="column">
        <Checkbox onChange={() => collisionRectsDebug()}>Show collision rectangles</Checkbox>
      </Flex>
    </Flex>
  </Box>
);

export default DebugControls;
