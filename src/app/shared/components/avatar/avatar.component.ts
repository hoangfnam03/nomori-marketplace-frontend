import { Component, Input } from '@angular/core';

/** A round avatar: the picture when there is one, otherwise a default silhouette. Decorative unless a label is given. */
@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    @if (src && !failed) {
      <img [src]="src" [attr.alt]="label || ''" [attr.aria-hidden]="label ? null : 'true'" [width]="size" [height]="size" (error)="failed = true" />
    } @else {
      <svg viewBox="0 0 40 40" [attr.width]="size" [attr.height]="size" [attr.role]="label ? 'img' : null"
        [attr.aria-label]="label || null" [attr.aria-hidden]="label ? null : 'true'" focusable="false">
        <circle cx="20" cy="20" r="20" class="bg" />
        <circle cx="20" cy="15.5" r="7" class="fg" />
        <path d="M6.5 34.5c2.6-6.3 7.6-9.5 13.5-9.5s10.9 3.2 13.5 9.5A19.9 19.9 0 0 1 20 40a19.9 19.9 0 0 1-13.5-5.5z" class="fg" />
      </svg>
    }
  `,
  styles: [`
    :host { display: inline-flex; flex: none; border-radius: 50%; overflow: hidden; line-height: 0; }
    img { object-fit: cover; border-radius: 50%; }
    .bg { fill: color-mix(in srgb, var(--green, #2f6f4f) 14%, var(--paper, #fff)); }
    .fg { fill: color-mix(in srgb, var(--green, #2f6f4f) 55%, var(--paper, #fff)); }
  `]
})
export class AvatarComponent {
  /** Image URL, or null for the default avatar. */
  @Input() set src(value: string | null) { this.url = value; this.failed = false; }
  get src() { return this.url; }
  @Input() size = 32;
  /** Accessible name; leave empty when the avatar sits next to the visible name. */
  @Input() label = '';

  /** A deleted or unreachable image falls back to the default avatar. */
  failed = false;
  private url: string | null = null;
}
