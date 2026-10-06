export type QueuedEmailStatus = 'pending' | 'sending' | 'sent' | 'failed';

export const QUEUED_EMAIL_STATUSES: QueuedEmailStatus[] = ['pending', 'sending', 'sent', 'failed'];

/** One row of the queue. The list does not carry the bodies. */
export interface QueuedEmail {
  id: number;
  kind: string;
  toAddress: string;
  subject: string;
  status: QueuedEmailStatus;
  attempts: number;
  nextAttemptUtc: string;
  lastError: string | null;
  createdOnUtc: string;
  sentOnUtc: string | null;
}

export interface QueuedEmailDetail extends QueuedEmail {
  htmlBody: string;
  textBody: string | null;
}

export interface QueuedEmailPage {
  items: QueuedEmail[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  /** How many emails there are per status (the whole queue, not the filtered list). */
  counts: Record<QueuedEmailStatus, number>;
}
