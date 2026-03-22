import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function broadcast(event: string, data: unknown): void {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message, (err) => {
        if (err) clients.delete(client);
      });
    }
  }
}

const ALLOWED_ORIGINS = [
  "http://localhost:1420",
  "http://localhost:4321",
  "http://localhost:5173",
];

export async function wsRoutes(server: FastifyInstance): Promise<void> {
  server.get("/ws", { websocket: true }, (socket, request) => {
    const origin = request.headers.origin ?? "";
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      socket.close(1008, "Forbidden");
      return;
    }

    clients.add(socket);
    server.log.info(`WebSocket client connected (${clients.size} total)`);

    socket.on("message", () => {
      socket.send(JSON.stringify({ error: "Messages not accepted" }));
    });

    socket.on("error", (err) => {
      server.log.error({ err }, "WebSocket error");
      clients.delete(socket);
    });

    socket.on("close", () => {
      clients.delete(socket);
      server.log.info(`WebSocket client disconnected (${clients.size} total)`);
    });
  });
}
