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

// Import the ZXing library in a way that won't break rendering if there's an issue
let BrowserMultiFormatReader: any;
let useBarcodeScanner = true;

try {
  const ZXing = require('@zxing/library');
  BrowserMultiFormatReader = ZXing.BrowserMultiFormatReader;
} catch (error) {
  console.error('Error loading ZXing library:', error);
  useBarcodeScanner = false;
}

const ScanPage: React.FC = () => {
  const { scanBarcode, loading, updateInventory } = useSocket();
  const [scannedMaterial, setScannedMaterial] = useState<any>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [manualInput, setManualInput] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<any>(null);
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

  // Initialize camera and barcode reader
  const startCamera = async () => {
    setScannerError(null);
    try {
      // First, initialize the camera without the barcode scanner
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          setCameraActive(true);
          setScannerReady(true);
          
          // After camera is initialized, try to setup the barcode reader if available
          if (useBarcodeScanner && BrowserMultiFormatReader) {
            try {
              // Create ZXing reader
              readerRef.current = new BrowserMultiFormatReader();
              
              // Start continuous scanning if possible
              readerRef.current.decodeFromVideoDevice(
                null, 
                videoRef.current, 
                (result: any, error: any) => {
                  if (result) {
                    // We got a result, stop scanning temporarily
                    setScanning(false);
                    
                    // Process the barcode
                    processBarcode(result.getText());
                    
                    // Restart scanning after a delay
                    setTimeout(() => {
                      setScanning(true);
                    }, 3000);
                  }
                  
                  if (error && !error.toString().includes('NotFoundException')) {
                    console.error('Scan error:', error);
                  }
                }
              );
              setScanning(true);
            } catch (error) {
              console.error('Error initializing barcode scanner:', error);
              // We'll continue with manual scanning only
              toast.error('Barcode scanner unavailable. Use manual capture instead.');
            }
          }
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setScannerError('Could not access camera. Please check permissions.');
      toast.error('Could not access camera. Please check permissions.');
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch (error) {
        console.error('Error resetting barcode reader:', error);
      }
      readerRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    setScanning(false);
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

  // Process scanned barcode
  const processBarcode = async (barcode: string) => {
    toast.loading('Processing...', { id: 'scan-toast' });
    
    try {
      if (isOnline) {
        // Try online lookup first
        const result = await scanBarcode(barcode);
        
        if (result && result.success) {
          setScannedMaterial(result.material);
          toast.success('Material found!', { id: 'scan-toast' });
        } else {
          // Fallback to cache if online lookup fails
          const cachedMaterial = await findMaterialInCache(barcode);
          if (cachedMaterial) {
            setScannedMaterial(cachedMaterial);
            toast.success('Material found in local cache!', { id: 'scan-toast' });
          } else {
            toast.error('No material found with this barcode', { id: 'scan-toast' });
          }
        }
      } else {
        // Offline mode - use cached data only
        const cachedMaterial = await findMaterialInCache(barcode);
        if (cachedMaterial) {
          setScannedMaterial(cachedMaterial);
          toast.success('Material found in offline cache!', { id: 'scan-toast' });
        } else {
          toast.error('Not found in offline cache. Please try when online.', { id: 'scan-toast' });
        }
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      toast.error('Error processing barcode', { id: 'scan-toast' });
    }
  };

  // Handle manual scan button
  const handleManualScan = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current video frame to canvas
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      if (useBarcodeScanner && readerRef.current) {
        // Use ZXing to decode from canvas if available
        try {
          // Create a blob from the canvas
          canvas.toBlob(async (blob) => {
            if (!blob) {
              toast.error('Failed to capture image.', { id: 'scan-toast' });
              return;
            }
            
            const imageUrl = URL.createObjectURL(blob);
            
            try {
              const result = await readerRef.current.decodeFromImage(undefined, imageUrl);
              if (result) {
                await processBarcode(result.getText());
              } else {
                toast.error('No barcode detected. Try again or use manual entry.', { id: 'scan-toast' });
              }
            } catch (error) {
              console.error('Error decoding image:', error);
              toast.error('Failed to process image. Try manual entry instead.', { id: 'scan-toast' });
            } finally {
              // Clean up object URL
              URL.revokeObjectURL(imageUrl);
            }
          }, 'image/jpeg', 0.95);
        } catch (error) {
          console.error('Error processing image with ZXing:', error);
          toast.error('Scanner error. Please use manual entry.', { id: 'scan-toast' });
        }
      } else {
        // Fallback to asking user to enter code manually
        toast.error('Automatic scanning unavailable. Please use manual entry below.', { id: 'scan-toast' });
      }
    } catch (error) {
      console.error('Error in manual scan:', error);
      toast.error('Failed to process image. Try again or use manual entry.', { id: 'scan-toast' });
    }
  };

  // Handle manual input search
  const handleManualSearch = async () => {
    if (!manualInput.trim()) {
      toast.error('Please enter a barcode or SKU');
      return;
    }
    
    await processBarcode(manualInput.trim());
  };

  // Handle inventory updates
  const handleInventoryUpdate = async (isAddition: boolean) => {
    if (!scannedMaterial) return;
    
    const amountChange = isAddition ? quantity : -quantity;
    const newStockAmount = scannedMaterial.current_stock + amountChange;
    
    try {
      let result;
      
      if (isOnline) {
        // Online update
        result = await updateInventory(scannedMaterial.id, amountChange);
        
        if (result.success) {
          // Also update the local cache to keep it in sync
          await updateCachedMaterial(scannedMaterial.id, newStockAmount);
          
          toast.success(`${isAddition ? 'Added' : 'Removed'} ${quantity} ${scannedMaterial.unit_of_measure} ${isAddition ? 'to' : 'from'} inventory`);
        } else {
          toast.error('Failed to update inventory');
        }
      } else {
        // Offline update
        await saveInventoryUpdate({ 
          materialId: scannedMaterial.id, 
          amount: amountChange 
        });
        
        // Also update the cached material
        await updateCachedMaterial(scannedMaterial.id, newStockAmount);
        
        // Update the local state to reflect changes
        setScannedMaterial({
          ...scannedMaterial,
          current_stock: newStockAmount
        });
        
        toast.success(`${isAddition ? 'Added' : 'Removed'} ${quantity} ${scannedMaterial.unit_of_measure} (offline). Will sync when online.`);
      }
      
      // Reset after update
      setTimeout(() => {
        setScannedMaterial(null);
        setManualInput('');
        setQuantity(1);
        // Resume scanning
        setScanning(true);
      }, 2000);
      
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
    <div className="flex flex-col h-full">
      <h1 className="text-xl font-bold mb-4">Scan Inventory</h1>
      
      {/* Online/Offline indicator */}
      <div className={`mb-4 p-2 rounded-lg text-sm font-medium text-center ${
        isOnline ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
      }`}>
        {isOnline ? "Online Mode" : "Offline Mode - Using Cached Data"}
      </div>
      
      {scannerError && (
        <div className="bg-red-100 text-red-800 p-3 rounded-lg mb-4">
          {scannerError}
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        {!cameraActive ? (
          <div className="p-6 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <button
              onClick={startCamera}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium"
            >
              Start Camera
            </button>
          </div>
        ) : (
          <div className="relative">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline
              className="w-full h-auto"
            />
            <canvas 
              ref={canvasRef} 
              className="hidden"
            />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-64 h-64 border-2 rounded-lg ${scanning ? 'border-indigo-500 animate-pulse' : 'border-indigo-500'}`}>
                {scanning && (
                  <div className="absolute inset-0 bg-indigo-500 opacity-10"></div>
                )}
              </div>
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
              <button
                onClick={handleManualScan}
                disabled={!scannerReady}
                className="bg-white text-indigo-600 p-3 rounded-full shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button
                onClick={stopCamera}
                className="bg-red-500 text-white p-3 rounded-full shadow-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {scannedMaterial && (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          <h2 className="text-lg font-semibold mb-2">{scannedMaterial.name}</h2>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div>
              <p className="text-sm text-gray-500">Current Stock</p>
              <p className="font-medium">{scannedMaterial.current_stock} {scannedMaterial.unit_of_measure}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">SKU</p>
              <p className="font-medium">{scannedMaterial.sku || 'N/A'}</p>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Update Quantity
            </label>
            <div className="flex items-center">
              <button
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                className="bg-gray-200 text-gray-700 p-2 rounded-l-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-16 text-center border-t border-b border-gray-300 py-2"
              />
              <button
                onClick={() => setQuantity(prev => prev + 1)}
                className="bg-gray-200 text-gray-700 p-2 rounded-r-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleInventoryUpdate(true)}
              className="bg-green-600 text-white py-2 rounded-lg font-medium"
            >
              Add (+)
            </button>
            <button
              onClick={() => handleInventoryUpdate(false)}
              className="bg-red-600 text-white py-2 rounded-lg font-medium"
            >
              Remove (-)
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-2">Manual Entry</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Barcode / SKU
          </label>
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter barcode or SKU"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
          />
        </div>
        <button
          onClick={handleManualSearch}
          className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium"
        >
          Search
        </button>
      </div>
    </div>
  );
};

export default ScanPage; 