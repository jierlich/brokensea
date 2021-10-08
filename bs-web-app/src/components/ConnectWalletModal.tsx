import React from "react";
import { Modal, Typography, Button, Box } from "@mui/material";
import { ethers } from "ethers";

type ConnectWalletModalProps = {
  isOpen: boolean;
  handleClose: () => void;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const style = {
  position: "absolute" as "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "20%",
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

export default function ConnectWalletModal({
  isOpen,
  handleClose,
  setIsOpen,
}: ConnectWalletModalProps): JSX.Element {
  const connectToMetamask = async () => {
    const provider = new ethers.providers.Web3Provider(
      (window as any).ethereum,
      "any"
    );
    await provider.send("eth_requestAccounts", []);
    provider.getSigner();
    setIsOpen(false);
  };
  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Box sx={style}>
        <Button
          disableRipple
          style={{
            textTransform: "none",
            flexDirection: "column",
            padding: 20,
          }}
          variant="outlined"
          onClick={connectToMetamask}
        >
          <img style={{ width: "20%" }} src="/metamask-logo.svg" />
          <Typography variant="h2" sx={{ mt: 1 }}>
            MetaMask
          </Typography>
          <Typography sx={{ mt: 1 }}>
            Connect to your Metamask Wallet
          </Typography>
        </Button>
      </Box>
    </Modal>
  );
}
