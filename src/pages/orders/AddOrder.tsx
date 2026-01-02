import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatINR } from '../../utils/formatters';

import { supabase } from '../../lib/supabase';
import { PrinterService, TrayStatus } from '../../services/printerService';


// --- Types & Interfaces ---

interface OrderData {
  customerName: string;
  orderDate: string;
  requiredDate: string;
  status: string;
  notes: string;
  totalAmount: number;
  jobNumber?: string;
}

interface OrderResult {
  success: boolean;
  orderId?: string;
  message: string;
}

interface Material {
  id: string;
  name: string;
  current_stock: number;
  unit_price: number;
  unit_of_measure: string;
}

interface OrderItem {
  material_id: string;
  quantity: number;
  unit_price: number;
}

interface Customer {
  id: number;
  name: string;
}

// --- Constants ---
const MACHINE_TYPES = ['Konica', 'Riso', 'Flex', 'Offset', 'Multicolor'] as const;
type MachineType = typeof MACHINE_TYPES[number];

const PAPER_SIZES = ['A4', 'A3', 'A5', 'Letter', 'Legal', 'Custom'];
const PAPER_TYPES = ['70 GSM', '80 GSM', '90 GSM', '100 GSM', '120 GSM', 'Art Paper', 'Matte', 'Glossy'];
const PAPER_COLORS = ['White', 'Yellow', 'Pink', 'Green', 'Blue'];
const BINDING_FORMATS = ['1+1', '1+2', '1+3'];
const BINDING_TYPES = ['None', 'Perfect Binding', 'Spiral', 'Center Staple', 'Hard Bound', 'Glue Padding'];
const MEDIA_TYPES = ['Vinyl', 'Flex', 'Star Flex', 'One Way Vision', 'Canvas', 'Backlit'];

// --- Helper Functions ---

const createOrderDirectly = async (orderData: OrderData): Promise<OrderResult> => {
  try {
    console.log('Creates order with data:', orderData);

    try {
      const { data: v2Data, error: v2Error } = await supabase.rpc('insert_order_v2', {
        customer_name_param: orderData.customerName,
        order_date_text: orderData.orderDate,
        required_date_text: orderData.requiredDate,
        status_text: orderData.status,
        notes_text: orderData.notes,
        total_amount_val: Number(orderData.totalAmount),
        job_number_text: orderData.jobNumber || undefined
      });

      if (!v2Error) {
        return { success: true, orderId: v2Data, message: "Order created successfully" };
      }

      const { data: flexibleData, error: flexibleError } = await supabase.rpc('flexible_insert_order', {
        name_param: orderData.customerName,
        order_date_text: orderData.orderDate,
        required_date_text: orderData.requiredDate,
        status_text: orderData.status,
        notes_text: orderData.notes,
        total_amount_val: Number(orderData.totalAmount),
        job_number_text: orderData.jobNumber || undefined
      });

      if (!flexibleError) {
        return { success: true, orderId: flexibleData, message: "Order created successfully" };
      }
    } catch (flexError) {
      console.error("RPC insertion failed, trying direct insert:", flexError);
    }

    const { data: directData, error: directError } = await supabase
      .from('orders')
      .insert([{
        customer_name: orderData.customerName,
        order_date: orderData.orderDate,
        required_date: orderData.requiredDate,
        status: orderData.status,
        notes: orderData.notes,
        total_amount: orderData.totalAmount,
        job_number: orderData.jobNumber || undefined
      }])
      .select()
      .single();

    if (directError) throw directError;

    return { success: true, orderId: directData.id, message: "Order created successfully" };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return { success: false, orderId: undefined, message: error.message || "Failed to create order" };
  }
};

