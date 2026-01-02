import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

// Constants
const MACHINE_TYPES = ['Konica', 'Riso', 'Flex', 'Offset', 'Multicolor'] as const;
type MachineType = typeof MACHINE_TYPES[number];

// Fallback defaults if DB is empty
// Fallback defaults if DB is empty
const DEFAULT_PAPER_SIZES = ['A4', 'A3', 'A5', 'Letter', 'Legal', '12x18', '13x19'];
const DEFAULT_PAPER_TYPES = ['80 GSM', '100 GSM', '120 GSM', '170 GSM', '250 GSM', '300 GSM', 'Art Paper', 'Matte', 'Glossy'];
const DEFAULT_PAPER_COLORS = ['White', 'Yellow', 'Pink', 'Green', 'Blue'];
const DEFAULT_BINDING_TYPES = ['None', 'Staple', 'Spiral', 'Perfect Bind'];
const BINDING_FORMATS = ['1+1', '1+2', '1+3'];
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

    // --- Dynamic Data State ---
    // --- Dynamic Data State ---
    const [paperSizes, setPaperSizes] = useState<string[]>(DEFAULT_PAPER_SIZES);
    const [paperTypes, setPaperTypes] = useState<string[]>(DEFAULT_PAPER_TYPES);
    const [paperColors, setPaperColors] = useState<string[]>(DEFAULT_PAPER_COLORS);
    const [bindingTypes, setBindingTypes] = useState<string[]>(DEFAULT_BINDING_TYPES);
    const [productNames, setProductNames] = useState<string[]>([]);

    // --- Multi-Job State ---
    interface JobItem {
        id: string; // temp id for UI
        machine: MachineType | '';
        productName: string;
        quantity: string;
        details: Record<string, any>;
        summary: string;
    }
    const [jobItems, setJobItems] = useState<JobItem[]>([]);

    // --- Common Form State ---
    const [customerName, setCustomerName] = useState('');
    const [selectedMachine, setSelectedMachine] = useState<MachineType | ''>('');
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [status, setStatus] = useState('pending');


    // --- Konica/Generic Specific State ---
    const [konicaPaperSize, setKonicaPaperSize] = useState('A4');
    const [customPaperSize, setCustomPaperSize] = useState(''); // New state for custom input
    const [konicaPaperType, setKonicaPaperType] = useState('80 GSM');
    const [konicaSide, setKonicaSide] = useState<'single' | 'double'>('single');
    const [konicaColorMode, setKonicaColorMode] = useState<'color' | 'bw'>('color');
    const [konicaPiecesPerSheet, setKonicaPiecesPerSheet] = useState('1');
    const [konicaCutting, setKonicaCutting] = useState(false);
    const [konicaLamination, setKonicaLamination] = useState(false);
    const [konicaPlotter, setKonicaPlotter] = useState(false);

    // --- Riso Specific State ---
    const [risoSize, setRisoSize] = useState('A4');
    const [risoCustomSize, setRisoCustomSize] = useState('');
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
        const init = async () => {
            await fetchDropdownOptions();
            await fetchOrder();
        };
        init();
    }, [id]);

    const fetchDropdownOptions = async () => {
        const { data } = await supabase
            .from('dropdown_options')
            .select('category, value')
            .order('value');

        if (data) {
            const sizes = data.filter(d => d.category === 'paper_size').map(d => d.value);
            if (sizes.length > 0) setPaperSizes(sizes);

            const types = data.filter(d => d.category === 'paper_quality').map(d => d.value);
            if (types.length > 0) setPaperTypes(types);

            const colors = data.filter(d => d.category === 'paper_color').map(d => d.value);
            if (colors.length > 0) setPaperColors(colors);

            const bindings = data.filter(d => d.category === 'binding_type').map(d => d.value);
            if (bindings.length > 0) setBindingTypes(bindings);

            const products = data.filter(d => d.category === 'product_name').map(d => d.value);
            if (products.length > 0) setProductNames(products);
        }
    };

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

    // Helper to create summary
    const getJobSummary = (machine: string, details: any) => {
        const parts = [`Machine: ${machine}`];
        if (details.paperSize) parts.push(`Size: ${details.paperSize}`);
        if (details.paperType) parts.push(`Paper: ${details.paperType}`);
        if (details.side) parts.push(`Side: ${details.side}`);
        return parts.join(', ');
    };

    // Parse existing notes back into job items
    const parseNotesToForm = (notes: string) => {
        // Extract additional notes first
        const notesMatch = notes.match(/=== NOTES ===\n([\s\S]*?)$/);
        if (notesMatch) {
            setAdditionalNotes(notesMatch[1].trim());
        }

        const parsedJobs: JobItem[] = [];

        // Check for Multi-Job Format - Robust check for either header OR job blocks
        const jobHeaderRegex = /=== JOB \d+: .+ ===/;
        const hasMultiJobHeader = notes.includes('=== MULTI-JOB ORDER ===');
        const hasJobBlocks = jobHeaderRegex.test(notes);

        if (hasMultiJobHeader || hasJobBlocks) {
            // Multi-job parsing

            // Use a more robust splitting strategy
            const splitRegex = /(?==== JOB \d+: .+ ===)/;
            const rawBlocks = notes.split(splitRegex);

            // Filter out blocks that don't look like jobs (e.g. pre-header text)
            const jobBlocks = rawBlocks.filter(b => jobHeaderRegex.test(b));

            const jobHeaders = notes.match(/=== JOB \d+: (.+) ===/g) || [];

            jobBlocks.forEach((block, index) => {
                const getValue = (key: string) => {
                    const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
                    const match = block.match(regex);
                    return match ? match[1].trim() : '';
                };

                const machine = getValue('Machine') as MachineType;
                const prodName = jobHeaders[index] ? jobHeaders[index].replace(/=== JOB \d+: | ===/g, '') : getValue('Product');
                const qty = getValue('Quantity');

                // Extract details based on machine
                const details: Record<string, any> = {};

                if (machine === 'Konica' || machine === 'Offset' || machine === 'Multicolor') {
                    details.paperSize = getValue('Paper Size');
                    details.paperType = getValue('Paper Type');
                    details.side = getValue('Sides').toLowerCase().includes('double') ? 'double' : 'single';
                    details.colorMode = getValue('Color').toLowerCase().includes('color') ? 'color' : 'bw';
                    details.piecesPerSheet = getValue('Pieces per Sheet');
                    const postPress = getValue('Post-Press');
                    details.cutting = postPress.includes('Cutting');
                    details.lamination = postPress.includes('Lamination');
                    details.plotter = postPress.includes('Plotter');
                } else if (machine === 'Riso') {
                    details.paperSize = getValue('Size');
                    details.bindingFormat = getValue('Binding Format');
                    details.bindingType = getValue('Binding Type');
                    // Note: Parsing complex nested strings like "Original: Paper (Color)" is simplified here for brevity
                    // Ideally we would Regex parse these out if we wanted full fidelity editing
                } else if (machine === 'Flex') {
                    const size = getValue('Size');
                    if (size.includes('x')) {
                        const [w, h] = size.split('x').map(s => s.trim());
                        details.width = w;
                        details.height = h;
                    }
                    details.mediaType = getValue('Media');
                    details.revite = getValue('Revite') === 'Yes';
                    details.lopping = getValue('Lopping') === 'Yes';
                    details.frame = getValue('Frame') === 'Yes';
                }

                parsedJobs.push({
                    id: Date.now().toString() + index,
                    machine,
                    productName: prodName,
                    quantity: qty,
                    details,
                    summary: getJobSummary(machine, details)
                });
            });
        } else {
            // Legacy single job parsing -> convert to 1 job item
            const getValue = (key: string): string => {
                const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
                const match = notes.match(regex);
                return match ? match[1].trim() : '';
            };
            const machine = getValue('Machine') as MachineType;
            if (machine) {
                const prodName = getValue('Product');
                const qty = getValue('Quantity');

                const details: Record<string, any> = {};
                if (machine === 'Konica' || machine === 'Offset' || machine === 'Multicolor') {
                    details.paperSize = getValue('Paper Size');
                    details.paperType = getValue('Paper Type');
                    details.side = getValue('Sides').toLowerCase().includes('double') ? 'double' : 'single';
                    details.colorMode = getValue('Color').toLowerCase().includes('color') ? 'color' : 'bw';
                    details.piecesPerSheet = getValue('Pieces per Sheet');
                    const postPress = getValue('Post-Press');
                    details.cutting = postPress.includes('Cutting');
                    details.lamination = postPress.includes('Lamination');
                    details.plotter = postPress.includes('Plotter');
                }

                parsedJobs.push({
                    id: Date.now().toString(),
                    machine,
                    productName: prodName,
                    quantity: qty,
                    details,
                    summary: getJobSummary(machine, details)
                });
            }
        }
        setJobItems(parsedJobs);
    };

    const handleAddJob = () => {
        if (!selectedMachine) {
            toast.error('Please select a machine type');
            return;
        }
        if (!quantity) {
            toast.error('Please enter quantity');
            return;
        }

        const details: Record<string, any> = {};

        // Collect details - Simplified for EditOrder to use same state vars
        // Note: This relies on the form state being set by the user
        if (selectedMachine === 'Konica' || selectedMachine === 'Offset' || selectedMachine === 'Multicolor') {
            details.paperSize = konicaPaperSize === 'Custom' ? customPaperSize : konicaPaperSize;
            details.paperType = konicaPaperType;
            details.side = konicaSide;
            details.colorMode = konicaColorMode;
            details.piecesPerSheet = konicaPiecesPerSheet;
            details.cutting = konicaCutting;
            details.lamination = konicaLamination;
            details.plotter = konicaPlotter;
        } else if (selectedMachine === 'Riso') {
            details.paperSize = risoSize === 'Custom' ? risoCustomSize : risoSize;
            details.bindingFormat = risoBindingFormat;
            details.bindingType = risoBindingType;
            details.originalPaper = risoOriginalPaper;
            details.originalColor = risoOriginalColor;
            details.duplicatePaper = risoDuplicatePaper;
            details.duplicateColor = risoDuplicateColor;
            details.triplicatePaper = risoTriplicatePaper;
            details.triplicateColor = risoTriplicateColor;
        } else if (selectedMachine === 'Flex') {
            details.width = flexWidth;
            details.height = flexHeight;
            details.mediaType = flexMediaType;
            details.revite = flexRevite;
            details.lopping = flexLopping;
            details.frame = flexFrame;
            details.framePastingBy = flexFramePastingBy;
            details.frameLocation = flexFrameLocation;
        }

        const newJob: JobItem = {
            id: Date.now().toString(),
            machine: selectedMachine,
            productName: productName || 'Print Job',
            quantity: quantity,
            details,
            summary: getJobSummary(selectedMachine, details)
        };

        setJobItems([...jobItems, newJob]);
        toast.success('Job added');

        // Reset basic fields
        setProductName('');
        setQuantity('');
    };

    const removeJob = (id: string) => {
        setJobItems(jobItems.filter(j => j.id !== id));
    };

    const handleEditJob = (id: string) => {
        const jobToEdit = jobItems.find(j => j.id === id);
        if (!jobToEdit) return;

        // 1. Set machine and basic details
        setSelectedMachine(jobToEdit.machine as MachineType);
        setProductName(jobToEdit.productName);
        setQuantity(jobToEdit.quantity);

        // 2. Populate Machine Specific Details
        const d = jobToEdit.details;
        if (jobToEdit.machine === 'Konica' || jobToEdit.machine === 'Offset' || jobToEdit.machine === 'Multicolor') {
            if (d.paperSize) setKonicaPaperSize(d.paperSize);
            // Handle custom size logic if needed
            if (d.paperType) setKonicaPaperType(d.paperType);
            if (d.side) setKonicaSide(d.side);
            if (d.colorMode) setKonicaColorMode(d.colorMode);
            if (d.piecesPerSheet) setKonicaPiecesPerSheet(d.piecesPerSheet);
            setKonicaCutting(!!d.cutting);
            setKonicaLamination(!!d.lamination);
            setKonicaPlotter(!!d.plotter);
        } else if (jobToEdit.machine === 'Riso') {
            if (d.paperSize) setRisoSize(d.paperSize);
            if (d.bindingFormat) setRisoBindingFormat(d.bindingFormat);
            if (d.bindingType) setRisoBindingType(d.bindingType);
            // ... map other riso fields if present in details
        } else if (jobToEdit.machine === 'Flex') {
            if (d.width) setFlexWidth(d.width);
            if (d.height) setFlexHeight(d.height);
            if (d.mediaType) setFlexMediaType(d.mediaType);
            setFlexRevite(!!d.revite);
            setFlexLopping(!!d.lopping);
            setFlexFrame(!!d.frame);
            if (d.framePastingBy) setFlexFramePastingBy(d.framePastingBy);
            if (d.frameLocation) setFlexFrameLocation(d.frameLocation);
        }

        // 3. Remove from list so it can be re-added ("Move to Edit")
        setJobItems(jobItems.filter(j => j.id !== id));
        toast.dismiss();
        toast('Job loaded for editing', { icon: '📝' });
    };

    const formatMultiJobNotes = () => {
        if (jobItems.length === 0) return '';

        const jobBlocks = jobItems.map((job, index) => {
            let specs: string[] = [`Machine: ${job.machine}`, `Product: ${job.productName}`, `Quantity: ${job.quantity}`];
            const details = job.details;

            if (job.machine === 'Konica' || job.machine === 'Offset' || job.machine === 'Multicolor') {
                specs.push(
                    `Paper Size: ${details.paperSize || 'A4'}`,
                    `Paper Type: ${details.paperType || '80 GSM'}`,
                    `Sides: ${details.side === 'double' ? 'Double Side' : 'Single Side'}`,
                    `Color: ${details.colorMode === 'bw' ? 'B/W' : 'Color'}`,
                    `Pieces per Sheet: ${details.piecesPerSheet || '1'}`,
                    `Post-Press: ${[details.cutting && 'Cutting', details.lamination && 'Lamination', details.plotter && 'Plotter'].filter(Boolean).join(', ') || 'None'}`
                );
            } else if (job.machine === 'Riso') {
                specs.push(
                    `Size: ${details.paperSize || 'A4'}`,
                    `Binding Format: ${details.bindingFormat || '1+1'}`,
                );
                // Simplified reconstruction for brevity
                specs.push(`Binding Type: ${details.bindingType || 'None'}`);
            } else if (job.machine === 'Flex') {
                specs.push(
                    `Size: ${details.width} x ${details.height}`,
                    `Media: ${details.mediaType}`,
                );
            }
            return `=== JOB ${index + 1}: ${job.productName} ===\n${specs.join('\n')}`;
        });

        return `=== MULTI-JOB ORDER ===\n\n${jobBlocks.join('\n\n')}\n\n=== NOTES ===\n${additionalNotes}`;
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
                    notes: formatMultiJobNotes() // Always use multi-job format now
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
                        {paperSizes.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="Custom">Custom Size...</option>
                    </select>
                    {konicaPaperSize === 'Custom' && (
                        <input
                            type="text"
                            value={customPaperSize}
                            onChange={(e) => setCustomPaperSize(e.target.value)}
                            placeholder="Enter size (e.g. 10x10)"
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    )}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paper Type</label>
                    <select value={konicaPaperType} onChange={(e) => setKonicaPaperType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pieces per Sheet</label>
                    <input type="number" value={konicaPiecesPerSheet} onChange={(e) => setKonicaPiecesPerSheet(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md" min="1" />
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
        </div>
    );

    const renderRisoForm = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <select value={risoSize} onChange={(e) => setRisoSize(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        {paperSizes.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="Custom">Custom Size...</option>
                    </select>
                    {risoSize === 'Custom' && (
                        <input
                            type="text"
                            value={risoCustomSize}
                            onChange={(e) => setRisoCustomSize(e.target.value)}
                            placeholder="Enter size (e.g. 10x10)"
                            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                    )}
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
                        {bindingTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Original</p>
                    <select value={risoOriginalPaper} onChange={(e) => setRisoOriginalPaper(e.target.value)} className="w-full px-2 py-1 border rounded mb-2 text-sm">
                        {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={risoOriginalColor} onChange={(e) => setRisoOriginalColor(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                        {paperColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Duplicate</p>
                    <select value={risoDuplicatePaper} onChange={(e) => setRisoDuplicatePaper(e.target.value)} className="w-full px-2 py-1 border rounded mb-2 text-sm">
                        {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={risoDuplicateColor} onChange={(e) => setRisoDuplicateColor(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                        {paperColors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                {(risoBindingFormat === '1+2' || risoBindingFormat === '1+3') && (
                    <div className="p-3 bg-pink-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Triplicate</p>
                        <select value={risoTriplicatePaper} onChange={(e) => setRisoTriplicatePaper(e.target.value)} className="w-full px-2 py-1 border rounded mb-2 text-sm">
                            {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select value={risoTriplicateColor} onChange={(e) => setRisoTriplicateColor(e.target.value)} className="w-full px-2 py-1 border rounded text-sm">
                            {paperColors.map(c => <option key={c} value={c}>{c}</option>)}
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
            case 'Konica':
            case 'Offset':
            case 'Multicolor':
                return renderKonicaForm(); // Reuse generic form for offset/multicolor now
            case 'Riso': return renderRisoForm();
            case 'Flex': return renderFlexForm();
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
                                <div className="relative">
                                    <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md" list="edit-product-name-suggestions" />
                                    <datalist id="edit-product-name-suggestions">
                                        {productNames.map(name => <option key={name} value={name} />)}
                                    </datalist>
                                </div>
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

                    {/* Job List */}
                    {jobItems.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-lg font-semibold text-gray-800">Job Items ({jobItems.length})</h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {jobItems.map((job) => (
                                    <div key={job.id} className="p-4 flex justify-between items-start hover:bg-gray-50">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-gray-900">{job.productName}</h4>
                                                <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-medium">
                                                    {job.machine}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">{job.summary}</p>
                                            <p className="text-sm font-medium text-blue-600 mt-1">Qty: {job.quantity}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleEditJob(job.id)}
                                                className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50"
                                                title="Edit Job">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                </svg>
                                            </button>
                                            <button onClick={() => removeJob(job.id)}
                                                className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
                                                title="Remove Job">
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Machine-Specific Form (For Adding New Jobs) */}
                    {selectedMachine && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h2 className="text-lg font-semibold text-gray-800">Add {selectedMachine} Job</h2>
                            </div>
                            <div className="p-6">
                                {renderMachineForm()}
                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleAddJob}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                        </svg>
                                        Add Job to Order
                                    </button>
                                </div>
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
        </div >
    );
};

export default EditOrder;
