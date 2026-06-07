import { BrowserRouter } from 'react-router-dom';
import AppRoutes          from './routes/AppRoutes';

// App is the root component — it wraps everything
// BrowserRouter provides React Router context to ALL child components
// Without it, useNavigate, useLocation, Link etc. won't work
// Rule: only ONE BrowserRouter in the entire app — never nest them

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
    // Notice: no AuthProvider needed!
    // Zustand doesn't require a Provider wrapper like Context does
    // The store is available to any component automatically
  );
}

export default App;