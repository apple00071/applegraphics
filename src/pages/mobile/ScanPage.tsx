import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import toast from 'react-hot-toast';
import { 
  getCachedMaterials, 
  getCachedMaterialByIdentifier,
  updateCachedMaterial,
  saveInventoryUpdate, 
  requestSync 
} from '../../utils/offlineStorage';
import { isIOS, isAndroid } from '../../utils/browserDetection';
import { BrowserMultiFormatReader } from '@zxing/library';

interface Camera {
  deviceId: string;
  label: string;
}

interface Material {
  id: number;
  name: string;
  sku: string;
  current_stock: number;
  unit_of_measure: string;
  category_id?: number;
  supplier_id?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  location?: string;
  notes?: string;
  last_updated?: string;
}

const ScanPage: React.FC = () => {
  const { scanBarcode, loading, updateInventory } = useSocket();
  const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [manualInput, setManualInput] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>();
  const streamRef = useRef<MediaStream | null>(null);
  const [scannerReady, setScannerReady] = useState<boolean>(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast('Back online', { icon: '🌐' });
      // Trigger sync when back online
      requestSync('inventory');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('You are offline. Scanning will use cached data.', { icon: '📴' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize code reader
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  // Get list of available cameras
  const getAvailableCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(camera => ({
          deviceId: camera.deviceId,
          label: camera.label || `Camera ${camera.deviceId.slice(0, 4)}`
        }));
      
      setAvailableCameras(cameras);
      
      // Select back camera by default if available
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear')
      );
      if (backCamera && !selectedCamera) {
        setSelectedCamera(backCamera.deviceId);
      } else if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
      setScannerError('Failed to get available cameras');
    }
  };

  // Start camera with constraints
  const startCamera = async (deviceId?: string) => {
    try {
      if (!codeReader.current || !videoRef.current) {
        throw new Error('Scanner not initialized');
      }
      
      await getAvailableCameras();
      
      const constraints = {
        video: {
          deviceId: deviceId || selectedCamera,
          facingMode: deviceId ? undefined : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          aspectRatio: { ideal: 16/9 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      
      setCameraActive(true);
      setScannerError(null);
      
      // Start continuous scanning
      codeReader.current.decodeFromVideoDevice(
        deviceId || selectedCamera,
        videoRef.current,
        (result, error) => {
          if (result) {
            handleScan(result.getText());
          }
        }
      );
    } catch (error: any) {
      console.error('Error starting camera:', error);
      let errorMessage = 'Failed to start camera';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please check your permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera found on your device.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application.';
      }
      
      setScannerError(errorMessage);
      setCameraActive(false);
    }
  };

  // Stop camera
  const stopCamera = async () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (codeReader.current) {
      codeReader.current.reset();
    }
    
    setCameraActive(false);
  };

  // Handle camera selection
  const handleCameraChange = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (cameraActive) {
      await stopCamera();
      await startCamera(deviceId);
    }
  };

  // Find material in local cache
  const findMaterialInCache = async (barcode: string) => {
    try {
      // Use the more efficient lookup function
      return await getCachedMaterialByIdentifier(barcode);
    } catch (error) {
      console.error('Error searching cached materials:', error);
      return null;
    }
  };

  // Handle successful scan
  const handleScan = async (barcode: string) => {
    try {
      // TODO: Implement barcode processing logic
      console.log('Scanned barcode:', barcode);
      
      // Temporarily stop scanning while processing
      if (codeReader.current) {
        codeReader.current.reset();
      }
      
      // Process the barcode (implement your logic here)
      // For now, just set some dummy data
      setScannedMaterial({
        id: 1,
        name: `Test Material (${barcode})`,
        sku: barcode,
        current_stock: 100,
        unit_of_measure: 'pcs'
      });
      
      // Restart scanning after a delay
      setTimeout(() => {
        if (cameraActive && videoRef.current) {
          startCamera(selectedCamera);
        }
      }, 2000);
    } catch (error) {
      console.error('Error processing barcode:', error);
      setScannerError('Failed to process barcode');
    }
  };

  // Handle manual search
  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    
    try {
      // TODO: Implement manual search logic
      console.log('Manual search:', manualInput);
      
      // For now, just set some dummy data
      setScannedMaterial({
        id: 1,
        name: `Test Material (${manualInput})`,
        sku: manualInput,
        current_stock: 100,
        unit_of_measure: 'pcs'
      });
      
      setManualInput('');
    } catch (error) {
      console.error('Error searching manually:', error);
      setScannerError('Failed to search for material');
    }
  };

  // Handle inventory update
  const handleInventoryUpdate = async (isAdd: boolean) => {
    if (!scannedMaterial) return;
    
    try {
      const updateAmount = isAdd ? quantity : -quantity;
      
      // TODO: Implement inventory update logic
      console.log('Updating inventory:', {
        material: scannedMaterial,
        amount: updateAmount
      });
      
      // For now, just update the local state
      setScannedMaterial(prev => {
        if (!prev) return null;
        return {
          ...prev,
          current_stock: prev.current_stock + updateAmount
        };
      });
      
      setQuantity(1);
    } catch (error) {
      console.error('Error updating inventory:', error);
      setScannerError('Failed to update inventory');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-2">Scan Inventory</h1>
        <p className="text-sm text-gray-600 mb-4">
          {isOnline ? 'Online Mode' : 'Offline Mode - Using Cached Data'}
        </p>
      </div>

      {/* Camera Section */}
      <div className="relative flex-1 bg-black">
        {/* Camera Feed */}
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            ref={videoRef}
            className="max-w-full max-h-full"
            playsInline
            muted
            style={{
              transform: 'scaleX(-1)', // Mirror the feed for front camera
              display: cameraActive ? 'block' : 'none'
            }}
          />
          
          {/* Scanning Overlay */}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-white rounded-lg"></div>
            </div>
          )}
          
          {/* Camera Error Message */}
          {scannerError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 p-4">
              <div className="text-white text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm">{scannerError}</p>
                <button
                  onClick={() => {
                    setScannerError(null);
                    startCamera();
                  }}
                  className="mt-4 px-4 py-2 bg-white text-black rounded-lg text-sm"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Camera Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
          <div className="flex items-center justify-between">
            {/* Camera Selection */}
            {availableCameras.length > 1 && (
              <select
                value={selectedCamera}
                onChange={(e) => handleCameraChange(e.target.value)}
                className="bg-white bg-opacity-20 text-white rounded-lg px-3 py-2 text-sm"
              >
                {availableCameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label}
                  </option>
                ))}
              </select>
            )}
            
            {/* Camera Toggle Button */}
            <button
              onClick={() => cameraActive ? stopCamera() : startCamera()}
              className="ml-auto bg-white rounded-full p-3"
            >
              {cameraActive ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Manual Input Section */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter barcode manually"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleManualSearch}
            disabled={!manualInput.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </div>

      {/* Scanned Material Info */}
      {scannedMaterial && (
        <div className="p-4 bg-white border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-2">{scannedMaterial.name}</h2>
          <p className="text-sm text-gray-600 mb-2">
            Current Stock: {scannedMaterial.current_stock} {scannedMaterial.unit_of_measure}
          </p>
          
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className="p-2 border border-gray-300 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center"
            />
            
            <button
              onClick={() => setQuantity(prev => prev + 1)}
              className="p-2 border border-gray-300 rounded-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleInventoryUpdate(false)}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              Remove (-)
            </button>
            <button
              onClick={() => handleInventoryUpdate(true)}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg"
            >
              Add (+)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanPage; 