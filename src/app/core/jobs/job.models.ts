export type JobStatus = 'running' | 'succeeded' | 'partial' | 'failed';

/** A background job as the administrator sees it. */
export interface Job {
  name: string;
  description: string;
  enabled: boolean;
  intervalMinutes: number;
  defaultIntervalMinutes: number;
  /** Null means "due now". */
  nextRunUtc: string | null;
  lastStartedUtc: string | null;
  lastFinishedUtc: string | null;
  lastStatus: JobStatus | null;
  lastMessage: string | null;
  /** The job holds its lock right now. */
  running: boolean;
}

export interface JobRun {
  id: number;
  job: string;
  trigger: 'schedule' | 'manual';
  startedUtc: string;
  finishedUtc: string;
  status: JobStatus;
  processed: number;
  failed: number;
  message: string | null;
}

export const MIN_INTERVAL_MINUTES = 1;
export const MAX_INTERVAL_MINUTES = 10080;
