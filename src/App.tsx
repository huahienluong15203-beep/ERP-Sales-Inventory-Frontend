import { BrowserRouter } from './routes/Router';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppRoutes } from './routes/AppRoutes';
import { ErrorBoundary } from './pages/common/ErrorBoundary';
import { ModalScrollLockManager } from './components/common/ModalScrollLockManager';
import './App.css';

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ModalScrollLockManager />
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

