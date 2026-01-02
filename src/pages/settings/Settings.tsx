import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface DropdownOption {
    id: string;
    category: string;
    value: string;
}

const CATEGORIES = [
    { id: 'product_name', label: 'Product Names' },
    { id: 'binding_type', label: 'Binding Types' },
    { id: 'paper_quality', label: 'Paper Qualities' },
    { id: 'paper_color', label: 'Paper Colors' },
    { id: 'paper_size', label: 'Paper Sizes' },
    { id: 'printing_type', label: 'Printing Types / Machines' },
];

const Settings: React.FC = () => {
    const [activeTab, setActiveTab] = useState(CATEGORIES[0].id);
    const [options, setOptions] = useState<DropdownOption[]>([]);
    const [newItemValue, setNewItemValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, [activeTab]);

    const fetchOptions = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .from('dropdown_options')
            .select('*')
            .eq('category', activeTab)
            .order('value');

        if (error) {
            console.error('Error fetching options:', error);
            toast.error('Failed to load options');
        } else {
            setOptions(data || []);
        }
        setIsLoading(false);
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemValue.trim()) return;

        setIsAdding(true);
        const { data, error } = await supabase
            .from('dropdown_options')
            .insert([{ category: activeTab, value: newItemValue.trim() }])
            .select()
            .single();

        if (error) {
            console.error('Error adding option:', error);
            toast.error('Failed to add item. It might already exist.');
        } else {
            setOptions([...options, data].sort((a, b) => a.value.localeCompare(b.value)));
            setNewItemValue('');
            toast.success('Item added successfully');
        }
        setIsAdding(false);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;

        const { error } = await supabase
            .from('dropdown_options')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting option:', error);
            toast.error('Failed to delete item');
        } else {
            setOptions(options.filter(opt => opt.id !== id));
            toast.success('Item deleted');
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        {CATEGORIES.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => setActiveTab(category.id)}
                                className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${activeTab === category.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {category.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Manage {CATEGORIES.find(c => c.id === activeTab)?.label}
                        </h3>

                        <form onSubmit={handleAdd} className="flex gap-4">
                            <input
                                type="text"
                                value={newItemValue}
                                onChange={(e) => setNewItemValue(e.target.value)}
                                placeholder="Enter new item name..."
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-4 py-2 border"
                            />
                            <button
                                type="submit"
                                disabled={isAdding || !newItemValue.trim()}
                                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                {isAdding ? 'Adding...' : 'Add Item'}
                            </button>
                        </form>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-4">Loading...</div>
                    ) : (
                        <div className="bg-gray-50 rounded-md border border-gray-200 overflow-hidden">
                            <ul className="divide-y divide-gray-200">
                                {options.length === 0 ? (
                                    <li className="px-6 py-4 text-gray-500 text-center text-sm">No items found. Add one above!</li>
                                ) : (
                                    options.map((option) => (
                                        <li key={option.id} className="px-6 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors">
                                            <span className="text-gray-900">{option.value}</span>
                                            <button
                                                onClick={() => handleDelete(option.id)}
                                                className="text-red-600 hover:text-red-900 text-sm font-medium"
                                            >
                                                Delete
                                            </button>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
