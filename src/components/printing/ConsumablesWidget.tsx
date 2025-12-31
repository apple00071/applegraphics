import React, { useState, useEffect } from 'react';
import { PrinterService } from '../../services/printerService';
import { toast } from 'react-hot-toast';

interface ConsumablesData {
    toner_cyan: number;
    toner_magenta: number;
    toner_yellow: number;
    toner_black: number;
    waste_toner: number;
    drum_life_remaining: number;
    last_updated: string;
}

const ConsumablesWidget: React.FC = () => {
    const [data, setData] = useState<ConsumablesData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadConsumables();
    }, []);

    const loadConsumables = async () => {
        try {
            // @ts-ignore - Supabase returns what DB has
            const consumables = await PrinterService.getConsumables();
            setData(consumables);
        } catch (error) {
            console.error('Error loading consumables:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-gray-200 h-32 rounded-lg"></div>;
    }

    if (!data) {
        return <div className="text-sm text-gray-500">Consumables data unavailable</div>;
    }

    const renderTonerBar = (level: number, colorClass: string, label: string) => (
        <div className="flex flex-col items-center space-y-1">
            <div className="h-24 w-8 bg-gray-100 rounded-full overflow-hidden border border-gray-200 relative flex items-end justify-center">
                <div
                    className={`w-full transition-all duration-500 ${colorClass}`}
                    style={{ height: `${level}%` }}
                />
                <span className="absolute bottom-1 text-[10px] font-bold text-gray-700 mix-blend-multiply">{level}%</span>
            </div>
            <span className="text-xs font-medium text-gray-600">{label}</span>
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Consumables</h3>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    Manual Config Mode
                </span>
            </div>

            <div className="flex justify-around items-end">
                {renderTonerBar(data.toner_cyan, 'bg-cyan-400', 'C')}
                {renderTonerBar(data.toner_magenta, 'bg-magenta-500', 'M')}
                {renderTonerBar(data.toner_yellow, 'bg-yellow-400', 'Y')}
                {renderTonerBar(data.toner_black, 'bg-black', 'K')}

                <div className="ml-4 pl-4 border-l border-gray-100 flex flex-col justify-center space-y-4">
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Waste Toner</span>
                            <span className={data.waste_toner > 80 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                {data.waste_toner}%
                            </span>
                        </div>
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${data.waste_toner > 80 ? 'bg-red-500' : 'bg-gray-400'}`}
                                style={{ width: `${data.waste_toner}%` }}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span>Drum Unit</span>
                            <span className="text-gray-600">{data.drum_life_remaining}%</span>
                        </div>
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500"
                                style={{ width: `${data.drum_life_remaining}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsumablesWidget;
