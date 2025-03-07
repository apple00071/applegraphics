import React, { useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeGeneratorProps {
  value?: string;
  materialName?: string;
  onClose?: () => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ value, materialName, onClose }) => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const qrCodeRef = useRef<HTMLDivElement>(null);
  
  // Use value prop if provided, otherwise use the URL parameter
  const qrValue = value || code || '';
  
  const handlePrint = () => {
    const printContent = document.getElementById('qr-code-to-print');
    const windowUrl = 'about:blank';
    const uniqueName = `qrcode_${new Date().getTime()}`;
    
    const printWindow = window.open(windowUrl, uniqueName);
    
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print QR Code</title>');
      printWindow.document.write('<style>');
      printWindow.document.write(`
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; text-align: center; }
        .container { display: inline-block; padding: 15px; border: 1px solid #ccc; border-radius: 5px; }
        .qr-wrapper { display: flex; flex-direction: column; align-items: center; }
        .qr-code { margin-bottom: 10px; }
        .material-info { margin-top: 15px; font-size: 14px; }
        .sku { font-weight: bold; font-size: 16px; margin-top: 5px; }
      `);
      printWindow.document.write('</style></head><body>');
      
      if (printContent) {
        printWindow.document.write('<div class="container">');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</div>');
      }
      
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      
      // Give the browser a moment to process the document before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  const handleBack = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto my-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">QR Code Generator</h3>
        <button 
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div id="qr-code-to-print" ref={qrCodeRef} className="flex flex-col items-center">
        <div className="qr-wrapper">
          <div className="qr-code p-4 bg-white rounded-lg">
            <QRCodeSVG 
              value={qrValue} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          <div className="material-info mt-3 text-center">
            {materialName && <div className="font-medium">{materialName}</div>}
            <div className="sku mt-1">{qrValue}</div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex flex-col space-y-3">
        <button
          onClick={handlePrint}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print QR Code
        </button>
        
        <Link
          to="/"
          className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default QRCodeGenerator; 