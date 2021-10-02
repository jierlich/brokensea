import Asset from './pages/Asset';
import Navbar from './components/NavBar';
import { Grid } from '@mui/material';


function App() {
  return (
    <Grid>
      <Navbar />
      <h1>Brokensea</h1>
      <Asset name='Placeholder Name' image='https://picsum.photos/10/10'/>
    </Grid>
  );
}

export default App;
