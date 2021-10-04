import React from "react";
import { Modal, Typography, Button, Box } from "@mui/material";

type ConnectWalletModalProps = {
  isOpen: boolean;
  handleClose: () => void;
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
}: ConnectWalletModalProps): JSX.Element {
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
