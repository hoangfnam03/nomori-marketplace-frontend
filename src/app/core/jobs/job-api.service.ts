import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';
import { Job, JobRun } from './job.models';

/** Background jobs for administrators (permission jobs.manage). */
@Injectable({ providedIn: 'root' })
export class JobApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/admin/jobs`;

  list() { return this.http.get<Job[]>(this.base); }
  update(name: string, body: { enabled: boolean; intervalMinutes: number }) {
    return this.http.put<Job>(`${this.base}/${encodeURIComponent(name)}`, body);
  }
  run(name: string) { return this.http.post<JobRun>(`${this.base}/${encodeURIComponent(name)}/run`, {}); }
  runs(name: string) { return this.http.get<JobRun[]>(`${this.base}/${encodeURIComponent(name)}/runs`); }
}
