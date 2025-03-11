import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  isIOS, 
  isAndroid, 
  isSafari, 
  isChrome, 
  isFirefox,
  hasMediaDevices 
} from '../utils/browserDetection';

// This component is a dedicated camera test page for mobile debugging
const CameraTest: React.FC = () => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Collect device info on load
  useEffect(() => {
    const info = {
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      isIOS: isIOS(),
      isAndroid: isAndroid(),
      isSafari: isSafari(),
      isChrome: isChrome(),
      isFirefox: isFirefox(),
      hasMediaDevices: hasMediaDevices(),
      time: new Date().toISOString()
    };
    
    setDeviceInfo(info);
    console.log('Device Info:', info);
    
    // List camera devices if available
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          setCameraDevices(videoDevices);
          console.log('Available cameras:', videoDevices);
          
          if (videoDevices.length > 0) {
            setSelectedCamera(videoDevices[0].deviceId);
          }
        })
        .catch(error => {
          console.error('Error listing devices:', error);
          setCameraError('Failed to list camera devices: ' + error.message);
        });
    }
  }, []);
  
  const startCamera = async () => {
    setCameraError(null);
    
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported in this browser');
      }
      
      const constraints: MediaStreamConstraints = {
        video: selectedCamera 
          ? { deviceId: { exact: selectedCamera } }
          : { facingMode: 'environment' }
      };
      
      console.log('Using constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      setCameraError('Camera access error: ' + error.message);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };
  
  const handleCameraChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCamera(e.target.value);
    
    if (cameraActive) {
      stopCamera();
      // Give a small delay before restarting with new camera
      setTimeout(() => {
        startCamera();
      }, 300);
    }
  };
  
  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '100%', 
      overflowX: 'hidden'
    }}>
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
        <Link 
          to="/"
          style={{ 
            textDecoration: 'none',
            marginRight: '10px'
          }}
        >
          <span style={{ 
            display: 'inline-block',
            padding: '5px 10px',
            backgroundColor: '#4f46e5',
            color: 'white',
            borderRadius: '5px'
          }}>
            &larr; Back
          </span>
        </Link>
        <h1 style={{ fontSize: '24px', margin: 0 }}>
          Camera Diagnostic Test
        </h1>
      </div>
      
      <div style={{ 
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#f1f1f1',
        borderRadius: '5px'
      }}>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Device Information</h2>
        <pre style={{ 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-all',
          fontSize: '12px'
        }}>
          {JSON.stringify(deviceInfo, null, 2)}
        </pre>
      </div>
      
      {cameraDevices.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Select Camera:
          </label>
          <select 
            value={selectedCamera}
            onChange={handleCameraChange}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: '1px solid #ccc'
            }}
          >
            {cameraDevices.map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
      
      <div style={{ 
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px'
      }}>
        {!cameraActive ? (
          <button
            onClick={startCamera}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            style={{ 
              padding: '10px 20px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Stop Camera
          </button>
        )}
      </div>
      
      {cameraError && (
        <div style={{ 
          padding: '10px',
          marginBottom: '20px',
          backgroundColor: '#fee2e2',
          borderRadius: '5px',
          color: '#b91c1c'
        }}>
          <strong>Error:</strong> {cameraError}
        </div>
      )}
      
      <div style={{
        backgroundColor: '#f1f1f1',
        padding: '10px',
        borderRadius: '5px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '300px'
      }}>
        <video 
          ref={videoRef} 
          style={{ 
            maxWidth: '100%',
            maxHeight: '300px',
            display: cameraActive ? 'block' : 'none'
          }}
          autoPlay 
          playsInline
        />
        
        {!cameraActive && !cameraError && (
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280'
          }}>
            Camera preview will appear here
          </div>
        )}
      </div>
      
      <div style={{ 
        padding: '10px',
        backgroundColor: '#ffedd5',
        borderRadius: '5px',
        fontSize: '14px'
      }}>
        <p><strong>Tips:</strong></p>
        <ul style={{ paddingLeft: '20px', marginTop: '10px' }}>
          <li>On iOS, camera access requires HTTPS</li>
          <li>Some browsers may require camera permission in settings</li>
          <li>If no camera is detected, try a different browser</li>
          <li>For best results, use Chrome on Android or Safari on iOS</li>
        </ul>
      </div>
    </div>
  );
};

export default CameraTest; 