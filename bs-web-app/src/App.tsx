import React from "react";
import Asset from "./pages/Asset";
import Navbar from "./components/NavBar";
import { Container, CssBaseline, ThemeProvider } from "@mui/material";
import { NoSsr } from "@mui/core";
import theme from "./theme/index";

function App(): JSX.Element {
  return (
    <NoSsr>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Navbar />
        <Container
          maxWidth="lg"
          sx={{ border: "1px black solid", marginTop: 5 }}
        >
          <Asset
            name="Placeholder Name"
            image="https://picsum.photos/100/100"
          />
        </Container>
      </ThemeProvider>
    </NoSsr>
  );
}

export default App;
