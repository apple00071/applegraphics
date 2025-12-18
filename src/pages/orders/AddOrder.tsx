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
  customerContact?: string;
  customerEmail?: string;
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
// Initial Fallbacks in case DB is empty or loading
const INITIAL_PRODUCT_OPTIONS = ['Other'];
const INITIAL_BINDING_OPTIONS = ['None', 'Other'];
const INITIAL_PAPER_OPTIONS = ['Other'];
const INITIAL_PAPER_COLOR_OPTIONS = ['White', 'Other'];
const BILL_BOOK_FORMATS = ['1+1', '1+2', '1+3'];

// --- Helper Functions ---

// Helper function to insert order directly using SQL - bypasses schema cache issues
const createOrderDirectly = async (orderData: OrderData): Promise<OrderResult> => {
  try {
    console.log('Creates order with data:', orderData);

    // Try the flexible function first
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

      // Fallback to flexible_insert_order
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

    // Direct Insert Fallback
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

  // Dynamic Options State
  const [productOptions, setProductOptions] = useState<string[]>(INITIAL_PRODUCT_OPTIONS);
  const [bindingOptions, setBindingOptions] = useState<string[]>(INITIAL_BINDING_OPTIONS);
  const [paperOptions, setPaperOptions] = useState<string[]>(INITIAL_PAPER_OPTIONS);
  const [paperColorOptions, setPaperColorOptions] = useState<string[]>(INITIAL_PAPER_COLOR_OPTIONS);

  // --- Form State ---

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Dates & Job
  const [jobNumber, setJobNumber] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [printingDate, setPrintingDate] = useState('');

  // Product Specs
  const [productName, setProductName] = useState('');
  const [otherProductName, setOtherProductName] = useState('');
  const [quantity, setQuantity] = useState('');

  // Bill Book / Binding Logic
  const [billBookFormat, setBillBookFormat] = useState('1+1');
  const [bindingType, setBindingType] = useState('');
  const [otherBindingType, setOtherBindingType] = useState('');

  // Paper Specs
  const [paperQuality, setPaperQuality] = useState('');
  const [otherPaperQuality, setOtherPaperQuality] = useState('');

  const [paperColor, setPaperColor] = useState('');
  const [otherPaperColor, setOtherPaperColor] = useState('');

  // Specific papers (for bill books)
  const [originalPaper, setOriginalPaper] = useState('');
  const [otherOriginalPaper, setOtherOriginalPaper] = useState('');
  const [originalPaperColor, setOriginalPaperColor] = useState('White');
  const [otherOriginalPaperColor, setOtherOriginalPaperColor] = useState('');

  const [duplicatePaper, setDuplicatePaper] = useState('');
  const [otherDuplicatePaper, setOtherDuplicatePaper] = useState('');
  const [duplicatePaperColor, setDuplicatePaperColor] = useState('White');
  const [otherDuplicatePaperColor, setOtherDuplicatePaperColor] = useState('');

  const [triplicatePaper, setTriplicatePaper] = useState('');
  const [otherTriplicatePaper, setOtherTriplicatePaper] = useState('');
  const [triplicatePaperColor, setTriplicatePaperColor] = useState('White');
  const [otherTriplicatePaperColor, setOtherTriplicatePaperColor] = useState('');

  const [quadruplicatePaper, setQuadruplicatePaper] = useState('');
  const [otherQuadruplicatePaper, setOtherQuadruplicatePaper] = useState('');
  const [quadruplicatePaperColor, setQuadruplicatePaperColor] = useState('White');
  const [otherQuadruplicatePaperColor, setOtherQuadruplicatePaperColor] = useState('');

  // Other Specs
  const [numbering, setNumbering] = useState('');
  const [numberOfPages, setNumberOfPages] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Materials
  const [includeMaterials, setIncludeMaterials] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([{ material_id: '0', quantity: 1, unit_price: 0 }]);

  // Production Job
  const [includeProductionJob, setIncludeProductionJob] = useState(false);
  const [jobName, setJobName] = useState('');
  const [jobStatus, setJobStatus] = useState('pending');
  const [jobStartDate, setJobStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [jobDueDate, setJobDueDate] = useState('');

  // --- Derived State ---

  const isBillBookType = [
    'Bill Book', 'Debit Note', 'Delivery Challan', 'Receipt Book'
  ].includes(productName);

  // --- Effects ---

  useEffect(() => {
    fetchData();
  }, []);

  // Update Job Due Date when Required Date changes
  useEffect(() => {
    if (requiredDate) {
      setJobDueDate(requiredDate);
    }
  }, [requiredDate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [custRes, matRes, optionsRes] = await Promise.all([
        supabase.from('customers').select('*').order('name'),
        supabase.from('materials').select('*').order('name'),
        supabase.from('dropdown_options').select('*').order('value')
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (matRes.data) setMaterials(matRes.data);

      if (optionsRes.data) {
        // Process dynamic options
        const products = optionsRes.data.filter(o => o.category === 'product_name').map(o => o.value);
        const bindings = optionsRes.data.filter(o => o.category === 'binding_type').map(o => o.value);
        const papers = optionsRes.data.filter(o => o.category === 'paper_quality').map(o => o.value);
        const colors = optionsRes.data.filter(o => o.category === 'paper_color').map(o => o.value);

        // Ensure 'Other' is always last
        const finalizeOptions = (opts: string[]) => {
          const unique = Array.from(new Set(opts));
          const withoutOther = unique.filter(o => o !== 'Other');
          return [...withoutOther, 'Other'];
        };

        const finalProducts = finalizeOptions(products);
        const finalBindings = finalizeOptions(bindings);
        const finalPapers = finalizeOptions(papers);
        const finalColors = finalizeOptions(colors);

        setProductOptions(finalProducts);
        setBindingOptions(finalBindings);
        setPaperOptions(finalPapers);
        setPaperColorOptions(finalColors);

        // Set Defaults if not set
        if (!productName && finalProducts.length > 0) setProductName(finalProducts[0]);
        if (!bindingType && finalBindings.length > 0) setBindingType(finalBindings[0]);

        const defaultPaper = finalPapers.length > 0 ? finalPapers[0] : '';
        if (!paperQuality) setPaperQuality(defaultPaper);
        if (!originalPaper) setOriginalPaper(defaultPaper);
        if (!duplicatePaper) setDuplicatePaper(defaultPaper);
        if (!triplicatePaper) setTriplicatePaper(defaultPaper);
        if (!quadruplicatePaper) setQuadruplicatePaper(defaultPaper);

        const defaultColor = finalColors.length > 0 ? finalColors[0] : 'White';
        if (!paperColor) setPaperColor(defaultColor);
        if (!originalPaperColor) setOriginalPaperColor(defaultColor);
        if (!duplicatePaperColor) setDuplicatePaperColor(defaultColor);
        if (!triplicatePaperColor) setTriplicatePaperColor(defaultColor);
        if (!quadruplicatePaperColor) setQuadruplicatePaperColor(defaultColor);
      }

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
    const finalProduct = productName === 'Other' ? otherProductName : productName;
    const finalBinding = bindingType === 'Other' ? otherBindingType : bindingType;
    const finalPaper = paperQuality === 'Other' ? otherPaperQuality : paperQuality;
    const finalColor = paperColor === 'Other' ? otherPaperColor : paperColor;

    let specs = [
      `Job Number: ${jobNumber || 'N/A'}`,
      `Product: ${finalProduct || 'N/A'}`,
      `Quantity: ${quantity || 'N/A'}`,
      `Printing Date: ${printingDate || 'N/A'}`,
      `Binding: ${finalBinding || 'N/A'}`,
      `Numbering: ${numbering || 'N/A'}`,
      `Pages: ${numberOfPages || 'N/A'}`,
    ];

    if (!isBillBookType) {
      // Single Paper Mode
      specs.push(`Paper: ${finalPaper} (${finalColor})`);
    } else {
      // Bill Book Mode
      specs.push(`Format: ${billBookFormat}`);

      const getNote = (label: string, quality: string, otherQ: string, color: string, otherC: string) => {
        const q = quality === 'Other' ? otherQ : quality;
        const c = color === 'Other' ? otherC : color;
        return `${label}: ${q} (${c})`;
      };

      specs.push(getNote('Original', originalPaper, otherOriginalPaper, originalPaperColor, otherOriginalPaperColor));
      specs.push(getNote('Duplicate', duplicatePaper, otherDuplicatePaper, duplicatePaperColor, otherDuplicatePaperColor));

      if (billBookFormat === '1+2' || billBookFormat === '1+3') {
        specs.push(getNote('Triplicate', triplicatePaper, otherTriplicatePaper, triplicatePaperColor, otherTriplicatePaperColor));
      }
      if (billBookFormat === '1+3') {
        specs.push(getNote('Quadruplicate', quadruplicatePaper, otherQuadruplicatePaper, quadruplicatePaperColor, otherQuadruplicatePaperColor));
      }
    }

    const contactInfo = [
      `Contact Person: ${customerContact || 'N/A'}`,
      `Email: ${customerEmail || 'N/A'}`
    ];

    let productionNotes = '';
    if (includeProductionJob) {
      productionNotes = `\n\n=== PRODUCTION JOB ===\nName: ${jobName || finalProduct}\nStatus: ${jobStatus}\nStart: ${jobStartDate}\nDue: ${jobDueDate}`;
    }

    return `=== PRINT SPECIFICATIONS ===\n${specs.join('\n')}\n\n=== CONTACT ===\n${contactInfo.join('\n')}\n\n=== NOTES ===\n${additionalNotes}${productionNotes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !requiredDate) {
      toast.error('Customer Name and Required Date are mandatory.');
      return;
    }

    setIsLoading(true);
    try {
      const totalAmount = calculateTotal();
      const formattedNotes = formatNotes();

      const result = await createOrderDirectly({
        customerName,
        orderDate: new Date().toISOString(),
        requiredDate: new Date(requiredDate).toISOString(),
        status: 'pending',
        notes: formattedNotes,
        totalAmount,
        jobNumber,
        customerContact,
        customerEmail
      });

      if (!result.success) {
        toast.error(`Error: ${result.message}`);
        return;
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
          // Update Stock
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

      // Handle Production Job
      if (result.orderId && includeProductionJob) {
        const finalProduct = productName === 'Other' ? otherProductName : productName;
        await supabase.from('production_jobs').insert([{
          order_id: result.orderId,
          job_name: jobName || finalProduct || 'New Job',
          status: jobStatus,
          start_date: jobStartDate ? new Date(jobStartDate).toISOString() : null,
          due_date: jobDueDate ? new Date(jobDueDate).toISOString() : null
        }]);
      }

      toast.success('Order created successfully!');
      navigate('/orders');

    } catch (err: any) {
      console.error(err);
      toast.error('Unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Helpers ---

  const renderSelectWithOther = (
    label: string,
    value: string,
    setValue: (val: string) => void,
    options: string[],
    otherValue: string,
    setOtherValue: (val: string) => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      {value === 'Other' && (
        <input
          type="text"
          placeholder={`Specify ${label}`}
          value={otherValue}
          onChange={(e) => setOtherValue(e.target.value)}
          className="mt-2 w-full px-3 py-2 border border-blue-300 bg-blue-50 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
        />
      )}
    </div>
  );

  const renderCompactSelectWithOther = (
    label: string,
    value: string,
    setValue: (val: string) => void,
    options: string[],
    otherValue: string,
    setOtherValue: (val: string) => void
  ) => (
    <div>
      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full text-sm border-gray-300 rounded-md"
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      {value === 'Other' && (
        <input
          type="text"
          placeholder="Specify..."
          value={otherValue}
          onChange={(e) => setOtherValue(e.target.value)}
          className="mt-1 w-full text-sm border-blue-300 bg-blue-50 rounded-md"
        />
      )}
    </div>
  );

  const renderPaperRow = (
    label: string,
    quality: string,
    setQuality: (val: string) => void,
    otherQuality: string,
    setOtherQuality: (val: string) => void,
    color: string,
    setColor: (val: string) => void,
    otherColor: string,
    setOtherColor: (val: string) => void
  ) => (
    <div className="bg-white p-3 rounded border border-gray-200 shadow-sm">
      <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wide border-b pb-1">
        {label}
      </label>
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value)}
            className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            {paperOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {quality === 'Other' && (
            <input
              type="text"
              placeholder="Specify Quality"
              value={otherQuality}
              onChange={(e) => setOtherQuality(e.target.value)}
              className="mt-1 w-full text-xs border-blue-300 bg-blue-50 rounded"
            />
          )}
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Color</label>
          <select
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            {paperColorOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {color === 'Other' && (
            <input
              type="text"
              placeholder="Specify Color"
              value={otherColor}
              onChange={(e) => setOtherColor(e.target.value)}
              className="mt-1 w-full text-xs border-blue-300 bg-blue-50 rounded"
            />
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/orders')}
              className="mr-4 p-2 rounded-full hover:bg-white hover:shadow-sm text-gray-500 transition-all"
            >
              <ArrowLeftIcon />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">New Order</h1>
              <p className="text-sm text-gray-500 mt-1">Create a new print order and job</p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => navigate('/orders')}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 shadow-md transform transition active:scale-95 disabled:opacity-70"
            >
              {isLoading ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column - Form Inputs */}
          <div className="lg:col-span-2 space-y-8">

            {/* 1. Customer Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">Customer Details</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <div className="relative">
                    <input
                      type="text"
                      list="customer-suggestions"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Search or enter new customer..."
                    />
                    <datalist id="customer-suggestions">
                      {customers.map(c => <option key={c.id} value={c.name} />)}
                    </datalist>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={customerContact}
                    onChange={(e) => setCustomerContact(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Order Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">Order Information</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Number</label>
                  <input
                    type="text"
                    value={jobNumber}
                    onChange={(e) => setJobNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                    placeholder="Auto-generated if empty"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Date *</label>
                  <input
                    type="date"
                    value={requiredDate}
                    onChange={(e) => setRequiredDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Printing Date</label>
                  <input
                    type="date"
                    value={printingDate}
                    onChange={(e) => setPrintingDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 3. Print Specifications */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-semibold text-gray-800">Print Specifications</h2>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {renderSelectWithOther('Product Name', productName, setProductName, productOptions, otherProductName, setOtherProductName)}

                  {isBillBookType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                      <select
                        value={billBookFormat}
                        onChange={(e) => setBillBookFormat(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500"
                      >
                        {BILL_BOOK_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Dynamic Paper Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 border-b pb-2">Paper Specifications</h3>
                  <div className="space-y-4">
                    {!isBillBookType ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {renderSelectWithOther('Paper Quality', paperQuality, setPaperQuality, paperOptions, otherPaperQuality, setOtherPaperQuality)}
                        {renderSelectWithOther('Paper Color', paperColor, setPaperColor, paperColorOptions, otherPaperColor, setOtherPaperColor)}
                      </div>
                    ) : (
                      <>
                        {/* Bill Book Specific Inputs - Updated layout for Quality + Color */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {renderPaperRow(
                            'Original Paper',
                            originalPaper, setOriginalPaper, otherOriginalPaper, setOtherOriginalPaper,
                            originalPaperColor, setOriginalPaperColor, otherOriginalPaperColor, setOtherOriginalPaperColor
                          )}

                          {renderPaperRow(
                            'Duplicate Paper',
                            duplicatePaper, setDuplicatePaper, otherDuplicatePaper, setOtherDuplicatePaper,
                            duplicatePaperColor, setDuplicatePaperColor, otherDuplicatePaperColor, setOtherDuplicatePaperColor
                          )}

                          {(billBookFormat === '1+2' || billBookFormat === '1+3') && (
                            renderPaperRow(
                              'Triplicate Paper',
                              triplicatePaper, setTriplicatePaper, otherTriplicatePaper, setOtherTriplicatePaper,
                              triplicatePaperColor, setTriplicatePaperColor, otherTriplicatePaperColor, setOtherTriplicatePaperColor
                            )
                          )}

                          {billBookFormat === '1+3' && (
                            renderPaperRow(
                              'Quadruplicate Paper',
                              quadruplicatePaper, setQuadruplicatePaper, otherQuadruplicatePaper, setOtherQuadruplicatePaper,
                              quadruplicatePaperColor, setQuadruplicatePaperColor, otherQuadruplicatePaperColor, setOtherQuadruplicatePaperColor
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>


                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renderSelectWithOther('Binding Type', bindingType, setBindingType, bindingOptions, otherBindingType, setOtherBindingType)}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numbering</label>
                    <input
                      type="text"
                      value={numbering}
                      onChange={(e) => setNumbering(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                      placeholder="e.g. 101-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pages</label>
                    <input
                      type="number"
                      value={numberOfPages}
                      onChange={(e) => setNumberOfPages(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    rows={3}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500"
                    placeholder="Any special instructions..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Materials, Job & Summary */}
          <div className="space-y-8">

            {/* Materials Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Materials</h2>
                <div className="flex items-center">
                  <input
                    id="inc-materials"
                    type="checkbox"
                    checked={includeMaterials}
                    onChange={(e) => setIncludeMaterials(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="inc-materials" className="ml-2 text-sm text-gray-600">Track Stock</label>
                </div>
              </div>

              {includeMaterials && (
                <div className="p-4">
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-200 relative group">
                        <button
                          onClick={() => removeItem(index)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={items.length === 1}
                        >
                          ✕
                        </button>

                        <div className="mb-2">
                          <label className="text-xs text-gray-500">Material</label>
                          <select
                            value={item.material_id}
                            onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-md mt-1"
                          >
                            <option value="0">Select Material</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name} (Stock: {m.current_stock})</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                              className="w-full text-sm border-gray-300 rounded-md mt-1"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-xs text-gray-500">Cost (₹)</label>
                            <div className="mt-2 text-sm font-medium text-gray-900">
                              {formatINR(item.unit_price * item.quantity)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={addItem}
                    className="mt-4 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  >
                    + Add Another Material
                  </button>
                </div>
              )}
            </div>

            {/* Production Job Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Production</h2>
                <div className="flex items-center">
                  <input
                    id="inc-job"
                    type="checkbox"
                    checked={includeProductionJob}
                    onChange={(e) => setIncludeProductionJob(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="inc-job" className="ml-2 text-sm text-gray-600">Create Job</label>
                </div>
              </div>
              {includeProductionJob && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Name</label>
                    <input
                      type="text"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      placeholder={productName}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={jobDueDate}
                      onChange={(e) => setJobDueDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={jobStatus}
                      onChange={(e) => setJobStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden p-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Material Cost</span>
                <span className="font-medium">{formatINR(calculateTotal())}</span>
              </div>
              <div className="border-t border-gray-100 my-2 pt-2 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-blue-600">{formatINR(calculateTotal())}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AddOrder;