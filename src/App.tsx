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

// Ultra Simple Mobile App
const UltraSimpleMobileApp = () => {
  const [page, setPage] = useState('home');
  const [deviceInfo, setDeviceInfo] = useState({});

  useEffect(() => {
    // Collect basic device info
    setDeviceInfo({
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      time: new Date().toISOString()
    });
  }, []);

  // Very simple navigation that doesn't use React Router
  const renderPage = () => {
    switch (page) {
      case 'camera':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Simple Camera Test</h2>
            <p>This is a simplified camera test page.</p>
            <button 
              onClick={() => setPage('home')}
              style={{ 
                marginTop: '20px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Back to Home
            </button>
          </div>
        );
      case 'inventory':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Inventory List</h2>
            <p>This is a simplified inventory list page.</p>
            <button 
              onClick={() => setPage('home')}
              style={{ 
                marginTop: '20px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Back to Home
            </button>
          </div>
        );
      case 'orders':
        return (
          <div style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Orders List</h2>
            <p>This is a simplified orders list page.</p>
            <button 
              onClick={() => setPage('home')}
              style={{ 
                marginTop: '20px',
                backgroundColor: '#4f46e5',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Back to Home
            </button>
          </div>
        );
      default:
        return (
          <div style={{ padding: '20px' }}>
            <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>PrintPress Inventory</h1>
            
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
            
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '15px' }}>Ultra Simple Mode</h2>
              <p>This is a simplified version of the app to troubleshoot mobile issues.</p>
            </div>
            
            <div style={{ display: 'grid', gap: '15px' }}>
              <button 
                onClick={() => setPage('inventory')}
                style={{ 
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                View Inventory
              </button>
              
              <button 
                onClick={() => setPage('orders')}
                style={{ 
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                View Orders
              </button>
              
              <button 
                onClick={() => setPage('camera')}
                style={{ 
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  padding: '15px',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Test Camera
              </button>

              <a 
                href="/camera-test"
                style={{ 
                  backgroundColor: '#10b981',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '15px',
                  borderRadius: '5px',
                  textAlign: 'center',
                  marginTop: '20px'
                }}
              >
                Go to Full Camera Test
              </a>

              <a 
                href="/login"
                style={{ 
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  textDecoration: 'none',
                  padding: '15px',
                  borderRadius: '5px',
                  textAlign: 'center'
                }}
              >
                Go to Login Page
              </a>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ 
      maxWidth: '100%', 
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      fontFamily: 'Arial, sans-serif',
      color: '#1f2937'
    }}>
      {renderPage()}
      
      {/* Simple bottom navigation */}
      <div style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0,
        display: 'flex',
        justifyContent: 'space-around',
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        padding: '10px 0'
      }}>
        <button 
          onClick={() => setPage('home')}
          style={{ 
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '12px',
            color: page === 'home' ? '#4f46e5' : '#6b7280'
          }}
        >
          <span style={{ fontSize: '20px', marginBottom: '2px' }}>🏠</span>
          Home
        </button>

        <button 
          onClick={() => setPage('inventory')}
          style={{ 
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '12px',
            color: page === 'inventory' ? '#4f46e5' : '#6b7280'
          }}
        >
          <span style={{ fontSize: '20px', marginBottom: '2px' }}>📦</span>
          Inventory
        </button>

        <button 
          onClick={() => setPage('camera')}
          style={{ 
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '12px',
            color: page === 'camera' ? '#4f46e5' : '#6b7280'
          }}
        >
          <span style={{ fontSize: '20px', marginBottom: '2px' }}>📷</span>
          Scan
        </button>

        <button 
          onClick={() => setPage('orders')}
          style={{ 
            background: 'none',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontSize: '12px',
            color: page === 'orders' ? '#4f46e5' : '#6b7280'
          }}
        >
          <span style={{ fontSize: '20px', marginBottom: '2px' }}>📋</span>
          Orders
        </button>
      </div>
    </div>
  );
};

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
  
  // Change to true to see the diagnostic fallback screen
  const [useFallback, setUseFallback] = useState(false);
  
  // Use ultra simple mobile app instead of full React app on mobile
  const [useUltraSimple, setUseUltraSimple] = useState(true);

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

  // Show diagnostic fallback screen if enabled
  if (isMobile && useFallback) {
    return <MobileFallback />;
  }
  
  // Show ultra simple mobile app if enabled and on mobile
  if (isMobile && useUltraSimple) {
    return <UltraSimpleMobileApp />;
  }

  // Default app with full React Router, context providers, etc.
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