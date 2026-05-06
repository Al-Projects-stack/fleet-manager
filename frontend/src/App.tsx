import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './stores/authStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import VehiclesPage from './pages/VehiclesPage';
import AlertsPage from './pages/AlertsPage';
import WorkOrdersPage from './pages/WorkOrdersPage';
import ReportsPage from './pages/ReportsPage';

// Animates each dashboard sub-page in/out as the route changes
function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => Boolean(s.token && s.user));
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => Boolean(s.token && s.user));

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />

        {/* All protected routes are children of ProtectedLayout via Outlet */}
        <Route path="/dashboard" element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="work-orders" element={<WorkOrdersPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}
