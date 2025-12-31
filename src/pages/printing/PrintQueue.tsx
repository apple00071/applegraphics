import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PrinterService, PrintQueueItem } from '../../services/printerService';
import SubmitPrintJobModal from '../../components/printing/SubmitPrintJobModal';



const PrintQueue = () => {
    const [queue, setQueue] = useState<PrintQueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSubmitModal, setShowSubmitModal] = useState(false);


    useEffect(() => {
        loadQueue();

        // Auto-refresh every 5 seconds
        const interval = setInterval(loadQueue, 5000);

        return () => clearInterval(interval);
    }, []);

    const loadQueue = async () => {
        try {
            const data = await PrinterService.getPrintQueue();
            setQueue(data);
            setLoading(false);
        } catch (error) {
            console.error('Error loading queue:', error);
            if (loading) {
                toast.error('Failed to load print queue');
            }
        }
    };

    const handleCancel = async (jobId: number) => {
        if (!window.confirm('Are you sure you want to cancel this print job?')) {
            return;
        }

        try {
            await PrinterService.cancelPrintJob(jobId);
            toast.success('Print job cancelled');
            loadQueue();
        } catch (error) {
            console.error('Error cancelling job:', error);
            toast.error('Failed to cancel job');
        }
    };

    const handleComplete = async (jobId: number) => {
        try {
            const pagesPrompt = window.prompt('How many pages were actually printed?');
            if (!pagesPrompt) return;

            const pages = parseInt(pagesPrompt);
            await PrinterService.completePrintJob(jobId, pages);
            toast.success('Print job marked as completed');
            loadQueue();
        } catch (error) {
            console.error('Error completing job:', error);
            toast.error('Failed to complete job');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'queued': return 'bg-yellow-100 text-yellow-800';
            case 'printing': return 'bg-blue-100 text-blue-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'error': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'queued': return '⏳';
            case 'printing': return '🖨️';
            case 'completed': return '✅';
            case 'error': return '❌';
            case 'cancelled': return '⛔';
            default: return '📄';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading print queue...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Print Queue</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Real-time monitoring of active print jobs
                        </p>
                    </div>
                    <button
                        onClick={loadQueue}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        🔄 Refresh
                    </button>
                    <div className="ml-2">
                        <button
                            onClick={() => setShowSubmitModal(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center"
                        >
                            ➕ New Job
                        </button>
                    </div>
                </div>

                {/* Queue Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <div className="text-sm font-medium text-gray-500 uppercase">Total Jobs</div>
                        <div className="text-3xl font-bold text-gray-900 mt-2">{queue.length}</div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <div className="text-sm font-medium text-gray-500 uppercase">Queued</div>
                        <div className="text-3xl font-bold text-yellow-600 mt-2">
                            {queue.filter(j => j.status === 'queued').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <div className="text-sm font-medium text-gray-500 uppercase">Printing</div>
                        <div className="text-3xl font-bold text-blue-600 mt-2">
                            {queue.filter(j => j.status === 'printing').length}
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                        <div className="text-sm font-medium text-gray-500 uppercase">Total Pages</div>
                        <div className="text-3xl font-bold text-gray-900 mt-2">
                            {queue.reduce((sum, j) => sum + (j.total_pages || 0), 0)}
                        </div>
                    </div>
                </div>

                {/* Queue Table */}
                {queue.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12 text-center">
                        <div className="text-gray-400 text-lg mb-2">📭 Queue is empty</div>
                        <p className="text-sm text-gray-500">No active print jobs at the moment</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Job
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Customer
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tray
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Pages
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Submitted
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {queue.map((job) => (
                                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{job.job_name}</div>
                                            <div className="text-xs text-gray-500">ID: {job.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{job.customer_name || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">{job.tray_requested}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {job.pages_printed || 0} / {job.total_pages || 0}
                                            </div>
                                            <div className="text-xs text-gray-500">{job.copies} {job.copies > 1 ? 'copies' : 'copy'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                                                {getStatusIcon(job.status)} {job.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {new Date(job.submitted_at).toLocaleString()}
                                            </div>
                                            <div className="text-xs text-gray-500">By: {job.submitted_by}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                                            {job.status === 'printing' && (
                                                <button
                                                    onClick={() => handleComplete(job.id)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    ✓ Complete
                                                </button>
                                            )}
                                            {(job.status === 'queued' || job.status === 'printing') && (
                                                <button
                                                    onClick={() => handleCancel(job.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    ✕ Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Submit Job Modal */}
            <SubmitPrintJobModal
                isOpen={showSubmitModal}
                onClose={() => setShowSubmitModal(false)}
                onSuccess={loadQueue}
            />
        </div>
    );
};

export default PrintQueue;
