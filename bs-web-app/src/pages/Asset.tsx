import React from "react";
import { Button, Typography, Grid, CardMedia } from "@mui/material";

type AssetProps = {
  name: string;
  image: string;
};

const Asset = ({ name, image }: AssetProps): JSX.Element => {
  return (
    <Grid container>
      <Grid container item md={7} direction="column" alignItems="center">
        <CardMedia
          component="img"
          image={image}
          style={{
            width: "70%",
            border: "2px solid rgb(229, 232, 235)",
            borderRadius: 5,
          }}
        />
      </Grid>
      <Grid container item md={5} direction="column">
        <Typography variant="h2" gutterBottom>
          Project Name: {name}
        </Typography>
        <Typography variant="h3" gutterBottom>
          tokenId: {name}
        </Typography>
        <Typography variant="h4" gutterBottom>
          Owned by: {name}
        </Typography>
        <Typography variant="h4" gutterBottom>
          Etherscan: {name}
        </Typography>
        <Grid
          item
          sx={{ backgroundColor: "rgb(251, 253, 255)", borderRadius: 10 }}
        >
          <Typography variant="h4">Price: 123 WETH</Typography>
          <Button variant="contained">Buy Now</Button>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Asset;
