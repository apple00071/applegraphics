import React from 'react';
import { Link } from 'react-router-dom';

interface Material {
  id: number;
  name: string;
  current_stock: number;
  reorder_level: number;
  unit_of_measure?: string;
}

interface LowStockAlertProps {
  materials: Material[];
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ materials }) => {
  if (materials.length === 0) {
    return <p className="text-gray-500">No low stock items to display.</p>;
  }

  return (
    <div className="overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {materials.map((material) => (
          <li key={material.id} className="py-3">
            <Link to={`/materials/${material.id}`} className="block hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-600">{material.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Stock Level: {material.current_stock} {material.unit_of_measure || ''}
                  </p>
                </div>
                <div>
                  <span 
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      material.current_stock === 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {material.current_stock === 0 
                      ? 'Out of Stock' 
                      : `Low Stock (${Math.round((material.current_stock / material.reorder_level) * 100)}%)`}
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LowStockAlert; 