const generateJobNumber = async (machineType: string, productName: string): Promise<string> => {
  const machineCode = machineType.charAt(0).toUpperCase();
  const productCode = productName.charAt(0).toUpperCase();
  const prefix = `AG${machineCode}${productCode}`;

  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('job_number')
      .like('job_number', `${prefix}%`)
      .order('job_number', { ascending: false })
      .limit(1);

    let nextSequence = 1;

    if (!error && orders && orders.length > 0 && orders[0].job_number) {
      const lastJobNumber = orders[0].job_number;
      const sequencePart = lastJobNumber.substring(prefix.length);
      const lastSequence = parseInt(sequencePart, 10);

      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }

    const sequenceStr = nextSequence.toString().padStart(2, '0');
    return `${prefix}${sequenceStr}`;
  } catch (error) {
    console.error('Error generating job number:', error);
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}${timestamp}`;
  }
};

const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

// --- Component ---

const AddOrder: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);

  // --- Common Form State ---
  const [customerName, setCustomerName] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<MachineType | ''>('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

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

  // --- Materials ---
  const [includeMaterials, setIncludeMaterials] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([{ material_id: '0', quantity: 1, unit_price: 0 }]);

  // --- Print Job (Paper Catalog) ---
  const [trays, setTrays] = useState<TrayStatus[]>([]);
  const [selectedTrayId, setSelectedTrayId] = useState<number | ''>('');
  const [createPrintJob, setCreatePrintJob] = useState(false);
  // --- Effects ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, matRes, traysRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('materials').select('*').order('name'),
        PrinterService.getTrayStatus()
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (matRes.data) setMaterials(matRes.data);
      if (traysRes) setTrays(traysRes);
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Failed to load form data");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Handlers ---
  const handleItemChange = (index: number, field: keyof OrderItem, value: any) => {
    const newItems = [...items];
    if (field === 'material_id') {
      const material = materials.find(m => String(m.id) === String(value));
      if (material) {
        newItems[index].material_id = material.id;
        newItems[index].unit_price = material.unit_price;
      }
    } else {
      // @ts-ignore
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => setItems([...items, { material_id: '0', quantity: 1, unit_price: 0 }]);

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const calculateTotal = () => {
    if (!includeMaterials) return 0;
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
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
    if (!customerName) {
      toast.error('Customer Name is mandatory.');
      return;
    }
    if (!selectedMachine) {
      toast.error('Please select a Machine Type.');
      return;
    }
    if (!productName) {
      toast.error('Please enter Product Name.');
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = calculateTotal();
      const formattedNotes = formatNotes();
      const generatedJobNumber = await generateJobNumber(selectedMachine, productName);

      const result = await createOrderDirectly({
        customerName,
        orderDate: new Date().toISOString(),
        requiredDate: new Date().toISOString(),
        status: 'pending',
        notes: formattedNotes,
        totalAmount,
        jobNumber: generatedJobNumber
      });

      if (!result.success) {
        toast.error(`Error: ${result.message}`);
        return;
      }

      // Handle File Upload (if selected)
      if (result.orderId && file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${result.orderId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('print-jobs')
          .upload(filePath, file);

        if (uploadError) {
          console.error('File upload error:', uploadError);
          toast.error('Order created, but file upload failed.');
        } else {
          // Update order with file path
          const { error: updateError } = await supabase
            .from('orders')
            .update({ file_path: filePath })
            .eq('id', result.orderId);

          if (updateError) {
            console.error('Failed to update order with file path:', updateError);
          }
        }
      }

      // Handle Materials
      if (result.orderId && includeMaterials) {
        const orderItems = items.map(i => ({
          order_id: result.orderId,
          material_id: i.material_id,
          quantity: i.quantity,
          unit_price: i.unit_price
        }));

        const { error: itemsError } = await supabase.from('order_items').insert(orderItems);

        if (itemsError) {
          console.error("Materials insert failed:", itemsError);
          toast.error("Order created, but materials could not be added.");
        } else {
          for (const item of items) {
            const mat = materials.find(m => m.id === item.material_id);
            if (mat) {
              await supabase.from('materials')
                .update({ current_stock: mat.current_stock - item.quantity })
                .eq('id', item.material_id);
            }
          }
        }
      }

      toast.success(`Order ${generatedJobNumber} created!`);

      // Handle Print Job (Queue)
      if (result.orderId && createPrintJob && selectedTrayId) {
        const tray = trays.find(t => t.id === Number(selectedTrayId));
        if (tray) {
          await supabase.from('print_jobs').insert([{
            printer_id: tray.printer_id,
            order_id: result.orderId,
            job_name: `Order #${generatedJobNumber} - ${productName}`,
            status: 'queued',
            tray_requested: tray.tray_name,
            paper_size: tray.paper_size,
            paper_type: tray.paper_type,
            copies: Number(quantity) || 1,
            duplex: konicaSide === 'double',
            color_mode: konicaColorMode,
            total_pages: 1, // Placeholder
            submitted_by: 'Order Form'
          }]);
        }
      }
      navigate('/orders');

    } catch (err: any) {
      console.error(err);
      toast.error('Unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };


  // --- Render Machine-Specific Forms ---

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
          <label className="block text-sm font-medium text-gray-700 mb-1">Pieces/Sheet</label>
          <input type="number" value={konicaPiecesPerSheet} onChange={(e) => setKonicaPiecesPerSheet(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" min="1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sides</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={konicaSide === 'single'} onChange={() => setKonicaSide('single')} />
              Single
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={konicaSide === 'double'} onChange={() => setKonicaSide('double')} />
              Double
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Color Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" checked={konicaColorMode === 'color'} onChange={() => setKonicaColorMode('color')} />
              Color
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={konicaColorMode === 'bw'} onChange={() => setKonicaColorMode('bw')} />
              B/W
            </label>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Post-Press</label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={konicaCutting} onChange={(e) => setKonicaCutting(e.target.checked)} />
            Cutting
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={konicaLamination} onChange={(e) => setKonicaLamination(e.target.checked)} />
            Lamination
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={konicaPlotter} onChange={(e) => setKonicaPlotter(e.target.checked)} />
            Plotter
          </label>
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

      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h4 className="text-sm font-medium text-gray-800">Paper Layers</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Original Paper</label>
            <select value={risoOriginalPaper} onChange={(e) => setRisoOriginalPaper(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {PAPER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Original Color</label>
            <select value={risoOriginalColor} onChange={(e) => setRisoOriginalColor(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {PAPER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duplicate Paper</label>
            <select value={risoDuplicatePaper} onChange={(e) => setRisoDuplicatePaper(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {PAPER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duplicate Color</label>
            <select value={risoDuplicateColor} onChange={(e) => setRisoDuplicateColor(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {PAPER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {(risoBindingFormat === '1+2' || risoBindingFormat === '1+3') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Triplicate Paper</label>
              <select value={risoTriplicatePaper} onChange={(e) => setRisoTriplicatePaper(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
                {PAPER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Triplicate Color</label>
              <select value={risoTriplicateColor} onChange={(e) => setRisoTriplicateColor(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
                {PAPER_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="e.g., 6" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Media Type</label>
          <select value={flexMediaType} onChange={(e) => setFlexMediaType(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md">
            {MEDIA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Finishing Options</label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flexRevite} onChange={(e) => setFlexRevite(e.target.checked)} />
            Revite (Eyelet)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flexLopping} onChange={(e) => setFlexLopping(e.target.checked)} />
            Lopping
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={flexFrame} onChange={(e) => setFlexFrame(e.target.checked)} />
            Frame
          </label>
        </div>
      </div>

      {flexFrame && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-3">Frame Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pasting By</label>
              <input type="text" value={flexFramePastingBy} onChange={(e) => setFlexFramePastingBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Who is pasting?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frame Location</label>
              <input type="text" value={flexFrameLocation} onChange={(e) => setFlexFrameLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Where to fix?" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderOffsetMulticolorForm = () => (
    <div className="text-gray-500 text-sm italic p-4 bg-gray-50 rounded-lg">
      Additional fields for {selectedMachine} coming soon. Currently using common fields only.
    </div>
  );

  const renderMachineForm = () => {
    switch (selectedMachine) {
      case 'Konica': return renderKonicaForm();
      case 'Riso': return renderRisoForm();
      case 'Flex': return renderFlexForm();
      case 'Offset':
      case 'Multicolor': return renderOffsetMulticolorForm();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button onClick={() => navigate('/orders')}
              className="mr-4 p-2 rounded-full hover:bg-white hover:shadow-sm text-gray-500 transition-all">
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Order</h1>
              <p className="text-sm text-gray-500 mt-1">Order # auto-generated (AG + Machine + Product + Seq)</p>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={isLoading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-md disabled:opacity-70">
            {isLoading ? 'Creating...' : 'Create Order'}
          </button>
        </div>

        <div className="space-y-6">

          {/* 1. Machine Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Select Machine</h2>
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

          {/* 2. Customer & Common Fields */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Order Details</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                <input type="text" list="customer-suggestions" value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Search or enter customer..." />
                <datalist id="customer-suggestions">
                  {customers.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Visiting Card" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., 500" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (Optional)</label>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setFile(e.target.files[0]);
                    }
                  }}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
            </div>
          </div>

          {/* 3. Machine-Specific Form */}
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

          {/* 4. Printer Tray Selection (Optional) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Printer Tray Selection</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createPrintJob}
                  onChange={(e) => setCreatePrintJob(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Add to Print Queue</span>
              </label>
            </div>

            {createPrintJob && (
              <div className="p-6 bg-blue-50/50 border-t border-blue-100">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Paper Source</label>
                <select
                  value={selectedTrayId}
                  onChange={(e) => setSelectedTrayId(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">-- Select Tray --</option>
                  {trays.filter(t => t.is_active).map(tray => (
                    <option key={tray.id} value={tray.id}>
                      {tray.tray_name}: {tray.paper_size} - {tray.paper_type} ({tray.color}) [{tray.paper_weight_gsm}gsm]
                    </option>
                  ))}
                </select>
                {selectedTrayId && (() => {
                  const t = trays.find(tr => tr.id === Number(selectedTrayId));
                  return t ? (
                    <p className="mt-2 text-sm text-blue-600 flex items-center">
                      <span className="mr-2">ℹ️</span>
                      {t.sheets_loaded} sheets remaining in {t.tray_name}
                    </p>
                  ) : null;
                })()}
              </div>
            )}
          </div>

          {/* 5. Additional Notes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-semibold text-gray-800">Additional Notes</h2>
            </div>
            <div className="p-6">
              <textarea rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Any special instructions..." />
            </div>
          </div>

          {/* 6. Materials (Optional) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Materials</h2>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeMaterials}
                  onChange={(e) => setIncludeMaterials(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded" />
                <span className="text-sm text-gray-600">Track Stock</span>
              </label>
            </div>

            {includeMaterials && (
              <div className="p-4 space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-4 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Material</label>
                      <select value={item.material_id}
                        onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                        className="w-full text-sm border-gray-300 rounded-md mt-1">
                        <option value="0">Select Material</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name} (Stock: {m.current_stock})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500">Qty</label>
                      <input type="number" min="1" value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="w-full text-sm border-gray-300 rounded-md mt-1" />
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-gray-500">Cost</label>
                      <div className="mt-1 text-sm font-medium">{formatINR(item.unit_price * item.quantity)}</div>
                    </div>
                    <button onClick={() => removeItem(index)} disabled={items.length === 1}
                      className="text-red-500 hover:text-red-700 disabled:opacity-30">✕</button>
                  </div>
                ))}
                <button onClick={addItem}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500">
                  + Add Material
                </button>
                <div className="text-right font-bold text-lg text-blue-600">
                  Total: {formatINR(calculateTotal())}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AddOrder;
