import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'html5-qrcode-scanner';

  useEffect(() => {
    // Cleanup scanner on component unmount
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(error => {
          console.error("Error stopping scanner:", error);
        });
      }
    };
  }, [isScanning]);

  const startScanner = async () => {
    try {
      setIsScanning(true);
      
      // Initialize the scanner if it doesn't exist
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }
      
      const qrCodeSuccessCallback = (decodedText: string) => {
        // Stop scanning after successful scan
        if (scannerRef.current) {
          scannerRef.current.stop().catch(error => {
            console.error("Error stopping scanner after successful scan:", error);
          });
        }
        setIsScanning(false);
        onScan(decodedText);
      };
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      // Start scanning
      await scannerRef.current.start(
        { facingMode: "environment" }, // Use back camera
        config,
        qrCodeSuccessCallback,
        (errorMessage: string) => {
          // This is just for errors during scanning, not for permission errors
          console.log(`QR Code scanning error: ${errorMessage}`);
        }
      );
    } catch (error) {
      console.error("Error starting scanner:", error);
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

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Scan Barcode or QR Code</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div className="relative w-full aspect-square bg-gray-100 rounded overflow-hidden">
        <div id={scannerContainerId} className="w-full h-full">
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <p className="text-gray-500 text-center px-4">Position the barcode or QR code within the scanner</p>
            </div>
          )}
        </div>
        
        {isScanning && (
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center">
            <div className="bg-black bg-opacity-50 text-white px-4 py-2 rounded-full">
              <p>Scanning...</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 flex justify-center">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            Stop Scanner
          </button>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-4 text-center">
        Please allow camera access when prompted to scan barcodes
      </p>
    </div>
  );
};

export default BarcodeScanner; 