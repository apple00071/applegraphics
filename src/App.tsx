import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import { isIOS, isAndroid, applyPolyfills } from './utils/browserDetection';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import MobileLayout from './layouts/MobileLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MaterialsList from './pages/materials/MaterialsList';
import AddMaterial from './pages/materials/AddMaterial';
import EditMaterial from './pages/materials/EditMaterial';
import MaterialDetail from './pages/materials/MaterialDetail';
import OrdersList from './pages/orders/OrdersList';
import AddOrder from './pages/orders/AddOrder';
import EditOrder from './pages/orders/EditOrder';
import OrderDetail from './pages/orders/OrderDetail';
import CategoriesList from './pages/categories/CategoriesList';
import SuppliersList from './pages/suppliers/SuppliersList';
import Reports from './pages/Reports';
import QRCodeGenerator from './components/QRCodeGenerator';
import ScanPage from './pages/mobile/ScanPage';
import ProfilePage from './pages/mobile/ProfilePage';
import CameraTest from './pages/CameraTest';
import Settings from './pages/settings/Settings';

// MainRoutes component to handle different routes for mobile and desktop
interface MainRoutesProps {
  isMobile: boolean;
}

const MainRoutes: React.FC<MainRoutesProps> = ({ isMobile }) => {
  if (isMobile) {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/dashboard" element={
          <MobileLayout>
            <Dashboard />
          </MobileLayout>
        } />

        <Route path="/materials" element={
          <MobileLayout>
            <MaterialsList />
          </MobileLayout>
        } />

        <Route path="/materials/add" element={
          <MobileLayout>
            <AddMaterial />
          </MobileLayout>
        } />

        <Route path="/materials/edit/:id" element={
          <MobileLayout>
            <EditMaterial />
          </MobileLayout>
        } />

        <Route path="/materials/:id" element={
          <MobileLayout>
            <MaterialDetail />
          </MobileLayout>
        } />

        <Route path="/orders" element={
          <MobileLayout>
            <OrdersList />
          </MobileLayout>
        } />

        <Route path="/orders/add" element={
          <MobileLayout>
            <AddOrder />
          </MobileLayout>
        } />

        <Route path="/orders/:id" element={
          <MobileLayout>
            <OrderDetail />
          </MobileLayout>
        } />

        <Route path="/orders/:id/edit" element={
          <MobileLayout>
            <EditOrder />
          </MobileLayout>
        } />

        <Route path="/scan" element={
          <MobileLayout>
            <ScanPage />
          </MobileLayout>
        } />

        <Route path="/profile" element={
          <MobileLayout>
            <ProfilePage />
          </MobileLayout>
        } />

        <Route path="/categories" element={
          <MobileLayout>
            <CategoriesList />
          </MobileLayout>
        } />

        <Route path="/suppliers" element={
          <MobileLayout>
            <SuppliersList />
          </MobileLayout>
        } />

        <Route path="/reports" element={
          <MobileLayout>
            <Reports />
          </MobileLayout>
        } />

        <Route path="/qr-generator/:code" element={
          <MobileLayout>
            <QRCodeGenerator />
          </MobileLayout>
        } />

        <Route path="/camera-test" element={
          <MobileLayout>
            <CameraTest />
          </MobileLayout>
        } />

        {/* Catch all for mobile */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/materials" element={
        <ProtectedRoute>
          <DashboardLayout>
            <MaterialsList />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/materials/add" element={
        <ProtectedRoute>
          <DashboardLayout>
            <AddMaterial />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/materials/edit/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <EditMaterial />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/materials/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <MaterialDetail />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/orders" element={
        <ProtectedRoute>
          <DashboardLayout>
            <OrdersList />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/orders/add" element={
        <ProtectedRoute>
          <DashboardLayout>
            <AddOrder />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/orders/:id" element={
        <ProtectedRoute>
          <DashboardLayout>
            <OrderDetail />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/orders/:id/edit" element={
        <ProtectedRoute>
          <DashboardLayout>
            <EditOrder />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/categories" element={
        <ProtectedRoute>
          <DashboardLayout>
            <CategoriesList />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/suppliers" element={
        <ProtectedRoute>
          <DashboardLayout>
            <SuppliersList />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/reports" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Reports />
          </DashboardLayout>
        </ProtectedRoute>
      } />



      <Route path="/qr-generator/:code" element={
        <ProtectedRoute>
          <DashboardLayout>
            <QRCodeGenerator />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      <Route path="/settings" element={
        <ProtectedRoute>
          <DashboardLayout>
            <Settings />
          </DashboardLayout>
        </ProtectedRoute>
      } />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768 || isIOS() || isAndroid();
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    applyPolyfills();

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster position="top-right" />
          <MainRoutes isMobile={isMobile} />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App; 