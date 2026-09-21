import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminAuthorizationApiService, AdminAuditLog, AdminRole } from '../services/admin-authorization-api.service';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-intro" aria-labelledby="admin-title">
      <div>
        <div class="eyebrow">Admin / Foundation</div>
        <h1 id="admin-title">The operational side starts here.</h1>
        <p>Role assignment is protected by the backend permission boundary. The browser only coordinates the workflow and renders the API state.</p>
      </div>
      <div class="status-card"><span class="status-label">Boundary status</span><strong>Authorization online</strong><span>Role catalog and assignment API are available.</span></div>
    </section>
    <section class="role-panel" aria-labelledby="role-title">
      <div class="eyebrow">Authorization / Roles</div>
      <h2 id="role-title">Assign customer roles</h2>
      @if (loading) { <p class="state">Loading role catalog...</p> }
      @if (error) { <p class="state state-error" role="alert">{{ error }}</p> }
      @if (!loading && !error) {
        <div class="role-form">
          <label>Customer ID <input type="number" min="1" [(ngModel)]="customerId" /></label>
          <button type="button" (click)="loadCustomerRoles()" [disabled]="!customerId">Load current roles</button>
        </div>
        <div class="role-list">
          @for (role of roles; track role.systemName) {
            <label class="role-option"><input type="checkbox" [checked]="selectedRoles.has(role.systemName)" (change)="toggleRole(role)" /> <span>{{ role.name }}</span><small>{{ role.systemName }}</small></label>
          }
        </div>
        <button type="button" class="save-button" (click)="saveRoles()" [disabled]="!customerId || saving">{{ saving ? 'Saving...' : 'Save roles' }}</button>
        @if (success) { <p class="state state-success" role="status">Role assignment saved.</p> }
      }
    </section>
    <section class="role-panel audit-panel" aria-labelledby="audit-title">
      <div class="eyebrow">Security / Audit</div>
      <h2 id="audit-title">Recent security events</h2>
      <button type="button" (click)="loadAuditLogs()" [disabled]="auditLoading">{{ auditLoading ? 'Loading...' : 'Load audit log' }}</button>
      @if (auditError) { <p class="state state-error" role="alert">{{ auditError }}</p> }
      @if (auditLogs) { @if (!auditLogs.length) { <p class="state">No audit events yet.</p> } @else { <div class="audit-list">@for (log of auditLogs; track log.id) { <div class="audit-row"><strong>{{ log.eventName }}</strong><span>{{ log.createdOnUtc | date:'medium' }}</span><small>Customer {{ log.customerId ?? 'system' }} · {{ log.ipAddress ?? 'unknown IP' }}</small></div> }</div> } }
    </section>
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
      error: error => { this.error = error.status === 403 ? 'You do not have permission to read roles.' : 'Unable to load roles.'; this.loading = false; }
    });
  }

  toggleRole(role: AdminRole) {
    if (this.selectedRoles.has(role.systemName)) this.selectedRoles.delete(role.systemName);
    else this.selectedRoles.add(role.systemName);
  }

  loadCustomerRoles() {
    if (!this.customerId) return;
    this.error = null;
    this.api.getCustomerRoles(this.customerId).subscribe({
      next: response => this.selectedRoles = new Set(response.roles.map(role => role.systemName)),
      error: error => this.error = error.status === 404 ? 'Customer was not found.' : 'Unable to load customer roles.'
    });
  }

  saveRoles() {
    if (!this.customerId) return;
    this.saving = true; this.success = false; this.error = null;
    this.api.replaceCustomerRoles(this.customerId, [...this.selectedRoles]).subscribe({
      next: response => { this.selectedRoles = new Set(response.roles.map(role => role.systemName)); this.success = true; this.saving = false; },
      error: error => { this.error = error.status === 403 ? 'You cannot remove your own Administrator role.' : 'Unable to save customer roles.'; this.saving = false; }
    });
  }

  loadAuditLogs() {
    this.auditLoading = true; this.auditError = null;
    this.api.getAuditLogs().subscribe({ next: logs => this.auditLogs = logs, error: error => this.auditError = error.status === 403 ? 'You do not have permission to read audit logs.' : 'Unable to load audit logs.', complete: () => this.auditLoading = false });
  }
}
