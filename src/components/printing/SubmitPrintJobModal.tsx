import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { PrinterService, PrinterTray } from '../../services/printerService';

interface SubmitPrintJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    prefillOrderId?: string;
    prefillJobName?: string;
}

const SubmitPrintJobModal: React.FC<SubmitPrintJobModalProps> = ({ isOpen, onClose, onSuccess, prefillOrderId, prefillJobName }) => {
    const [loading, setLoading] = useState(false);
    const [trays, setTrays] = useState<PrinterTray[]>([]);
    const [loadingTrays, setLoadingTrays] = useState(false);
    // Tab State
    const [activeTab, setActiveTab] = useState<'general' | 'layout' | 'finishing'>('general');

    // Form State
    const [jobName, setJobName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [trayId, setTrayId] = useState<number | ''>('');
    const [copies, setCopies] = useState(1);
    const [duplex, setDuplex] = useState(false);
    const [colorMode, setColorMode] = useState<'color' | 'grayscale'>('color');
    const [paperSize, setPaperSize] = useState('A4');

    // Advanced Layout State
    const [nUp, setNUp] = useState<number>(1);
    const [booklet, setBooklet] = useState<'off' | 'booklet' | '2-in-1'>('off');
    const [bindingPosition, setBindingPosition] = useState<'left' | 'right' | 'top'>('left');
    const [imageShiftX, setImageShiftX] = useState<number>(0);
    const [imageShiftY, setImageShiftY] = useState<number>(0);

    // Advanced Finishing State
    const [staple, setStaple] = useState<'none' | 'top-left' | 'top-right' | 'dual-left' | 'dual-top' | 'saddle'>('none');
    const [punch, setPunch] = useState<'none' | '2-hole' | '3-hole' | '4-hole'>('none');
    const [fold, setFold] = useState<'none' | 'center' | 'tri-in' | 'tri-out' | 'z-fold'>('none');
    const [outputTray, setOutputTray] = useState<'auto' | 'main' | 'sub'>('auto');
    const [sort, setSort] = useState<'sort' | 'group'>('sort');

    // Load Paper Catalog on mount
    useEffect(() => {
        if (isOpen) {
            loadCatalog();
            // Reset form
            setJobName(prefillJobName || '');
            setFile(null);
            setTrayId('');
            setCopies(1);
            setDuplex(false);
            setColorMode('color');
            setActiveTab('general');

            // Reset Advanced
            setNUp(1);
            setBooklet('off');
            setBindingPosition('left');
            setImageShiftX(0);
            setImageShiftY(0);
            setStaple('none');
            setPunch('none');
            setFold('none');
            setOutputTray('auto');
            setSort('sort');
        }
    }, [isOpen, prefillJobName]);

    const loadCatalog = async () => {
        setLoadingTrays(true);
        try {
            const data = await PrinterService.getPaperCatalog();
            setTrays(data.filter(t => t.is_active));
            if (data.length > 0) {
                setTrayId(data[0].id);
            }
        } catch (error) {
            console.error(error);
            toast.error('Failed to load paper catalog');
        } finally {
            setLoadingTrays(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

            if (!allowedTypes.includes(selectedFile.type)) {
                toast.error('Only PDF, JPEG, and PNG files are supported');
                return;
            }
            setFile(selectedFile);
            if (!jobName) {
                setJobName(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !trayId) {
            toast.error('Please select a PDF file and a tray');
            return;
        }

        setLoading(true);
        try {
            const selectedTray = trays.find(t => t.id === Number(trayId));
            if (!selectedTray) throw new Error('Invalid tray selected');

            await PrinterService.submitPrintJob({
                jobName,
                pdfBlob: file,
                trayNumber: selectedTray.tray_number,
                paperSize: paperSize, // Use user selection
                paperType: selectedTray.paper_type,
                copies,
                duplex,
                colorMode,
                orderId: prefillOrderId,
                submittedBy: 'User',
                // Advanced Pass-through
                nUp, booklet, bindingPosition, imageShiftX, imageShiftY,
                staple, punch, fold, outputTray, sort
            });

            toast.success('Print job submitted successfully');
            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Failed to submit print job');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const renderGeneralTab = () => (
        <div className="space-y-4">
            {/* File Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File (PDF, JPG, PNG)</label>
                <input
                    type="file"
                    accept=".pdf, .jpg, .jpeg, .png"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                />
            </div>

            {/* Job Name */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
                <input
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter job name"
                    required
                />
            </div>

            {/* Tray / Media Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Paper Source</h4>
                    {loadingTrays && <span className="text-xs text-blue-500">Loading...</span>}
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Select Tray</label>
                    <select
                        value={trayId}
                        onChange={(e) => {
                            const tid = Number(e.target.value);
                            setTrayId(tid);
                            // Auto-update paper size if tray implies it
                            const t = trays.find(tr => tr.id === tid);
                            if (t && t.paper_size && t.paper_size !== 'Custom') {
                                setPaperSize(t.paper_size);
                            }
                        }}
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        required
                    >
                        <option value="">-- Select Input Tray --</option>
                        {trays.map(tray => (
                            <option key={tray.id} value={tray.id}>
                                {tray.tray_name} ({tray.paper_size})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Paper Size Override */}
                <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Paper Size</label>
                    <select
                        value={paperSize}
                        onChange={(e) => setPaperSize(e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="A4">A4</option>
                        <option value="A3">A3</option>
                        <option value="Letter">Letter</option>
                        <option value="Legal">Legal</option>
                        <option value="11x17">11x17 (Tabloid)</option>
                        <option value="12x18">12x18</option>
                        <option value="13x19">13x19 (Super B)</option>
                        <option value="Custom">Custom</option>
                    </select>
                </div>

                {/* Current Media Data (ReadOnly visual block) */}
                {trayId ? (() => {
                    const t = trays.find(tr => tr.id === Number(trayId));
                    if (!t) return null;
                    return (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                            <h5 className="text-xs font-semibold text-gray-800 mb-2">Current Media Data</h5>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-400">Paper Type</label>
                                    <div className="text-sm font-medium text-gray-900 bg-white px-2 py-1 border border-gray-200 rounded">
                                        {t.paper_type}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-400">Paper Weight</label>
                                    <div className="text-sm font-medium text-gray-900 bg-white px-2 py-1 border border-gray-200 rounded">
                                        {t.paper_weight_gsm} g/m²
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-400">Color</label>
                                    <div className="text-sm font-medium text-gray-900 bg-white px-2 py-1 border border-gray-200 rounded">
                                        {t.color}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-gray-400">Current Level</label>
                                    <div className="text-sm font-medium text-gray-900 bg-white px-2 py-1 border border-gray-200 rounded flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${t.status === 'Empty' ? 'bg-red-500' : t.status === 'Low' ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                                        {t.sheets_loaded} sheets
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })() : (
                    <div className="text-xs text-gray-400 italic text-center py-2">
                        Select a tray to view media details
                    </div>
                )}
            </div>

            {/* Basic Options */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Copies</label>
                    <input
                        type="number"
                        min="1"
                        max="999"
                        value={copies}
                        onChange={(e) => setCopies(parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color Mode</label>
                    <select
                        value={colorMode}
                        onChange={(e) => setColorMode(e.target.value as 'color' | 'grayscale')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                        <option value="color">Color</option>
                        <option value="grayscale">Grayscale</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center">
                <input
                    id="duplex"
                    type="checkbox"
                    checked={duplex}
                    onChange={(e) => setDuplex(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="duplex" className="ml-2 block text-sm text-gray-900">
                    Double-sided (Duplex)
                </label>
            </div>
        </div>
    );

    const renderLayoutTab = () => (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Page Layout</h4>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Imposition (N-Up)</label>
                    <select
                        value={nUp}
                        onChange={(e) => setNUp(Number(e.target.value))}
                        className="w-full text-sm border-gray-300 rounded-md"
                    >
                        <option value={1}>1 Page / Sheet</option>
                        <option value={2}>2 Pages / Sheet</option>
                        <option value={4}>4 Pages / Sheet</option>
                        <option value={6}>6 Pages / Sheet</option>
                        <option value={9}>9 Pages / Sheet</option>
                        <option value={16}>16 Pages / Sheet</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Booklet Mode</label>
                    <select
                        value={booklet}
                        onChange={(e) => setBooklet(e.target.value as any)}
                        className="w-full text-sm border-gray-300 rounded-md"
                    >
                        <option value="off">Off</option>
                        <option value="booklet">Booklet</option>
                        <option value="2-in-1">2-in-1 Booklet</option>
                    </select>
                </div>
            </div>

            {booklet !== 'off' && (
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Binding Position</label>
                    <div className="flex gap-4">
                        <label className="flex items-center text-xs">
                            <input type="radio" value="left" checked={bindingPosition === 'left'} onChange={() => setBindingPosition('left')} className="mr-1" /> Left Bind
                        </label>
                        <label className="flex items-center text-xs">
                            <input type="radio" value="right" checked={bindingPosition === 'right'} onChange={() => setBindingPosition('right')} className="mr-1" /> Right Bind
                        </label>
                        <label className="flex items-center text-xs">
                            <input type="radio" value="top" checked={bindingPosition === 'top'} onChange={() => setBindingPosition('top')} className="mr-1" /> Top Bind
                        </label>
                    </div>
                </div>
            )}

            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1 pt-2">Image Shift</h4>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">X Offset (mm)</label>
                    <input
                        type="number"
                        value={imageShiftX}
                        onChange={(e) => setImageShiftX(Number(e.target.value))}
                        className="w-full text-sm border-gray-300 rounded-md"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Y Offset (mm)</label>
                    <input
                        type="number"
                        value={imageShiftY}
                        onChange={(e) => setImageShiftY(Number(e.target.value))}
                        className="w-full text-sm border-gray-300 rounded-md"
                    />
                </div>
            </div>
        </div>
    );

    const renderFinishingTab = () => (
        <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 border-b pb-1">Finishing Options</h4>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Staple</label>
                    <select
                        value={staple}
                        onChange={(e) => setStaple(e.target.value as any)}
                        className="w-full text-sm border-gray-300 rounded-md"
                    >
                        <option value="none">None</option>
                        <option value="top-left">Top Left</option>
                        <option value="top-right">Top Right</option>
                        <option value="dual-left">2-Point Left</option>
                        <option value="dual-top">2-Point Top</option>
                        <option value="saddle">Saddle Stitch</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Punch</label>
                    <select
                        value={punch}
                        onChange={(e) => setPunch(e.target.value as any)}
                        className="w-full text-sm border-gray-300 rounded-md"
                    >
                        <option value="none">None</option>
                        <option value="2-hole">2-Hole</option>
                        <option value="3-hole">3-Hole</option>
                        <option value="4-hole">4-Hole</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Fold</label>
                    <select
                        value={fold}
                        onChange={(e) => setFold(e.target.value as any)}
                        className="w-full text-sm border-gray-300 rounded-md"
                    >
                        <option value="none">None</option>
                        <option value="center">Center Fold</option>
                        <option value="tri-in">Tri-Fold (In)</option>
                        <option value="tri-out">Tri-Fold (Out)</option>
                        <option value="z-fold">Z-Fold</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Output Tray</label>
                    <select
                        value={outputTray}
                        onChange={(e) => setOutputTray(e.target.value as any)}
                        className="w-full text-sm border-gray-300 rounded-md"
                    >
                        <option value="auto">Auto</option>
                        <option value="main">Main Tray</option>
                        <option value="sub">Sub Tray</option>
                    </select>
                </div>
            </div>

            <div className="pt-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Sort / Group</label>
                <div className="flex gap-4">
                    <label className="flex items-center text-xs">
                        <input type="radio" value="sort" checked={sort === 'sort'} onChange={() => setSort('sort')} className="mr-1" /> Sort (Collated)
                    </label>
                    <label className="flex items-center text-xs">
                        <input type="radio" value="group" checked={sort === 'group'} onChange={() => setSort('group')} className="mr-1" /> Group (Uncollated)
                    </label>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">New Print Job</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">✕</button>
                </div>

                {/* Tab Header */}
                <div className="flex border-b border-gray-200">
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('general')}
                    >
                        General
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'layout' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('layout')}
                    >
                        Layout
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'finishing' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('finishing')}
                    >
                        Finishing
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} id="print-form">
                        {activeTab === 'general' && renderGeneralTab()}
                        {activeTab === 'layout' && renderLayoutTab()}
                        {activeTab === 'finishing' && renderFinishingTab()}
                    </form>
                </div>

                {/* Footer / Actions */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="print-form"
                        disabled={loading || !file}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Submitting...' : 'Print Job'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SubmitPrintJobModal;
