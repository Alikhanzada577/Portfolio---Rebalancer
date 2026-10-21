/** Domain errors of the rebalance workflow. The API layer maps each one to an HTTP response. */

export class NoTargetsError extends Error {
  constructor() {
    super("No targets saved for this account");
    this.name = "NoTargetsError";
  }
}

export class RunNotFoundError extends Error {
  constructor() {
    super("Run not found for this user");
    this.name = "RunNotFoundError";
  }
}

/** The run was already started (double click, second tab, retry). Nothing was submitted a second time. */
export class ExecutionConflictError extends Error {
  constructor(readonly runStatus: string) {
    super(`Run is already ${runStatus}`);
    this.name = "ExecutionConflictError";
  }
}

/** Another rebalance on the same account is still running, so a second one would trade on top of it. */
export class RunInProgressError extends Error {
  constructor(readonly runId: string | null) {
    super("A rebalance is already in progress for this account");
    this.name = "RunInProgressError";
  }
}

export class PreviewExpiredError extends Error {
  constructor() {
    super("Preview expired");
    this.name = "PreviewExpiredError";
  }
}
