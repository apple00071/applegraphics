import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL || '',
  process.env.REACT_APP_SUPABASE_KEY || ''
);

interface Equipment {
  id: number;
  name: string;
  description?: string;
  quantity: number;
}

const EquipmentList: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEquipmentFromSupabase = async () => {
      try {
        console.log('📊 Fetching equipment from Supabase...');
        const { data, error } = await supabase.from('equipment').select('*');
        if (error) throw error;
        console.log(`✅ Fetched ${data?.length || 0} equipment from Supabase`);
        setEquipment(data || []);
      } catch (error) {
        console.error('❌ Error fetching equipment:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEquipmentFromSupabase();
  }, []);

  return (
    <div>
      <h2>Equipment Inventory</h2>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ul>
          {equipment.map(e => (
            <li key={e.id}>{e.name}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EquipmentList; 