import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { QueuedEmail, QueuedEmailDetail, QueuedEmailPage, QueuedEmailStatus } from './email-queue.models';

/** The email queue for administrators (permission emails.manage). */
@Injectable({ providedIn: 'root' })
export class EmailQueueApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/admin/emails`;

  list(status: QueuedEmailStatus | '', search: string, page: number, pageSize: number) {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    if (search.trim()) params = params.set('search', search.trim());
    return this.http.get<QueuedEmailPage>(this.base, { params });
  }
  get(id: number) { return this.http.get<QueuedEmailDetail>(`${this.base}/${id}`); }
  retry(id: number) { return this.http.post<QueuedEmail>(`${this.base}/${id}/retry`, {}); }
  delete(id: number) { return this.http.delete<void>(`${this.base}/${id}`); }
}
