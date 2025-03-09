import React from 'react';
import { Link } from 'react-router-dom';
import { formatINR, formatDateToIST } from '../utils/formatters';
import { Order } from '../contexts/SocketContext';

interface RecentOrdersProps {
  orders: Order[];
}

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
  if (orders.length === 0) {
    return <p className="text-gray-500">No recent orders to display.</p>;
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="overflow-hidden">
      <ul className="divide-y divide-gray-200">
        {orders.map((order) => (
          <li key={order.id} className="py-3">
            <Link to={`/orders/${order.id}`} className="block hover:bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    {order.job_number ? `Job #${order.job_number}` : `Order #${order.id}`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{order.customer_name}</p>
                  <p className="text-xs text-gray-400">{formatDateToIST(order.order_date)}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{formatINR(order.total_amount)}</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RecentOrders; 