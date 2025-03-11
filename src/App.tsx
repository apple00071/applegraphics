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
import OrderDetail from './pages/orders/OrderDetail';
import CategoriesList from './pages/categories/CategoriesList';
import SuppliersList from './pages/suppliers/SuppliersList';
import Reports from './pages/Reports';
import QRCodeGenerator from './components/QRCodeGenerator';
import ScanPage from './pages/mobile/ScanPage';
import ProfilePage from './pages/mobile/ProfilePage';
import CameraTest from './pages/CameraTest';

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
        
        {/* Catch all for mobile */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    );
  }
  
  // Desktop routes
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      <Route element={<DashboardLayout />}>
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
      
      {/* Catch all for desktop */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// Main App component (doesn't use hooks that require Router context)
const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

// Content component that uses Router-dependent hooks
const AppContent: React.FC = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  
  // Set this to false to disable fallback mode - only used for diagnostics
  const [useFallback, setUseFallback] = useState<boolean>(false);
  
  // Detect mobile devices on component mount and window resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Log device info for debugging
    console.log('Device Info:', {
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      isMobile: isMobile
    });

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobile]);

  // Show fallback diagnostic UI if enabled (for troubleshooting only)
  if (isMobile && useFallback) {
    return <MobileFallback />;
  }

  // Regular application rendering with authentication
  return (
    <>
      <AuthProvider>
        <SocketProvider>
          <div className="app-container">
            <Toaster position="top-right" />
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/camera-test" element={<CameraTest />} />
              
              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainRoutes isMobile={isMobile} />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </SocketProvider>
      </AuthProvider>
    </>
  );
};

// ... rest of the existing code ...

export default App; 