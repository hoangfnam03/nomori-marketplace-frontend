import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MediaImageFieldComponent } from '../../shared/components/media-image-field/media-image-field.component';
import { UpdateVendorRequest, VendorApiService } from '../../core/vendors/vendor-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';
import { VendorMemberResponse, VendorResponse } from '../../core/vendors/vendor.models';

interface VendorForm {
  pictureId: number;
  name: string;
  email: string;
  description: string;
  phoneNumber: string;
  taxCode: string;
  businessAddress: string;
  adminComment: string;
  active: boolean;
  displayOrder: number;
}

@Component({
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink, MediaImageFieldComponent, TranslocoDirective],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <ng-container *transloco="let t">
    <section class="page-intro" aria-labelledby="vendors-title">
      <div class="eyebrow">{{ t('admin.vendors.eyebrow') }}</div>
      <h1 id="vendors-title">{{ t('admin.vendors.title') }}</h1>
      <p>
        {{ t('admin.vendors.ledeBefore') }}
        <a routerLink="/admin/vendor-applications">{{ t('admin.vendors.ledeLink') }}</a>{{ t('admin.vendors.ledeAfter') }}
      </p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>{{ t('admin.vendors.heading') }}</h2>
        <div class="actions">
          <input type="search" [placeholder]="t('admin.vendors.search')" [(ngModel)]="searchTerm" (input)="onSearch()" name="vendorSearch" [attr.aria-label]="t('admin.vendors.search')" />
        </div>
      </div>

      @if (loading) {
        <p class="state">{{ t('common.states.loading') }}</p>
      } @else if (loadError) {
        <p class="state state-error" role="alert">{{ loadError }}</p>
      } @else if (vendors.length === 0) {
        <p class="state">{{ t('admin.vendors.empty') }}</p>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>{{ t('admin.common.name') }}</th><th>{{ t('admin.common.email') }}</th><th>{{ t('admin.common.status') }}</th><th>{{ t('admin.common.order') }}</th><th>{{ t('admin.common.created') }}</th><th></th></tr></thead>
            <tbody>
              @for (v of vendors; track v.id) {
                <tr [class.selected]="selected?.id === v.id">
                  <td><strong>{{ v.name }}</strong></td>
                  <td>{{ v.email }}</td>
                  <td><span [class]="v.active ? 'badge badge-active' : 'badge'">{{ v.active ? t('vendorStatus.vendor.active') : t('vendorStatus.vendor.inactive') }}</span></td>
                  <td>{{ v.displayOrder }}</td>
                  <td>{{ v.createdOnUtc | date:'dd/MM/yyyy' }}</td>
                  <td class="row-actions">
                    <button type="button" class="btn btn-secondary btn-small" (click)="openForm(v)">{{ t('common.actions.edit') }}</button>
                    <button type="button" class="btn btn-secondary btn-small" (click)="showMembers(v)">{{ t('admin.vendors.members') }}</button>
                    <button type="button" class="btn btn-danger btn-small" (click)="askDelete(v)">{{ t('common.actions.delete') }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (totalPages > 1) {
          <div class="pagination">
            <button type="button" [disabled]="page === 1" (click)="goPage(page - 1)">‹ {{ t('common.pagination.prev') }}</button>
            <span>{{ t('common.pagination.pageOf', { page: page, total: totalPages }) }}</span>
            <button type="button" [disabled]="page === totalPages" (click)="goPage(page + 1)">{{ t('common.pagination.next') }} ›</button>
          </div>
        }
      }
    </div>

    @if (pendingDelete; as d) {
      <div class="panel">
        <div class="panel-body">
          <div class="confirm confirm-danger" role="alertdialog" [attr.aria-label]="t('admin.vendors.confirmDeleteLabel')">
            <strong>{{ t('admin.vendors.confirmDelete', { name: d.name }) }}</strong>
            <span class="muted">{{ t('admin.vendors.deleteWarning') }}</span>
            @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
            <div class="actions">
              <button type="button" class="btn btn-danger" (click)="confirmDelete(d)" [disabled]="saving">{{ saving ? t('admin.vendors.deleting') : t('admin.vendors.deleteVendor') }}</button>
              <button type="button" class="btn btn-secondary" (click)="pendingDelete = null">{{ t('common.actions.cancel') }}</button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (formOpen) {
      <div class="panel">
        <div class="panel-header"><h2>{{ t('admin.vendors.edit') }}</h2></div>
        <form class="form panel-body" (ngSubmit)="submitVendor()" [attr.aria-label]="t('admin.vendors.edit')">
          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
          <div class="form-row">
            <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="form.name" name="name" required maxlength="400" /></label>
            <label>{{ t('admin.common.email') }} <input type="email" [(ngModel)]="form.email" name="email" required maxlength="320" /></label>
          </div>
          <div class="form-row">
            <label>{{ t('customer.fields.phone') }} <input type="tel" [(ngModel)]="form.phoneNumber" name="phoneNumber" maxlength="50" /></label>
            <label>{{ t('adminVendorApplications.taxCode') }} <input type="text" [(ngModel)]="form.taxCode" name="taxCode" maxlength="50" /></label>
          </div>
          <label>{{ t('adminVendorApplications.businessAddress') }} <input type="text" [(ngModel)]="form.businessAddress" name="businessAddress" maxlength="1000" /></label>
          <label>{{ t('admin.common.description') }} <textarea [(ngModel)]="form.description" name="description" rows="2"></textarea></label>
          <app-media-image-field [label]="t('admin.vendors.logo')" purpose="vendorLogo" [vendorId]="editingId" [(pictureId)]="form.pictureId" />
          <label>{{ t('admin.vendors.adminComment') }} <textarea [(ngModel)]="form.adminComment" name="adminComment" rows="2"></textarea></label>
          <div class="form-row">
            <label class="check-label"><input type="checkbox" [(ngModel)]="form.active" name="active" /> {{ t('admin.common.active') }}</label>
            <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="form.displayOrder" name="displayOrder" /></label>
          </div>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="saving">{{ saving ? t('common.states.saving') : t('common.actions.save') }}</button>
            <button type="button" class="btn btn-secondary" (click)="closeForm()">{{ t('common.actions.cancel') }}</button>
          </div>
        </form>
      </div>
    }

    @if (selected; as v) {
      <div class="panel">
        <div class="panel-header"><h2>{{ t('admin.vendors.membersOf', { name: v.name }) }}</h2></div>
        @if (membersLoading) {
          <p class="state">{{ t('admin.vendors.loadingMembers') }}</p>
        } @else if (membersError) {
          <p class="state state-error" role="alert">{{ membersError }}</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>{{ t('admin.vendors.account') }}</th><th>{{ t('admin.common.status') }}</th><th>{{ t('admin.vendors.lastSignIn') }}</th><th></th></tr></thead>
              <tbody>
                @for (m of members; track m.customerId) {
                  <tr>
                    <td>{{ m.email }}@if (fullName(m)) { <br /><span class="muted">{{ fullName(m) }}</span> }</td>
                    <td><span [class]="'badge badge-' + m.status">{{ m.status === 'active' ? t('vendorStatus.member.active') : t('vendorStatus.member.pendingSetup') }}</span></td>
                    <td>{{ m.lastLoginDateUtc ? (m.lastLoginDateUtc | date:'dd/MM/yyyy HH:mm') : '—' }}</td>
                    <td class="row-actions">
                      @if (pendingRemove?.customerId === m.customerId) {
                        <button type="button" class="btn btn-danger btn-small" (click)="removeMember(v, m)" [disabled]="saving">{{ t('admin.vendors.confirmRemove') }}</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingRemove = null">{{ t('common.actions.cancel') }}</button>
                      } @else {
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingRemove = m" [disabled]="members.length <= 1" [title]="members.length <= 1 ? t('errors.vendor_member.last_member') : ''">{{ t('admin.vendors.remove') }}</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          @if (members.length <= 1) { <p class="state">{{ t('admin.vendors.lastMemberNote') }}</p> }
          @if (actionError) { <p class="banner" role="alert">{{ actionError }}</p> }
        }
      </div>
    }
    </ng-container>
  `
})
export class AdminVendorsPage implements OnInit {
  private readonly api = inject(VendorApiService);
  private readonly transloco = inject(TranslocoService);

  vendors: VendorResponse[] = [];
  loading = false;
  loadError = '';
  page = 1;
  readonly pageSize = 50;
  totalPages = 1;
  searchTerm = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  formOpen = false;
  editingId: number | null = null;
  form: VendorForm = this.emptyForm();
  saving = false;
  actionError = '';
  pendingDelete: VendorResponse | null = null;

  selected: VendorResponse | null = null;
  members: VendorMemberResponse[] = [];
  membersLoading = false;
  membersError = '';
  pendingRemove: VendorMemberResponse | null = null;

  ngOnInit() { this.loadVendors(); }

  loadVendors() {
    this.loading = true;
    this.loadError = '';
    this.api.getVendors(this.page, this.pageSize, this.searchTerm.trim() || undefined).subscribe({
      next: res => { this.vendors = res.items; this.totalPages = Math.max(res.totalPages, 1); this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, this.transloco.translate('admin.vendors.errors.load')); }
    });
  }

  onSearch() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => { this.page = 1; this.loadVendors(); }, 300);
  }

  goPage(p: number) { this.page = p; this.loadVendors(); }

  openForm(v: VendorResponse) {
    this.editingId = v.id;
    this.form = {
      pictureId: v.pictureId,
      name: v.name, email: v.email, description: v.description ?? '',
      phoneNumber: v.phoneNumber ?? '', taxCode: v.taxCode ?? '', businessAddress: v.businessAddress ?? '',
      adminComment: v.adminComment ?? '', active: v.active ?? true, displayOrder: v.displayOrder
    };
    this.actionError = '';
    this.pendingDelete = null;
    this.formOpen = true;
  }

  closeForm() { this.formOpen = false; this.editingId = null; this.actionError = ''; }

  submitVendor() {
    if (!this.editingId) return;
    if (!this.form.name.trim() || !this.form.email.trim()) {
      this.actionError = this.transloco.translate('admin.vendors.nameEmailRequired');
      return;
    }
    this.saving = true;
    this.actionError = '';
    const body: UpdateVendorRequest = {
      name: this.form.name,
      email: this.form.email,
      description: this.form.description || null,
      phoneNumber: this.form.phoneNumber || null,
      taxCode: this.form.taxCode || null,
      businessAddress: this.form.businessAddress || null,
      pictureId: this.form.pictureId,
      adminComment: this.form.adminComment || null,
      active: this.form.active,
      displayOrder: this.form.displayOrder
    };
    this.api.updateVendor(this.editingId, body).subscribe({
      next: () => { this.saving = false; this.closeForm(); this.loadVendors(); },
      error: err => { this.saving = false; this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.common.saveFailed')); }
    });
  }

  askDelete(v: VendorResponse) {
    this.pendingDelete = v;
    this.actionError = '';
    this.formOpen = false;
  }

  confirmDelete(v: VendorResponse) {
    this.saving = true;
    this.actionError = '';
    this.api.deleteVendor(v.id).subscribe({
      next: () => {
        this.saving = false;
        this.pendingDelete = null;
        if (this.selected?.id === v.id) this.selected = null;
        this.loadVendors();
      },
      error: err => { this.saving = false; this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.common.deleteFailed')); }
    });
  }

  showMembers(v: VendorResponse) {
    this.selected = v;
    this.pendingRemove = null;
    this.actionError = '';
    this.loadMembers(v);
  }

  removeMember(v: VendorResponse, m: VendorMemberResponse) {
    this.saving = true;
    this.actionError = '';
    this.api.removeMember(v.id, m.customerId).subscribe({
      next: () => { this.saving = false; this.pendingRemove = null; this.loadMembers(v); },
      error: err => {
        this.saving = false;
        this.pendingRemove = null;
        this.actionError = vendorErrorMessage(err, this.transloco.translate('admin.vendors.errors.removeMember'));
        this.loadMembers(v);
      }
    });
  }

  fullName(m: VendorMemberResponse) {
    return [m.firstName, m.lastName].filter(Boolean).join(' ');
  }

  private loadMembers(v: VendorResponse) {
    this.membersLoading = true;
    this.membersError = '';
    this.api.getMembers(v.id).subscribe({
      next: members => { this.members = members; this.membersLoading = false; },
      error: err => { this.membersLoading = false; this.membersError = vendorErrorMessage(err, this.transloco.translate('admin.vendors.errors.loadMembers')); }
    });
  }

  private emptyForm(): VendorForm {
    return { pictureId: 0, name: '', email: '', description: '', phoneNumber: '', taxCode: '', businessAddress: '', adminComment: '', active: true, displayOrder: 0 };
  }
}
