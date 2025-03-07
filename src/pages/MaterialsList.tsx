const { useEffect } = require('react');
const { useSocket } = require('../contexts/SocketContext');
const supabase = require('../supabaseClient');

const MaterialsList = () => {
  const { inventoryData } = useSocket();

  useEffect(() => {
    const fetchMaterialsFromSupabase = async () => {
      try {
        console.log('📊 Fetching materials from Supabase...');
        const { data, error } = await supabase.from('materials').select('*');
        if (error) throw error;
        console.log(`✅ Fetched ${data.length} materials from Supabase`);
        // Update state or context with fetched materials
      } catch (error) {
        console.error('❌ Error fetching materials:', error);
      }
    };

    fetchMaterialsFromSupabase();
  }, []);

  return (
    <div>
      <h2>Materials Inventory</h2>
      {/* Render materials here */}
    </div>
  );
};

module.exports = MaterialsList; 