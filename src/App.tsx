import { ChakraProvider, Container, Heading } from "@chakra-ui/react";
import { Provider } from "react-redux";
import CanvasBoard from "./components/CanvasBoard";
import ScoreCard from "./components/ScoreCard";
import store from "./store";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './utils';

const App = () => {
  return (
    <Provider store={store}>
      <ChakraProvider>
        <Container maxW="container.lg" centerContent>
          <Heading as="h1" size="xl">GARDEN TENDING GAME</Heading>
          <ScoreCard />
          <CanvasBoard height={CANVAS_HEIGHT} width={CANVAS_WIDTH} />
        </Container>
      </ChakraProvider>
    </Provider>
  );
};

export default App;
