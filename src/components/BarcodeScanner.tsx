import React, { useState, useEffect, useRef } from 'react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isTakingPicture, setIsTakingPicture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const [autoScanActive, setAutoScanActive] = useState(true);
  const autoScanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<boolean>(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [`${timestamp}: ${message}`, ...prevLogs.slice(0, 9)]);
    console.log(`${timestamp}: ${message}`);
  };

  // Initialize camera and auto-scanning when component mounts
  useEffect(() => {
    startCamera();
    
    // Cleanup on unmount
    return () => {
      stopCamera();
      stopAutoScan();
    };
  }, []);

  // Start auto-scanning when camera becomes active
  useEffect(() => {
    if (cameraActive && autoScanActive) {
      startAutoScan();
    } else {
      stopAutoScan();
    }
  }, [cameraActive, autoScanActive]);

  const startCamera = async () => {
    try {
      // Reset error state
      setErrorMessage('');
      addLog('Starting camera...');
      
      // Stop any existing camera stream
      stopCamera();
      
      // Get camera stream
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Save stream for cleanup
      mediaStreamRef.current = stream;
      
      // Connect stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraActive(true);
      addLog('Camera started successfully');
    } catch (error) {
      setCameraActive(false);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Camera error: ${errorMsg}`);
      addLog(`Camera error: ${errorMsg}`);
      if (onError) onError(errorMsg);
    }
  };
  
  const stopCamera = () => {
    if (mediaStreamRef.current) {
      addLog('Stopping camera...');
      
      try {
        mediaStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
        
        mediaStreamRef.current = null;
        setCameraActive(false);
        addLog('Camera stopped');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        addLog(`Error stopping camera: ${errorMsg}`);
      }
    }
  };

  const startAutoScan = () => {
    addLog('Starting automatic scanning...');
    stopAutoScan(); // Clear any existing interval first
    
    // Set interval for scanning every 1000ms (1 second)
    autoScanIntervalRef.current = setInterval(() => {
      if (cameraActive && !scanCooldownRef.current) {
        captureAndProcessFrame();
      }
    }, 1000);
  };
  
  const stopAutoScan = () => {
    if (autoScanIntervalRef.current) {
      clearInterval(autoScanIntervalRef.current);
      autoScanIntervalRef.current = null;
      addLog('Automatic scanning stopped');
    }
  };
  
  const toggleAutoScan = () => {
    const newState = !autoScanActive;
    setAutoScanActive(newState);
    addLog(`Automatic scanning ${newState ? 'enabled' : 'disabled'}`);
  };

  const handleTakePicture = async () => {
    if (isTakingPicture) return;
    
    // Using the native file input approach as direct fallback
    setIsTakingPicture(true);
    addLog('Opening file picker...');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera when possible
    
    input.onchange = async (e: Event) => {
      const element = e.target as HTMLInputElement;
      if (element.files && element.files.length > 0) {
        const file = element.files[0];
        addLog(`Selected image: ${file.name}`);
        
        try {
          // Create image from file for processing
          const img = new Image();
          img.src = URL.createObjectURL(file);
          
          img.onload = async () => {
            // Create canvas to process the image
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            if (!context) {
              throw new Error('Could not create canvas context');
            }
            
            // Set canvas dimensions to match image
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw image to canvas
            context.drawImage(img, 0, 0, img.width, img.height);
            
            // Try to use BarcodeDetector API if available
            if ('BarcodeDetector' in window) {
              try {
                addLog('Using BarcodeDetector API for image...');
                // @ts-ignore - BarcodeDetector might not be recognized by TypeScript
                const barcodeDetector = new BarcodeDetector({
                  formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix']
                });
                
                // Detect barcodes in the image
                const barcodes = await barcodeDetector.detect(canvas);
                
                if (barcodes.length > 0) {
                  // Use the first detected barcode
                  const barcode = barcodes[0];
                  addLog(`Barcode detected in image: ${barcode.rawValue}`);
                  handleSuccessfulScan(barcode.rawValue);
                } else {
                  addLog('No barcodes detected in image');
                  setErrorMessage('No barcode found in image. Please try again with a clearer picture.');
                  if (onError) onError('No barcode found in image');
                }
              } catch (err) {
                addLog(`BarcodeDetector error: ${err instanceof Error ? err.message : String(err)}`);
                setErrorMessage('Error detecting barcode. Please try a different image or method.');
                if (onError) onError('Error detecting barcode');
              }
            } else {
              addLog('BarcodeDetector API not available');
              setErrorMessage('Your browser does not support barcode detection.');
              if (onError) onError('Barcode detection not supported');
            }
            
            URL.revokeObjectURL(img.src); // Clean up object URL
          };
          
          img.onerror = (error) => {
            addLog(`Error loading image: ${error}`);
            setErrorMessage('Error loading image. Please try again.');
            URL.revokeObjectURL(img.src); // Clean up object URL
            if (onError) onError('Error loading image');
          };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          addLog(`Error processing image: ${errorMsg}`);
          setErrorMessage(`Error processing image: ${errorMsg}`);
          if (onError) onError(errorMsg);
        }
      } else {
        addLog('No file selected');
      }
      setIsTakingPicture(false);
    };
    
    input.click();
  };
  
  const captureAndProcessFrame = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      return;
    }
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) {
        addLog('Error: Could not get canvas context');
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Try to use the BarcodeDetector API if available in the browser
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore - BarcodeDetector might not be recognized by TypeScript
          const barcodeDetector = new BarcodeDetector({
            formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'data_matrix']
          });
          
          // Detect barcodes in the frame
          const barcodes = await barcodeDetector.detect(canvas);
          
          if (barcodes.length > 0) {
            // Use the first detected barcode
            const barcode = barcodes[0];
            
            // Avoid duplicate scans by checking against the last scanned code
            if (barcode.rawValue !== lastScannedCodeRef.current) {
              addLog(`Barcode detected: ${barcode.rawValue}`);
              handleSuccessfulScan(barcode.rawValue);
            }
          }
        } catch (err) {
          console.error('BarcodeDetector error:', err);
        }
      }
    } catch (error) {
      console.error('Error capturing frame:', error);
    }
  };
  
  const handleSuccessfulScan = (code: string) => {
    // Set a cooldown to prevent multiple rapid scans of the same code
    scanCooldownRef.current = true;
    lastScannedCodeRef.current = code;
    
    // Call the onScan callback with the scanned code
    onScan(code);
    
    // Reset the cooldown after a delay
    setTimeout(() => {
      scanCooldownRef.current = false;
    }, 3000); // 3 second cooldown
  };

  const handleManualCapture = () => {
    captureAndProcessFrame();
  };
  
  const handleManualScan = () => {
    addLog('Manually initiating scan for testing');
    
    // Only use this in testing/development environments
    if (process.env.NODE_ENV !== 'production') {
      handleSuccessfulScan("A000123456789");
    } else {
      // In production, just inform the user this is a test feature
      addLog('Test scan not available in production');
      setErrorMessage('This is a testing feature. Please use camera scanning in production.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md w-full">
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="text-lg font-medium">Scan Barcode/QR Code</h3>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="p-4">
          <div className="relative h-64 bg-gray-100 mb-4 flex items-center justify-center overflow-hidden">
            {/* Hidden canvas for image processing */}
            <canvas 
              ref={canvasRef} 
              style={{ display: 'none' }} 
            />
            
            {/* Video element */}
            <video
              id="video-element"
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              muted
              onCanPlay={() => addLog('Video can play')}
            />
            
            {/* Loading or error overlay */}
            {!cameraActive && !errorMessage && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Starting camera...</p>
                </div>
              </div>
            )}
            
            {errorMessage && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-90">
                <div className="text-red-600 text-center p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="font-medium">{errorMessage}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button 
              onClick={startCamera}
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restart Camera
              </div>
            </button>
            
            <button 
              onClick={toggleAutoScan}
              className={`${autoScanActive ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-500 hover:bg-gray-600'} text-white py-2 px-4 rounded-md`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {autoScanActive ? 'Auto-Scan On' : 'Auto-Scan Off'}
              </div>
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button 
              onClick={handleTakePicture}
              disabled={isTakingPicture}
              className={`bg-green-500 text-white py-2 px-4 rounded-md ${!isTakingPicture ? 'hover:bg-green-600' : 'opacity-50 cursor-not-allowed'}`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Picture
              </div>
            </button>
            
            <button 
              onClick={handleManualCapture}
              disabled={!cameraActive}
              className={`bg-purple-500 text-white py-2 px-4 rounded-md ${cameraActive ? 'hover:bg-purple-600' : 'opacity-50 cursor-not-allowed'}`}
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Capture Frame
              </div>
            </button>
          </div>
          
          <div className="bg-gray-100 p-2 rounded-md text-xs font-mono h-32 overflow-y-auto">
            <p className="text-gray-500 mb-1">Scanner initializing...</p>
            {logs.map((log, index) => (
              <div key={index} className="text-gray-700">{log}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 