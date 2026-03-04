import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from './components/ui/sonner';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Feed } from './pages/Feed';
import { Profile } from './pages/Profile';
import { Events } from './pages/Events';
import { Wallet } from './pages/Wallet';
import { AdminPanel } from './pages/AdminPanel';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Betöltés...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Betöltés...</p>
        </div>
      </div>
    );
  }
  
  return !user ? children : <Navigate to="/feed" replace />;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
            <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
            <Route path="/profile/:userId" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/events" element={<PrivateRoute><Events /></PrivateRoute>} />
            <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminPanel /></PrivateRoute>} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
