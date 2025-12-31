import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PrinterService, TrayStatus } from '../../services/printerService';
import ConsumablesWidget from '../../components/printing/ConsumablesWidget';



const PaperCatalog = () => {
    const [trays, setTrays] = useState<TrayStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingTray, setEditingTray] = useState<TrayStatus | null>(null);
    const [formData, setFormData] = useState<Partial<TrayStatus>>({});

    useEffect(() => {
        loadTrays();
    }, []);

    const loadTrays = async () => {
        try {
            setLoading(true);
            const data = await PrinterService.getTrayStatus();
            setTrays(data);
        } catch (error) {
            console.error('Error loading trays:', error);
            toast.error('Failed to load paper catalog');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (tray: TrayStatus) => {
        setEditingTray(tray);
        setFormData({
            paper_size: tray.paper_size,
            paper_type: tray.paper_type,
            paper_weight_gsm: tray.paper_weight_gsm,
            color: tray.color,
            sheets_loaded: tray.sheets_loaded
        });
    };

    const handleSave = async () => {
        if (!editingTray) return;

        try {
            await PrinterService.updateTray(editingTray.id, formData);
            toast.success('Tray updated successfully');
            setEditingTray(null);
            loadTrays();
        } catch (error) {
            console.error('Error updating tray:', error);
            toast.error('Failed to update tray');
        }
    };

    const getTrayStatusColor = (status: string) => {
        switch (status) {
            case 'Good': return 'text-green-600 bg-green-100';
            case 'Medium': return 'text-yellow-600 bg-yellow-100';
            case 'Low': return 'text-orange-600 bg-orange-100';
            case 'Empty': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getTrayFillColor = (percentage: number | null) => {
        if (percentage === null) return 'bg-gray-400';
        if (percentage >= 50) return 'bg-green-500';
        if (percentage >= 20) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading paper catalog...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Paper Catalog</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Manage paper configurations and view consumables
                        </p>
                    </div>
                    <div className="w-full md:w-auto">
                        <ConsumablesWidget />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {trays.map((tray) => (
                        <div
                            key={tray.tray_name}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">{tray.tray_name}</h3>
                                        <p className="text-sm text-gray-500">{tray.printer_name}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getTrayStatusColor(tray.status)}`}>
                                        {tray.status}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Paper Size</label>
                                        <div className="text-sm font-medium text-gray-900">{tray.paper_size}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Paper Type</label>
                                        <div className="text-sm font-medium text-gray-900">{tray.paper_type}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Weight</label>
                                        <div className="text-sm font-medium text-gray-900">{tray.paper_weight_gsm} gsm</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Color</label>
                                        <div className="text-sm font-medium text-gray-900">{tray.color}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-xs font-medium text-gray-500 uppercase">Paper Level</label>
                                        <span className="text-sm font-medium text-gray-700">
                                            {tray.sheets_loaded} / {tray.sheets_capacity} sheets
                                        </span>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ${getTrayFillColor(tray.fill_percentage)}`}
                                            style={{ width: `${tray.fill_percentage || 0}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-gray-500">
                                            {tray.fill_percentage ? `${tray.fill_percentage.toFixed(1)}% full` : 'No data'}
                                        </span>
                                        {tray.status === 'Low' && <span className="text-xs text-orange-600 font-medium">⚠️ Refill soon</span>}
                                        {tray.status === 'Empty' && <span className="text-xs text-red-600 font-medium">❌ Out of paper</span>}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                    <button
                                        onClick={() => handleEdit(tray)}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Configure Tray
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {editingTray && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-xl font-semibold text-gray-900">Configure {editingTray.tray_name}</h2>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Paper Size</label>
                                        <select
                                            value={['A4', 'Letter', '13x19', 'Tabloid Extra'].includes(formData.paper_size || '') ? formData.paper_size : 'Custom'}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                // If switching to a standard size, set it directly. 
                                                // If switching to Custom, clear it or set default 'Custom' to start typing.
                                                setFormData({
                                                    ...formData,
                                                    paper_size: val === 'Custom' ? 'Custom' : val
                                                });
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-2"
                                        >
                                            <option value="A4">A4</option>
                                            <option value="Letter">Letter</option>
                                            <option value="13x19">13x19</option>
                                            <option value="Tabloid Extra">Tabloid Extra</option>
                                            <option value="Custom">Custom / Other</option>
                                        </select>

                                        {/* Show text input if value is not one of the standard options OR is literally 'Custom' */}
                                        {(!['A4', 'Letter', '13x19', 'Tabloid Extra'].includes(formData.paper_size || '') || formData.paper_size === 'Custom') && (
                                            <input
                                                type="text"
                                                value={formData.paper_size}
                                                onChange={(e) => setFormData({ ...formData, paper_size: e.target.value })}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                                placeholder="Enter custom size (e.g. 12x18)"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Paper Type</label>
                                        <select
                                            value={formData.paper_type}
                                            onChange={(e) => setFormData({ ...formData, paper_type: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="Plain">Plain</option>
                                            <option value="Coated">Coated</option>
                                            <option value="Coated G">Coated G</option>
                                            <option value="Glossy">Glossy</option>
                                            <option value="Bond">Bond</option>
                                            <option value="Stationary">Stationary</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Paper Weight (gsm)</label>
                                        <input
                                            type="number"
                                            value={formData.paper_weight_gsm}
                                            onChange={(e) => setFormData({ ...formData, paper_weight_gsm: parseInt(e.target.value) || 0 })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            placeholder="e.g., 80, 120, 170"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Paper Color</label>
                                        <select
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="White">White</option>
                                            <option value="Ivory">Ivory</option>
                                            <option value="Yellow">Yellow</option>
                                            <option value="Pink">Pink</option>
                                            <option value="Blue">Blue</option>
                                            <option value="Green">Green</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Sheets Loaded</label>
                                    <input
                                        type="number"
                                        value={formData.sheets_loaded}
                                        onChange={(e) => setFormData({ ...formData, sheets_loaded: parseInt(e.target.value) || 0 })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Number of sheets currently in tray"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Capacity: {editingTray.sheets_capacity} sheets</p>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                                <button
                                    onClick={() => setEditingTray(null)}
                                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaperCatalog;
