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

interface Material {
  id?: string;
  name?: string;
  unit_of_measure?: string;
}

interface OrderItemRaw {
  id: number;
  quantity: number;
  unit_price: number;
  material_id?: string;
  materials?: Material;
}

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
  extractedInfo: Record<string, string>;
  job_number?: string;    // Add job number field
  file_path?: string;
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
  const [fileUrl, setFileUrl] = useState<string | null>(null);
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

        let formattedItems: OrderItem[] = [];
        let extractedInfo: Record<string, string> = {};

        try {
          // Fetch order items - simplified approach without relationships
          console.log('Attempting to fetch order items for order:', id);
          let orderItemsData = null;

          const { data: directItems, error: itemsError } = await supabase
            .from('order_items')
            .select('id, material_id, quantity, unit_price')
            .eq('order_id', id);

          if (itemsError) {
            console.error('Error fetching order items:', itemsError);
            // Try using the RPC function as a fallback
            console.log('Trying fallback function get_order_items...');
            const { data: functionItems, error: functionError } = await supabase
              .rpc('get_order_items', { order_id_param: id });

            if (functionError) {
              console.error('Error using get_order_items function:', functionError);
              // Don't return - try to display the order info without items
            } else if (functionItems && functionItems.length > 0) {
              console.log('Successfully fetched order items using function:', functionItems);
              // Use the function items
              orderItemsData = functionItems;
            }
          } else {
            console.log('Successfully fetched order items:', directItems);
            orderItemsData = directItems;
          }

          // If we have order items, fetch the related materials
          if (orderItemsData && orderItemsData.length > 0) {
            // Get unique material IDs - using Array.from for better compatibility
            const materialIdsSet = new Set();
            orderItemsData.forEach((item: OrderItemRaw) => {
              if (item.material_id) {
                materialIdsSet.add(item.material_id);
              }
            });
            const materialIds = Array.from(materialIdsSet);

            if (materialIds.length > 0) {
              // Fetch materials for these IDs
              console.log('Fetching materials for IDs:', materialIds);
              const { data: materials, error: materialsError } = await supabase
                .from('materials')
                .select('id, name, unit_of_measure')
                .in('id', materialIds);

              if (materialsError) {
                console.error('Error fetching materials:', materialsError);
              } else if (materials) {
                console.log('Successfully fetched materials:', materials);

                // Create a lookup map for materials
                const materialsMap = new Map();
                materials.forEach((material: any) => {
                  materialsMap.set(material.id, material);
                });

                // Now build the formatted items with material details
                orderItemsData.forEach((item: any) => {
                  const material = materialsMap.get(item.material_id);
                  formattedItems.push({
                    id: item.id,
                    material_name: material ? material.name : 'Unknown Material',
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    unit_of_measure: material ? material.unit_of_measure : 'unit',
                    total_price: item.quantity * item.unit_price
                  });
                });
              }
            }
          }
        } catch (err) {
          console.error('Exception when trying to fetch order items:', err);
          // Continue with order display without items
        }

        // Ensure order data has an extractedInfo property, even if notes are null
        if (!orderData.extractedInfo) {
          orderData.extractedInfo = {};
        }

        // Set up initial extractedInfo with what we know even if notes are null
        if (orderData.job_number) {
          extractedInfo.job_number = orderData.job_number;
        }
        if (orderData.customer_name) {
          extractedInfo.customer_name = orderData.customer_name;
        }
        if (orderData.customer_contact) {
          extractedInfo.contact_person = orderData.customer_contact;
        }
        if (orderData.customer_email) {
          extractedInfo.contact_email = orderData.customer_email;
        }

        // Try to extract information from notes (if any)
        if (orderData.notes) {
          try {
            // First, save the complete notes
            extractedInfo.original_notes = orderData.notes;

            console.log('Processing notes:', orderData.notes);

            // Log raw notes for debugging
            console.log('Raw notes:', JSON.stringify(orderData.notes));

            // Directly extract key fields using more precise regex patterns
            const fieldPatterns = [
              { pattern: /Machine:\s*([^\n]+)/i, key: 'machine' },
              { pattern: /Product:\s*([^\n]+)/i, key: 'product' },
              { pattern: /Quantity:\s*([^\n]+)/i, key: 'quantity' },
              { pattern: /Paper Size:\s*([^\n]+)/i, key: 'paper_size' },
              { pattern: /Paper Type:\s*([^\n]+)/i, key: 'paper_type' },
              { pattern: /Sides:\s*([^\n]+)/i, key: 'sides' },
              { pattern: /Color:\s*([^\n]+)/i, key: 'color_mode' },
              { pattern: /Pieces per Sheet:\s*([^\n]+)/i, key: 'pieces_per_sheet' },
              { pattern: /Post-Press:\s*([^\n]+)/i, key: 'post_press' },
              { pattern: /Size:\s*([^\n]+)/i, key: 'size' },
              { pattern: /Media:\s*([^\n]+)/i, key: 'media' },
              { pattern: /Revite:\s*([^\n]+)/i, key: 'revite' },
              { pattern: /Lopping:\s*([^\n]+)/i, key: 'lopping' },
              { pattern: /Frame:\s*([^\n]+)/i, key: 'frame' },
              { pattern: /Frame Pasting By:\s*([^\n]+)/i, key: 'frame_pasting_by' },
              { pattern: /Frame Location:\s*([^\n]+)/i, key: 'frame_location' },
              { pattern: /Binding Format:\s*([^\n]+)/i, key: 'binding_format' },
              { pattern: /Binding Type:\s*([^\n]+)/i, key: 'binding_type' },
              { pattern: /Original:\s*([^\n]+)/i, key: 'original_paper' },
              { pattern: /Duplicate:\s*([^\n]+)/i, key: 'duplicate_paper' },
              { pattern: /Triplicate:\s*([^\n]+)/i, key: 'triplicate_paper' }
            ];

            // Extract each field
            fieldPatterns.forEach(({ pattern, key }) => {
              const match = orderData.notes.match(pattern);
              if (match && match[1] && match[1].trim() !== 'N/A') {
                // Clean the value - remove any trailing text that might contain other field names
                let value = match[1].trim();

                // For extra safety, if the value contains any field name as a substring, truncate it
                fieldPatterns.forEach(pattern => {
                  const fieldNameMatch = value.match(new RegExp(pattern.key.replace(/_/g, ' '), 'i'));
                  if (fieldNameMatch && fieldNameMatch.index > 0) {
                    value = value.substring(0, fieldNameMatch.index).trim();
                  }
                });

                extractedInfo[key] = value;
                console.log(`Directly extracted ${key}: ${value}`);

                // Update customer contact and email if needed
                if (key === 'contact_person' && !orderData.customer_contact) {
                  orderData.customer_contact = value;
                } else if (key === 'contact_email' && !orderData.customer_email) {
                  orderData.customer_email = value;
                }
              }
            });

            // Look for additional notes
            const additionalNotesMatch = orderData.notes.match(/===\s*ADDITIONAL NOTES\s*===\s*\n([\s\S]*?)(\n===|$)/i);
            if (additionalNotesMatch && additionalNotesMatch[1]) {
              const additionalNotes = additionalNotesMatch[1].trim();
              if (additionalNotes && additionalNotes !== 'None') {
                // Store only the actual content, not the section header
                extractedInfo.additional_notes = additionalNotes;
                console.log(`Extracted additional notes: ${additionalNotes}`);
              }
            }

            console.log('Final extracted info:', extractedInfo);
          } catch (error) {
            console.error('Error parsing notes:', error);
          }
        }

        // Include extracted info in the order data
        orderData.extractedInfo = extractedInfo;
        console.log('Final order data with extractedInfo:', orderData);

        // Set the complete order data
        setOrder({
          ...orderData,
          items: formattedItems,
          production_jobs: [], // Currently not implemented, could be added later
          extractedInfo
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

  useEffect(() => {
    if (order?.file_path) {
      // If it's a full URL (e.g. Dropbox link), use it directly
      if (order.file_path.startsWith('http')) {
        setFileUrl(order.file_path);
      } else {
        // Otherwise generate Supabase public URL
        const { data } = supabase.storage.from('print-jobs').getPublicUrl(order.file_path);
        setFileUrl(data.publicUrl);
      }
    }
  }, [order]);

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
    if (!order || !order.production_jobs) return;

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

    // Update the order state
    setOrder({
      ...order,
      production_jobs: updatedJobs
    });

    // For a real app, this would send an API request to update the job status
    toast.success(`Job status updated to ${newStatus}`);
    setSelectedJob(null);
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
          <h1 className="text-2xl font-bold">
            Order #{order.job_number || order.id}
          </h1>
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

      <div>
        {/* Order Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-medium">{getCustomerName(order)}</p>
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
            {order.file_path && fileUrl && (
              <div>
                <p className="text-sm text-gray-500">Attachment</p>
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                  View / Download
                </a>
              </div>
            )}
          </div>

          {/* Print Specifications - extracted from notes */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Print Specifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Machine Type */}
              {order.extractedInfo?.machine && (
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                  <p className="text-sm text-blue-600 font-medium">Machine</p>
                  <p className="text-blue-900 font-medium">{order.extractedInfo.machine}</p>
                </div>
              )}

              {/* Product */}
              {order.extractedInfo?.product && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500 font-medium">Product</p>
                  <p className="text-gray-900">{order.extractedInfo.product}</p>
                </div>
              )}

              {/* Quantity */}
              {order.extractedInfo?.quantity && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-500 font-medium">Quantity</p>
                  <p className="text-gray-900">{order.extractedInfo.quantity}</p>
                </div>
              )}

              {/* Display all other extracted specifications dynamically */}
              {order.extractedInfo && Object.entries(order.extractedInfo)
                .filter(([key, value]) => {
                  // Skip primary fields already displayed above
                  const skipKeys = [
                    'machine', 'product', 'quantity',
                    'notes', 'original_notes', 'additional_notes',
                    'contact_person', 'contact_email', 'status', 'total_amount',
                    'customer_name', 'job_number'
                  ];
                  if (skipKeys.includes(key)) return false;
                  // Ensure we have a value
                  return value && value !== 'N/A' && value.trim() !== '';
                })
                .map(([key, value]) => (
                  <div key={key} className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-500 font-medium">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </p>
                    <p className="text-gray-900">{value}</p>
                  </div>
                ))}
            </div>
          </div>

          {/* Notes section - Only show if there are actual additional notes */}
          {order.extractedInfo?.additional_notes &&
            order.extractedInfo.additional_notes !== 'None' &&
            !order.extractedInfo.additional_notes.includes("=== PRINT SPECIFICATIONS ===") && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4">Additional Notes</h3>
                <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                  {order.extractedInfo.additional_notes}
                </div>
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
      </div>
    </div>
  );
};

export default OrderDetail; 