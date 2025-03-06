import React, { useRef } from 'react';
import Barcode from 'react-barcode';

interface BarcodeGeneratorProps {
  value: string;
  materialName?: string;
  onClose?: () => void;
}

const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({ value, materialName, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print barcodes');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Barcode</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .barcode-container {
              text-align: center;
              margin: 0 auto;
              padding: 10px;
              border: 1px solid #ccc;
              max-width: 300px;
            }
            .material-name {
              margin-top: 10px;
              font-weight: bold;
            }
            .barcode-value {
              margin-top: 5px;
              font-size: 12px;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${printContent.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Generated Barcode</h3>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      <div ref={printRef} className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-md">
        <Barcode value={value} />
        {materialName && <div className="mt-2 font-semibold">{materialName}</div>}
        <div className="mt-1 text-sm text-gray-500">{value}</div>
      </div>
      
      <div className="mt-4 flex justify-center">
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Print Barcode
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-4 text-center">
        You can print this barcode and attach it to the physical item
      </p>
    </div>
  );
};

export default BarcodeGenerator; 