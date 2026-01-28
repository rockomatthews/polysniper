import { RiskLimits, TradeFill } from "@polysniper/core";
import { checkRisk, createRiskState, recordFill, recordOrder } from "@polysniper/core";

export class RiskEngine {
  private state = createRiskState();

  constructor(private limits: RiskLimits) {}

  canPlace(marketId: string, notional: number) {
    return checkRisk(this.state, this.limits, marketId, notional, Date.now());
  }

  recordOrder() {
    recordOrder(this.state, Date.now());
  }

  recordFill(fill: TradeFill) {
    recordFill(this.state, fill);
  }
}
