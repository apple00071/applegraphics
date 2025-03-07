import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError, onClose }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [logs, setLogs] = useState<string[]>(['Scanner initializing...']);
  const [scanAttempted, setScanAttempted] = useState(false);
  
  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // Initialize camera on component mount
  useEffect(() => {
    addLog('Starting camera initialization');
    startCamera();
    
    // Cleanup on unmount
    return () => {
      const video = videoRef.current;
      if (video && video.srcObject) {
        const tracks = (video.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
        addLog('Camera stopped');
      }
    };
  }, []);

  // Start the camera
  const startCamera = async () => {
    setErrorMessage(null);
    setScanAttempted(true);
    
    try {
      addLog('Requesting camera access');
      const constraints = { 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addLog('Camera access granted');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        addLog('Video element connected to camera stream');
        
        // Force the video element to be visible
        videoRef.current.style.display = 'block';
        videoRef.current.style.width = '100%';
        videoRef.current.style.height = 'auto';
        videoRef.current.style.maxHeight = '70vh';
        videoRef.current.style.objectFit = 'cover';
        videoRef.current.style.borderRadius = '8px';
      } else {
        addLog('ERROR: Video element not found');
        throw new Error('Video element not found');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      addLog(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
      setErrorMessage('Camera access failed. Please ensure camera permissions are granted and no other app is using your camera.');
      if (onError) {
        onError('Failed to access camera');
      }
    }
  };

  // Handle successful scan
  const handleManualScan = () => {
    // For testing purposes, simulate a successful scan
    const testCode = 'TEST-123456';
    addLog(`Scan successful: ${testCode}`);
    
    try {
      // Play success sound if available
      const audio = new Audio('/beep.mp3');
      audio.play().catch(e => addLog(`Sound error: ${e.message}`));
    } catch (e) {
      addLog('Sound not available');
    }
    
    onScan(testCode);
  };

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-800">Camera View</h3>
        <div className="flex">
          <Link 
            to="/camera-test"
            className="text-blue-600 mr-3 flex items-center"
            target="_blank"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">Diagnostics</span>
          </Link>
          {onClose && (
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {errorMessage && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">
            <div className="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold">Camera Error</span>
            </div>
            <p className="ml-7">{errorMessage}</p>
            <div className="flex flex-col sm:flex-row mt-2 ml-7 space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={startCamera}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Try Again
              </button>
              <Link
                to="/camera-test"
                className="inline-block text-center bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                target="_blank"
              >
                Open Diagnostic Page
              </Link>
            </div>
          </div>
        )}
        
        <div className="w-full mb-4 bg-black rounded-lg overflow-hidden flex justify-center">
          <video
            ref={videoRef}
            className="max-w-full rounded-lg"
            autoPlay
            playsInline
            muted
            onCanPlay={() => addLog('Video can play')}
            style={{ display: 'block', maxHeight: '70vh' }}
          />
        </div>
        
        <div className="flex space-x-2 mb-4">
          <button
            onClick={startCamera}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Restart Camera
          </button>
          
          <button
            onClick={handleManualScan}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Simulate Scan (Testing)
          </button>
        </div>
        
        <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-600 max-h-32 overflow-y-auto">
          <div className="font-semibold mb-1">Debug Logs:</div>
          <pre className="whitespace-pre-wrap">
            {logs.join('\n')}
          </pre>
        </div>
        
        <div className="flex flex-col items-center mt-4">
          <p className="text-xs text-gray-500 mb-2">
            {scanAttempted 
              ? "If your camera doesn't appear, please check camera permissions in your browser settings" 
              : "Camera should initialize automatically"}
          </p>
          <Link 
            to="/camera-test" 
            className="text-blue-600 text-sm hover:underline"
            target="_blank"
          >
            Open full camera diagnostic tool
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner; 