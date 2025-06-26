const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 3000 });
const clients = new Map();

wss.on('connection', (ws) => {
  const id = uuidv4();
  clients.set(ws, { id });
  console.log(`✅ Client connected: ${id}`);

  ws.send(JSON.stringify({ type: 'init', id }));

  ws.on('message', (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error('❌ Ungültiges JSON:', message);
      return;
    }

    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        if (data.type === 'sound' || data.type === 'avatar') {
          if (data.type === 'avatar') {
            data.id = clients.get(ws).id;
          }
          client.send(JSON.stringify(data));
        }
      }
    });
  });

  ws.on('close', () => {
    console.log(`❌ Client disconnected: ${clients.get(ws).id}`);
    const id = clients.get(ws).id;
    clients.delete(ws);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'remove', id }));
      }
    });
  });
});

wss.on('connection', (ws) => {
  const id = uuidv4();
  clients.set(id, ws);

  ws.on('message', (msg) => {
    const data = JSON.parse(msg);

    if (data.type === 'avatar') {
      clients.forEach((clientWs, clientId) => {
        if (clientId !== id) {
          clientWs.send(JSON.stringify({
            type: 'avatar',
            id,
            position: data.position,
            rotation: data.rotation,
            headRotationY: data.headRotationY, 
          }));
        }
      });
    }
  });

  // ...
});

console.log('🚀 WebSocket Server läuft auf ws://localhost:3000');
