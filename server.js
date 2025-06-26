const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const wss = new WebSocket.Server({ port: 3000 });
const clients = new Map(); // key: ws, value: { id }

wss.on('connection', (ws) => {
  const id = uuidv4();
  clients.set(ws, { id });
  console.log(`✅ Client connected: ${id}`);

  // Sende dem neuen Client alle anderen IDs
  const otherIds = Array.from(clients.values())
    .filter(client => client.id !== id)
    .map(client => client.id);
  ws.send(JSON.stringify({ type: 'init', id, others: otherIds }));

  // Informiere alle anderen über den neuen Client
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'new', id }));
    }
  });

  ws.on('message', (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch {
      console.error('Ungültiges JSON:', msg);
      return;
    }

    // Wenn Avatar, hänge die ID dran
    if (data.type === 'avatar') {
      data.id = id;
    }
    // Wenn Chat, hänge die ID dran
    if (data.type === 'chat') {
      data.id = id;
    }
    // Broadcast nur an alle anderen
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        if (data.type === 'sound' || data.type === 'avatar' || data.type === 'chat') {
          client.send(JSON.stringify(data));
        }
      }
    });
  });

  ws.on('close', () => {
    console.log(`❌ Client disconnected: ${id}`);
    clients.delete(ws);
    // Informiere alle anderen, dass dieser Client verschwunden ist
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'remove', id }));
      }
    });
  });
});

console.log('🚀 WS-Server läuft auf ws://localhost:3000');
