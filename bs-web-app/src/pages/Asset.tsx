import { Button, Typography, Grid, CardMedia } from '@mui/material';

type AssetProps = {
  name: string;
  image: string;
}

const Asset = ({name, image}: AssetProps) => {
  return (
    <Grid>
      <Typography>{name}</Typography>
      <CardMedia
        component="img"
        image={image}
        style={{
          width: '20%'
        }}
      />
      <Button variant="contained">Buy/List</Button>
    </Grid>
  )
}

export default Asset;
