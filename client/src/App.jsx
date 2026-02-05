import { Routes, Route, Link } from 'react-router-dom';
import Lobby from './pages/Lobby.jsx';
import AuctionRoom from './pages/AuctionRoom.jsx';
import Analytics from './pages/Analytics.jsx';

const App = () => {
  return (
    <div className="app">
      <header className="app-header">
        <h1>IPL Auction</h1>
        <nav>
          <Link to="/">Lobby</Link>
          <Link to="/room/demo">Room</Link>
          <Link to="/analytics">Analytics</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/room/:id" element={<AuctionRoom />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
