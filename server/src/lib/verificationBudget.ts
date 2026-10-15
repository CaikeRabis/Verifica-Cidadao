import { performance } from 'node:perf_hooks'

export const VERIFICATION_TIME_BUDGET_MS = 25_000
export const TIME_BUDGET_SAFETY_MARGIN_MS = 500

/** Deadline monotônico compartilhado por toda a verificação. */
export class VerificationBudget {
  readonly startedAt = performance.now()
  readonly deadlineAt: number
  constructor(readonly budgetMs = VERIFICATION_TIME_BUDGET_MS) { this.deadlineAt = this.startedAt + budgetMs }
  elapsedMs() { return Math.max(0, Math.round(performance.now() - this.startedAt)) }
  remainingMs() { return Math.max(0, Math.round(this.deadlineAt - performance.now())) }
  exhausted() { return this.remainingMs() <= 0 }
  canStartOperation(maxDurationMs: number) { return this.remainingMs() >= maxDurationMs + TIME_BUDGET_SAFETY_MARGIN_MS }
}
