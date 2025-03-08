import React, { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader, Result, Exception } from '@zxing/library';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scanAttempts, setScanAttempts] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const [videoStarted, setVideoStarted] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [`${timestamp}: ${message}`, ...prevLogs.slice(0, 9)]);
  };

  useEffect(() => {
    // Initialize the code reader
    const codeReader = new BrowserMultiFormatReader();
    codeReaderRef.current = codeReader;
    
    // Get list of video devices
    codeReader.listVideoInputDevices()
      .then(videoInputDevices => {
        if (videoInputDevices.length === 0) {
          addLog('No camera devices found');
          setErrorMessage('No camera devices found on this device');
          return;
        }

        // Log available devices
        addLog(`Found ${videoInputDevices.length} camera devices`);
        setAvailableCameras(videoInputDevices);
        
        // Try to select back camera first (environment facing)
        const backCamera = videoInputDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear'));
          
        // If back camera is found, use it, otherwise use the first camera
        const deviceId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        setSelectedDeviceId(deviceId);
        
        // Start scanning with selected camera
        startScanner(deviceId);
      })
      .catch(err => {
        addLog(`Error listing cameras: ${err.message || err}`);
        setErrorMessage('Could not access camera list. Please check permissions.');
        if (onError) onError(`Camera list error: ${err.message || err}`);
      });

    // Cleanup on unmount
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
        addLog('Scanner reset');
      }
    };
  }, []);

  const startScanner = (deviceId?: string) => {
    if (!codeReaderRef.current) {
      addLog('Scanner not initialized');
      return;
    }
    
    setVideoStarted(false);
    setErrorMessage('');
    addLog('Starting camera...');
    
    // Reset previous scanner if running
    codeReaderRef.current.reset();
    
    // Start scanning from video device - only uses 3 parameters
    codeReaderRef.current.decodeFromVideoDevice(
      deviceId || null,
      'video-element',
      (result) => {
        if (result) {
          const text = result.getText();
          addLog(`Successfully scanned: ${text}`);
          onScan(text);
        }
      }
    )
    .then(() => {
      setVideoStarted(true);
      addLog('Camera started successfully');
    })
    .catch(err => {
      const errorMsg = err.message || String(err);
      addLog(`Camera error: ${errorMsg}`);
      setErrorMessage(`Failed to start camera: ${errorMsg}`);
      
      if (errorMsg.includes('Permission') || errorMsg.includes('permission')) {
        setErrorMessage('Camera permission denied. Please allow camera access and try again.');
      }
      
      if (onError) onError(errorMsg);
    });
  };

  const handleSwitchCamera = () => {
    if (availableCameras.length <= 1) {
      addLog('No additional cameras to switch to');
      return;
    }
    
    // Find the index of current camera
    const currentIndex = availableCameras.findIndex(cam => cam.deviceId === selectedDeviceId);
    // Get the next camera (or go back to first)
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextDeviceId = availableCameras[nextIndex].deviceId;
    
    addLog(`Switching to camera: ${availableCameras[nextIndex].label}`);
    setSelectedDeviceId(nextDeviceId);
    startScanner(nextDeviceId);
  };

  const handleRestartCamera = () => {
    addLog('Restarting camera');
    startScanner(selectedDeviceId);
  };

  const handleManualScan = () => {
    const testCode = "TEST-123456";
    addLog(`Simulating scan with code: ${testCode}`);
    onScan(testCode);
    setScanAttempts(prev => prev + 1);
  };

  const handleTakePicture = () => {
    addLog('Opening device camera');
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera when possible
    
    input.onchange = async (e: Event) => {
      const element = e.target as HTMLInputElement;
      if (element.files && element.files.length > 0) {
        const file = element.files[0];
        addLog(`Processing image: ${file.name}`);
        
        try {
          // Create an image from the file
          const img = document.createElement('img');
          img.src = URL.createObjectURL(file);
          
          img.onload = async () => {
            try {
              if (!codeReaderRef.current) {
                throw new Error('Scanner not initialized');
              }
              
              // Decode the image
              const result = await codeReaderRef.current.decodeFromImage(img);
              const text = result.getText();
              addLog(`Successfully scanned from image: ${text}`);
              onScan(text);
            } catch (err) {
              addLog(`Error decoding image: ${err instanceof Error ? err.message : String(err)}`);
              setErrorMessage('No barcode found in image. Please try again.');
              if (onError) onError('No barcode found in image');
            } finally {
              URL.revokeObjectURL(img.src); // Clean up the object URL
            }
          };
          
          img.onerror = () => {
            addLog('Error loading image');
            setErrorMessage('Error loading image. Please try a different one.');
            URL.revokeObjectURL(img.src);
          };
        } catch (err) {
          addLog(`Error processing image: ${err instanceof Error ? err.message : String(err)}`);
          setErrorMessage('Error processing image');
          if (onError) onError('Image processing error');
        }
      }
    };
    
    // Trigger file input click
    input.click();
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
            <video 
              id="video-element" 
              className="w-full h-full object-cover"
              ref={videoRef}
            />
            
            {!videoStarted && !errorMessage && (
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
              onClick={handleRestartCamera}
              className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restart Camera
              </div>
            </button>
            
            {availableCameras.length > 1 && (
              <button 
                onClick={handleSwitchCamera}
                className="bg-purple-500 text-white py-2 px-4 rounded-md hover:bg-purple-600"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Switch Camera
                </div>
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button 
              onClick={handleTakePicture}
              className="bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600"
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
              onClick={handleManualScan}
              className="bg-yellow-500 text-white py-2 px-4 rounded-md hover:bg-yellow-600"
            >
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Simulate Scan
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