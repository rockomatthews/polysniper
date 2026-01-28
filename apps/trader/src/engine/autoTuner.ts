import { OpportunityEngine } from "./opportunityEngine";
import { logger } from "../utils/logger";

type TunerConfig = {
  window: number;
  step: number;
  minMultiplier: number;
  maxMultiplier: number;
};

export class AutoTuner {
  private opportunities = 0;
  private riskBlocks = 0;
  private executionErrors = 0;
  private shadowTrades = 0;

  constructor(private config: TunerConfig, private opportunityEngine: OpportunityEngine) {}

  recordOpportunity() {
    this.opportunities += 1;
    this.maybeAdjust();
  }

  recordRiskBlock() {
    this.riskBlocks += 1;
    this.maybeAdjust();
  }

  recordExecutionError() {
    this.executionErrors += 1;
    this.maybeAdjust();
  }

  recordShadowTrade() {
    this.shadowTrades += 1;
    this.maybeAdjust();
  }

  private maybeAdjust() {
    if (this.opportunities < this.config.window) {
      return;
    }
    const errorRate = this.executionErrors / this.opportunities;
    const riskRate = this.riskBlocks / this.opportunities;
    const shadowRate = this.shadowTrades / this.opportunities;

    let multiplier = this.opportunityEngine.getAdaptiveMultiplier();
    if (errorRate > 0.1 || riskRate > 0.3) {
      multiplier = Math.min(multiplier + this.config.step, this.config.maxMultiplier);
    } else if (shadowRate > 0.6 && errorRate < 0.05) {
      multiplier = Math.max(multiplier - this.config.step, this.config.minMultiplier);
    }

    this.opportunityEngine.setAdaptiveMultiplier(multiplier);
    logger.info("Auto-tuner adjust", {
      multiplier,
      errorRate,
      riskRate,
      shadowRate
    });

    this.opportunities = 0;
    this.riskBlocks = 0;
    this.executionErrors = 0;
    this.shadowTrades = 0;
  }
}
