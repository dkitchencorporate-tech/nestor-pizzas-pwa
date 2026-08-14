import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jlchjamoejkzahaeimec.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsY2hqYW1vZWpremFoYWVpbWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NTYzMzAsImV4cCI6MjEwMjEzMjMzMH0.WkifUqwa5hh4CY-apavqA5gJYoExCTQgxWdgUdVRlF0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Connecting to Realtime...');
const channel = supabase.channel('test-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
    console.log('Realtime payload received:', payload);
  })
  .subscribe((status) => {
    console.log('Subscription status:', status);
    
    if (status === 'SUBSCRIBED') {
      console.log('Successfully subscribed! Inserting a test order to trigger event...');
      // Insert a test order to see if we get the payload
      supabase.from('orders').insert({
        total_amount: 10,
        status: 'pending',
        client_name: 'Realtime Tester',
        client_phone: '123456789',
        delivery_address: 'Local',
        delivery_method: 'pickup'
      }).then(res => {
        console.log('Insert result:', res.error ? res.error : 'Success');
      });
    }
  });

// Keep process alive for 10 seconds
setTimeout(() => {
  console.log('Timeout reached. Exiting...');
  process.exit(0);
}, 10000);
