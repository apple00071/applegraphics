import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Mobile specific pages
import ScanPage from './pages/mobile/ScanPage';
import ProfilePage from './pages/mobile/ProfilePage';

// Simple Mobile Fallback Component 
const MobileFallback = () => {
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  
  useEffect(() => {
    // Gather device info
    setDeviceInfo({
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      time: new Date().toISOString()
    });
  }, []);
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>
        PrintPress Inventory
      </h1>
      
      <p style={{ marginBottom: '20px' }}>
        We detected you're on a mobile device. Simple mode activated.
      </p>
      
      <div style={{ 
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#f1f1f1',
        borderRadius: '5px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Device Information</h2>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-all',
          fontSize: '12px'
        }}>
          {JSON.stringify(deviceInfo, null, 2)}
        </pre>
      </div>
      
      <div style={{ 
        padding: '15px',
        backgroundColor: '#e6f7ff',
        borderRadius: '5px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Diagnostic Menu</h2>
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          <li style={{ marginBottom: '10px' }}>
            <a 
              href="/simple-dashboard" 
              style={{ 
                display: 'block', 
                padding: '10px', 
                backgroundColor: '#4f46e5', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '5px',
                textAlign: 'center' 
              }}
            >
              Simple Dashboard
            </a>
          </li>
          <li style={{ marginBottom: '10px' }}>
            <a 
              href="/camera-test" 
              style={{ 
                display: 'block', 
                padding: '10px', 
                backgroundColor: '#4f46e5', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '5px',
                textAlign: 'center'  
              }}
            >
              Test Camera
            </a>
          </li>
          <li>
            <a 
              href="/login" 
              style={{ 
                display: 'block', 
                padding: '10px', 
                backgroundColor: '#4f46e5', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '5px',
                textAlign: 'center'  
              }}
            >
              Go to Login
            </a>
          </li>
        </ul>
      </div>
      
      <p style={{ 
        padding: '10px', 
        backgroundColor: '#ffedd5', 
        borderRadius: '5px', 
        fontSize: '14px' 
      }}>
        Note: This is a simplified interface for diagnosing mobile issues. 
        Please contact support with the device information above.
      </p>
    </div>
  );
};

const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(
    window.innerWidth < 768 || isIOS() || isAndroid()
  );
  
  // Add state to control if we should show fallback
  const [useFallback, setUseFallback] = useState(true);

  useEffect(() => {
    // Apply any necessary polyfills
    applyPolyfills();
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || isIOS() || isAndroid());
    };

    window.addEventListener('resize', handleResize);
    
    // Log device info for debugging
    console.log('Device Info:', {
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      isMobile: window.innerWidth < 768 || isIOS() || isAndroid()
    });
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile && useFallback) {
    return <MobileFallback />;
  }

  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Toaster position="top-right" />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/camera-test" element={<CameraTest />} />
            <Route path="/simple-dashboard" element={<div className="p-4">Simple Dashboard</div>} />
            
            {/* Mobile routes */}
            {isMobile && (
              <>
                <Route path="/" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <Dashboard />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <Dashboard />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/materials" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <MaterialsList />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/materials/add" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <AddMaterial />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/materials/edit/:id" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <EditMaterial />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/materials/:id" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <MaterialDetail />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/orders" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <OrdersList />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/orders/add" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <AddOrder />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/orders/:id" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <OrderDetail />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
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
                
                <Route path="/categories" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <CategoriesList />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/suppliers" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <SuppliersList />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/reports" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <Reports />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/qr-generator/:code" element={
                  <ProtectedRoute>
                    <MobileLayout>
                      <QRCodeGenerator />
                    </MobileLayout>
                  </ProtectedRoute>
                } />
              </>
            )}
            
            {/* Desktop routes */}
            {!isMobile && (
              <>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                <Route element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/dashboard" element={<Dashboard />} />
                  
                  <Route path="/materials">
                    <Route index element={<MaterialsList />} />
                    <Route path="add" element={<AddMaterial />} />
                    <Route path="edit/:id" element={<EditMaterial />} />
                    <Route path=":id" element={<MaterialDetail />} />
                  </Route>
                  
                  <Route path="/orders">
                    <Route index element={<OrdersList />} />
                    <Route path="add" element={<AddOrder />} />
                    <Route path=":id" element={<OrderDetail />} />
                  </Route>
                  
                  <Route path="/categories" element={<CategoriesList />} />
                  <Route path="/suppliers" element={<SuppliersList />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/qr-generator/:code" element={<QRCodeGenerator />} />
                </Route>
              </>
            )}
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App; 