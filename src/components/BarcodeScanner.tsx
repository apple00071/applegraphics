import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError, onClose }) => {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameras, setCameras] = useState<Array<{ id: string, label: string }>>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'scanner-container';
  
  // Initialize scanner when component mounts
  useEffect(() => {
    // Create scanner instance
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(scannerContainerId);
    }
    
    // Check for cameras
    checkCameras();
    
    // Cleanup on unmount
    return () => {
      if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        scannerRef.current.stop().catch(error => {
          console.error("Error stopping scanner:", error);
        });
      }
    };
  }, []);
  
  // Check for available cameras
  const checkCameras = async () => {
    try {
      setErrorMessage(null);
      
      // Request camera permissions first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setPermissionGranted(true);
      } catch (error) {
        console.error("Camera permission error:", error);
        setPermissionGranted(false);
        setErrorMessage("Camera access denied. Please grant camera permissions in your browser settings.");
        return;
      }
      
      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        setErrorMessage("No cameras found on your device.");
        return;
      }
      
      setCameras(devices);
      
      // Try to select back camera by default on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        const backCamera = devices.find(camera => 
          camera.label.toLowerCase().includes('back') || 
          camera.label.toLowerCase().includes('rear')
        );
        
        if (backCamera) {
          setSelectedCamera(backCamera.id);
          startScanner(backCamera.id);
        } else {
          setSelectedCamera(devices[0].id);
          startScanner(devices[0].id);
        }
      } else {
        // On desktop just use the first camera
        setSelectedCamera(devices[0].id);
      }
    } catch (error) {
      console.error("Error checking cameras:", error);
      setErrorMessage("Could not access cameras. Please ensure your browser supports camera access.");
    }
  };
  
  // Start the scanner with selected camera
  const startScanner = async (cameraId: string) => {
    if (!scannerRef.current || !cameraId) return;
    
    try {
      setErrorMessage(null);
      
      if (scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
        await scannerRef.current.stop();
      }
      
      // Calculate optimal QR box size based on screen dimensions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const minDimension = Math.min(screenWidth, screenHeight);
      const qrboxSize = Math.min(250, minDimension - 100);
      
      const config = {
        fps: 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1.0
      };
      
      console.log("Starting scanner with camera ID:", cameraId);
      await scannerRef.current.start(
        cameraId, 
        config,
        (decodedText) => {
          // Success callback
          console.log("Scan successful:", decodedText);
          
          // Play success sound if available
          try {
            const audio = new Audio('/beep.mp3');
            audio.play().catch(e => console.log("Sound play error:", e));
          } catch (e) {
            console.log("Sound not available");
          }
          
          // Call the onScan prop with result
          onScan(decodedText);
          
          // Stop scanning after successful scan
          if (scannerRef.current) {
            scannerRef.current.stop().catch(e => console.error("Error stopping scanner:", e));
            setScanning(false);
          }
        },
        (errorMessage) => {
          // Error callback - Just log errors during scanning
          console.log("Scan error:", errorMessage);
        }
      );
      
      setScanning(true);
      
      // Style the scanner elements
      setTimeout(() => {
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          video.style.borderRadius = '8px';
          video.style.maxWidth = '100%';
          video.style.objectFit = 'cover';
        });
      }, 500);
    } catch (error) {
      console.error("Error starting scanner:", error);
      setErrorMessage(error instanceof Error ? error.message : "Failed to start camera scanner.");
      setScanning(false);
    }
  };
  
  // Stop the scanner
  const stopScanner = async () => {
    if (!scannerRef.current || scannerRef.current.getState() !== Html5QrcodeScannerState.SCANNING) return;
    
    try {
      await scannerRef.current.stop();
      setScanning(false);
    } catch (error) {
      console.error("Error stopping scanner:", error);
    }
  };
  
  // Handle camera selection change
  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const cameraId = event.target.value;
    setSelectedCamera(cameraId);
    startScanner(cameraId);
  };
  
  // Handle close button
  const handleClose = () => {
    stopScanner();
    if (onClose) onClose();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">Scan Code</h3>
        {onClose && (
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="p-4">
        {/* Permission Status */}
        {permissionGranted === false && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold">Camera Access Denied</span>
            </div>
            <p className="ml-7">Please grant camera permissions in your browser settings to scan codes.</p>
            <button
              onClick={checkCameras}
              className="ml-7 mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Error Message */}
        {errorMessage && permissionGranted !== false && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold">Error</span>
            </div>
            <p className="ml-7">{errorMessage}</p>
            <button
              onClick={checkCameras}
              className="ml-7 mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Camera
            </label>
            <select
              value={selectedCamera || ''}
              onChange={handleCameraChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {cameras.map(camera => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${cameras.indexOf(camera) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {/* Scanner Container */}
        <div 
          id={scannerContainerId} 
          className="w-full bg-gray-100 rounded-lg overflow-hidden"
          style={{ 
            minHeight: '300px',
            position: 'relative',
            marginBottom: '1rem'
          }}
        >
          {/* Scanner will be mounted here by HTML5-QRCode library */}
          {!scanning && !errorMessage && permissionGranted !== false && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-600 text-center px-4">
                {cameras.length > 0 
                  ? 'Camera initializing...' 
                  : 'Searching for cameras...'}
              </p>
            </div>
          )}
        </div>
        
        {/* Scanner Controls */}
        <div className="flex space-x-2">
          {!scanning && selectedCamera && permissionGranted && (
            <button
              onClick={() => startScanner(selectedCamera)}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Start Scanner
            </button>
          )}
          
          {scanning && (
            <button
              onClick={stopScanner}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Stop Scanner
            </button>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          {scanning 
            ? "Point your camera at a barcode or QR code" 
            : "Press Start Scanner to begin scanning"}
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner; 