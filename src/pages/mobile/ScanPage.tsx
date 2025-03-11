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
  id: string;
  name: string;
  sku: string;
  current_stock: number;
  unit_of_measure: string;
  category_id?: string;
  supplier_id?: string;
  reorder_level?: number;
  location?: string;
}

const ScanPage: React.FC = () => {
  const { scanBarcode, updateInventory } = useSocket();
  const [scannedMaterial, setScannedMaterial] = useState<Material | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [manualInput, setManualInput] = useState<string>('');
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef<BrowserMultiFormatReader>();

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online');
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
    getAvailableCameras();
    
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
      if (backCamera) {
        setSelectedCamera(backCamera.deviceId);
      } else if (cameras.length > 0) {
        setSelectedCamera(cameras[0].deviceId);
      }
    } catch (error) {
      console.error('Error getting cameras:', error);
      setScannerError('Failed to get available cameras');
    }
  };

  // Start camera with constraints
  const startCamera = async () => {
    try {
      if (!codeReader.current || !videoRef.current) {
        throw new Error('Scanner not initialized');
      }

      const constraints = {
        video: {
          deviceId: selectedCamera ? { exact: selectedCamera } : undefined,
          facingMode: selectedCamera ? undefined : 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      // First try to get camera access
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Then start the barcode reader
      await codeReader.current.decodeFromVideoDevice(
        selectedCamera,
        videoRef.current,
        async (result, error) => {
          if (result) {
            const barcode = result.getText();
            await handleScan(barcode);
          }
        }
      );

      setCameraActive(true);
      setScannerError(null);
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
    if (videoRef.current?.srcObject) {
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
      await startCamera();
    }
  };

  // Handle successful scan
  const handleScan = async (barcode: string) => {
    try {
      let material;
      
      if (isOnline) {
        // Try online scan first
        const result = await scanBarcode(barcode);
        if (result?.success) {
          material = result.material;
        }
      }
      
      // Fall back to offline cache if online scan failed or offline
      if (!material) {
        material = await getCachedMaterialByIdentifier(barcode);
      }
      
      if (material) {
        setScannedMaterial(material);
        toast.success('Material found');
      } else {
        toast.error('Material not found');
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      toast.error('Failed to process barcode');
    }
  };

  // Handle manual search
  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    
    try {
      let material;
      
      if (isOnline) {
        // Try online search first
        const result = await scanBarcode(manualInput);
        if (result?.success) {
          material = result.material;
        }
      }
      
      // Fall back to offline cache if online search failed or offline
      if (!material) {
        material = await getCachedMaterialByIdentifier(manualInput);
      }
      
      if (material) {
        setScannedMaterial(material);
        setManualInput('');
        toast.success('Material found');
      } else {
        toast.error('Material not found');
      }
    } catch (error) {
      console.error('Error searching manually:', error);
      toast.error('Failed to search for material');
    }
  };

  // Handle inventory update
  const handleInventoryUpdate = async (isAdd: boolean) => {
    if (!scannedMaterial) return;
    
    try {
      const updateAmount = isAdd ? quantity : -quantity;
      const newStock = scannedMaterial.current_stock + updateAmount;
      
      if (isOnline) {
        // Try online update first
        await updateInventory(scannedMaterial.id, updateAmount);
      } else {
        // Store update for later sync
        await saveInventoryUpdate({
          materialId: scannedMaterial.id,
          amount: updateAmount,
          timestamp: new Date().toISOString()
        });
      }
      
      // Update local state
      setScannedMaterial(prev => prev ? {
        ...prev,
        current_stock: newStock
      } : null);
      
      // Update cached material
      await updateCachedMaterial(scannedMaterial.id, newStock);
      
      setQuantity(1);
      toast.success(`Inventory ${isAdd ? 'increased' : 'decreased'} by ${quantity}`);
    } catch (error) {
      console.error('Error updating inventory:', error);
      toast.error('Failed to update inventory');
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
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          style={{
            display: cameraActive ? 'block' : 'none'
          }}
        />
        
        {/* Scanning Frame */}
        {cameraActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 border-2 border-white rounded-lg"></div>
          </div>
        )}
        
        {/* Camera Error */}
        {scannerError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 p-4">
            <div className="text-white text-center">
              <p className="text-sm mb-4">{scannerError}</p>
              <button
                onClick={() => {
                  setScannerError(null);
                  startCamera();
                }}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Camera Controls */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
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
          <p className="text-sm text-gray-600 mb-4">
            Current Stock: {scannedMaterial.current_stock} {scannedMaterial.unit_of_measure}
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-4">
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