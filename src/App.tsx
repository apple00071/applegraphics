import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';
import MobileLayout from './layouts/MobileLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MaterialsList from './pages/materials/MaterialsList';
import MaterialDetail from './pages/materials/MaterialDetail';
import AddMaterial from './pages/materials/AddMaterial';
import OrdersList from './pages/orders/OrdersList';
import AddOrder from './pages/orders/AddOrder';
import OrderDetail from './pages/orders/OrderDetail';
import Reports from './pages/Reports';
import EditMaterial from './pages/materials/EditMaterial';
import QRCodeGenerator from './components/QRCodeGenerator';
import CategoriesList from './pages/categories/CategoriesList';
import SuppliersList from './pages/suppliers/SuppliersList';
import CameraTest from './pages/CameraTest';

// Create placeholder components for mobile pages until they're fully implemented
const ScanPage = () => <div className="p-4">Scan Page Coming Soon</div>;
const ProfilePage = () => <div className="p-4">Profile Page Coming Soon</div>;

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/camera-test" element={<CameraTest />} />
            
            {/* Mobile-specific routes */}
            <Route path="/scan" element={
              <ProtectedRoute>
                <MobileLayout>
                  <ScanPage />
                </MobileLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <MobileLayout>
                  <ProfilePage />
                </MobileLayout>
              </ProtectedRoute>
            } />
            
            {/* Main application routes */}
            <Route path="/" element={
              <ProtectedRoute>
                {isMobile ? (
                  <MobileLayout>
                    <Routes>
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="materials" element={<MaterialsList />} />
                      <Route path="materials/add" element={<AddMaterial />} />
                      <Route path="materials/edit/:id" element={<EditMaterial />} />
                      <Route path="materials/:id" element={<MaterialDetail />} />
                      <Route path="orders" element={<OrdersList />} />
                      <Route path="orders/add" element={<AddOrder />} />
                      <Route path="orders/:id" element={<OrderDetail />} />
                      <Route path="categories" element={<CategoriesList />} />
                      <Route path="suppliers" element={<SuppliersList />} />
                      <Route path="reports" element={<Reports />} />
                      <Route path="qr-generator/:code" element={<QRCodeGenerator />} />
                    </Routes>
                  </MobileLayout>
                ) : (
                  <DashboardLayout />
                )}
              </ProtectedRoute>
            }>
              {!isMobile && (
                <>
                  <Route path="dashboard" element={<Dashboard />} />
                  
                  <Route path="materials">
                    <Route index element={<MaterialsList />} />
                    <Route path="add" element={<AddMaterial />} />
                    <Route path="edit/:id" element={<EditMaterial />} />
                    <Route path=":id" element={<MaterialDetail />} />
                  </Route>
                  
                  <Route path="orders">
                    <Route index element={<OrdersList />} />
                    <Route path="add" element={<AddOrder />} />
                    <Route path=":id" element={<OrderDetail />} />
                  </Route>
                  
                  <Route path="categories" element={<CategoriesList />} />
                  <Route path="suppliers" element={<SuppliersList />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="qr-generator/:code" element={<QRCodeGenerator />} />
                </>
              )}
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App; 