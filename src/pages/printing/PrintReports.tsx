import React, { useState, useEffect } from 'react';
import { PrinterService } from '../../services/printerService';
import { formatINR } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface DailyStats {
    production_date: string;
    jobs_completed: number;
    total_sheets_printed: number;
    color_sheets: number;
    black_sheets: number;
    total_revenue: number;
}

const PrintReports: React.FC = () => {
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadData();
    }, [dateFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [dailyData, historyData] = await Promise.all([
                PrinterService.getDailyProduction(new Date(dateFilter)),
                PrinterService.getPrintHistory({ startDate: dateFilter, endDate: dateFilter + 'T23:59:59' })
            ]);
            setStats(dailyData);
            setHistory(historyData);
        } catch (error) {
            console.error(error);
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Production Reports</h1>
                        <p className="text-sm text-gray-500 mt-1">Daily job accounting and production metrics</p>
                    </div>
                    <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                        <label className="text-sm font-medium text-gray-600">Date:</label>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-32 bg-gray-200 rounded-xl"></div>
                        <div className="h-64 bg-gray-200 rounded-xl"></div>
                    </div>
                ) : (
                    <>
                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Jobs Completed</p>
                                <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.jobs_completed || 0}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Sheets</p>
                                <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.total_sheets_printed || 0}</p>
                                <div className="flex gap-2 mt-2 text-xs text-gray-500">
                                    <span>Color: {stats?.color_sheets}</span>
                                    <span>B&W: {stats?.black_sheets}</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue</p>
                                <p className="text-3xl font-bold text-green-600 mt-2">{formatINR(stats?.total_revenue || 0)}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Efficiency</p>
                                <p className="text-3xl font-bold text-purple-600 mt-2">
                                    {stats?.jobs_completed ? Math.round(stats.total_sheets_printed / stats.jobs_completed) : 0}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Avg. sheets / job</p>
                            </div>
                        </div>

                        {/* Recent Jobs Table */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="text-lg font-semibold text-gray-900">Job History</h3>
                                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Download CSV</button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specs</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {history.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                    No print jobs found for this date.
                                                </td>
                                            </tr>
                                        ) : (
                                            history.map((job) => (
                                                <tr key={job.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(job.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{job.job_name}</div>
                                                        <div className="text-xs text-gray-500">{job.orders?.customer_name || 'No Customer'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {job.submitted_by}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div>{job.paper_size} - {job.paper_type}</div>
                                                        <div className="text-xs">{job.color_mode} • {job.duplex ? 'Duplex' : 'Simplex'}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {job.total_pages * job.copies} sheets
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {job.print_accounting?.total_cost ? formatINR(job.print_accounting.total_cost) : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                                            ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                                job.status === 'error' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'}`}>
                                                            {job.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PrintReports;
