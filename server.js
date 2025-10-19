const express = require('express');
const http = require('http');
const path = require('path');
const app = express();
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;
const users = new Map();

function broadcastUserList() {
  const list = Array.from(users.values());
  io.emit('user-list', list);
}

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  socket.on('join', (username) => {
    username = String(username || 'Anonymous').trim().slice(0, 30);
    users.set(socket.id, username);
    socket.emit('message', { system: true, text: `Welcome, ${username}!`, timestamp: Date.now() });
    socket.broadcast.emit('message', { system: true, text: `${username} has joined the chat.`, timestamp: Date.now() });
    broadcastUserList();
  });

  socket.on('send-message', (text) => {
    const username = users.get(socket.id) || 'Anonymous';
    const message = { username, text: String(text || ''), timestamp: Date.now() };
    io.emit('message', message);
  });

  socket.on('typing', (isTyping) => {
    const username = users.get(socket.id) || 'Anonymous';
    socket.broadcast.emit('typing', { username, isTyping });
  });

  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    users.delete(socket.id);
    if (username) {
      socket.broadcast.emit('message', { system: true, text: `${username} left the chat.`, timestamp: Date.now() });
      broadcastUserList();
    }
  });
});

server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
