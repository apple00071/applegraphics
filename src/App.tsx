import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MaterialsList from './pages/materials/MaterialsList';
import MaterialDetail from './pages/materials/MaterialDetail';
import AddMaterial from './pages/materials/AddMaterial';
import EquipmentList from './pages/equipment/EquipmentList';
import OrdersList from './pages/orders/OrdersList';
import AddOrder from './pages/orders/AddOrder';
import OrderDetail from './pages/orders/OrderDetail';
import Reports from './pages/Reports';
import EditMaterial from './pages/materials/EditMaterial';
import QRCodeGenerator from './components/QRCodeGenerator';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              
              <Route path="materials">
                <Route index element={<MaterialsList />} />
                <Route path="add" element={<AddMaterial />} />
                <Route path="edit/:id" element={<EditMaterial />} />
                <Route path=":id" element={<MaterialDetail />} />
              </Route>
              
              <Route path="equipment">
                <Route index element={<EquipmentList />} />
              </Route>
              
              <Route path="orders">
                <Route index element={<OrdersList />} />
                <Route path="add" element={<AddOrder />} />
                <Route path=":id" element={<OrderDetail />} />
              </Route>
              
              <Route path="reports" element={<Reports />} />
              
              {/* QR Code Generator Route */}
              <Route path="qr-generator/:code" element={<QRCodeGenerator />} />
            </Route>
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App; 