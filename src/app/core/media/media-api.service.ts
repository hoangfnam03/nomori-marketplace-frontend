import { inject, Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';

export type MediaPurpose = 'category' | 'manufacturer' | 'vendorLogo' | 'product' | 'customerAvatar';

export interface MediaResponse {
  id: number;
  purpose: MediaPurpose;
  mimeType: string;
  sizeBytes: number;
  vendorId: number | null;
  createdOnUtc: string;
  url: string;
}

/** Presigned POST returned by the API: send `fields` and then the file to `url`. */
export interface MediaUploadTicket {
  uploadId: string;
  url: string;
  fields: Record<string, string>;
  expiresOnUtc: string;
  maxBytes: number;
}

/** Limits mirrored from the API so the browser can reject obvious mistakes early. The API re-checks everything. */
export const MEDIA_MAX_BYTES = 5 * 1024 * 1024;
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/gif,image/webp';

/** The API keeps images in its database; the client then uploads through the API instead. */
const DIRECT_UPLOAD_UNAVAILABLE = 'media.direct_upload_unavailable';

@Injectable({ providedIn: 'root' })
export class MediaApiService {
  private readonly http = inject(HttpClient);
  // Object storage is another origin: no interceptors, so no CSRF header or cookies go there.
  private readonly storage = new HttpClient(inject(HttpBackend));
  private readonly base = `${inject(API_BASE_URL)}/v1/media`;

  /**
   * Uploads straight to object storage: the API hands out a presigned POST, the browser sends the file there,
   * and the API then validates the stored bytes. Falls back to a multipart upload through the API when
   * object storage is not configured. Errors have the shape of the HTTP error interceptor ({ status, fieldErrors, message }).
   */
  upload(file: File, purpose: MediaPurpose, vendorId?: number | null): Observable<MediaResponse> {
    return this.http.post<MediaUploadTicket>(`${this.base}/uploads`, { purpose, vendorId: vendorId || null, sizeBytes: file.size }).pipe(
      switchMap(ticket => this.sendToStorage(ticket, file).pipe(
        switchMap(() => this.http.post<MediaResponse>(`${this.base}/uploads/${ticket.uploadId}/complete`, {}))
      )),
      catchError(err => err?.status === 409 && err?.message === DIRECT_UPLOAD_UNAVAILABLE
        ? this.uploadThroughApi(file, purpose, vendorId)
        : throwError(() => err))
    );
  }

  delete(id: number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  /** Public URL of an image, or null when there is no picture (id 0). The API redirects to object storage when the image lives there. */
  url(id: number | null | undefined): string | null {
    return id && id > 0 ? `${this.base}/${id}` : null;
  }

  private uploadThroughApi(file: File, purpose: MediaPurpose, vendorId?: number | null) {
    const form = new FormData();
    form.append('file', file);
    form.append('purpose', purpose);
    if (vendorId) form.append('vendorId', String(vendorId));
    return this.http.post<MediaResponse>(this.base, form);
  }

  private sendToStorage(ticket: MediaUploadTicket, file: File): Observable<void> {
    const form = new FormData();
    // S3 requires the policy fields before the file.
    for (const [name, value] of Object.entries(ticket.fields)) form.append(name, value);
    form.append('file', file);
    return this.storage.post(ticket.url, form, { responseType: 'text' }).pipe(
      map(() => undefined),
      catchError((error: HttpErrorResponse) => throwError(() => storageError(error)))
    );
  }
}

/** Maps an S3 XML error to the interceptor's error shape, so callers handle both the same way. */
function storageError(error: HttpErrorResponse) {
  const code = typeof error.error === 'string' ? /<Code>([^<]+)<\/Code>/.exec(error.error)?.[1] ?? null : null;
  // The policy only admits the announced size; a larger body is the same mistake as an oversize file.
  const status = code === 'EntityTooLarge' ? 413 : error.status;
  return { status, code, fieldErrors: undefined, traceId: null, message: code ?? error.message };
}
