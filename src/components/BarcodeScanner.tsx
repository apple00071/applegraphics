import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

interface ScannerConfig {
  fps: number;
  qrbox: {
    width: number;
    height: number;
  };
  aspectRatio: number;
  showTorchButtonIfSupported: boolean;
  showZoomSliderIfSupported: boolean;
  defaultZoomValueIfSupported?: number;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5-qrcode-scanner';

  // Initialize scanner on component mount
  useEffect(() => {
    // Start scanner automatically when component mounts
    startScanner();

    // Cleanup scanner on component unmount
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(error => {
          console.error("Error stopping scanner:", error);
        });
      }
    };
  }, []);

  const handleSuccessfulScan = async (decodedText: string, decodedResult: any) => {
    try {
      // Stop the scanner immediately to prevent multiple scans
      if (scannerRef.current) {
        await scannerRef.current.stop();
        setIsScanning(false);
      }
      
      // Play a success sound if available
      try {
        const audio = new Audio('/beep.mp3');
        await audio.play();
      } catch (soundError) {
        console.log('Sound not available');
      }
      
      console.log('Successfully scanned:', decodedText);
      
      // Call the onScan callback with the result
      onScan(decodedText);
    } catch (error) {
      console.error('Error handling successful scan:', error);
      if (onError) {
        onError('Error processing scan result');
      }
    }
  };

  const startScanner = async () => {
    try {
      setCameraError(null);
      
      // Initialize the scanner if it doesn't exist
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      
      if (!devices || devices.length === 0) {
        throw new Error("No cameras found on your device. Please ensure camera permissions are enabled.");
      }

      // Prefer back camera for mobile devices
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      let selectedCamera;
      
      if (isMobile) {
        // On mobile, explicitly try to use the back camera
        selectedCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
      }
      
      // If no back camera found or not on mobile, use the first available camera
      if (!selectedCamera) {
        selectedCamera = devices[0];
      }
      
      // Calculate optimal QR box size based on screen dimensions
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const minDimension = Math.min(screenWidth, screenHeight);
      const qrboxSize = Math.min(250, minDimension - 80);

      // Mobile-optimized configuration
      const scannerConfig: ScannerConfig = {
        fps: 10,
        qrbox: {
          width: qrboxSize,
          height: qrboxSize
        },
        aspectRatio: window.innerWidth / window.innerHeight,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2
      };
      
      console.log(`Starting scanner with camera: ${selectedCamera.label || selectedCamera.id}`);
      setIsScanning(true);
      
      await scannerRef.current.start(
        selectedCamera.id,
        scannerConfig,
        handleSuccessfulScan,
        (errorMessage: string) => {
          console.log(`QR Code scanning error: ${errorMessage}`);
        }
      );
      
      // Style the scanner UI for better mobile experience
      setTimeout(() => {
        document.querySelectorAll(`#${scannerContainerId} video`).forEach((videoElement: Element) => {
          if (videoElement instanceof HTMLElement) {
            videoElement.style.width = '100%';
            videoElement.style.height = '100%';
            videoElement.style.objectFit = 'cover';
            videoElement.style.borderRadius = '8px';
          }
        });
        
        document.querySelectorAll(`#${scannerContainerId} .qrcode-region`).forEach((region: Element) => {
          if (region instanceof HTMLElement) {
            region.style.width = '100%';
            region.style.height = '100%';
            region.style.minHeight = '300px';
            region.style.borderRadius = '8px';
          }
        });
      }, 1000);
    } catch (error) {
      console.error("Error starting scanner:", error);
      setCameraError(error instanceof Error ? error.message : "Scanner initialization failed. Please try again.");
      setIsScanning(false);
      if (onError) {
        onError(error instanceof Error ? error.message : String(error));
      }
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (error) {
        console.error("Error stopping scanner:", error);
      }
    }
  };

  const switchCamera = async () => {
    if (scannerRef.current) {
      try {
        // First stop the current scanner
        if (isScanning) {
          await scannerRef.current.stop();
          setIsScanning(false);
        }
        
        // Short delay before restarting with a different camera
        setTimeout(async () => {
          try {
            const devices = await Html5Qrcode.getCameras();
            if (!devices || devices.length <= 1) {
              throw new Error("No additional cameras found on your device.");
            }

            // Get the current camera ID
            let currentDeviceId = "";
            try {
              const trackSettings = scannerRef.current?.getRunningTrackSettings();
              if (trackSettings && typeof trackSettings === 'object' && 'deviceId' in trackSettings) {
                currentDeviceId = trackSettings.deviceId as string || "";
              }
            } catch (err) {
              console.log("Could not get current camera ID:", err);
            }
            
            // Find a different camera
            const newCamera = devices.find(device => device.id !== currentDeviceId);
            
            if (!newCamera) {
              throw new Error("No alternative camera found.");
            }

            console.log(`Switching to camera: ${newCamera.label || newCamera.id}`);
            
            // Calculate optimal QR box size
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            const minDimension = Math.min(screenWidth, screenHeight);
            const qrboxSize = Math.min(250, minDimension - 80);
            
            const newScannerConfig: ScannerConfig = {
              fps: 10,
              qrbox: {
                width: qrboxSize,
                height: qrboxSize
              },
              aspectRatio: window.innerWidth / window.innerHeight,
              showTorchButtonIfSupported: true,
              showZoomSliderIfSupported: true
            };
            
            setIsScanning(true);
            await scannerRef.current?.start(
              newCamera.id,
              newScannerConfig,
              handleSuccessfulScan,
              (errorMessage: string) => {
                console.log(`QR Code scanning error: ${errorMessage}`);
              }
            );
            
            setCameraError(null);
            
            // Style the scanner UI
            setTimeout(() => {
              document.querySelectorAll(`#${scannerContainerId} video`).forEach((videoElement: Element) => {
                if (videoElement instanceof HTMLElement) {
                  videoElement.style.width = '100%';
                  videoElement.style.height = '100%';
                  videoElement.style.objectFit = 'cover';
                  videoElement.style.borderRadius = '8px';
                }
              });
              
              document.querySelectorAll(`#${scannerContainerId} .qrcode-region`).forEach((region: Element) => {
                if (region instanceof HTMLElement) {
                  region.style.width = '100%';
                  region.style.height = '100%';
                  region.style.minHeight = '300px';
                  region.style.borderRadius = '8px';
                }
              });
            }, 1000);
          } catch (error) {
            console.error("Error switching camera:", error);
            setCameraError(error instanceof Error ? error.message : "Failed to switch camera.");
          }
        }, 500);
      } catch (error) {
        console.error("Error stopping scanner before switch:", error);
      }
    } else {
      // If scanner doesn't exist yet, just restart it
      startScanner();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Scan Barcode or QR Code</h3>
        {onClose && (
          <button 
            onClick={() => {
              stopScanner();
              onClose();
            }} 
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
        <div 
          id={scannerContainerId} 
          className="w-full h-full" 
          style={{ 
            position: 'relative', 
            minHeight: '300px',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          {!isScanning && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-gray-500 text-center px-4">Initializing camera...</p>
            </div>
          )}
          
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-600 text-center font-medium mb-2">Camera Error</p>
              <p className="text-red-500 text-center mb-4">{cameraError}</p>
              <button
                onClick={switchCamera}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors mb-2"
              >
                Try Different Camera
              </button>
              <button
                onClick={startScanner}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex space-x-2">
        {isScanning && (
          <button
            onClick={switchCamera}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Switch Camera
          </button>
        )}
        
        {!isScanning && !cameraError && (
          <button
            onClick={startScanner}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Start Scanner
          </button>
        )}
        
        {isScanning && (
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
        Point your camera at a QR code or barcode to scan
      </p>
    </div>
  );
};

export default BarcodeScanner; 