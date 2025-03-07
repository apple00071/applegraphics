import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

// This component is a dedicated camera test page for mobile debugging
const CameraTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>(['Camera test initializing...']);
  const [cameraInfo, setCameraInfo] = useState<string[]>([]);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<string>('not requested');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `${timestamp}: ${message}`]);
    console.log(`${timestamp}: ${message}`); // Also log to console if it's available
  };
  
  const addError = (message: string) => {
    setErrorMessages(prev => [...prev, message]);
    addLog(`ERROR: ${message}`);
  };
  
  useEffect(() => {
    // Check if MediaDevices API is available
    if (!navigator.mediaDevices) {
      addError('MediaDevices API not available in this browser');
      setHasCamera(false);
      return;
    }
    
    checkCameraAvailability();
    
    // Clean up on unmount
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
          track.stop();
          addLog('Camera tracks stopped on cleanup');
        });
      }
    };
  }, []);
  
  // Check if cameras are available
  const checkCameraAvailability = async () => {
    try {
      addLog('Checking for available cameras...');
      
      // Check if enumerateDevices is supported
      if (!navigator.mediaDevices.enumerateDevices) {
        addError('enumerateDevices() not supported in this browser');
        setHasCamera(false);
        return;
      }
      
      // Get all media devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      addLog(`Found ${videoDevices.length} video devices`);
      
      // Store camera info
      const cameraDetails = videoDevices.map((device, index) => 
        `Camera ${index + 1}: ${device.label || 'Label not available (no permission)'} (${device.deviceId.substring(0, 8)}...)`
      );
      setCameraInfo(cameraDetails);
      
      if (videoDevices.length > 0) {
        setHasCamera(true);
        addLog('Camera hardware detected');
      } else {
        setHasCamera(false);
        addError('No camera found on this device');
      }
    } catch (error) {
      addError(`Error checking cameras: ${error instanceof Error ? error.message : String(error)}`);
      setHasCamera(false);
    }
  };
  
  // Request camera permission
  const requestPermission = async () => {
    try {
      addLog('Requesting camera permission...');
      setPermission('requesting');
      
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      addLog('Camera permission granted');
      setPermission('granted');
      setCameraStream(stream);
      
      // Get detailed camera info again (now with permissions)
      checkCameraAvailability();
      
      // Connect the stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.style.display = 'block';
        addLog('Stream connected to video element');
      } else {
        addError('Video element not available');
      }
      
      // Log track information
      stream.getVideoTracks().forEach((track, index) => {
        addLog(`Video track ${index + 1}: ${track.label}`);
        
        // Log track constraints and settings
        try {
          const settings = track.getSettings();
          const settingsStr = JSON.stringify(settings, null, 2);
          addLog(`Track settings: ${settingsStr}`);
        } catch (e) {
          addLog(`Couldn't get track settings: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    } catch (error) {
      addError(`Permission error: ${error instanceof Error ? error.message : String(error)}`);
      setPermission('denied');
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        track.stop();
      });
      setCameraStream(null);
      setPermission('stopped');
      addLog('Camera stopped');
      
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };
  
  // Switch camera (if multiple cameras are available)
  const switchCamera = async () => {
    // First stop the current camera
    stopCamera();
    
    try {
      addLog('Attempting to switch camera...');
      
      // Try to use the front camera if we were using the back camera, or vice versa
      const newFacingMode = cameraStream && 
        cameraStream.getVideoTracks()[0]?.getSettings().facingMode === 'environment' 
        ? 'user' : 'environment';
      
      addLog(`Trying to use ${newFacingMode} camera`);
      
      const constraints = {
        video: { 
          facingMode: newFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      addLog(`Switched to ${newFacingMode} camera`);
      setCameraStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      addError(`Failed to switch camera: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 bg-blue-50 border-b flex justify-between items-center">
          <h1 className="text-lg font-bold text-blue-800">📷 Camera Diagnostics</h1>
          <Link to="/" className="text-blue-600 text-sm hover:underline">
            Back to Dashboard
          </Link>
        </div>
        
        <div className="p-4">
          {/* Camera Status */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
            <h2 className="text-md font-semibold mb-2">Camera Hardware Status</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Camera Detected:</div>
              <div>
                {hasCamera === null && <span className="text-gray-500">Checking...</span>}
                {hasCamera === true && <span className="text-green-600">✅ Available</span>}
                {hasCamera === false && <span className="text-red-600">❌ Not Available</span>}
              </div>
              
              <div className="font-medium">Permission Status:</div>
              <div>
                {permission === 'not requested' && <span className="text-gray-500">Not Requested</span>}
                {permission === 'requesting' && <span className="text-yellow-500">Requesting...</span>}
                {permission === 'granted' && <span className="text-green-600">✅ Granted</span>}
                {permission === 'denied' && <span className="text-red-600">❌ Denied</span>}
                {permission === 'stopped' && <span className="text-blue-600">Stopped</span>}
              </div>
              
              <div className="font-medium">Browser:</div>
              <div>{navigator.userAgent}</div>
            </div>
          </div>
          
          {/* Camera List */}
          {cameraInfo.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border">
              <h2 className="text-md font-semibold mb-2">Available Cameras</h2>
              <ul className="list-disc pl-5 text-sm">
                {cameraInfo.map((info, index) => (
                  <li key={index} className="mb-1">{info}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Error Messages */}
          {errorMessages.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h2 className="text-md font-semibold mb-2 text-red-700">Errors</h2>
              <ul className="list-disc pl-5 text-sm text-red-600">
                {errorMessages.map((error, index) => (
                  <li key={index} className="mb-1">{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Camera Actions */}
          <div className="mb-4 flex space-x-2">
            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Request Camera Access
              </button>
            )}
            
            {permission === 'granted' && (
              <>
                <button
                  onClick={switchCamera}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  Switch Camera
                </button>
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                >
                  Stop Camera
                </button>
              </>
            )}
          </div>
          
          {/* Camera View */}
          <div className="mb-4 bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              className="w-full"
              style={{ display: 'none', maxHeight: '50vh', objectFit: 'cover' }}
              autoPlay
              playsInline
              muted
            />
          </div>
          
          {/* Debug Logs */}
          <div className="mt-4">
            <h2 className="text-md font-semibold mb-2">Debug Logs</h2>
            <div className="bg-gray-100 p-2 rounded text-xs text-gray-700 h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap">
                {logs.join('\n')}
              </pre>
            </div>
          </div>
          
          {/* Help Section */}
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h2 className="text-md font-semibold mb-2">Troubleshooting Tips</h2>
            <ul className="list-disc pl-5 text-sm">
              <li className="mb-1">Make sure you're using HTTPS (camera access is often blocked on HTTP)</li>
              <li className="mb-1">Check your browser settings to ensure camera permissions are enabled</li>
              <li className="mb-1">Try a different browser (Chrome or Safari typically work best)</li>
              <li className="mb-1">Make sure no other apps are currently using your camera</li>
              <li className="mb-1">Restart your device if the camera doesn't respond</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraTest; 