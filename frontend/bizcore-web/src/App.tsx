import { BrowserRouter, HashRouter } from 'react-router-dom';
import AppRoutes          from './routes/AppRoutes';

// Hash routing lets CDN previews refresh deep links without server rewrites.
const Router = import.meta.env.VITE_USE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
    // Notice: no AuthProvider needed!
    // Zustand doesn't require a Provider wrapper like Context does
    // The store is available to any component automatically
  );
}

export default App;