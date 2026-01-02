import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface PricingRule {
    id: string;
    machine_type: string;
    customer_type: 'B2B' | 'Direct';
    paper_size: string;
    min_qty: number;
    max_qty: number | null; // null means 'and above'
    unit_price: number;
}

const Pricing: React.FC = () => {
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeMachine, setActiveMachine] = useState('Konica');
    const [activeCustomerType, setActiveCustomerType] = useState<'Direct' | 'B2B'>('Direct');
    const [paperSizes, setPaperSizes] = useState<string[]>([]);

    const machineTypes = ['Konica', 'Riso', 'Offset', 'Multicolor', 'Flex', 'Plotter'];

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);

        // Fetch Rules
        const { data: rulesData, error: rulesError } = await supabase
            .from('pricing_rules')
            .select('*')
            .order('paper_size')
            .order('min_qty');

        if (rulesError) {
            console.error('Error fetching rules:', rulesError);
            toast.error(`DB Error (Rules): ${rulesError.message} (${rulesError.code})`);
        } else {
            console.log('Fetched rules:', rulesData);
            setRules(rulesData || []);
        }

        // Fetch available paper sizes for dropdown
        console.log('Fetching paper sizes...');
        const { data: sizesData, error: sizesError } = await supabase
            .from('dropdown_options')
            .select('value')
            .eq('category', 'paper_size') // Make sure this matches Settings.tsx
            .order('value');

        if (sizesError) {
            console.error("Error fetching paper sizes:", sizesError);
            toast.error(`DB Error (Sizes): ${sizesError.message} (${sizesError.code})`);
        }

        if (sizesData) {
            console.log('Fetched sizes:', sizesData);
            setPaperSizes(sizesData.map(s => s.value));
        } else {
            console.log('No sizes found');
        }

        setIsLoading(false);
    };

    // Helper to get rules for current view
    const currentRules = rules.filter(
        r => r.machine_type === activeMachine && r.customer_type === activeCustomerType
    );

    // Group by paper size
    const rulesBySize = currentRules.reduce((acc, rule) => {
        if (!acc[rule.paper_size]) acc[rule.paper_size] = [];
        acc[rule.paper_size].push(rule);
        return acc;
    }, {} as Record<string, PricingRule[]>);

    const handleAddRule = async (paperSize: string) => {
        const newRule = {
            machine_type: activeMachine,
            customer_type: activeCustomerType,
            paper_size: paperSize,
            min_qty: 1,
            max_qty: null,
            unit_price: 0
        };

        const { data, error } = await supabase
            .from('pricing_rules')
            .insert([newRule])
            .select()
            .single();

        if (error) {
            toast.error('Failed to add tier');
        } else {
            setRules([...rules, data]);
            toast.success('New tier added');
        }
    };

    const handleUpdateRule = (id: string, updates: Partial<PricingRule>) => {
        // Local update only
        setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    };

    const handleDeleteRule = async (id: string) => {
        // For delete, we can either do it immediately or wait for save. 
        // Immediate is clearer for "removing a row".
        if (!window.confirm('Delete this price tier?')) return;

        // If it's a temp row (not saved yet), just remove from UI
        // We don't have temp IDs implemented yet, but good practice.

        const { error } = await supabase.from('pricing_rules').delete().eq('id', id);
        if (error) {
            console.error("Delete failed:", error);
            toast.error("Failed to delete tier");
        } else {
            setRules(rules.filter(r => r.id !== id));
            toast.success('Tier deleted');
        }
    };

    const handleSaveAll = async () => {
        const loadingToast = toast.loading('Saving changes...');

        // Upsert all local rules to DB
        // We map just the fields we need to ensure no extra junk is sent
        const payload = rules.map(r => ({
            id: r.id,
            machine_type: r.machine_type,
            customer_type: r.customer_type,
            paper_size: r.paper_size,
            min_qty: r.min_qty,
            max_qty: r.max_qty,
            unit_price: r.unit_price
        }));

        const { error } = await supabase
            .from('pricing_rules')
            .upsert(payload);

        toast.dismiss(loadingToast);

        if (error) {
            console.error('Save failed:', error);
            toast.error(`Save failed: ${error.message}`);
        } else {
            toast.success('All pricing rules saved!');
            fetchData(); // Refresh to be sure
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Advanced Pricing Matrix</h1>
                    <p className="text-gray-500">Set tiered quantity prices based on paper size</p>
                </div>
                <button
                    onClick={handleSaveAll}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    Save Changes
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[600px]">
                {/* Machine Tabs */}
                <div className="flex border-b border-gray-200 overflow-x-auto">
                    {machineTypes.map(m => (
                        <button
                            key={m}
                            onClick={() => setActiveMachine(m)}
                            className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeMachine === m
                                ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                {/* Customer Type Toggle */}
                <div className="p-6 bg-gray-50 border-b border-gray-200 flex justify-center">
                    <div className="bg-white p-1 rounded-lg border border-gray-200 shadow-sm inline-flex">
                        <button
                            onClick={() => setActiveCustomerType('Direct')}
                            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeCustomerType === 'Direct'
                                ? 'bg-green-100 text-green-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Direct Customer (Retail)
                        </button>
                        <div className="w-px bg-gray-200 my-1 mx-1"></div>
                        <button
                            onClick={() => setActiveCustomerType('B2B')}
                            className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${activeCustomerType === 'B2B'
                                ? 'bg-purple-100 text-purple-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Printing Press (B2B)
                        </button>
                    </div>
                </div>

                {/* Pricing Matrix */}
                <div className="p-8">
                    {isLoading ? <div>Loading...</div> : (
                        <div className="space-y-8">
                            {/* Add Size Section */}
                            <div className="flex justify-end">
                                <select
                                    className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm p-2 border"
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            handleAddRule(e.target.value);
                                            e.target.value = ''; // Reset
                                        }
                                    }}
                                >
                                    <option value="">+ Add Pricing for Paper Size...</option>
                                    {paperSizes.filter(s => !rulesBySize[s]).map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            {Object.keys(rulesBySize).length === 0 ? (
                                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    No pricing rules set for this configuration yet. Select a paper size above to start.
                                </div>
                            ) : (
                                Object.entries(rulesBySize).map(([size, tiers]: [string, PricingRule[]]) => (
                                    <div key={size} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                            <h3 className="font-bold text-gray-800">{size}</h3>
                                            <button
                                                onClick={() => handleAddRule(size)}
                                                className="text-xs bg-white border border-gray-300 px-2 py-1 rounded hover:bg-gray-50 text-gray-600"
                                            >
                                                + Add Tier
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-100">
                                                <thead className="bg-white">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Qty</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Qty</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price (₹)</th>
                                                        <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {tiers.map((rule: PricingRule) => (
                                                        <tr key={rule.id}>
                                                            <td className="px-6 py-2">
                                                                <input
                                                                    type="number"
                                                                    value={rule.min_qty}
                                                                    onChange={(e) => handleUpdateRule(rule.id, { min_qty: Number(e.target.value) })}
                                                                    className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-1"
                                                                />
                                                            </td>
                                                            <td className="px-6 py-2">
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="number"
                                                                        value={rule.max_qty || ''}
                                                                        placeholder="∞"
                                                                        onChange={(e) => handleUpdateRule(rule.id, { max_qty: e.target.value ? Number(e.target.value) : null })}
                                                                        className="block w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-1"
                                                                    />
                                                                    <span className="text-xs text-gray-400"> (Empty = ∞)</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-2">
                                                                <div className="relative rounded-md shadow-sm w-32">
                                                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
                                                                        <span className="text-gray-500 sm:text-sm">₹</span>
                                                                    </div>
                                                                    <input
                                                                        type="number"
                                                                        value={rule.unit_price}
                                                                        onChange={(e) => handleUpdateRule(rule.id, { unit_price: Number(e.target.value) })}
                                                                        className="block w-full rounded-md border-gray-300 pl-6 focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-1"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-2 text-right">
                                                                <button
                                                                    onClick={() => handleDeleteRule(rule.id)}
                                                                    className="text-red-400 hover:text-red-600 transition-colors"
                                                                >
                                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Pricing;
