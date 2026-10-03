import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../config/api-config';
import { errorInterceptor } from '../http/error.interceptor';
import { MediaApiService, MediaResponse, MediaUploadTicket } from './media-api.service';

describe('MediaApiService', () => {
  let service: MediaApiService;
  let http: HttpTestingController;

  const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'a.png', { type: 'image/png' });
  const ticket: MediaUploadTicket = {
    uploadId: 'abc',
    url: 'http://localhost:9000/nomori-media',
    fields: { key: 'pending/abc', policy: 'p', 'x-amz-signature': 's' },
    expiresOnUtc: '2026-10-03T00:10:00Z',
    maxBytes: 4
  };
  const asset: MediaResponse = {
    id: 7, purpose: 'product', mimeType: 'image/png', sizeBytes: 4, vendorId: 5, createdOnUtc: '2026-10-03T00:00:00Z', url: '/api/v1/media/7'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: '/api' }
      ]
    });
    service = TestBed.inject(MediaApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads straight to storage and completes through the API', () => {
    let result: MediaResponse | undefined;
    service.upload(file, 'product', 5).subscribe(r => (result = r));

    const create = http.expectOne('/api/v1/media/uploads');
    expect(create.request.body).toEqual({ purpose: 'product', vendorId: 5, sizeBytes: 4 });
    create.flush(ticket);

    const post = http.expectOne(ticket.url);
    expect(post.request.withCredentials).toBeFalse();
    const form = post.request.body as FormData;
    const names: string[] = [];
    form.forEach((_, name) => names.push(name));
    expect(names).toEqual(['key', 'policy', 'x-amz-signature', 'file']);
    post.flush('', { status: 204, statusText: 'No Content' });

    http.expectOne('/api/v1/media/uploads/abc/complete').flush(asset);
    expect(result).toEqual(asset);
  });

  it('falls back to a multipart upload when the API stores images itself', () => {
    let result: MediaResponse | undefined;
    service.upload(file, 'category').subscribe(r => (result = r));

    http.expectOne('/api/v1/media/uploads').flush(
      { status: 409, detail: 'media.direct_upload_unavailable' }, { status: 409, statusText: 'Conflict' });

    const legacy = http.expectOne('/api/v1/media');
    expect((legacy.request.body as FormData).get('purpose')).toBe('category');
    legacy.flush(asset);
    expect(result).toEqual(asset);
  });

  it('reports a storage size rejection as 413', () => {
    let error: { status?: number } | undefined;
    service.upload(file, 'product', 5).subscribe({ error: e => (error = e) });

    http.expectOne('/api/v1/media/uploads').flush(ticket);
    http.expectOne(ticket.url).flush(
      '<?xml version="1.0"?><Error><Code>EntityTooLarge</Code><Message>too large</Message></Error>',
      { status: 400, statusText: 'Bad Request' });

    expect(error?.status).toBe(413);
  });

  it('passes API validation errors through unchanged', () => {
    let error: { status?: number; fieldErrors?: Record<string, string[]> } | undefined;
    service.upload(file, 'product', 5).subscribe({ error: e => (error = e) });

    http.expectOne('/api/v1/media/uploads').flush(ticket);
    http.expectOne(ticket.url).flush('', { status: 204, statusText: 'No Content' });
    http.expectOne('/api/v1/media/uploads/abc/complete').flush(
      { errors: { file: ['Only JPEG, PNG, GIF and WebP images are accepted.'] } }, { status: 400, statusText: 'Bad Request' });

    expect(error?.status).toBe(400);
    expect(error?.fieldErrors?.['file']).toBeDefined();
  });
});
