import { Box, Button, Flex, Heading, Kbd } from "@chakra-ui/react";

export interface IInstructionProps {
  resetBoard: () => void;
}
const Instruction = ({ resetBoard }: IInstructionProps) => (
  <Box mt={3}>
    <Heading as="h6" size="lg">
      How to Play
    </Heading>
    <Flex flexDirection="row" mt={3}>
      <Flex flexDirection={"column"}>
        <span>
          <Kbd>w</Kbd> Move up
        </span>
        <span>
          <Kbd>a</Kbd> Move left
        </span>
        <span>
          <Kbd>s</Kbd> Move down
        </span>
        <span>
          <Kbd>d</Kbd> Move right
        </span>
        <span>
          <Kbd>e</Kbd> Pick up item
        </span>
        <span>
          <Kbd>f</Kbd> Interact
        </span>
        <br/>
        <span>
        <Button onClick={() => resetBoard()}>Reset game</Button>
        </span>
      </Flex>
    </Flex>
  </Box>
);

export default Instruction;
