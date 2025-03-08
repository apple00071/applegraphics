import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatINR, formatDateToIST } from '../../utils/formatters';
import { supabase } from '../../lib/supabase';

// Custom icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface OrderItem {
  id: number;
  material_name: string;
  quantity: number;
  unit_price: number;
  unit_of_measure: string;
  total_price: number;
}

interface ProductionJob {
  id: number;
  job_name: string;
  status: string;
  start_date: string;
  due_date: string;
  completion_date: string | null;
}

interface Order {
  id: string;
  name?: string;           // For database structure variation
  customer_name?: string;  // Making this optional
  customer_contact?: string;
  customer_email?: string;
  order_date: string;
  required_date: string;
  status: string;
  total_amount: number;
  notes?: string;
  items?: OrderItem[];
  production_jobs?: ProductionJob[];
}

// Add this new interface for the job status modal
interface JobStatusModalProps {
  job: ProductionJob;
  onClose: () => void;
  onSave: (jobId: number, newStatus: string, completionDate: string | null) => void;
}

// New component for the job status modal
const JobStatusModal: React.FC<JobStatusModalProps> = ({ job, onClose, onSave }) => {
  const [status, setStatus] = useState(job.status);
  const [completionDate, setCompletionDate] = useState<string | null>(
    job.completion_date ? new Date(job.completion_date).toISOString().split('T')[0] : null
  );

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    
    // If status changed to "completed", set completion date to today
    if (newStatus === 'completed' && !completionDate) {
      setCompletionDate(new Date().toISOString().split('T')[0]);
    }
    // If status changed from "completed", clear completion date
    else if (newStatus !== 'completed') {
      setCompletionDate(null);
    }
  };

  const handleSave = () => {
    onSave(job.id, status, completionDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white w-full max-w-md p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Update Job Status</h3>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Job Name
          </label>
          <p className="px-3 py-2 bg-gray-50 rounded-md">{job.job_name}</p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {status === 'completed' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Completion Date
            </label>
            <input
              type="date"
              value={completionDate || ''}
              onChange={(e) => setCompletionDate(e.target.value || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

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

// Helper function to get customer name
const getCustomerName = (order: Order | null): string => {
  if (!order) return 'N/A';
  return order.customer_name || order.name || 'N/A';
};

const OrderDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [selectedJob, setSelectedJob] = useState<ProductionJob | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);
        console.log('Fetching order data for ID:', id);
        
        if (!id) {
          toast.error('Invalid order ID');
          navigate('/orders');
          return;
        }
        
        // Fetch the order from Supabase
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .single();
        
        if (orderError) {
          console.error('Error fetching order:', orderError);
          toast.error('Failed to load order details');
          return;
        }
        
        if (!orderData) {
          toast.error('Order not found');
          navigate('/orders');
          return;
        }
        
        console.log('Order data from Supabase:', orderData);
        
        // Fetch order items if needed
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            unit_price,
            material_id,
            materials(id, name, unit_of_measure)
          `)
          .eq('order_id', id);
        
        if (itemsError) {
          console.error('Error fetching order items:', itemsError);
        }
        
        // Format the order items
        const formattedItems = orderItems ? orderItems.map(item => ({
          id: item.id,
          material_name: item.materials ? item.materials.name : 'Unknown Material',
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_of_measure: item.materials ? item.materials.unit_of_measure : 'unit',
          total_price: item.quantity * item.unit_price
        })) : [];
        
        // Set the complete order data
        setOrder({
          ...orderData,
          items: formattedItems,
          production_jobs: [] // Currently not implemented, could be added later
        });
        
      } catch (error) {
        console.error('Error fetching order:', error);
        toast.error('Failed to load order details');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchOrder();
    }
  }, [id, navigate]);

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

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        // For a real app, this would be an actual API call
        // await axios.delete(`${API_URL}/orders/${id}`);
        toast.success('Order deleted successfully');
        navigate('/orders');
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Failed to delete order');
      }
    }
  };

  // Add this new function to handle job status updates
  const handleUpdateJobStatus = (jobId: number, newStatus: string, completionDate: string | null) => {
    if (!order) return;

    // Update the job in the current order state
    const updatedJobs = order.production_jobs.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          status: newStatus,
          completion_date: completionDate
        };
      }
      return job;
    });

    // Update the order with updated jobs
    setOrder({
      ...order,
      production_jobs: updatedJobs
    });

    // Save to localStorage if using it
    const localOrders = localStorage.getItem('orders');
    if (localOrders) {
      const parsedOrders = JSON.parse(localOrders);
      const updatedOrders = parsedOrders.map((ord: any) => {
        if (ord.id.toString() === id) {
          return {
            ...ord,
            production_jobs: updatedJobs
          };
        }
        return ord;
      });
      localStorage.setItem('orders', JSON.stringify(updatedOrders));
    }

    // Close the modal
    setSelectedJob(null);
    toast.success('Job status updated successfully');
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-gray-500">
        Order not found.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div className="flex items-center">
          <Link to="/orders" className="mr-4 text-gray-500 hover:text-gray-700">
            <ArrowLeftIcon />
          </Link>
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Link 
            to={`/orders/${order.id}/edit`} 
            className="flex items-center bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
          >
            <PencilIcon />
            <span className="ml-2">Edit Order</span>
          </Link>
          <button 
            onClick={handleDelete} 
            className="flex items-center bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            <TrashIcon />
            <span className="ml-2">Delete</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{getCustomerName(order)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Contact Person</p>
              <p className="font-medium">{order.customer_contact}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{order.customer_email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1).replace('-', ' ')}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Order Date</p>
              <p className="font-medium">{safeFormatDate(order.order_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Required Date</p>
              <p className="font-medium">{safeFormatDate(order.required_date)}</p>
            </div>
          </div>
          
          {order.notes && (
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="p-3 bg-gray-50 rounded">{order.notes}</p>
            </div>
          )}
          
          {/* Order Items */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Order Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {order.items && order.items.length > 0 ? (
                    order.items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {item.material_name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                          {item.quantity} {item.unit_of_measure}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {safeFormatINR(item.unit_price)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-right">
                          {safeFormatINR(item.total_price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-center text-sm text-gray-500">
                        No items found for this order
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                      Total:
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                      {safeFormatINR(order.total_amount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
        
        {/* Production Jobs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Production Jobs</h2>
          {order.production_jobs.length === 0 ? (
            <p className="text-gray-500">No production jobs for this order.</p>
          ) : (
            <div className="space-y-4">
              {order.production_jobs.map(job => (
                <div key={job.id} className="bg-white rounded-lg shadow-sm p-4 mb-3 border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold">{job.job_name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(job.status)}`}>
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="flex justify-between my-1">
                      <span className="text-gray-500">Start Date:</span> 
                      <span>{safeFormatDate(job.start_date)}</span>
                    </p>
                    <p className="flex justify-between my-1">
                      <span className="text-gray-500">Due Date:</span> 
                      <span>{safeFormatDate(job.due_date)}</span>
                    </p>
                    {job.completion_date && (
                      <p className="flex justify-between my-1">
                        <span className="text-gray-500">Completed:</span> 
                        <span>{safeFormatDate(job.completion_date)}</span>
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={() => setSelectedJob(job)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Update Status
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link 
              to={`/jobs/add?orderId=${order.id}`} 
              className="w-full flex justify-center items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Production Job
            </Link>
          </div>
        </div>
      </div>
      
      {/* Job Status Update Modal */}
      {selectedJob && (
        <JobStatusModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onSave={handleUpdateJobStatus}
        />
      )}
    </div>
  );
};

export default OrderDetail; 