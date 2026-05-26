const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

// Static game assets (index, sprites, pixel UI, config)
app.use(express.static(__dirname, { index: "index.html", extensions: ["html", "css", "js", "png"] }));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, rooms: rooms.size });
});

// Always render the game for direct visits and unknown paths (not socket.io)
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get(/^\/(?!socket\.io).*/, (req, res, next) => {
  if (req.path.includes(".")) return next();
  res.sendFile(path.join(__dirname, "index.html"), (err) => {
    if (err) next(err);
  });
});

function roomSummary(room) {
  return {
    id: room.id,
    name: room.name,
    players: room.players.length,
    maxPlayers: room.maxPlayers,
    inGame: room.inGame
  };
}

function broadcastRoomList() {
  io.emit("roomList", Array.from(rooms.values()).map(roomSummary));
}

function getRoom(socket) {
  if (!socket.roomId) return null;
  return rooms.get(socket.roomId) || null;
}

function leaveRoom(socket) {
  const room = getRoom(socket);
  if (!room) return;

  room.players = room.players.filter((p) => p.id !== socket.id);
  room.chat = room.chat.filter((m) => m.id !== socket.id);

  if (room.players.length === 0) {
    rooms.delete(room.id);
  } else {
    if (room.hostId === socket.id) {
      room.hostId = room.players[0].id;
    }
    io.to(room.id).emit("lobbyUpdate", {
      players: room.players,
      chat: room.chat,
      hostId: room.hostId,
      inGame: room.inGame
    });
  }

  socket.leave(room.id);
  socket.roomId = null;
  broadcastRoomList();
}

io.on("connection", (socket) => {
  socket.on("createRoom", ({ name, maxPlayers, username }) => {
    leaveRoom(socket);

    const roomName = String(name || "Room").slice(0, 24);
    const cap = Math.max(2, Math.min(8, Number(maxPlayers) || 4));
    const id = `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const room = {
      id,
      name: roomName,
      maxPlayers: cap,
      hostId: socket.id,
      inGame: false,
      players: [{ id: socket.id, username: String(username || "Player").slice(0, 16) }],
      chat: []
    };

    rooms.set(id, room);
    socket.join(id);
    socket.roomId = id;

    socket.emit("joinedRoom", {
      roomId: id,
      isHost: true,
      players: room.players,
      chat: room.chat,
      hostId: room.hostId
    });

    broadcastRoomList();
  });

  socket.on("joinRoom", ({ roomId, username }) => {
    const room = rooms.get(roomId);
    if (!room || room.inGame) {
      socket.emit("joinError", "Room unavailable");
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit("joinError", "Room is full");
      return;
    }

    leaveRoom(socket);

    room.players.push({
      id: socket.id,
      username: String(username || "Player").slice(0, 16)
    });

    socket.join(roomId);
    socket.roomId = roomId;

    io.to(roomId).emit("lobbyUpdate", {
      players: room.players,
      chat: room.chat,
      hostId: room.hostId,
      inGame: room.inGame
    });

    socket.emit("joinedRoom", {
      roomId,
      isHost: room.hostId === socket.id,
      players: room.players,
      chat: room.chat,
      hostId: room.hostId
    });

    broadcastRoomList();
  });

  socket.on("lobbyChat", (text) => {
    const room = getRoom(socket);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    const msg = {
      id: socket.id,
      username: player ? player.username : "Player",
      text: String(text || "").slice(0, 120),
      at: Date.now()
    };

    room.chat.push(msg);
    if (room.chat.length > 50) room.chat.shift();

    io.to(room.id).emit("lobbyChat", msg);
  });

  socket.on("startGame", () => {
    const room = getRoom(socket);
    if (!room || room.hostId !== socket.id || room.inGame) return;

    room.inGame = true;
    io.to(room.id).emit("gameStart", { seed: Date.now() });
    broadcastRoomList();
  });

  socket.on("playerState", (state) => {
    const room = getRoom(socket);
    if (!room || !room.inGame) return;
    socket.to(room.id).emit("playerState", {
      id: socket.id,
      ...state
    });
  });

  socket.on("gameChat", (text) => {
    const room = getRoom(socket);
    if (!room || !room.inGame) return;
    const player = room.players.find((p) => p.id === socket.id);
    io.to(room.id).emit("gameChat", {
      id: socket.id,
      username: player ? player.username : "Player",
      text: String(text || "").slice(0, 80),
      at: Date.now()
    });
  });

  socket.on("requestRooms", () => {
    socket.emit("roomList", Array.from(rooms.values()).map(roomSummary));
  });

  socket.on("leaveRoom", () => leaveRoom(socket));

  socket.on("disconnect", () => leaveRoom(socket));
});

setInterval(broadcastRoomList, 2500);

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`KITO CLUB server listening on ${HOST}:${PORT}`);
});
