import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatINR, formatDateToIST } from '../utils/formatters';

// Custom icons
const DocumentTextIcon = (props: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={props.className || "h-8 w-8"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const ArrowDownTrayIcon = (props: {className?: string}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={props.className || "h-5 w-5"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

// API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface ReportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const Reports: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);

  // Set default date range to this month
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  const reportOptions: ReportOption[] = [
    {
      id: 'inventory',
      name: 'Inventory Status Report',
      description: 'Current stock levels, low stock alerts, and inventory valuation',
      icon: <DocumentTextIcon className="h-8 w-8 text-blue-500" />
    },
    {
      id: 'material-usage',
      name: 'Material Usage Report',
      description: 'Track consumption of materials over time',
      icon: <DocumentTextIcon className="h-8 w-8 text-green-500" />
    },
    {
      id: 'orders',
      name: 'Orders Summary',
      description: 'Orders placed, fulfilled, and revenue for the period',
      icon: <DocumentTextIcon className="h-8 w-8 text-purple-500" />
    },
    {
      id: 'equipment',
      name: 'Equipment Maintenance',
      description: 'Upcoming and completed maintenance schedules',
      icon: <DocumentTextIcon className="h-8 w-8 text-red-500" />
    }
  ];

  const handleGenerateReport = async () => {
    if (!selectedReport) {
      toast.error('Please select a report type');
      return;
    }
    
    if (!startDate || !endDate) {
      toast.error('Please select date range');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // In a real app, this would call your API
      // const response = await axios.get(`${API_URL}/reports/${selectedReport}`, {
      //   params: { startDate, endDate }
      // });
      // setReportData(response.data);
      
      // For demo purposes, we'll simulate report data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
      
      // Generate sample data based on report type
      let sampleData: any = {
        reportName: '',
        generatedOn: new Date().toISOString(),
        dateRange: {
          start: startDate,
          end: endDate
        }
      };
      
      switch(selectedReport) {
        case 'inventory':
          sampleData = {
            ...sampleData,
            reportName: 'Inventory Status Report',
            materials: [
              { id: 1, name: 'Matte Paper A4', current_stock: 2500, unit_of_measure: 'sheets', reorder_level: 1000, value: 125.00 },
              { id: 2, name: 'Glossy Paper A4', current_stock: 1800, unit_of_measure: 'sheets', reorder_level: 1000, value: 108.00 },
              { id: 3, name: 'Black Ink', current_stock: 15, unit_of_measure: 'liters', reorder_level: 20, value: 375.00 },
              { id: 4, name: 'Cyan Ink', current_stock: 12, unit_of_measure: 'liters', reorder_level: 20, value: 300.00 },
              { id: 5, name: 'Magenta Ink', current_stock: 10, unit_of_measure: 'liters', reorder_level: 20, value: 250.00 },
              { id: 6, name: 'Yellow Ink', current_stock: 8, unit_of_measure: 'liters', reorder_level: 20, value: 200.00 },
              { id: 7, name: 'Binding Wire', current_stock: 35, unit_of_measure: 'rolls', reorder_level: 15, value: 525.00 },
            ],
            summary: {
              totalItems: 7,
              totalValue: 1883.00,
              lowStockItems: 3
            }
          };
          break;
        case 'material-usage':
          sampleData = {
            ...sampleData,
            reportName: 'Material Usage Report',
            usage: [
              { material: 'Matte Paper A4', total_used: 12500, unit_of_measure: 'sheets', total_cost: 625.00 },
              { material: 'Glossy Paper A4', total_used: 7500, unit_of_measure: 'sheets', total_cost: 450.00 },
              { material: 'Black Ink', total_used: 25, unit_of_measure: 'liters', total_cost: 625.00 },
              { material: 'Cyan Ink', total_used: 18, unit_of_measure: 'liters', total_cost: 450.00 },
              { material: 'Magenta Ink', total_used: 15, unit_of_measure: 'liters', total_cost: 375.00 },
              { material: 'Yellow Ink', total_used: 17, unit_of_measure: 'liters', total_cost: 425.00 },
              { material: 'Binding Wire', total_used: 28, unit_of_measure: 'rolls', total_cost: 420.00 },
            ],
            summary: {
              totalCost: 3370.00,
              topMaterial: 'Matte Paper A4',
              topMaterialCost: 625.00
            }
          };
          break;
          
        case 'orders':
          sampleData = {
            ...sampleData,
            reportName: 'Orders Summary',
            orders: {
              total: 42,
              completed: 32,
              inProgress: 7,
              pending: 2,
              cancelled: 1
            },
            revenue: {
              total: 28750.00,
              byStatus: {
                completed: 23500.00,
                inProgress: 4800.00,
                pending: 450.00
              }
            },
            topCustomers: [
              { name: 'ABC Corp', orders: 8, value: 5600.00 },
              { name: 'XYZ Publishing', orders: 5, value: 4200.00 },
              { name: 'Local Magazine', orders: 4, value: 3700.00 }
            ]
          };
          break;
          
        case 'equipment':
          sampleData = {
            ...sampleData,
            reportName: 'Equipment Maintenance Report',
            equipment: [
              { 
                name: 'Offset Press', 
                model: 'HP-2000', 
                status: 'operational',
                maintenance: {
                  completed: [
                    { date: '2023-08-15', type: 'Regular Maintenance', cost: 350.00 },
                    { date: '2023-06-10', type: 'Part Replacement', cost: 800.00 }
                  ],
                  upcoming: [
                    { date: '2023-11-15', type: 'Regular Maintenance', estimated_cost: 350.00 }
                  ]
                }
              },
              { 
                name: 'Digital Press', 
                model: 'Canon 800', 
                status: 'maintenance',
                maintenance: {
                  completed: [
                    { date: '2023-09-05', type: 'Emergency Repair', cost: 1200.00 },
                    { date: '2023-05-20', type: 'Regular Maintenance', cost: 400.00 }
                  ],
                  upcoming: [
                    { date: '2023-10-05', type: 'Part Replacement', estimated_cost: 750.00 }
                  ]
                }
              },
              { 
                name: 'Large Format Printer', 
                model: 'Epson P900', 
                status: 'operational',
                maintenance: {
                  completed: [
                    { date: '2023-07-22', type: 'Regular Maintenance', cost: 300.00 }
                  ],
                  upcoming: [
                    { date: '2023-10-22', type: 'Regular Maintenance', estimated_cost: 300.00 }
                  ]
                }
              }
            ],
            summary: {
              totalEquipment: 3,
              maintenanceCosts: 3050.00,
              upcomingMaintenance: 3
            }
          };
          break;
      }
      
      setReportData(sampleData);
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;
    
    // In a real app, this would download a properly formatted PDF or Excel file
    // For demo, we'll create a JSON file
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${reportData.reportName.replace(/\s+/g, '-').toLowerCase()}-${startDate}-to-${endDate}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Generate Report</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {reportOptions.map(option => (
                <div 
                  key={option.id}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    selectedReport === option.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                  onClick={() => setSelectedReport(option.id)}
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {option.icon}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium">{option.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Range
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleGenerateReport}
            disabled={isGenerating || !selectedReport}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
          >
            {isGenerating ? (
              <span className="flex items-center justify-center">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
                Generating...
              </span>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Report Preview</h2>
          
          {!reportData ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <DocumentTextIcon className="h-16 w-16 mb-2" />
              <p>Select a report type and date range, then click Generate</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-md font-medium">{reportData.reportName}</h3>
                <button 
                  onClick={handleDownloadReport}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-1" />
                  Download
                </button>
              </div>
              
              <div className="text-sm">
                <p>
                  <span className="font-medium">Period:</span>{' '}
                  {new Date(reportData.dateRange.start).toLocaleDateString()} to{' '}
                  {new Date(reportData.dateRange.end).toLocaleDateString()}
                </p>
                <p>
                  <span className="font-medium">Generated:</span>{' '}
                  {new Date(reportData.generatedOn).toLocaleString()}
                </p>
              </div>
              
              <div className="border-t pt-3 mt-3">
                {selectedReport === 'inventory' && (
                  <div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Total Materials</p>
                        <p className="text-lg font-medium">{reportData.summary.totalItems}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Total Inventory Value</p>
                        <p className="text-lg font-medium">{formatINR(reportData.summary.totalValue)}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg col-span-2">
                        <p className="text-xs text-gray-500">Low Stock Items</p>
                        <p className="text-lg font-medium">{reportData.summary.lowStockItems}</p>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Material</th>
                            <th className="text-right py-2">Stock</th>
                            <th className="text-right py-2">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.materials.map((material: any) => (
                            <tr key={material.id} className="border-b border-gray-100">
                              <td className="py-1.5">{material.name}</td>
                              <td className="text-right py-1.5">
                                {material.current_stock} {material.unit_of_measure}
                              </td>
                              <td className="text-right py-1.5">{formatINR(material.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {selectedReport === 'material-usage' && (
                  <div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Total Usage Cost</p>
                        <p className="text-lg font-medium">{formatINR(reportData.summary.totalCost)}</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Top Material</p>
                        <p className="text-lg font-medium">{reportData.summary.topMaterial}</p>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Material</th>
                            <th className="text-right py-2">Used</th>
                            <th className="text-right py-2">Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.usage.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-1.5">{item.material}</td>
                              <td className="text-right py-1.5">
                                {item.total_used} {item.unit_of_measure}
                              </td>
                              <td className="text-right py-1.5">{formatINR(item.total_cost)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {selectedReport === 'orders' && (
                  <div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Total Orders</p>
                        <p className="text-lg font-medium">{reportData.orders.total}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Completed</p>
                        <p className="text-lg font-medium">{reportData.orders.completed}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Total Revenue</p>
                        <p className="text-lg font-medium">{formatINR(reportData.revenue.total)}</p>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <p className="font-medium mb-1">Top Customers</p>
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Customer</th>
                            <th className="text-right py-2">Orders</th>
                            <th className="text-right py-2">Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.topCustomers.map((customer: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100">
                              <td className="py-1.5">{customer.name}</td>
                              <td className="text-right py-1.5">{customer.orders}</td>
                              <td className="text-right py-1.5">{formatINR(customer.value)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {selectedReport === 'equipment' && (
                  <div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Total Equipment</p>
                        <p className="text-lg font-medium">{reportData.summary.totalEquipment}</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500">Maintenance Costs</p>
                        <p className="text-lg font-medium">{formatINR(reportData.summary.maintenanceCosts)}</p>
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      <p className="font-medium mb-1">Upcoming Maintenance</p>
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2">Equipment</th>
                            <th className="text-left py-2">Type</th>
                            <th className="text-right py-2">Date</th>
                            <th className="text-right py-2">Est. Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.equipment.flatMap((equip: any) => 
                            equip.maintenance.upcoming.map((maint: any, idx: number) => (
                              <tr key={`${equip.name}-${idx}`} className="border-b border-gray-100">
                                <td className="py-1.5">{equip.name}</td>
                                <td className="py-1.5">{maint.type}</td>
                                <td className="text-right py-1.5">{new Date(maint.date).toLocaleDateString()}</td>
                                <td className="text-right py-1.5">{formatINR(maint.estimated_cost)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports; 