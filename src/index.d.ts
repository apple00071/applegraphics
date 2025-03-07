declare module '../supabaseClient' {
  const supabase: {
    from: (table: string) => {
      select: (columns: string) => Promise<{ data: any; error: any }>; // Adjust as needed
      insert: (values: any) => Promise<{ data: any; error: any }>; // Add insert method
      update: (values: any) => Promise<{ data: any; error: any }>; // Add update method
      delete: () => Promise<{ data: any; error: any }>; // Add delete method
      // Add other methods as needed
    };
  };
  export default supabase;
} 