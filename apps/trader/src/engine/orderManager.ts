import { ClobClient } from "../integrations/clobClient";
import { logger } from "../utils/logger";
import { Telemetry } from "./telemetry";

type PlaceOrderInput = {
  marketId: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  timeInForce?: string;
  orderType?: string;
};

export class OrderManager {
  constructor(private clob: ClobClient, private telemetry?: Telemetry) {}

  async placeOrder(input: PlaceOrderInput) {
    const clientOrderId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    logger.info("Placing order", { ...input, clientOrderId });
    this.telemetry?.logEvent({
      event_type: "order_attempt",
      market_id: input.marketId,
      payload: { ...input, clientOrderId }
    });
    return this.clob.placeOrder({ ...input, clientOrderId });
  }

  async cancelOrder(orderId: string) {
    logger.info("Canceling order", { orderId });
    this.telemetry?.logEvent({
      event_type: "order_cancel",
      payload: { orderId }
    });
    return this.clob.cancelOrder(orderId);
  }
}
