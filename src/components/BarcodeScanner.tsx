import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scanAttempts, setScanAttempts] = useState(0);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [`${timestamp}: ${message}`, ...prevLogs.slice(0, 9)]);
  };

  useEffect(() => {
    // Initialize scanner on component mount
    startCamera();
    
    // Cleanup on unmount
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error('Error stopping scanner:', err));
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      addLog('Starting camera initialization');
      
      // Create a unique ID for the scanner element
      const scannerId = 'html5qrcode-scanner';
      let scannerElement = document.getElementById(scannerId);
      
      // If element doesn't exist, create it
      if (!scannerElement) {
        scannerElement = document.createElement('div');
        scannerElement.id = scannerId;
        document.getElementById('scanner-container')?.appendChild(scannerElement);
      }
      
      // Check if scanner is already initialized
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }
      
      // Initialize scanner with specific config for mobile
      scannerRef.current = new Html5Qrcode(scannerId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      };
      
      addLog('Requesting camera access');
      
      await scannerRef.current.start(
        { facingMode: "environment" }, // Use rear camera
        config,
        (decodedText) => {
          addLog(`Successfully scanned: ${decodedText}`);
          onScan(decodedText);
        },
        (errorMessage) => {
          // This is a normal part of the scanning process, not an error to display
          console.log(`QR code scanning process: ${errorMessage}`);
        }
      );
      
      addLog('Camera started successfully');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrorMessage(`Camera error: ${errorMsg}`);
      addLog(`Error: ${errorMsg}`);
      if (onError) onError(errorMsg);
    }
  };

  const handleRestartCamera = () => {
    addLog('Restarting camera');
    startCamera();
  };

  const handleManualScan = () => {
    const testCode = "TEST-123456";
    addLog(`Simulating scan with code: ${testCode}`);
    onScan(testCode);
    setScanAttempts(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden max-w-md w-full">
        <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
          <h3 className="text-lg font-medium">Scan QR Code</h3>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        
        <div className="p-4">
          <div id="scanner-container" className="relative h-64 bg-gray-100 mb-4 flex items-center justify-center">
            {/* QR Code scanner will be mounted here */}
            {errorMessage && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-80">
                <div className="text-red-600 text-center p-2">
                  {errorMessage}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-between gap-2 mb-4">
            <button 
              onClick={handleRestartCamera}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Restart Camera
              </div>
            </button>
            
            <button 
              onClick={handleManualScan}
              className="flex-1 bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Simulate Scan (Testing)
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