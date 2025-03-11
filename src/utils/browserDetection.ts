/**
 * Browser detection utility for handling different browser capabilities and polyfills
 */

// Browser type detection
export const isSafari = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('safari') && !userAgent.includes('chrome');
};

export const isChrome = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('chrome');
};

export const isFirefox = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('firefox');
};

export const isIOS = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
};

export const isAndroid = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('android');
};

// Feature detection
export const hasMediaDevices = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

export const hasWebcam = async (): Promise<boolean> => {
  if (!hasMediaDevices()) return false;
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error checking for webcam:', error);
    return false;
  }
};

export const hasBackCamera = async (): Promise<boolean> => {
  if (!hasMediaDevices()) return false;
  
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // If we have more than one camera, assume at least one is back-facing
    // This is not 100% accurate but a reasonable guess
    if (videoDevices.length > 1) return true;
    
    // On mobile, even a single camera is likely to be back-facing
    if (videoDevices.length === 1 && (isAndroid() || isIOS())) return true;
    
    return false;
  } catch (error) {
    console.error('Error checking for back camera:', error);
    return false;
  }
};

export const hasIndexedDB = (): boolean => {
  return !!window.indexedDB;
};

export const hasServiceWorker = (): boolean => {
  return 'serviceWorker' in navigator;
};

// Browser capability report
export const getBrowserCapabilities = async (): Promise<Record<string, boolean>> => {
  const hasCamera = await hasWebcam();
  const hasBack = hasCamera ? await hasBackCamera() : false;
  
  return {
    safari: isSafari(),
    chrome: isChrome(),
    firefox: isFirefox(),
    ios: isIOS(),
    android: isAndroid(),
    mediaDevices: hasMediaDevices(),
    camera: hasCamera,
    backCamera: hasBack,
    indexedDB: hasIndexedDB(),
    serviceWorker: hasServiceWorker(),
  };
};

// Apply polyfills as needed
export const applyPolyfills = (): void => {
  // Add any necessary polyfills here
  
  // Example: Object.fromEntries polyfill for older browsers
  if (!Object.fromEntries) {
    Object.fromEntries = function(entries: any) {
      if (!entries || !entries[Symbol.iterator]) {
        throw new Error('Object.fromEntries requires an iterable object');
      }
      const obj: Record<string, any> = {};
      for (const [key, value] of entries) {
        obj[key] = value;
      }
      return obj;
    };
  }
}; 