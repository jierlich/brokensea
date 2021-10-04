import React from "react";
import { AppBar, Box, Toolbar, Typography, Button } from "@mui/material/";
import ConnectWalletModal from "../components/ConnectWalletModal";

export default function NavBar(): JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default">
        <Toolbar>
          <Typography variant="h2" sx={{ flexGrow: 1 }}>
            🏝 Brokensea
          </Typography>
          <Button variant="outlined" onClick={() => setIsOpen(true)}>
            Connect Wallet
          </Button>
          <ConnectWalletModal
            isOpen={isOpen}
            handleClose={() => setIsOpen(false)}
          />
        </Toolbar>
      </AppBar>
    </Box>
  );
}
