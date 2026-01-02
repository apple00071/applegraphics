import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { formatINR } from '../../utils/formatters';

import { supabase } from '../../lib/supabase';



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

// Fallback defaults if DB is empty
const DEFAULT_PAPER_SIZES = ['A4', 'A3', 'A5', 'Letter', 'Legal', '12x18', '13x19'];
const DEFAULT_PAPER_TYPES = ['70 GSM', '80 GSM', '90 GSM', '100 GSM', '120 GSM', 'Art Paper', 'Matte', 'Glossy'];
const DEFAULT_PAPER_COLORS = ['White', 'Yellow', 'Pink', 'Green', 'Blue'];
const DEFAULT_BINDING_TYPES = ['None', 'Perfect Binding', 'Spiral', 'Center Staple', 'Hard Bound', 'Glue Padding'];
const BINDING_FORMATS = ['1+1', '1+2', '1+3'];
const MEDIA_TYPES = ['Vinyl', 'Flex', 'Star Flex', 'One Way Vision', 'Canvas', 'Backlit'];

// --- Helper Functions ---

const createOrderDirectly = async (orderData: OrderData): Promise<OrderResult> => {
  try {
    console.log('Creates order with data:', orderData);

    // Direct insert only - skipping RPCs to avoid 404 errors
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

  // --- Dynamic Dropdown Options ---
  const [paperSizes, setPaperSizes] = useState<string[]>(DEFAULT_PAPER_SIZES);
  const [paperTypes, setPaperTypes] = useState<string[]>(DEFAULT_PAPER_TYPES);
  const [paperColors, setPaperColors] = useState<string[]>(DEFAULT_PAPER_COLORS);
  const [bindingTypes, setBindingTypes] = useState<string[]>(DEFAULT_BINDING_TYPES);
  const [productNames, setProductNames] = useState<string[]>([]); // For suggestions or dropdown if needed

  // --- Common Form State ---
  const [customerName, setCustomerName] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<MachineType | ''>('');
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);

  // --- Konica Specific State ---
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

  // --- Materials ---
  const [includeMaterials, setIncludeMaterials] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([{ material_id: '0', quantity: 1, unit_price: 0 }]);

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

  // Function to create a summary string for the job
  const getJobSummary = (machine: string, details: any) => {
    const parts = [`Machine: ${machine}`];
    if (details.paperSize) parts.push(`Size: ${details.paperSize}`);
    if (details.paperType) parts.push(`Paper: ${details.paperType}`);
    if (details.side) parts.push(`Side: ${details.side}`);
    return parts.join(', ');
  };

  // --- Print Job (Paper Catalog) ---

  // --- Effects ---
  useEffect(() => {
    fetchData();
    fetchDropdownOptions();
  }, []);

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

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, matRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('materials').select('*').order('name')
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (matRes.data) setMaterials(matRes.data);
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

  // --- Multi-Job Handlers ---
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

    // Collect details based on machine type
    if (selectedMachine === 'Konica') {
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
    // Add logic for other machines if needed (Offset, etc.)

    const newJob: JobItem = {
      id: Date.now().toString(),
      machine: selectedMachine,
      productName: productName || 'Print Job',
      quantity: quantity,
      details,
      summary: getJobSummary(selectedMachine, details)
    };

    setJobItems([...jobItems, newJob]);
    toast.success('Job added to order');

    // Optional: Reset common fields except customer
    // setProductName('');
    // setQuantity('');
  };

  const removeJob = (id: string) => {
    setJobItems(jobItems.filter(j => j.id !== id));
  };

  const calculateTotal = () => {
    if (!includeMaterials) return 0;
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const formatMultiJobNotes = () => {
    const jobBlocks = jobItems.map((job, index) => {
      let specs: string[] = [`Machine: ${job.machine}`, `Product: ${job.productName}`, `Quantity: ${job.quantity}`];

      const details = job.details;
      if (job.machine === 'Konica') {
        specs.push(
          `Paper Size: ${details.paperSize}`,
          `Paper Type: ${details.paperType}`,
          `Sides: ${details.side === 'double' ? 'Double Side' : 'Single Side'}`,
          `Color: ${details.colorMode === 'color' ? 'Color' : 'B/W'}`,
          `Pieces per Sheet: ${details.piecesPerSheet}`,
          `Post-Press: ${[details.cutting && 'Cutting', details.lamination && 'Lamination', details.plotter && 'Plotter'].filter(Boolean).join(', ') || 'None'}`
        );
      } else if (job.machine === 'Riso') {
        specs.push(
          `Size: ${details.paperSize}`,
          `Binding Format: ${details.bindingFormat}`,
          `Original: ${details.originalPaper} (${details.originalColor})`,
          `Duplicate: ${details.duplicatePaper} (${details.duplicateColor})`
        );
        if (details.bindingFormat === '1+2' || details.bindingFormat === '1+3') {
          specs.push(`Triplicate: ${details.triplicatePaper} (${details.triplicateColor})`);
        }
        specs.push(`Binding Type: ${details.bindingType}`);
      } else if (job.machine === 'Flex') {
        specs.push(
          `Size: ${details.width} x ${details.height}`,
          `Media: ${details.mediaType}`,
          `Revite: ${details.revite ? 'Yes' : 'No'}`,
          `Lopping: ${details.lopping ? 'Yes' : 'No'}`,
          `Frame: ${details.frame ? 'Yes' : 'No'}`
        );
        if (details.frame) {
          specs.push(`Frame Pasting By: ${details.framePastingBy}`, `Frame Location: ${details.frameLocation}`);
        }
      }

      return `=== JOB ${index + 1}: ${job.productName} ===\n${specs.join('\n')}`;
    });

    return `=== MULTI-JOB ORDER ===\n\n${jobBlocks.join('\n\n')}\n\n=== NOTES ===\n${additionalNotes}`;
  };

  const formatNotes = () => {
    let specs: string[] = [];

    if (selectedMachine === 'Konica' || selectedMachine === 'Offset' || selectedMachine === 'Multicolor') {
      const finalSize = konicaPaperSize === 'Custom' ? customPaperSize : konicaPaperSize;
      specs = [
        `Machine: ${selectedMachine}`,
        `Product: ${productName}`,
        `Paper Size: ${finalSize}`,
        `Paper Type: ${konicaPaperType}`,
        `Sides: ${konicaSide === 'double' ? 'Double Side' : 'Single Side'}`,
        `Color: ${konicaColorMode === 'color' ? 'Color' : 'B/W'}`,
        `Quantity: ${quantity}`,
        `Pieces per Sheet: ${konicaPiecesPerSheet}`,
        `Post-Press: ${[konicaCutting && 'Cutting', konicaLamination && 'Lamination', konicaPlotter && 'Plotter'].filter(Boolean).join(', ') || 'None'}`
      ];
    } else if (selectedMachine === 'Riso') {
      const finalRisoSize = risoSize === 'Custom' ? risoCustomSize : risoSize;
      specs = [
        `Machine: Riso`,
        `Product: ${productName}`,
        `Size: ${finalRisoSize}`,
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

    // Check if either items list is populated OR single form is filled
    if (jobItems.length === 0 && !selectedMachine) {
      toast.error('Please add at least one Job or select a Machine.');
      return;
    }

    if (jobItems.length === 0 && !productName) {
      toast.error('Please enter Product Name.');
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = calculateTotal();

      let formattedNotes = '';
      let generatedJobNumber = '';

      if (jobItems.length > 0) {
        formattedNotes = formatMultiJobNotes();
        // Use the first job's machine/product for ID generation
        generatedJobNumber = await generateJobNumber(jobItems[0].machine || 'Konica', jobItems[0].productName);
      } else {
        formattedNotes = formatNotes();
        generatedJobNumber = await generateJobNumber(selectedMachine, productName);
      }

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
        console.log("Processing materials for Order:", result.orderId);
        console.log("Raw items list:", items);

        // Filter out items that don't have a valid material selected
        const validItems = items.filter(i => {
          const isValid = i.material_id && String(i.material_id) !== '0';
          if (!isValid) console.warn("Filtering out invalid item:", i);
          return isValid;
        });

        console.log("Valid items to insert:", validItems);

        if (validItems.length > 0) {
          const orderItems = validItems.map(i => ({
            order_id: result.orderId,
            material_id: i.material_id,
            quantity: i.quantity,
            unit_price: i.unit_price
          }));

          const { data: insertedItems, error: itemsError } = await supabase
            .from('order_items')
            .insert(orderItems)
            .select();

          if (itemsError) {
            console.error("Materials insert failed:", itemsError);
            toast.error(`Error adding materials: ${itemsError.message}`);
          } else {
            console.log("Successfully inserted items:", insertedItems);

            // Update stock
            for (const item of validItems) {
              const mat = materials.find(m => m.id === item.material_id);
              if (mat) {
                await supabase.from('materials')
                  .update({ current_stock: mat.current_stock - item.quantity })
                  .eq('id', item.material_id);
              }
            }
          }
        } else {
          console.warn("Materials enabled but no valid items found to save.");
          toast('Note: Order created but no materials were added (empty selection).', { icon: '⚠️' });
        }
      } else {
        console.log("Skipping materials. IncludeMaterials:", includeMaterials);
      }

      toast.success(`Order ${generatedJobNumber} created!`);


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
      {/* Row 1: Quantity, Size, Type, Pieces */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
            placeholder="Qty" min="1" />
        </div>
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
              placeholder="e.g. 10x10"
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Pcs/Sheet</label>
          <input type="number" value={konicaPiecesPerSheet} onChange={(e) => setKonicaPiecesPerSheet(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md" min="1" />
        </div>
      </div>

      {/* Row 2: Sides, Color, Post-Press (Compacted) */}
      <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg border border-gray-100 items-center">
        {/* Sides */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-700">Sides:</span>
          <div className="flex bg-white rounded-md border border-gray-200 p-1">
            <button type="button" onClick={() => setKonicaSide('single')}
              className={`px-3 py-1 text-xs font-medium rounded ${konicaSide === 'single' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Single</button>
            <button type="button" onClick={() => setKonicaSide('double')}
              className={`px-3 py-1 text-xs font-medium rounded ${konicaSide === 'double' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}>Double</button>
          </div>
        </div>

        {/* Color */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-6">
          <span className="text-sm font-bold text-gray-700">Color:</span>
          <div className="flex bg-white rounded-md border border-gray-200 p-1">
            <button type="button" onClick={() => setKonicaColorMode('color')}
              className={`px-3 py-1 text-xs font-medium rounded ${konicaColorMode === 'color' ? 'bg-pink-100 text-pink-700' : 'text-gray-600 hover:bg-gray-50'}`}>Color</button>
            <button type="button" onClick={() => setKonicaColorMode('bw')}
              className={`px-3 py-1 text-xs font-medium rounded ${konicaColorMode === 'bw' ? 'bg-gray-200 text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}>B/W</button>
          </div>
        </div>

        {/* Post Press */}
        <div className="flex items-center gap-4 border-l border-gray-200 pl-6 flex-1">
          <span className="text-sm font-bold text-gray-700">Finishing:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={konicaCutting} onChange={(e) => setKonicaCutting(e.target.checked)} className="rounded text-blue-600" />
            <span className="text-sm">Cutting</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={konicaLamination} onChange={(e) => setKonicaLamination(e.target.checked)} className="rounded text-blue-600" />
            <span className="text-sm">Lamination</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={konicaPlotter} onChange={(e) => setKonicaPlotter(e.target.checked)} className="rounded text-blue-600" />
            <span className="text-sm">Plotter</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderRisoForm = () => (
    <div className="space-y-4">
      {/* Row 1: Quantity, Size, Binding Format, Binding Type - Refactored to 4 cols */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
            placeholder="Qty" min="1" />
        </div>
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

      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
        <h4 className="text-sm font-medium text-gray-800">Paper Layers</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Original Paper</label>
            <select value={risoOriginalPaper} onChange={(e) => setRisoOriginalPaper(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Original Color</label>
            <select value={risoOriginalColor} onChange={(e) => setRisoOriginalColor(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {paperColors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duplicate Paper</label>
            <select value={risoDuplicatePaper} onChange={(e) => setRisoDuplicatePaper(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Duplicate Color</label>
            <select value={risoDuplicateColor} onChange={(e) => setRisoDuplicateColor(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
              {paperColors.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {(risoBindingFormat === '1+2' || risoBindingFormat === '1+3') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Triplicate Paper</label>
              <select value={risoTriplicatePaper} onChange={(e) => setRisoTriplicatePaper(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
                {paperTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Triplicate Color</label>
              <select value={risoTriplicateColor} onChange={(e) => setRisoTriplicateColor(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded">
                {paperColors.map(c => <option key={c} value={c}>{c}</option>)}
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
          <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-bold text-gray-900"
            placeholder="Qty" min="1" />
        </div>
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



  const renderMachineForm = () => {
    switch (selectedMachine) {
      case 'Konica':
      case 'Offset':
      case 'Multicolor':
        return renderKonicaForm();
      case 'Riso': return renderRisoForm();
      case 'Flex': return renderFlexForm();
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button onClick={() => navigate('/orders')}
              className="mr-4 p-2 rounded-full hover:bg-white hover:shadow-sm text-gray-500 transition-all">
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Order</h1>
              <p className="text-xs text-gray-500 mt-1">Order # auto-generated (AG + Machine + Product + Seq)</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN - MAIN FORM (8 cols) */}
          <div className="lg:col-span-8 space-y-6">

            {/* 1. Machine Selection */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">Select Machine</h2>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {MACHINE_TYPES.map(machine => (
                    <button key={machine} type="button"
                      onClick={() => setSelectedMachine(machine)}
                      className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all whitespace-nowrap shadow-sm
                        ${selectedMachine === machine
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-white hover:bg-gray-50'}`}>
                      {machine}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. Order Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">Order Details</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <div className="relative">
                    <input type="text" list="customer-suggestions" value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search or enter customer..." />
                    <datalist id="customer-suggestions">
                      {customers.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="e.g., Visiting Card"
                      list="product-name-suggestions"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                    <datalist id="product-name-suggestions">
                      {productNames.map(name => <option key={name} value={name} />)}
                    </datalist>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Attach File (Optional)</label>
                  <div className="flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                    <label className="cursor-pointer bg-white text-blue-600 px-4 py-2 rounded-md hover:bg-blue-50 transition-colors border border-gray-200 text-sm font-medium shadow-sm">
                      Choose File
                      <input type="file" onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setFile(e.target.files[0]);
                        }
                      }} className="hidden" />
                    </label>
                    <span className="text-sm text-gray-500 truncate">{file ? file.name : 'No file chosen'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2.5 Job List (Multi-Item) */}
            {jobItems.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                <div className="px-6 py-4 border-b border-gray-100 bg-blue-50/50 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Jobs in this Order ({jobItems.length})</h2>
                </div>
                <div className="p-4 space-y-3">
                  {jobItems.map((job, idx) => (
                    <div key={job.id} className="border border-blue-100 rounded-lg p-3 bg-blue-50/30 flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-gray-800">Job {idx + 1}: {job.productName}</h4>
                        <p className="text-sm text-gray-600 mt-1">{job.summary}</p>
                        <p className="text-xs text-gray-500 mt-1">Qty: {job.quantity}</p>
                      </div>
                      <button onClick={() => removeJob(job.id)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2 py-1">
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Machine Specifications */}
            {selectedMachine && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">{selectedMachine} Specifications</h2>
                </div>
                <div className="p-6">


                  {renderMachineForm()}

                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <button type="button" onClick={handleAddJob}
                      className="w-full py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Job to Order List
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">
                      (Add multiple jobs here, then click "Create Order" on the right when finished)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Additional Notes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">Additional Notes</h2>
              </div>
              <div className="p-6">
                <textarea rows={3} value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any special instructions..." />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN - SIDEBAR (4 cols) */}
          <div className="lg:col-span-4 space-y-6">

            {/* ACTIONS CARD (Sticky on Desktop) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6 z-10">
              <button onClick={handleSubmit} disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-lg font-bold hover:from-blue-700 hover:to-indigo-700 shadow-md disabled:opacity-70 flex justify-center items-center gap-2 transition-transform active:scale-95">
                {isLoading ? 'Creating...' : (
                  <>
                    <span>Create Order</span>
                    <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </>
                )}
              </button>
            </div>


            {/* MATERIALS CARD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Materials</h2>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={includeMaterials}
                    onChange={(e) => setIncludeMaterials(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Enable</span>
                </label>
              </div>
              {includeMaterials && (
                <div className="p-4">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2 last:mb-0 items-center">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Material</label>
                        <select value={item.material_id}
                          onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mt-1">
                          <option value="0">Select Material</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} (Stock: {m.current_stock})</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-16">
                        <label className="text-xs text-gray-500">Qty</label>
                        <input type="number" min="1" value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm mt-1 text-center" />
                      </div>
                      <div className="w-20">
                        <label className="text-xs text-gray-500">Cost</label>
                        <div className="mt-2.5 text-sm font-medium text-right">{formatINR(item.unit_price * item.quantity)}</div>
                      </div>
                      <div className="pt-5">
                        <button onClick={() => removeItem(index)} disabled={items.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:opacity-30">✕</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addItem}
                    className="mt-3 w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium">
                    + Add Material
                  </button>
                  <div className="mt-4 text-right font-bold text-lg text-blue-600">
                    Total: {formatINR(calculateTotal())}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOrder;
