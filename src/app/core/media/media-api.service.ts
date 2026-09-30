import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api-config';

export type MediaPurpose = 'category' | 'manufacturer' | 'vendorLogo' | 'product';

export interface MediaResponse {
  id: number;
  purpose: MediaPurpose;
  mimeType: string;
  sizeBytes: number;
  vendorId: number | null;
  createdOnUtc: string;
  url: string;
}

/** Limits mirrored from the API so the browser can reject obvious mistakes early. The API re-checks everything. */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

@Injectable({ providedIn: 'root' })
export class MediaApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1/media`;

  upload(file: File, purpose: MediaPurpose, vendorId?: number | null) {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    if (vendorId) form.append('vendorId', String(vendorId));
    return this.http.post<MediaResponse>(this.base, form);
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Public URL of an image, or null when there is no picture (id 0). */
  url(id: number | null | undefined): string | null {
    return id && id > 0 ? `${this.base}/${id}` : null;
  }
}
