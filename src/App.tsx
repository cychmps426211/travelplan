import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TripDetail from './pages/TripDetail';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trip/:id" element={<TripDetail />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
