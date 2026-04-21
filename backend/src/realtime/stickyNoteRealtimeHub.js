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

    this.wss.on('connection', (socket, request, user) => {
      const client = {
        socket,
        user
      };

      this.clients.add(client);
      this.#sendTo(socket, {
        type: 'presence.snapshot',
        payload: {
          users: this.#listUsers()
        }
      });

      this.broadcast('presence.joined', { user: client.user.name, users: this.#listUsers() });

      socket.on('message', (raw) => {
        const message = safeParse(raw.toString());
        if (!message) return;

        if (message.type === 'presence.ping') {
          this.#sendTo(socket, { type: 'presence.pong', payload: { now: Date.now() } });
        }
      });

      socket.on('close', () => {
        this.clients.delete(client);
        this.broadcast('presence.left', { user: client.user.name, users: this.#listUsers() });
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
      let user;

      try {
        user = this.authTokenService.verifyToken(token);
      } catch {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request, user);
      });
    });
  }

  broadcast(type, payload) {
    const data = JSON.stringify({ type, payload });

    for (const client of this.clients) {
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

  #listUsers() {
    return [...this.clients].map((client) => client.user.name);
  }
}
