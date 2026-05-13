// Quick test: POST a fake UID to the RFID bridge server
const url = process.argv[2] || 'http://localhost:3001/api/rfid';
fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ uid: 'AABB1234' }),
})
  .then(r => r.json())
  .then(d => { console.log('✅ POST /api/rfid result:', JSON.stringify(d, null, 2)); process.exit(0); })
  .catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
