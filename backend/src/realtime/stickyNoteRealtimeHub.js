import { WebSocketServer } from 'ws';

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export class StickyNoteRealtimeHub {
  constructor(authTokenService) {
    this.authTokenService = authTokenService;
    this.clients = new Set();
    this.wss = new WebSocketServer({ noServer: true });

    this.wss.on('connection', (socket, request, user, boardId) => {
      const client = {
        socket,
        user,
        boardId
      };

      this.clients.add(client);
      this.#sendTo(socket, {
        type: 'presence.snapshot',
        payload: {
          users: this.#listUsers(boardId),
          boardId
        }
      });

      this.broadcastToBoard(boardId, 'presence.joined', {
        user: client.user.name,
        users: this.#listUsers(boardId),
        boardId
      });

      socket.on('message', (raw) => {
        const message = safeParse(raw.toString());
        if (!message) return;

        if (message.type === 'presence.ping') {
          this.#sendTo(socket, { type: 'presence.pong', payload: { now: Date.now() } });
        }
      });

      socket.on('close', () => {
        this.clients.delete(client);
        this.broadcastToBoard(boardId, 'presence.left', {
          user: client.user.name,
          users: this.#listUsers(boardId),
          boardId
        });
      });
    });
  }

  attach(httpServer) {
    httpServer.on('upgrade', (request, socket, head) => {
      const parsed = new URL(request.url || '/', 'http://localhost');
      if (parsed.pathname !== '/ws') {
        socket.destroy();
        return;
      }

      const token = parsed.searchParams.get('token');
      const boardId = parsed.searchParams.get('boardId');
      let user;

      try {
        user = this.authTokenService.verifyToken(token);
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      if (!boardId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request, user, boardId);
      });
    });
  }

  broadcastToBoard(boardId, type, payload) {
    const data = JSON.stringify({ type, payload });

    for (const client of this.clients) {
      if (client.boardId !== boardId) continue;
      if (client.socket.readyState === client.socket.OPEN) {
        client.socket.send(data);
      }
    }
  }

  close() {
    for (const client of this.clients) {
      client.socket.close();
    }
    this.clients.clear();
    this.wss.close();
  }

  #sendTo(socket, message) {
    if (socket.readyState !== socket.OPEN) return;
    socket.send(JSON.stringify(message));
  }

  #listUsers(boardId) {
    return [...this.clients].filter((client) => client.boardId === boardId).map((client) => client.user.name);
  }
}
