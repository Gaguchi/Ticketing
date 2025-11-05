// WebSocket Test Script
// Copy this into your browser console when logged into the app

console.log('🧪 WebSocket Test Script Started...\n');

// 1. Check if JWT token exists
const token = localStorage.getItem('access_token');
if (!token) {
  console.error('❌ No JWT token found! Please login first.');
} else {
  console.log('✅ JWT token found:', token.substring(0, 20) + '...');
}

// 2. Test WebSocket connection
const wsUrl = `ws://tickets-backend-lfffka-3700fb-31-97-181-167.traefik.me/ws/notifications/?token=${token}`;
console.log('📡 Connecting to:', wsUrl);

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('✅ WebSocket Connected!');
  console.log('💚 Connection is OPEN');
  
  // Send a ping
  setTimeout(() => {
    console.log('📤 Sending ping...');
    ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
  }, 1000);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Message received:', data);
  
  if (data.type === 'connection_established') {
    console.log('✅ Connection established successfully!');
  } else if (data.type === 'pong') {
    console.log('✅ Pong received - connection is alive!');
  }
};

ws.onerror = (error) => {
  console.error('❌ WebSocket Error:', error);
  console.log('💡 Check:');
  console.log('   1. Backend is running with Daphne (not Gunicorn)');
  console.log('   2. CORS settings allow WebSocket upgrade');
  console.log('   3. JWT token is valid');
};

ws.onclose = (event) => {
  console.log('🔌 WebSocket Closed');
  console.log('   Code:', event.code);
  console.log('   Reason:', event.reason || 'No reason provided');
  console.log('   Clean:', event.wasClean);
  
  if (event.code === 1006) {
    console.error('❌ Abnormal closure - possible causes:');
    console.log('   - Backend not running with Daphne');
    console.log('   - Network issue');
    console.log('   - CORS blocking WebSocket upgrade');
  } else if (event.code === 4001) {
    console.error('❌ Unauthorized - JWT token invalid or expired');
  }
};

// Keep reference for manual testing
window.testWs = ws;

console.log('\n📝 To manually send messages, use:');
console.log('   window.testWs.send(JSON.stringify({ type: "ping" }))');
console.log('\n📝 To close connection:');
console.log('   window.testWs.close()');
