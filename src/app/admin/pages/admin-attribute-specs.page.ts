import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { ProductAttributeSpec } from '../../core/catalog/product-attribute.models';

@Component({
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <section class="admin-intro" aria-labelledby="attrs-title">
      <div>
        <div class="eyebrow">{{ t('admin.attributes.eyebrow') }}</div>
        <h1 id="attrs-title">{{ t('admin.attributes.title') }}</h1>
        <p>{{ t('admin.attributes.lede') }}</p>
      </div>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('admin.attributes.heading') }}</h2>
        <button type="button" class="new-btn" (click)="openForm()">+ {{ t('admin.attributes.new') }}</button>
      </div>

      @if (formOpen) {
        <form class="inline-form" (ngSubmit)="submit()" [attr.aria-label]="editingId ? t('admin.attributes.edit') : t('admin.attributes.new')">
          <div class="form-title">{{ editingId ? t('admin.attributes.edit') : t('admin.attributes.new') }}</div>
          @if (formError) { <p class="form-error" role="alert">{{ t(formError) }}</p> }
          <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="form.name" name="name" required /></label>
          <label>{{ t('admin.common.description') }} <textarea [(ngModel)]="form.description" name="description" rows="2"></textarea></label>
          <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="form.displayOrder" name="displayOrder" style="width:80px" /></label>
          <div class="form-actions">
            <button type="submit" [disabled]="saving">{{ saving ? t('common.states.saving') : t('common.actions.save') }}</button>
            <button type="button" class="cancel-btn" (click)="closeForm()">{{ t('common.actions.cancel') }}</button>
          </div>
        </form>
      }

      @if (loading) {
        <p class="loading-msg">{{ t('common.states.loading') }}</p>
      } @else if (specs.length === 0) {
        <p class="empty-msg">{{ t('admin.attributes.empty') }}</p>
      } @else {
        <table class="data-table">
          <thead>
            <tr><th>{{ t('admin.common.name') }}</th><th>{{ t('admin.common.description') }}</th><th>{{ t('admin.common.order') }}</th><th></th></tr>
          </thead>
          <tbody>
            @for (s of specs; track s.id) {
              <tr>
                <td><strong>{{ s.name }}</strong></td>
                <td>{{ s.description || '—' }}</td>
                <td>{{ s.displayOrder }}</td>
                <td class="row-actions">
                  <button type="button" class="edit-btn" (click)="openForm(s)">{{ t('common.actions.edit') }}</button>
                  <button type="button" class="delete-btn" (click)="deleteSpec(s)">{{ t('common.actions.delete') }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .admin-intro { padding: 2.5rem var(--page-gutter, 2rem) 2rem; border-bottom: 1px solid var(--line); }
    .eyebrow { font-family: var(--mono-font); font-size: .75rem; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: .4rem; }
    h1 { font-family: var(--display-font); font-size: 2rem; margin: 0 0 .5rem; }
    p { color: var(--muted); margin: 0; }
    .panel { margin: 2rem var(--page-gutter, 2rem); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; border-bottom: 1px solid var(--line); }
    .panel-header h2 { margin: 0; font-size: 1rem; }
    .new-btn { background: var(--green); color: var(--paper); border: none; border-radius: 6px; padding: .45rem 1rem; font-size: .875rem; font-weight: 600; cursor: pointer; }
    .inline-form { margin: 1.25rem 1.5rem; padding: 1.25rem; border: 1px solid var(--line); border-radius: 8px; display: flex; flex-direction: column; gap: .75rem; }
    .form-title { font-weight: 600; font-size: .95rem; }
    .form-error { color: #d32f2f; font-size: .875rem; margin: 0; }
    .inline-form label { display: flex; flex-direction: column; gap: .3rem; font-size: .875rem; font-weight: 500; }
    .inline-form input, .inline-form textarea { border: 1px solid var(--line); border-radius: 6px; padding: .4rem .7rem; background: var(--paper); color: var(--ink); font-size: .9rem; }
    .form-actions { display: flex; gap: .75rem; }
    .form-actions button { border-radius: 6px; padding: .4rem .9rem; font-size: .875rem; cursor: pointer; }
    .form-actions button[type=submit] { background: var(--green); color: var(--paper); font-weight: 600; border: none; }
    .form-actions button[type=submit]:disabled { opacity: .5; cursor: not-allowed; }
    .cancel-btn { background: transparent; color: var(--ink); border: 1px solid var(--line); }
    .loading-msg, .empty-msg { padding: 2rem 1.5rem; color: var(--muted); font-size: .9rem; }
    .data-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    .data-table th { text-align: left; padding: .6rem 1rem; border-bottom: 1px solid var(--line); font-size: .75rem; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
    .data-table td { padding: .65rem 1rem; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .data-table tbody tr:last-child td { border-bottom: none; }
    .data-table tbody tr:hover { background: color-mix(in srgb, var(--green) 4%, var(--paper)); }
    .row-actions { display: flex; gap: .5rem; }
    .edit-btn, .delete-btn { border-radius: 4px; padding: .25rem .6rem; font-size: .8rem; cursor: pointer; border: 1px solid var(--line); background: var(--paper); color: var(--ink); }
    .delete-btn { color: #d32f2f; border-color: #d32f2f20; }
    .delete-btn:hover { background: #d32f2f10; }
  `]
})
export class AdminAttributeSpecsPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly transloco = inject(TranslocoService);

  specs: ProductAttributeSpec[] = [];
  loading = false;
  formOpen = false;
  editingId: number | null = null;
  saving = false;
  formError = '';
  form = { name: '', description: '', displayOrder: 0 };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.api.adminGetAttributeSpecs().subscribe({
      next: s => { this.specs = s; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openForm(s?: ProductAttributeSpec) {
    this.editingId = s?.id ?? null;
    this.form = { name: s?.name ?? '', description: s?.description ?? '', displayOrder: s?.displayOrder ?? 0 };
    this.formError = '';
    this.formOpen = true;
  }

  closeForm() { this.formOpen = false; this.editingId = null; }

  submit() {
    if (!this.form.name.trim()) { this.formError = 'admin.common.nameRequired'; return; }
    this.saving = true; this.formError = '';
    const body = { name: this.form.name, description: this.form.description || null, displayOrder: this.form.displayOrder };
    const req = this.editingId
      ? this.api.adminUpdateAttributeSpec(this.editingId, body)
      : this.api.adminCreateAttributeSpec(body);
    req.subscribe({
      next: () => { this.saving = false; this.closeForm(); this.load(); },
      error: err => { this.saving = false; this.formError = err?.status === 400 ? 'errors.badRequest' : 'admin.common.saveFailed'; }
    });
  }

  deleteSpec(s: ProductAttributeSpec) {
    if (!confirm(this.transloco.translate('admin.attributes.confirmDelete', { name: s.name }))) return;
    this.api.adminDeleteAttributeSpec(s.id).subscribe({ next: () => this.load() });
  }
}
