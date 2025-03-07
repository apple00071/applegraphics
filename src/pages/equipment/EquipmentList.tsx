import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_KEY || ''
);

// Custom icons
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
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

interface Equipment {
  id: number;
  name: string;
  model: string;
  serial_number: string;
  status: string;
  last_maintenance_date: string;
  next_maintenance_date?: string;
}

const EquipmentList: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);

  useEffect(() => {
    fetchEquipmentFromSupabase();

    // Set up real-time subscription
    const equipmentSubscription = supabase
      .channel('equipment-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'equipment' 
      }, (payload) => {
        console.log('📊 Equipment changed:', payload.eventType, payload);
        fetchEquipmentFromSupabase();
      })
      .subscribe();
      
    setRealtimeEnabled(true);
    
    // Cleanup subscription
    return () => {
      supabase.removeChannel(equipmentSubscription);
    };
  }, []);

  const fetchEquipmentFromSupabase = async () => {
    try {
      setIsLoading(true);
      console.log('📊 Fetching equipment from Supabase...');
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      console.log(`✅ Fetched ${data?.length || 0} equipment items from Supabase`);
      
      if (data && data.length > 0) {
        setEquipment(data);
      } else {
        console.warn('No equipment found in database');
        // Use fallback demo data
        setEquipment([
          {
            id: 1,
            name: 'Offset Printer',
            model: 'HP-5000',
            serial_number: 'SN12345',
            status: 'operational',
            last_maintenance_date: '2023-02-15',
            next_maintenance_date: '2023-05-15'
          },
          {
            id: 2,
            name: 'Paper Cutter',
            model: 'Cut-Master 3000',
            serial_number: 'CM3000-789',
            status: 'maintenance',
            last_maintenance_date: '2023-03-01',
            next_maintenance_date: '2023-06-01'
          },
          {
            id: 3,
            name: 'Binding Machine',
            model: 'BindPro 2000',
            serial_number: 'BP2K-456',
            status: 'operational',
            last_maintenance_date: '2023-01-10',
            next_maintenance_date: '2023-04-10'
          }
        ]);
      }
    } catch (error) {
      console.error('❌ Error fetching equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this equipment?')) {
      try {
        console.log(`🗑️ Deleting equipment with ID: ${id}`);
        
        // Delete from Supabase
        const { error } = await supabase
          .from('equipment')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        toast.success('Equipment deleted successfully');
        
        // The UI will be updated automatically by the subscription
      } catch (error) {
        console.error('❌ Error deleting equipment:', error);
        toast.error('Failed to delete equipment');
      }
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (currentFilter === 'all') return matchesSearch;
    if (currentFilter === 'operational') return matchesSearch && item.status === 'operational';
    if (currentFilter === 'maintenance') return matchesSearch && item.status === 'maintenance';
    if (currentFilter === 'outOfService') return matchesSearch && item.status === 'out_of_service';
    return matchesSearch;
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'bg-green-100 text-green-800';
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_service':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">Equipment Inventory</h1>
        <div className="flex space-x-2">
          <Link
            to="/equipment/add"
            className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <PlusIcon />
            <span className="ml-2">Add Equipment</span>
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b flex flex-col md:flex-row justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center">
            <div>
              <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter by:
              </label>
              <select
                id="filter"
                className="border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={currentFilter}
                onChange={(e) => setCurrentFilter(e.target.value)}
              >
                <option value="all">All Equipment</option>
                <option value="operational">Operational</option>
                <option value="maintenance">In Maintenance</option>
                <option value="outOfService">Out of Service</option>
              </select>
            </div>
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search:
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search equipment..."
                className="border border-gray-300 rounded-md p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <button
              onClick={fetchEquipmentFromSupabase}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            {realtimeEnabled && (
              <span className="text-xs text-green-600 mt-1 flex items-center justify-center">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-1"></span>
                Real-time updates enabled
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredEquipment.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Serial Number</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Maintenance</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Maintenance</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEquipment.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.serial_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.last_maintenance_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.next_maintenance_date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center space-x-3">
                        <Link
                          to={`/equipment/edit/${item.id}`}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Edit"
                        >
                          <PencilIcon />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
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
        ) : (
          <div className="p-6 text-center text-gray-500">
            No equipment found. Try changing your filter or add some equipment.
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentList; 