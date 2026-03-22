import type { FastifyInstance } from "fastify";
import type { WebSocket } from "ws";

const clients = new Set<WebSocket>();

export function broadcast(event: string, data: unknown): void {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

export async function wsRoutes(server: FastifyInstance): Promise<void> {
  server.get("/ws", { websocket: true }, (socket) => {
    clients.add(socket);
    server.log.info(`WebSocket client connected (${clients.size} total)`);

    socket.on("close", () => {
      clients.delete(socket);
      server.log.info(`WebSocket client disconnected (${clients.size} total)`);
    });
  });
}
