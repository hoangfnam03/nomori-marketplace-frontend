import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { AdminAuthorizationApiService, AdminAuditLog, AdminCustomerSummary, AdminRole } from '../services/admin-authorization-api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <section class="admin-intro" aria-labelledby="admin-title">
      <div>
        <div class="eyebrow">{{ t('admin.home.eyebrow') }}</div>
        <h1 id="admin-title">{{ t('admin.home.title') }}</h1>
        <p>{{ t('admin.home.lede') }}</p>
      </div>
      <div class="status-card"><span class="status-label">{{ t('admin.home.statusLabel') }}</span><strong>{{ t('admin.home.statusTitle') }}</strong><span>{{ t('admin.home.statusText') }}</span></div>
    </section>
    <section class="role-panel" aria-labelledby="role-title">
      <div class="eyebrow">{{ t('admin.home.rolesEyebrow') }}</div>
      <h2 id="role-title">{{ t('admin.home.rolesTitle') }}</h2>
      @if (loading) { <p class="state">{{ t('admin.home.rolesLoading') }}</p> }
      @if (error) { <p class="state state-error" role="alert">{{ t(error) }}</p> }
      @if (!loading && !error) {
        <div class="customer-search">
          <form class="role-form" (ngSubmit)="searchCustomers()">
            <label>{{ t('admin.home.searchLabel') }} <input type="search" name="customerSearch" [(ngModel)]="searchTerm" maxlength="200" /></label>
            <button type="submit" [disabled]="searching || !searchTerm.trim()">{{ searching ? t('admin.home.searching') : t('admin.home.searchButton') }}</button>
          </form>
          @if (searchError) { <p class="state state-error" role="alert">{{ t(searchError) }}</p> }
          @if (searchResults) {
            @if (!searchResults.length) { <p class="state">{{ t('admin.home.noCustomerFound') }}</p> }
            @else {
              <div class="search-results">
                @for (c of searchResults; track c.id) {
                  <div class="search-row">
                    <span><strong>{{ c.email }}</strong> <small>#{{ c.id }}{{ c.username ? ' · ' + c.username : '' }}{{ fullName(c) ? ' · ' + fullName(c) : '' }}</small></span>
                    <button type="button" (click)="selectCustomer(c)" [disabled]="customerId === c.id">{{ customerId === c.id ? t('admin.home.selectedCustomer') : t('admin.home.selectCustomer') }}</button>
                  </div>
                }
              </div>
            }
          }
        </div>
        <div class="role-form">
          <label>{{ t('admin.home.customerId') }} <input type="number" min="1" [(ngModel)]="customerId" /></label>
          <button type="button" (click)="loadCustomerRoles()" [disabled]="!customerId">{{ t('admin.home.loadRoles') }}</button>
        </div>
        <div class="role-list">
          @for (role of roles; track role.systemName) {
            <label class="role-option"><input type="checkbox" [checked]="selectedRoles.has(role.systemName)" (change)="toggleRole(role)" /> <span>{{ role.name }}</span><small>{{ role.systemName }}</small></label>
          }
        </div>
        <button type="button" class="save-button" (click)="saveRoles()" [disabled]="!customerId || saving">{{ saving ? t('common.states.saving') : t('admin.home.saveRoles') }}</button>
        @if (success) { <p class="state state-success" role="status">{{ t('admin.home.rolesSaved') }}</p> }
      }
    </section>
    <section class="role-panel audit-panel" aria-labelledby="audit-title">
      <div class="eyebrow">{{ t('admin.home.auditEyebrow') }}</div>
      <h2 id="audit-title">{{ t('admin.home.auditTitle') }}</h2>
      <button type="button" (click)="loadAuditLogs()" [disabled]="auditLoading">{{ auditLoading ? t('common.states.loading') : t('admin.home.loadAudit') }}</button>
      @if (auditError) { <p class="state state-error" role="alert">{{ t(auditError) }}</p> }
      @if (auditLogs) { @if (!auditLogs.length) { <p class="state">{{ t('admin.home.noAudit') }}</p> } @else { <div class="audit-list">@for (log of auditLogs; track log.id) { <div class="audit-row"><strong>{{ log.eventName }}</strong><span>{{ log.createdOnUtc | date:'dd/MM/yyyy HH:mm' }}</span><small>{{ t('admin.home.auditActor', { customer: log.customerId ?? t('admin.home.system'), ip: log.ipAddress ?? t('admin.home.unknownIp') }) }}</small></div> }</div> } }
    </section>
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .admin-intro { display: grid; grid-template-columns: 1fr 300px; gap: clamp(2rem, 8vw, 8rem); align-items: end; min-height: 60vh; animation: rise-in 600ms ease both; }
    .eyebrow, .status-label { color: var(--green); font: 700 0.75rem/1 var(--mono-font); letter-spacing: 0.13em; text-transform: uppercase; }
    h1 { max-width: 700px; margin: 1.2rem 0; font: 700 clamp(3rem, 7vw, 7rem)/0.94 var(--display-font); }
    p { max-width: 560px; color: var(--muted); font-size: 1.1rem; line-height: 1.7; }
    .status-card { display: grid; gap: 0.7rem; padding: 1.4rem; border: 1px solid var(--line-strong); background: var(--ink); color: var(--paper); }
    .status-card strong { font: 700 1.5rem/1.1 var(--display-font); }
    .status-card span:last-child { color: #b4b8ae; font-size: 0.85rem; }
    .role-panel { max-width: 760px; margin: 2rem 0 5rem; padding: 1.5rem; border: 1px solid var(--line); background: rgba(255,255,255,.58); }
    h2 { margin: .7rem 0 1.2rem; font: 700 2rem/1 var(--display-font); }
    .role-form { display: flex; flex-wrap: wrap; gap: .8rem; align-items: end; }
    .role-form label { display: grid; gap: .4rem; color: var(--muted); font: .7rem var(--mono-font); text-transform: uppercase; }
    input[type=number] { display: block; width: 180px; padding: .7rem; border: 1px solid var(--line-strong); background: var(--paper); font: inherit; }
    button { border: 1px solid var(--ink); padding: .75rem 1rem; background: var(--ink); color: var(--paper); cursor: pointer; font-weight: 700; }
    button:disabled { cursor: not-allowed; opacity: .5; }
    .customer-search { display: grid; gap: .8rem; margin-bottom: 1.2rem; }
    .customer-search form { margin: 0; }
    .search-results { display: grid; gap: .4rem; }
    .search-row { display: flex; justify-content: space-between; align-items: center; gap: .8rem; padding: .6rem 0; border-bottom: 1px solid var(--line); }
    .search-row small { color: var(--muted); font: .68rem var(--mono-font); }
    .search-row button { padding: .5rem .8rem; }
    .role-list { display: grid; gap: .6rem; margin: 1.4rem 0; }
    .role-option { display: grid; grid-template-columns: auto 1fr auto; gap: .7rem; align-items: center; padding: .7rem; border-bottom: 1px solid var(--line); }
    .role-option small { color: var(--muted); font: .68rem var(--mono-font); }
    .save-button { background: var(--green); }
    .state { color: var(--muted); line-height: 1.5; }
    .state-error { color: #8d3128; }
    .state-success { color: var(--green); }
    .audit-panel { max-width: 900px; }
    .audit-list { display: grid; gap: .5rem; margin-top: 1rem; }
    .audit-row { display: grid; grid-template-columns: 1fr auto; gap: .25rem 1rem; padding: .75rem; border-bottom: 1px solid var(--line); }
    .audit-row span, .audit-row small { color: var(--muted); font: .72rem var(--mono-font); }
    .audit-row small { grid-column: 1 / -1; }
    @media (max-width: 760px) { .admin-intro { grid-template-columns: 1fr; align-items: start; } .role-option { grid-template-columns: auto 1fr; } .role-option small { grid-column: 2; } }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminHomePage {
  private readonly api = inject(AdminAuthorizationApiService);
  roles: AdminRole[] = [];
  selectedRoles = new Set<string>();
  customerId: number | null = null;
  searchTerm = '';
  searchResults: AdminCustomerSummary[] | null = null;
  searching = false;
  searchError: string | null = null;
  loading = true;
  saving = false;
  success = false;
  error: string | null = null;
  auditLogs?: AdminAuditLog[];
  auditLoading = false;
  auditError: string | null = null;

  constructor() {
    this.api.getRoles().subscribe({
      next: roles => { this.roles = roles; this.loading = false; },
      error: error => { this.error = error.status === 403 ? 'admin.home.errors.rolesForbidden' : 'admin.home.errors.rolesLoad'; this.loading = false; }
    });
  }

  toggleRole(role: AdminRole) {
    if (this.selectedRoles.has(role.systemName)) this.selectedRoles.delete(role.systemName);
    else this.selectedRoles.add(role.systemName);
  }

  searchCustomers() {
    const term = this.searchTerm.trim();
    if (!term) return;
    this.searching = true; this.searchError = null;
    this.api.searchCustomers(term).subscribe({
      next: results => { this.searchResults = results; this.searching = false; },
      error: () => { this.searchError = 'admin.home.searchError'; this.searching = false; }
    });
  }

  selectCustomer(customer: AdminCustomerSummary) {
    this.customerId = customer.id;
    this.loadCustomerRoles();
  }

  fullName(customer: AdminCustomerSummary) {
    return [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  }

  loadCustomerRoles() {
    if (!this.customerId) return;
    this.error = null;
    this.api.getCustomerRoles(this.customerId).subscribe({
      next: response => this.selectedRoles = new Set(response.roles.map(role => role.systemName)),
      error: error => this.error = error.status === 404 ? 'admin.home.errors.customerNotFound' : 'admin.home.errors.customerRolesLoad'
    });
  }

  saveRoles() {
    if (!this.customerId) return;
    this.saving = true; this.success = false; this.error = null;
    this.api.replaceCustomerRoles(this.customerId, [...this.selectedRoles]).subscribe({
      next: response => { this.selectedRoles = new Set(response.roles.map(role => role.systemName)); this.success = true; this.saving = false; },
      error: error => { this.error = error.status === 403 ? 'admin.home.errors.ownAdminRole' : 'admin.home.errors.rolesSave'; this.saving = false; }
    });
  }

  loadAuditLogs() {
    this.auditLoading = true; this.auditError = null;
    this.api.getAuditLogs().subscribe({ next: logs => this.auditLogs = logs, error: error => this.auditError = error.status === 403 ? 'admin.home.errors.auditForbidden' : 'admin.home.errors.auditLoad', complete: () => this.auditLoading = false });
  }
}
