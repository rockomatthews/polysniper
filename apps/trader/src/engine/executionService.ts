import { OrderManager } from "./orderManager";
import { AutoTuner } from "./autoTuner";
import { ControlService } from "./controlService";
import { Telemetry } from "./telemetry";
import { logger } from "../utils/logger";

type PairExecution = {
  side: "buy" | "sell";
  size: number;
  legA: { marketId: string; price: number };
  legB: { marketId: string; price: number };
};

type ExecutionConfig = {
  paperTrading: boolean;
  timeInForce?: string;
  orderType?: string;
  maxConsecutiveErrors: number;
  shadowMode: boolean;
};

export class ExecutionService {
  private consecutiveErrors = 0;
  private halted = false;

  constructor(
    private config: ExecutionConfig,
    private orders: OrderManager,
    private telemetry?: Telemetry,
    private autoTuner?: AutoTuner,
    private controlService?: ControlService
  ) {}

  setAutoTuner(autoTuner: AutoTuner | undefined) {
    this.autoTuner = autoTuner;
  }

  setControlService(controlService: ControlService | undefined) {
    this.controlService = controlService;
  }

  isHalted() {
    return this.halted;
  }

  async executePair(input: PairExecution) {
    if (this.halted) {
      return;
    }
    const control = this.controlService?.getState();
    if (control && !control.connected) {
      this.telemetry?.logEvent({
        event_type: "control_block",
        payload: { reason: "disconnected", control }
      });
      return;
    }
    if (control && !control.armed) {
      this.telemetry?.logEvent({
        event_type: "control_block",
        payload: { reason: "not_armed", control }
      });
      return;
    }

    if (control && !control.liveTrading && !this.config.paperTrading && !this.config.shadowMode) {
      this.telemetry?.logEvent({
        event_type: "control_block",
        payload: { reason: "live_trading_disabled", control }
      });
      return;
    }

    if (this.config.paperTrading || this.config.shadowMode) {
      logger.info("Paper trade", input);
      this.telemetry?.logEvent({
        event_type: this.config.shadowMode ? "shadow_trade" : "paper_trade",
        payload: input
      });
      this.autoTuner?.recordShadowTrade();
      return;
    }

    try {
      await Promise.all([
        this.orders.placeOrder({
          marketId: input.legA.marketId,
          side: input.side,
          price: input.legA.price,
          size: input.size,
          timeInForce: this.config.timeInForce,
          orderType: this.config.orderType
        }),
        this.orders.placeOrder({
          marketId: input.legB.marketId,
          side: input.side,
          price: input.legB.price,
          size: input.size,
          timeInForce: this.config.timeInForce,
          orderType: this.config.orderType
        })
      ]);
      this.consecutiveErrors = 0;
    } catch (error) {
      this.consecutiveErrors += 1;
      logger.error("Execution failed", { error: (error as Error).message });
      this.telemetry?.logEvent({
        event_type: "execution_error",
        payload: { error: (error as Error).message }
      });
      this.autoTuner?.recordExecutionError();
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.halted = true;
        logger.error("Kill switch engaged", { consecutiveErrors: this.consecutiveErrors });
        this.telemetry?.logEvent({
          event_type: "kill_switch",
          payload: { consecutiveErrors: this.consecutiveErrors }
        });
      }
    }
  }

  async executeCross(input: { buy: PairExecution["legA"]; sell: PairExecution["legA"]; size: number }) {
    if (this.halted) {
      return;
    }
    const control = this.controlService?.getState();
    if (control && !control.connected) {
      this.telemetry?.logEvent({
        event_type: "control_block",
        payload: { reason: "disconnected", control }
      });
      return;
    }
    if (control && !control.armed) {
      this.telemetry?.logEvent({
        event_type: "control_block",
        payload: { reason: "not_armed", control }
      });
      return;
    }

    if (control && !control.liveTrading && !this.config.paperTrading && !this.config.shadowMode) {
      this.telemetry?.logEvent({
        event_type: "control_block",
        payload: { reason: "live_trading_disabled", control }
      });
      return;
    }

    if (this.config.paperTrading || this.config.shadowMode) {
      logger.info("Paper trade (cross)", input);
      this.telemetry?.logEvent({
        event_type: this.config.shadowMode ? "shadow_trade" : "paper_trade",
        payload: input
      });
      this.autoTuner?.recordShadowTrade();
      return;
    }

    try {
      await Promise.all([
        this.orders.placeOrder({
          marketId: input.buy.marketId,
          side: "buy",
          price: input.buy.price,
          size: input.size,
          timeInForce: this.config.timeInForce,
          orderType: this.config.orderType
        }),
        this.orders.placeOrder({
          marketId: input.sell.marketId,
          side: "sell",
          price: input.sell.price,
          size: input.size,
          timeInForce: this.config.timeInForce,
          orderType: this.config.orderType
        })
      ]);
      this.consecutiveErrors = 0;
    } catch (error) {
      this.consecutiveErrors += 1;
      logger.error("Cross execution failed", { error: (error as Error).message });
      this.telemetry?.logEvent({
        event_type: "execution_error",
        payload: { error: (error as Error).message }
      });
      this.autoTuner?.recordExecutionError();
      if (this.consecutiveErrors >= this.config.maxConsecutiveErrors) {
        this.halted = true;
        logger.error("Kill switch engaged", { consecutiveErrors: this.consecutiveErrors });
        this.telemetry?.logEvent({
          event_type: "kill_switch",
          payload: { consecutiveErrors: this.consecutiveErrors }
        });
      }
    }
  }
}
