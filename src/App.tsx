import { ChakraProvider, Container, Heading } from "@chakra-ui/react";
import { Provider } from "react-redux";
import CanvasBoard from "./components/CanvasBoard";
import ScoreCard from "./components/ScoreCard";
import store from "./store";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './utils';
import theme from "./theme";

const App = () => {
  return (
    // @ts-ignore
    <Provider store={store}>
      <ChakraProvider theme={theme}>
        <Container maxW="container.lg" centerContent>
          <Heading as="h1" ><br/></Heading>
          <CanvasBoard height={CANVAS_HEIGHT} width={CANVAS_WIDTH} />
        </Container>
      </ChakraProvider>
    </Provider>
  );
};

export default App;
