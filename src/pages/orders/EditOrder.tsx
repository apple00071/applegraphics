import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Constants
const MACHINE_TYPES = ['Konica', 'Riso', 'Flex', 'Offset', 'Multicolor'] as const;
type MachineType = typeof MACHINE_TYPES[number];

const PAPER_SIZES = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'B4', 'B5'];
const PAPER_TYPES = ['80 GSM', '100 GSM', '120 GSM', '170 GSM', '250 GSM', '300 GSM', 'Art Paper', 'Matte'];
const BINDING_FORMATS = ['1+1', '1+2', '1+3'];
const PAPER_COLORS = ['White', 'Yellow', 'Pink', 'Green', 'Blue'];
const BINDING_TYPES = ['None', 'Staple', 'Spiral', 'Perfect Bind'];
const MEDIA_TYPES = ['Flex', 'Vinyl', 'Star Flex', 'One Way Vision', 'Backlit'];

const ArrowLeftIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
);

const EditOrder: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [order, setOrder] = useState<any>(null);

    // --- Common Form State ---
    const [customerName, setCustomerName] = useState('');
    const [selectedMachine, setSelectedMachine] = useState<MachineType | ''>('');
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [status, setStatus] = useState('pending');

    // --- Konica Specific State ---
    const [konicaPaperSize, setKonicaPaperSize] = useState('A4');
    const [konicaPaperType, setKonicaPaperType] = useState('80 GSM');
    const [konicaSide, setKonicaSide] = useState<'single' | 'double'>('single');
    const [konicaColorMode, setKonicaColorMode] = useState<'color' | 'bw'>('color');
    const [konicaPiecesPerSheet, setKonicaPiecesPerSheet] = useState('1');
    const [konicaCutting, setKonicaCutting] = useState(false);
    const [konicaLamination, setKonicaLamination] = useState(false);
    const [konicaPlotter, setKonicaPlotter] = useState(false);

    // --- Riso Specific State ---
    const [risoSize, setRisoSize] = useState('A4');
    const [risoBindingFormat, setRisoBindingFormat] = useState('1+1');
    const [risoOriginalPaper, setRisoOriginalPaper] = useState('80 GSM');
    const [risoOriginalColor, setRisoOriginalColor] = useState('White');
    const [risoDuplicatePaper, setRisoDuplicatePaper] = useState('70 GSM');
    const [risoDuplicateColor, setRisoDuplicateColor] = useState('Yellow');
    const [risoTriplicatePaper, setRisoTriplicatePaper] = useState('70 GSM');
    const [risoTriplicateColor, setRisoTriplicateColor] = useState('Pink');
    const [risoBindingType, setRisoBindingType] = useState('None');

    // --- Flex Specific State ---
    const [flexWidth, setFlexWidth] = useState('');
    const [flexHeight, setFlexHeight] = useState('');
    const [flexMediaType, setFlexMediaType] = useState('Flex');
    const [flexRevite, setFlexRevite] = useState(false);
    const [flexLopping, setFlexLopping] = useState(false);
    const [flexFrame, setFlexFrame] = useState(false);
    const [flexFramePastingBy, setFlexFramePastingBy] = useState('');
    const [flexFrameLocation, setFlexFrameLocation] = useState('');

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const fetchOrder = async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (data) {
                setOrder(data);
                setCustomerName(data.customer_name || '');
                setStatus(data.status || 'pending');
                parseNotesToForm(data.notes || '');
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            toast.error('Failed to load order');
            navigate('/orders');
        } finally {
            setIsLoading(false);
        }
    };

    // Parse existing notes back into form fields
    const parseNotesToForm = (notes: string) => {
        const getValue = (key: string): string => {
            const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
            const match = notes.match(regex);
            return match ? match[1].trim() : '';
        };

        // Machine type
        const machine = getValue('Machine');
        if (MACHINE_TYPES.includes(machine as MachineType)) {
            setSelectedMachine(machine as MachineType);
        }

        // Common
        setProductName(getValue('Product'));
        setQuantity(getValue('Quantity'));

        // Extract additional notes
        const notesMatch = notes.match(/=== NOTES ===\n([\s\S]*?)$/);
        if (notesMatch) {
            setAdditionalNotes(notesMatch[1].trim());
        }

        // Machine-specific parsing
        if (machine === 'Konica') {
            setKonicaPaperSize(getValue('Paper Size') || 'A4');
            setKonicaPaperType(getValue('Paper Type') || '80 GSM');
            const sides = getValue('Sides');
            setKonicaSide(sides.toLowerCase().includes('double') ? 'double' : 'single');
            const color = getValue('Color');
            setKonicaColorMode(color.toLowerCase().includes('b/w') ? 'bw' : 'color');
            setKonicaPiecesPerSheet(getValue('Pieces per Sheet') || '1');
            const postPress = getValue('Post-Press');
            setKonicaCutting(postPress.includes('Cutting'));
            setKonicaLamination(postPress.includes('Lamination'));
            setKonicaPlotter(postPress.includes('Plotter'));
        } else if (machine === 'Riso') {
            setRisoSize(getValue('Size') || 'A4');
            setRisoBindingFormat(getValue('Binding Format') || '1+1');
            const original = getValue('Original');
            if (original) {
                const origMatch = original.match(/(.+?)\s*\((.+?)\)/);
                if (origMatch) {
                    setRisoOriginalPaper(origMatch[1].trim());
                    setRisoOriginalColor(origMatch[2].trim());
                }
            }
            const duplicate = getValue('Duplicate');
            if (duplicate) {
                const dupMatch = duplicate.match(/(.+?)\s*\((.+?)\)/);
                if (dupMatch) {
                    setRisoDuplicatePaper(dupMatch[1].trim());
                    setRisoDuplicateColor(dupMatch[2].trim());
                }
            }
            const triplicate = getValue('Triplicate');
            if (triplicate) {
                const tripMatch = triplicate.match(/(.+?)\s*\((.+?)\)/);
                if (tripMatch) {
                    setRisoTriplicatePaper(tripMatch[1].trim());
                    setRisoTriplicateColor(tripMatch[2].trim());
                }
            }
            setRisoBindingType(getValue('Binding Type') || 'None');
        } else if (machine === 'Flex') {
            const size = getValue('Size');
            if (size && size.includes('x')) {
                const [w, h] = size.split('x').map(s => s.trim());
                setFlexWidth(w);
                setFlexHeight(h);
            }
            setFlexMediaType(getValue('Media') || 'Flex');
            setFlexRevite(getValue('Revite').toLowerCase() === 'yes');
            setFlexLopping(getValue('Lopping').toLowerCase() === 'yes');
            setFlexFrame(getValue('Frame').toLowerCase() === 'yes');
            setFlexFramePastingBy(getValue('Frame Pasting By'));
            setFlexFrameLocation(getValue('Frame Location'));
        }
    };

    const formatNotes = () => {
        let specs: string[] = [];

        if (selectedMachine === 'Konica') {
            specs = [
                `Machine: Konica`,
                `Product: ${productName}`,
                `Paper Size: ${konicaPaperSize}`,
                `Paper Type: ${konicaPaperType}`,
                `Sides: ${konicaSide === 'double' ? 'Double Side' : 'Single Side'}`,
                `Color: ${konicaColorMode === 'color' ? 'Color' : 'B/W'}`,
                `Quantity: ${quantity}`,
                `Pieces per Sheet: ${konicaPiecesPerSheet}`,
                `Post-Press: ${[konicaCutting && 'Cutting', konicaLamination && 'Lamination', konicaPlotter && 'Plotter'].filter(Boolean).join(', ') || 'None'}`
            ];
        } else if (selectedMachine === 'Riso') {
            specs = [
                `Machine: Riso`,
                `Product: ${productName}`,
                `Size: ${risoSize}`,
                `Binding Format: ${risoBindingFormat}`,
                `Original: ${risoOriginalPaper} (${risoOriginalColor})`,
                `Duplicate: ${risoDuplicatePaper} (${risoDuplicateColor})`
            ];
            if (risoBindingFormat === '1+2' || risoBindingFormat === '1+3') {
                specs.push(`Triplicate: ${risoTriplicatePaper} (${risoTriplicateColor})`);
            }
            specs.push(`Binding Type: ${risoBindingType}`, `Quantity: ${quantity}`);
        } else if (selectedMachine === 'Flex') {
            specs = [
                `Machine: Flex`,
                `Product: ${productName}`,
                `Size: ${flexWidth} x ${flexHeight}`,
                `Media: ${flexMediaType}`,
                `Quantity: ${quantity}`,
                `Revite: ${flexRevite ? 'Yes' : 'No'}`,
                `Lopping: ${flexLopping ? 'Yes' : 'No'}`,
                `Frame: ${flexFrame ? 'Yes' : 'No'}`
            ];
            if (flexFrame) {
                specs.push(`Frame Pasting By: ${flexFramePastingBy}`, `Frame Location: ${flexFrameLocation}`);
            }
        } else {
            specs = [
                `Machine: ${selectedMachine}`,
                `Product: ${productName}`,
                `Quantity: ${quantity}`
            ];
        }

        return `=== PRINT SPECIFICATIONS ===\n${specs.join('\n')}\n\n=== NOTES ===\n${additionalNotes}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;

        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    customer_name: customerName,
                    status,
                    notes: formatNotes()
                })
                .eq('id', id);

            if (error) throw error;

            toast.success('Order updated successfully');
            navigate(`/orders/${id}`);
        } catch (err) {
            console.error('Error updating order:', err);
            toast.error('Failed to update order');
        } finally {
            setIsSaving(false);
        }
    };

    // --- Render Machine Forms ---
    const renderKonicaForm = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Size</label>
                    <select value={konicaPaperSize} onChange={(e) => setKonicaPaperSize(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {PAPER_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Type</label>
                    <select value={konicaPaperType} onChange={(e) => setKonicaPaperType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {PAPER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pieces per Sheet</label>
                    <input type="number" value={konicaPiecesPerSheet} onChange={(e) => setKonicaPiecesPerSheet(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" min="1" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Print Side</label>
                    <div className="flex gap-4">
                        <label className="flex items-center"><input type="radio" checked={konicaSide === 'single'} onChange={() => setKonicaSide('single')} className="mr-2" /> Single</label>
                        <label className="flex items-center"><input type="radio" checked={konicaSide === 'double'} onChange={() => setKonicaSide('double')} className="mr-2" /> Double</label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color Mode</label>
                    <div className="flex gap-4">
                        <label className="flex items-center"><input type="radio" checked={konicaColorMode === 'color'} onChange={() => setKonicaColorMode('color')} className="mr-2" /> Color</label>
                        <label className="flex items-center"><input type="radio" checked={konicaColorMode === 'bw'} onChange={() => setKonicaColorMode('bw')} className="mr-2" /> B/W</label>
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Post-Press</label>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center"><input type="checkbox" checked={konicaCutting} onChange={(e) => setKonicaCutting(e.target.checked)} className="mr-2" /> Cutting</label>
                    <label className="flex items-center"><input type="checkbox" checked={konicaLamination} onChange={(e) => setKonicaLamination(e.target.checked)} className="mr-2" /> Lamination</label>
                    <label className="flex items-center"><input type="checkbox" checked={konicaPlotter} onChange={(e) => setKonicaPlotter(e.target.checked)} className="mr-2" /> Plotter</label>
                </div>
            </div>
        </div>
    );

    const renderRisoForm = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <select value={risoSize} onChange={(e) => setRisoSize(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {PAPER_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Binding Format</label>
                    <select value={risoBindingFormat} onChange={(e) => setRisoBindingFormat(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {BINDING_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Binding Type</label>
                    <select value={risoBindingType} onChange={(e) => setRisoBindingType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {BINDING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Original</p>
                    <select value={risoOriginalPaper} onChange={(e) => setRisoOriginalPaper(e.target.value)} className="w-full px-2 py-1 border rounded mb-2 text-sm">
                        {PAPER_TYPES.slice(0, 4).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={risoOriginalColor} onChange={(e) => setRisoOriginalColor(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                        {PAPER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Duplicate</p>
                    <select value={risoDuplicatePaper} onChange={(e) => setRisoDuplicatePaper(e.target.value)} className="w-full px-2 py-1 border rounded mb-2 text-sm">
                        {PAPER_TYPES.slice(0, 4).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={risoDuplicateColor} onChange={(e) => setRisoDuplicateColor(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                        {PAPER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {(risoBindingFormat === '1+2' || risoBindingFormat === '1+3') && (
                    <div className="p-3 bg-pink-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Triplicate</p>
                        <select value={risoTriplicatePaper} onChange={(e) => setRisoTriplicatePaper(e.target.value)} className="w-full px-2 py-1 border rounded mb-2 text-sm">
                            {PAPER_TYPES.slice(0, 4).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={risoTriplicateColor} onChange={(e) => setRisoTriplicateColor(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                            {PAPER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );

    const renderFlexForm = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Width (ft)</label>
                    <input type="text" value={flexWidth} onChange={(e) => setFlexWidth(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g., 3" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Height (ft)</label>
                    <input type="text" value={flexHeight} onChange={(e) => setFlexHeight(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g., 5" />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Media Type</label>
                    <select value={flexMediaType} onChange={(e) => setFlexMediaType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {MEDIA_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Finishing Options</label>
                <div className="flex flex-wrap gap-4">
                    <label className="flex items-center"><input type="checkbox" checked={flexRevite} onChange={(e) => setFlexRevite(e.target.checked)} className="mr-2" /> Revite</label>
                    <label className="flex items-center"><input type="checkbox" checked={flexLopping} onChange={(e) => setFlexLopping(e.target.checked)} className="mr-2" /> Lopping</label>
                    <label className="flex items-center"><input type="checkbox" checked={flexFrame} onChange={(e) => setFlexFrame(e.target.checked)} className="mr-2" /> Frame</label>
                </div>
            </div>
            {flexFrame && (
                <div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pasting By</label>
                        <input type="text" value={flexFramePastingBy} onChange={(e) => setFlexFramePastingBy(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Who will paste" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <input type="text" value={flexFrameLocation} onChange={(e) => setFlexFrameLocation(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Installation location" />
                    </div>
                </div>
            )}
        </div>
    );

    const renderMachineForm = () => {
        switch (selectedMachine) {
            case 'Konica': return renderKonicaForm();
            case 'Riso': return renderRisoForm();
            case 'Flex': return renderFlexForm();
            case 'Offset':
            case 'Multicolor':
                return <p className="text-gray-500 italic">Additional fields coming soon for {selectedMachine}.</p>;
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center">
                        <button onClick={() => navigate(`/orders/${id}`)}
                            className="mr-4 p-2 rounded-full hover:bg-white hover:shadow-sm text-gray-500">
                            <ArrowLeftIcon />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Edit Order</h1>
                            <p className="text-sm text-gray-500">#{order?.job_number || id}</p>
                        </div>
                    </div>
                    <button onClick={handleSubmit} disabled={isSaving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Machine Selection */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-800">Machine Type</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                                {MACHINE_TYPES.map(machine => (
                                    <button key={machine} type="button"
                                        onClick={() => setSelectedMachine(machine)}
                                        className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all
                      ${selectedMachine === machine
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                                        {machine}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Order Details */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-800">Order Details</h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                                <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select value={status} onChange={(e) => setStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="pending">Pending</option>
                                    <option value="in-progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Machine-Specific Form */}
                    {selectedMachine && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg font-semibold text-gray-800">{selectedMachine} Specifications</h2>
                            </div>
                            <div className="p-6">
                                {renderMachineForm()}
                            </div>
                        </div>
                    )}

                    {/* Additional Notes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="text-lg font-semibold text-gray-800">Additional Notes</h2>
                        </div>
                        <div className="p-6">
                            <textarea rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="Any special instructions or notes..." />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditOrder;
