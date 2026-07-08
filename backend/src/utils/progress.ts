/**
 * Progress Utilities
 * Provides progress bars and spinners for CLI operations
 */

import ora from "ora";

export class ProgressManager {
  private spinners: Map<string, any> = new Map();

  start(message: string, id: string = "default"): void {
    const spinner = ora(message).start();
    this.spinners.set(id, spinner);
  }

  update(message: string, id: string = "default"): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.text = message;
    }
  }

  succeed(message?: string, id: string = "default"): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.succeed(message);
      this.spinners.delete(id);
    }
  }

  fail(message?: string, id: string = "default"): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.fail(message);
      this.spinners.delete(id);
    }
  }

  stop(id: string = "default"): void {
    const spinner = this.spinners.get(id);
    if (spinner) {
      spinner.stop();
      this.spinners.delete(id);
    }
  }

  stopAll(): void {
    for (const [id] of this.spinners) {
      this.stop(id);
    }
  }
}

export const progress = new ProgressManager();
