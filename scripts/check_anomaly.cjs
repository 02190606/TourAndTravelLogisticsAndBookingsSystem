async function run() {
  const headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltam1xdWJibWVyeXF6b2xzenZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODU3NzAsImV4cCI6MjA5Nzk2MTc3MH0.0yr0YkGjtMTNb7p5PiLzTaiFuB1YoYd3OEVnoBrzPTk',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inltam1xdWJibWVyeXF6b2xzenZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODU3NzAsImV4cCI6MjA5Nzk2MTc3MH0.0yr0YkGjtMTNb7p5PiLzTaiFuB1YoYd3OEVnoBrzPTk',
    'Accept': 'application/json'
  };

  const base = 'https://ymjmqubbmeryqzolszvr.supabase.co/rest/v1';
  
  // Search across date fields for years > 2030
  const fields = ['insurance_commencement', 'insurance_expiry', 'pmo_commencement', 'pmo_expiry', 'psv_expiry', 'permit_expiry_date'];
  
  const resp = await fetch(`${base}/vehicles?select=registration_number,${fields.join(',')}`, { headers });
  const vehicles = await resp.json();
  
  console.log(`Total vehicles: ${vehicles.length}`);
  for (const v of vehicles) {
    for (const field of fields) {
      const val = v[field];
      if (val && typeof val === 'string' && val.length >= 10) {
        const year = parseInt(val.substring(0, 4), 10);
        if (year > 2030) {
          console.log(`⚠️  ${v.registration_number}: ${field} = ${val} (year ${year})`);
        }
      }
    }
  }
  console.log('Done.');
}
run();
