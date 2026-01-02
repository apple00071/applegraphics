import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface Customer {
    id: string;
    name: string;
    type: 'B2B' | 'Direct';
    contact_person?: string;
    contact_number?: string;
    email?: string;
    address?: string;
}

const CustomerList: React.FC = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState<Partial<Customer>>({
        name: '',
        type: 'Direct',
        contact_person: '',
        contact_number: '',
        email: '',
        address: ''
    });

    const fetchCustomers = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        } else {
            setCustomers(data || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) {
            toast.error('Customer Name is required');
            return;
        }

        try {
            const { error } = await supabase
                .from('customers')
                .insert([formData]);

            if (error) throw error;

            toast.success('Customer added successfully');
            setIsModalOpen(false);
            setFormData({ name: '', type: 'Direct', contact_person: '', contact_number: '', email: '', address: '' });
            fetchCustomers();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add customer');
        }
    };

    const deleteCustomer = async (id: string) => {
        if (!window.confirm('Are you sure? This will not delete their orders.')) return;

        try {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;
            toast.success('Customer deleted');
            fetchCustomers();
        } catch (err: any) {
            toast.error('Failed to delete customer');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
                    <p className="text-gray-500">Manage your Direct and B2B clients</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    Add Customer
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
                        ) : customers.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">No customers found. Add your first one!</td></tr>
                        ) : (
                            customers.map(c => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{c.name}</div>
                                        {c.email && <div className="text-sm text-gray-500">{c.email}</div>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.type === 'B2B' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                                            }`}>
                                            {c.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{c.contact_person || '-'}</div>
                                        <div className="text-xs text-gray-500">{c.contact_number}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{c.address || '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => deleteCustomer(c.id)} className="text-red-500 hover:text-red-700">Delete</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Customer Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Add New Customer</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'Direct' })}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'Direct'
                                                ? 'bg-green-50 border-green-200 text-green-700 ring-1 ring-green-300'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Direct Customer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: 'B2B' })}
                                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'B2B'
                                                ? 'bg-purple-50 border-purple-200 text-purple-700 ring-1 ring-purple-300'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        Printing Press (B2B)
                                    </button>
                                </div>
                                <p className="mt-1.5 text-xs text-gray-500">
                                    {formData.type === 'B2B'
                                        ? 'B2B customers will get the "Printing Press" discount rates.'
                                        : 'Standard retail rates will apply.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.contact_person}
                                        onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.contact_number}
                                        onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                <textarea
                                    rows={2}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="pt-2">
                                <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
                                    Create Customer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerList;
