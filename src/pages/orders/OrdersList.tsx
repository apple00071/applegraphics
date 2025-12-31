import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatINR, formatDateToIST } from '../../utils/formatters';
import { Order } from '../../contexts/SocketContext';
import supabase from '../../supabaseClient';
import SubmitPrintJobModal from '../../components/printing/SubmitPrintJobModal';


// Safe formatters to handle nulls
const safeFormatDate = (date: string | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    return formatDateToIST(date);
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return 'Invalid Date';
  }
};

const safeFormatINR = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N/A';
  try {
    return formatINR(amount);
  } catch (error) {
    console.error('Error formatting amount:', amount, error);
    return '₹0.00';
  }
};

// Custom icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const PrinterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.89l-2.1 2.1m0 0l-2.1-2.1m2.1 2.1V9.75M19.125 12.99V9.75m0 0l2.1 2.1m-2.1-2.1l-2.1 2.1m-6.09-8.1h.01m4.347 1.134l-3-3a.45.45 0 00-.636 0l-3 3a.45.45 0 00.636.636l1.782-1.782V15a.45.45 0 10.9 0V4.038l1.782 1.782a.45.45 0 10.636-.636zM3.6 20.25a1.8 1.8 0 001.8 1.8h13.2a1.8 1.8 0 001.8-1.8V15a1.8 1.8 0 00-1.8-1.8H5.4A1.8 1.8 0 003.6 15v5.25z" />
  </svg>
);

const OrdersList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<{ id: string, name: string } | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setIsLoading(true);
        console.log('📊 Fetching orders from Supabase...');

        // Fetch orders directly from Supabase
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('order_date', { ascending: false });

        if (error) throw error;

        console.log(`✅ Fetched ${data?.length || 0} orders from Supabase`);
        setOrders(data || []);
      } catch (error) {
        console.error('❌ Error fetching orders:', error);
        toast.error('Failed to load orders');

        // No fallback demo data, just show empty state
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        console.log(`🗑️ Deleting order with ID: ${id}`);

        // Delete from Supabase
        const { error } = await supabase
          .from('orders')
          .delete()
          .eq('id', id);

        if (error) throw error;

        // Update the UI
        setOrders(orders.filter(order => order.id !== id));
        toast.success('Order deleted successfully');
      } catch (error) {
        console.error('❌ Error deleting order:', error);
        toast.error('Failed to delete order');
      }
    }
  };

  const handleOpenPrintModal = (order: Order) => {
    setSelectedOrderForPrint({
      id: order.id,
      name: `Job #${order.job_number || order.id} - ${order.customer_name}`
    });
    setIsPrintModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    const customerName = order.customer_name || order.name || '';

    const matchesSearch =
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.includes(searchTerm);

    if (currentFilter === 'all') return matchesSearch;
    if (currentFilter === 'pending') return matchesSearch && order.status === 'pending';
    if (currentFilter === 'in-progress') return matchesSearch && order.status === 'in-progress';
    if (currentFilter === 'completed') return matchesSearch && order.status === 'completed';
    if (currentFilter === 'cancelled') return matchesSearch && order.status === 'cancelled';

    return matchesSearch;
  });

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
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link
          to="/orders/add"
          className="mt-3 sm:mt-0 flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon />
          <span className="ml-2">New Order</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          {/* Search input */}
          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Search orders..."
              className="pl-10 pr-4 py-2 border rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('all')}
            >
              All
            </button>
            <button
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'pending' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('pending')}
            >
              Pending
            </button>
            <button
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'in-progress' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('in-progress')}
            >
              In Progress
            </button>
            <button
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'completed' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('completed')}
            >
              Completed
            </button>
            <button
              className={`px-3 py-1.5 rounded-md ${currentFilter === 'cancelled' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
              onClick={() => setCurrentFilter('cancelled')}
            >
              Cancelled
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
          </div>
        ) : (
          <>
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No orders found matching your search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Required Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link to={`/orders/${order.id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                            {order.job_number ? `#${order.job_number}` : `#${order.id}`}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {order.customer_name || order.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {safeFormatDate(order.order_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {safeFormatDate(order.required_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeColor(order.status || 'pending')}`}>
                            {order.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                          {safeFormatINR(order.total_amount || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex justify-center space-x-3">
                            <Link to={`/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900">
                              <EyeIcon />
                            </Link>
                            <button
                              onClick={() => handleOpenPrintModal(order)}
                              className="text-gray-600 hover:text-gray-900"
                              title="Print Job"
                            >
                              <PrinterIcon />
                            </button>
                            <button
                              onClick={() => handleDelete(order.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <SubmitPrintJobModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        prefillOrderId={selectedOrderForPrint?.id}
        prefillJobName={selectedOrderForPrint?.name}
      />
    </div>
  );
};

export default OrdersList; 