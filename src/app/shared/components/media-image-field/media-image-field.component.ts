import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MEDIA_ACCEPT, MEDIA_MAX_BYTES, MediaApiService, MediaPurpose } from '../../../core/media/media-api.service';

/**
 * Upload, preview and remove one image. Two-way binds the picture id: `[(pictureId)]="form.pictureId"`.
 * An image uploaded in this session but never saved is deleted again when it is replaced or removed.
 */
@Component({
  selector: 'app-media-image-field',
  standalone: true,
  imports: [TranslocoDirective],
  template: `
    <div class="field" *transloco="let t">
      <span class="label">{{ label || t('media.image') }}</span>
      @if (preview) {
        <img class="preview" [src]="preview" [alt]="label || t('media.image')" />
      } @else {
        <div class="preview empty" aria-hidden="true">{{ t('media.noImage') }}</div>
      }
      <div class="actions">
        <label class="pick" [class.disabled]="uploading">
          <input type="file" [accept]="accept" (change)="onFile($event)" [disabled]="uploading" />
          {{ uploading ? t('media.uploading') : (pictureId ? t('media.replace') : t('media.upload')) }}
        </label>
        @if (pictureId) {
          <button type="button" class="remove" (click)="remove()" [disabled]="uploading">{{ t('media.remove') }}</button>
        }
      </div>
      <small class="hint">{{ t('media.hint') }}</small>
      @if (error) { <span class="error" role="alert">{{ error }}</span> }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .field { display: grid; gap: .5rem; justify-items: start; }
    .label { color: var(--muted); font: .7rem var(--mono-font); text-transform: uppercase; }
    .preview { width: 120px; height: 120px; object-fit: cover; border: 1px solid var(--line); background: var(--paper); }
    .preview.empty { display: flex; align-items: center; justify-content: center; color: var(--muted); font-size: .75rem; }
    .actions { display: flex; gap: .6rem; align-items: center; flex-wrap: wrap; }
    .pick { border: 1px solid var(--green); color: var(--green); padding: .35rem .8rem; font-size: .8rem; font-weight: 600; cursor: pointer; text-transform: none; }
    .pick.disabled { opacity: .5; cursor: not-allowed; }
    .pick input { position: absolute; width: 1px; height: 1px; opacity: 0; }
    .pick:focus-within { outline: 2px solid var(--green); outline-offset: 2px; }
    .remove { border: 1px solid var(--line); background: transparent; padding: .35rem .8rem; font-size: .8rem; cursor: pointer; }
    .hint { color: var(--muted); text-transform: none; }
    .error { color: #a84031; font-size: .8rem; text-transform: none; }
  `]
})
export class MediaImageFieldComponent {
  private readonly media = inject(MediaApiService);
  private readonly transloco = inject(TranslocoService);

  @Input() label = '';
  @Input({ required: true }) purpose!: MediaPurpose;
  @Input() vendorId: number | null = null;
  @Input() pictureId = 0;
  @Output() pictureIdChange = new EventEmitter<number>();

  readonly accept = MEDIA_ACCEPT;
  uploading = false;
  error = '';
  private sessionUploadId = 0;

  get preview() { return this.media.url(this.pictureId); }

  onFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.error = '';
    if (file.size > MEDIA_MAX_BYTES) { this.error = this.transloco.translate('media.errors.tooLarge5'); return; }
    if (!MEDIA_ACCEPT.split(',').includes(file.type)) { this.error = this.transloco.translate('media.errors.type'); return; }

    this.uploading = true;
    this.media.upload(file, this.purpose, this.vendorId).subscribe({
      next: asset => {
        this.uploading = false;
        this.discardSessionUpload();
        this.sessionUploadId = asset.id;
        this.pictureId = asset.id;
        this.pictureIdChange.emit(asset.id);
      },
      error: err => {
        this.uploading = false;
        this.error = this.message(err);
      }
    });
  }

  remove() {
    if (this.pictureId === this.sessionUploadId) this.discardSessionUpload();
    this.pictureId = 0;
    this.pictureIdChange.emit(0);
  }

  private discardSessionUpload() {
    if (!this.sessionUploadId) return;
    // Best effort: the asset is unreferenced unless the record was saved, in which case the API refuses (409).
    this.media.delete(this.sessionUploadId).subscribe({ error: () => undefined });
    this.sessionUploadId = 0;
  }

  private message(err: { status?: number; fieldErrors?: Record<string, string[]> }) {
    const fileError = err.fieldErrors?.['file']?.[0];
    if (fileError) return fileError;
    if (err.status === 403) return this.transloco.translate('media.errors.forbidden');
    if (err.status === 401) return this.transloco.translate('media.errors.signIn');
    if (err.status === 413) return this.transloco.translate('media.errors.tooLarge');
    if (err.status === 0) return this.transloco.translate('errors.network');
    return this.transloco.translate('media.errors.failed');
  }
}
