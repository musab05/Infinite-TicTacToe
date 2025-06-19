const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { nanoid } = require('nanoid');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const rooms = {};
const gameStates = {};
const socketToRoom = {};

io.on('connection', socket => {
  console.log(`Connected: ${socket.id}`);

  socket.on('createRoom', () => {
    const code = nanoid(6);
    socket.join(code);
    socket.symbol = 'X';
    socketToRoom[socket.id] = code;

    gameStates[code] = {
      currentTurn: 'X',
      players: {
        X: socket.id,
        O: null,
      },
    };

    socket.emit('roomCreated', { code });
  });

  socket.on('joinRoom', ({ code }) => {
    const room = io.sockets.adapter.rooms.get(code);
    if (room && room.size === 1 && gameStates[code]) {
      socket.join(code);
      socket.symbol = 'O';
      socketToRoom[socket.id] = code;

      gameStates[code].players.O = socket.id;

      socket.emit('roomJoined', { code, symbol: 'O' });
      io.to(code).emit('bothJoined');
    } else {
      socket.emit('errorMsg', 'Room full or does not exist.');
    }
  });

  socket.on('randomJoin', () => {
    let found = null;
    for (const [code, sockets] of Object.entries(rooms)) {
      if (sockets.length === 1) {
        found = code;
        break;
      }
    }

    if (found) {
      rooms[found].push(socket);
      socket.join(found);
      socket.symbol = 'O';
      socketToRoom[socket.id] = found;

      if (gameStates[found]) {
        gameStates[found].players.O = socket.id;
      }

      socket.emit('roomJoined', { code: found, symbol: 'O' });
      io.to(found).emit('bothJoined');
    } else {
      const code = nanoid(6);
      rooms[code] = [socket];
      socket.join(code);
      socket.symbol = 'X';
      socketToRoom[socket.id] = code;

      gameStates[code] = {
        currentTurn: 'X',
        players: {
          X: socket.id,
          O: null,
        },
      };

      socket.emit('roomCreated', { code });
    }
  });

  socket.on('makeMove', ({ room, index }) => {
    const gameState = gameStates[room];
    if (!gameState) return;

    if (gameState.currentTurn !== socket.symbol) {
      socket.emit('errorMsg', 'Not your turn!');
      return;
    }

    gameState.currentTurn = gameState.currentTurn === 'X' ? 'O' : 'X';

    socket.to(room).emit('opponentMove', index);
    io.to(room).emit('turnUpdate', { currentTurn: gameState.currentTurn });
  });

  socket.on('sendMessage', ({ room, message }) => {
    socket.to(room).emit('receiveMessage', message);
  });

  socket.on('restartGame', ({ room }) => {
    const gameState = gameStates[room];
    if (gameState) {
      gameState.currentTurn = 'X';

      io.to(room).emit('restartGame', { currentTurn: 'X' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);

    const roomCode = socketToRoom[socket.id];

    if (roomCode) {
      io.to(roomCode).emit('kickAll'); 

      const room = io.sockets.adapter.rooms.get(roomCode);
      if (room) {
        for (const clientId of room) {
          const clientSocket = io.sockets.sockets.get(clientId);
          if (clientSocket) {
            clientSocket.leave(roomCode);
          }
          delete socketToRoom[clientId];
        }
      }

      delete gameStates[roomCode];
      delete rooms[roomCode];
    }

    for (const [code, sockets] of Object.entries(rooms)) {
      rooms[code] = sockets.filter(s => s !== socket);
      if (rooms[code].length === 0) {
        delete rooms[code];
      }
    }

    delete socketToRoom[socket.id];
  });  
});

server.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
});
