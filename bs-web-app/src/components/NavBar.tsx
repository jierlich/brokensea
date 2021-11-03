import React, { useEffect, useCallback } from "react";
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Chip,
  Avatar,
} from "@mui/material/";
import ConnectWalletModal from "../components/ConnectWalletModal";
import { ethers } from "ethers";

export default function NavBar(): JSX.Element {
  const [isOpen, setIsOpen] = React.useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean>(false);
  const [signerAddress, setSignerAddress] = React.useState<string>();

  const checkLoggedIn = useCallback(async () => {
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum,
      "any"
    );

    const accountsList = await provider.listAccounts();
    setIsLoggedIn(accountsList.length !== 0);
    setSignerAddress(accountsList[0]);
  }, [setIsLoggedIn]);

  useEffect(() => {
    checkLoggedIn();
  }, [checkLoggedIn]);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default">
        <Toolbar>
          <Typography variant="h2" sx={{ flexGrow: 1 }}>
            🏝 Brokensea
          </Typography>
          {isLoggedIn ? (
            <Chip
              avatar={
                <Avatar
                  style={{
                    color: "green",
                  }}
                ></Avatar>
              }
              label={signerAddress}
            />
          ) : (
            <>
              <Button variant="outlined" onClick={() => setIsOpen(true)}>
                Connect Wallet
              </Button>
              <ConnectWalletModal
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                handleClose={() => setIsOpen(false)}
                checkLoggedIn={checkLoggedIn}
              />
            </>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
