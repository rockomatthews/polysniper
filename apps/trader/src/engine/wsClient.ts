import WebSocket from "ws";
import { logger } from "../utils/logger";

type MessageHandler = (data: unknown) => void;

export class WsClient {
  private socket: WebSocket | null = null;
  private handlers: MessageHandler[] = [];

  constructor(private url: string) {}

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.on("open", () => logger.info("CLOB WS connected"));
    this.socket.on("close", () => logger.warn("CLOB WS disconnected"));
    this.socket.on("error", (error) =>
      logger.error("CLOB WS error", { error: (error as Error).message })
    );
    this.socket.on("message", (data) => {
      let parsed: unknown = data.toString();
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        parsed = data.toString();
      }
      this.handlers.forEach((handler) => handler(parsed));
    });
  }

  onMessage(handler: MessageHandler) {
    this.handlers.push(handler);
  }

  send(payload: unknown) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.warn("WS not open, dropped message");
      return;
    }
    this.socket.send(JSON.stringify(payload));
  }

  close() {
    this.socket?.close();
  }
}
