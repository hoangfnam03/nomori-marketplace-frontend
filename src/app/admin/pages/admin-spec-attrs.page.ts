import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { CatalogApiService } from '../../core/catalog/catalog-api.service';
import { SpecificationAttributeGroup, SpecificationAttributeDef, SpecificationAttributeOption } from '../../core/catalog/spec-attribute.models';

type Panel = 'groups' | 'attrs' | 'options';

@Component({
  standalone: true,
  imports: [FormsModule, TranslocoDirective],
  template: `
    <ng-container *transloco="let t">
    <section class="admin-intro" aria-labelledby="spec-title">
      <div>
        <div class="eyebrow">{{ t('admin.specs.eyebrow') }}</div>
        <h1 id="spec-title">{{ t('admin.specs.title') }}</h1>
        <p>{{ t('admin.specs.lede') }}</p>
      </div>
    </section>

    <div class="tabs" role="tablist">
      <button role="tab" [class.active]="panel === 'groups'" (click)="setPanel('groups')">{{ t('admin.specs.tabGroups') }}</button>
      <button role="tab" [class.active]="panel === 'attrs'" (click)="setPanel('attrs')">{{ t('admin.specs.tabAttributes') }}</button>
      <button role="tab" [class.active]="panel === 'options'" (click)="setPanel('options')">{{ t('admin.specs.tabOptions') }}</button>
    </div>

    <!-- GROUPS -->
    @if (panel === 'groups') {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('admin.specs.groupsHeading') }}</h2>
          <button type="button" class="new-btn" (click)="openGroupForm()">+ {{ t('admin.specs.newGroup') }}</button>
        </div>

        @if (groupFormOpen) {
          <form class="inline-form" (ngSubmit)="submitGroup()" [attr.aria-label]="editingGroupId ? t('admin.specs.editGroup') : t('admin.specs.newGroup')">
            <div class="form-title">{{ editingGroupId ? t('admin.specs.editGroup') : t('admin.specs.newGroup') }}</div>
            @if (groupFormError) { <p class="form-error" role="alert">{{ t(groupFormError) }}</p> }
            <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="groupForm.name" name="name" required /></label>
            <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="groupForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            <div class="form-actions">
              <button type="submit" [disabled]="saving">{{ saving ? t('common.states.saving') : t('common.actions.save') }}</button>
              <button type="button" class="cancel-btn" (click)="closeGroupForm()">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }

        @if (loadingGroups) {
          <p class="loading-msg">{{ t('common.states.loading') }}</p>
        } @else if (groups.length === 0) {
          <p class="empty-msg">{{ t('admin.specs.noGroups') }}</p>
        } @else {
          <table class="data-table">
            <thead><tr><th>{{ t('admin.common.name') }}</th><th>{{ t('admin.common.order') }}</th><th class="actions-col"></th></tr></thead>
            <tbody>
              @for (g of groups; track g.id) {
                <tr>
                  <td>{{ g.name }}</td>
                  <td>{{ g.displayOrder }}</td>
                  <td class="row-actions">
                    <button type="button" class="edit-btn" (click)="editGroup(g)">{{ t('common.actions.edit') }}</button>
                    <button type="button" class="del-btn" (click)="deleteGroup(g.id)">{{ t('common.actions.delete') }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }

    <!-- ATTRIBUTES -->
    @if (panel === 'attrs') {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('admin.specs.attributesHeading') }}</h2>
          <button type="button" class="new-btn" (click)="openAttrForm()">+ {{ t('admin.specs.newAttribute') }}</button>
        </div>

        @if (attrFormOpen) {
          <form class="inline-form" (ngSubmit)="submitAttr()" [attr.aria-label]="editingAttrId ? t('admin.specs.editAttribute') : t('admin.specs.newAttribute')">
            <div class="form-title">{{ editingAttrId ? t('admin.specs.editAttribute') : t('admin.specs.newAttribute') }}</div>
            @if (attrFormError) { <p class="form-error" role="alert">{{ t(attrFormError) }}</p> }
            <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="attrForm.name" name="name" required /></label>
            <label>{{ t('admin.specs.group') }}
              <select [(ngModel)]="attrForm.groupId" name="groupId">
                <option [ngValue]="null">— {{ t('admin.common.none') }} —</option>
                @for (g of groups; track g.id) {
                  <option [ngValue]="g.id">{{ g.name }}</option>
                }
              </select>
            </label>
            <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="attrForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            <div class="form-actions">
              <button type="submit" [disabled]="saving">{{ saving ? t('common.states.saving') : t('common.actions.save') }}</button>
              <button type="button" class="cancel-btn" (click)="closeAttrForm()">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }

        @if (loadingAttrs) {
          <p class="loading-msg">{{ t('common.states.loading') }}</p>
        } @else if (attrs.length === 0) {
          <p class="empty-msg">{{ t('admin.specs.noAttributes') }}</p>
        } @else {
          <table class="data-table">
            <thead><tr><th>{{ t('admin.common.name') }}</th><th>{{ t('admin.specs.group') }}</th><th>{{ t('admin.common.order') }}</th><th class="actions-col"></th></tr></thead>
            <tbody>
              @for (a of attrs; track a.id) {
                <tr>
                  <td>{{ a.name }}</td>
                  <td>{{ groupName(a.specificationAttributeGroupId) }}</td>
                  <td>{{ a.displayOrder }}</td>
                  <td class="row-actions">
                    <button type="button" class="edit-btn" (click)="editAttr(a)">{{ t('common.actions.edit') }}</button>
                    <button type="button" class="opt-btn" (click)="viewOptions(a)">{{ t('admin.specs.tabOptions') }}</button>
                    <button type="button" class="del-btn" (click)="deleteAttr(a.id)">{{ t('common.actions.delete') }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }

    <!-- OPTIONS -->
    @if (panel === 'options') {
      <div class="panel">
        <div class="panel-header">
          <h2>{{ t('admin.specs.tabOptions') }}{{ selectedAttr ? ' — ' + selectedAttr.name : '' }}</h2>
          <div class="header-right">
            <select class="attr-select" [(ngModel)]="selectedAttrId" (ngModelChange)="loadOptions($event)" [ngModelOptions]="{standalone: true}">
              <option [ngValue]="null">{{ t('admin.specs.selectAttribute') }}</option>
              @for (a of attrs; track a.id) {
                <option [ngValue]="a.id">{{ a.name }}</option>
              }
            </select>
            @if (selectedAttrId) {
              <button type="button" class="new-btn" (click)="openOptionForm()">+ {{ t('admin.specs.newOption') }}</button>
            }
          </div>
        </div>

        @if (optionFormOpen) {
          <form class="inline-form" (ngSubmit)="submitOption()" [attr.aria-label]="editingOptionId ? t('admin.specs.editOption') : t('admin.specs.newOption')">
            <div class="form-title">{{ editingOptionId ? t('admin.specs.editOption') : t('admin.specs.newOption') }}</div>
            @if (optionFormError) { <p class="form-error" role="alert">{{ t(optionFormError) }}</p> }
            <label>{{ t('admin.common.name') }} <input type="text" [(ngModel)]="optionForm.name" name="name" required /></label>
            <label>{{ t('admin.specs.colorHex') }} <input type="text" [(ngModel)]="optionForm.colorSquaresRgb" name="color" placeholder="#rrggbb" style="width:120px" /></label>
            <label>{{ t('admin.common.displayOrder') }} <input type="number" [(ngModel)]="optionForm.displayOrder" name="displayOrder" style="width:80px" /></label>
            <div class="form-actions">
              <button type="submit" [disabled]="saving">{{ saving ? t('common.states.saving') : t('common.actions.save') }}</button>
              <button type="button" class="cancel-btn" (click)="closeOptionForm()">{{ t('common.actions.cancel') }}</button>
            </div>
          </form>
        }

        @if (!selectedAttrId) {
          <p class="empty-msg">{{ t('admin.specs.selectAttributeHint') }}</p>
        } @else if (loadingOptions) {
          <p class="loading-msg">{{ t('common.states.loading') }}</p>
        } @else if (options.length === 0) {
          <p class="empty-msg">{{ t('admin.specs.noOptions') }}</p>
        } @else {
          <table class="data-table">
            <thead><tr><th>{{ t('admin.common.name') }}</th><th>{{ t('admin.specs.color') }}</th><th>{{ t('admin.common.order') }}</th><th class="actions-col"></th></tr></thead>
            <tbody>
              @for (o of options; track o.id) {
                <tr>
                  <td>
                    @if (o.colorSquaresRgb) {
                      <span class="color-dot" [style.background]="o.colorSquaresRgb"></span>
                    }
                    {{ o.name }}
                  </td>
                  <td><code>{{ o.colorSquaresRgb || '—' }}</code></td>
                  <td>{{ o.displayOrder }}</td>
                  <td class="row-actions">
                    <button type="button" class="edit-btn" (click)="editOption(o)">{{ t('common.actions.edit') }}</button>
                    <button type="button" class="del-btn" (click)="deleteOption(o.id)">{{ t('common.actions.delete') }}</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    }
    </ng-container>
  `,
  styles: [`
    :host { display: block; }
    .admin-intro { padding: 3rem 0 2rem; animation: rise-in 500ms ease both; }
    .eyebrow { color: var(--green); font: 700 .72rem/1 var(--mono-font); letter-spacing: .13em; text-transform: uppercase; margin-bottom: .75rem; }
    h1 { margin: 0; font: 700 clamp(2rem,4vw,3.2rem)/1.08 var(--display-font); }
    .admin-intro p { color: var(--muted); max-width: 600px; margin: .75rem 0 0; }
    .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--line); margin-bottom: 1.5rem; }
    .tabs button { padding: .6rem 1.2rem; border: none; border-bottom: 2px solid transparent; background: transparent; color: var(--muted); font: 600 .85rem inherit; cursor: pointer; margin-bottom: -1px; transition: color .12s, border-color .12s; }
    .tabs button.active { color: var(--ink); border-bottom-color: var(--ink); }
    .tabs button:hover:not(.active) { color: var(--ink); }
    .panel { border: 1px solid var(--line); padding: 1.5rem; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
    .panel-header h2 { margin: 0; font: 700 1.15rem/1 var(--display-font); }
    .header-right { display: flex; align-items: center; gap: .75rem; }
    .attr-select { padding: .4rem .6rem; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-size: .85rem; }
    .new-btn { padding: .4rem .9rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); font: 600 .82rem inherit; cursor: pointer; letter-spacing: .04em; }
    .new-btn:hover { opacity: .85; }
    .inline-form { border: 1px solid var(--line); padding: 1.25rem 1.5rem; margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: .75rem; max-width: 480px; }
    .form-title { font: 700 .9rem var(--display-font); margin-bottom: .25rem; }
    .form-error { color: #8d3128; font-size: .85rem; margin: 0; }
    .inline-form label { display: flex; flex-direction: column; gap: .3rem; font: .8rem var(--mono-font); text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
    .inline-form input, .inline-form select, .inline-form textarea { border: 1px solid var(--line); padding: .45rem .6rem; font-size: .9rem; background: var(--paper); color: var(--ink); }
    .form-actions { display: flex; gap: .5rem; padding-top: .25rem; }
    .form-actions button[type=submit] { padding: .45rem 1.1rem; border: 1px solid var(--ink); background: var(--ink); color: var(--paper); font: 600 .82rem inherit; cursor: pointer; }
    .form-actions button[type=submit]:disabled { opacity: .45; cursor: not-allowed; }
    .cancel-btn { padding: .45rem 1.1rem; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font: 600 .82rem inherit; cursor: pointer; }
    .loading-msg, .empty-msg { color: var(--muted); font-size: .9rem; padding: 1rem 0; }
    .data-table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    .data-table th { text-align: left; font: 700 .68rem var(--mono-font); text-transform: uppercase; letter-spacing: .08em; color: var(--muted); padding: .5rem .75rem .5rem 0; border-bottom: 1px solid var(--line); }
    .data-table td { padding: .75rem .75rem .75rem 0; border-bottom: 1px solid var(--line); vertical-align: middle; }
    .actions-col { width: 1px; white-space: nowrap; }
    .row-actions { display: flex; gap: .5rem; }
    .edit-btn, .opt-btn { padding: .3rem .7rem; border: 1px solid var(--line); background: var(--paper); color: var(--ink); font-size: .78rem; cursor: pointer; }
    .edit-btn:hover, .opt-btn:hover { border-color: var(--ink); }
    .del-btn { padding: .3rem .7rem; border: 1px solid #c9a9a4; background: var(--paper); color: #8d3128; font-size: .78rem; cursor: pointer; }
    .del-btn:hover { background: #8d3128; color: #fff; border-color: #8d3128; }
    .color-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: middle; margin-right: .4rem; border: 1px solid var(--line); }
    code { font: .78rem var(--mono-font); color: var(--muted); }
    @keyframes rise-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AdminSpecAttrsPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly transloco = inject(TranslocoService);

  panel: Panel = 'groups';

  groups: SpecificationAttributeGroup[] = [];
  loadingGroups = true;
  groupFormOpen = false;
  editingGroupId: number | null = null;
  groupForm = { name: '', displayOrder: 0 };
  groupFormError: string | null = null;

  attrs: SpecificationAttributeDef[] = [];
  loadingAttrs = true;
  attrFormOpen = false;
  editingAttrId: number | null = null;
  attrForm = { name: '', groupId: null as number | null, displayOrder: 0 };
  attrFormError: string | null = null;

  options: SpecificationAttributeOption[] = [];
  loadingOptions = false;
  selectedAttrId: number | null = null;
  optionFormOpen = false;
  editingOptionId: number | null = null;
  optionForm = { name: '', colorSquaresRgb: null as string | null, displayOrder: 0 };
  optionFormError: string | null = null;

  saving = false;

  get selectedAttr(): SpecificationAttributeDef | null {
    return this.attrs.find(a => a.id === this.selectedAttrId) ?? null;
  }

  ngOnInit() {
    this.fetchGroups();
    this.fetchAttrs();
  }

  setPanel(p: Panel) {
    this.panel = p;
    this.closeGroupForm();
    this.closeAttrForm();
    this.closeOptionForm();
  }

  // ---- Groups ----

  fetchGroups() {
    this.loadingGroups = true;
    this.api.adminGetSpecGroups().subscribe({ next: g => { this.groups = g; this.loadingGroups = false; }, error: () => { this.loadingGroups = false; } });
  }

  openGroupForm() { this.editingGroupId = null; this.groupForm = { name: '', displayOrder: 0 }; this.groupFormError = null; this.groupFormOpen = true; }
  closeGroupForm() { this.groupFormOpen = false; this.groupFormError = null; }

  editGroup(g: SpecificationAttributeGroup) {
    this.editingGroupId = g.id;
    this.groupForm = { name: g.name, displayOrder: g.displayOrder };
    this.groupFormError = null;
    this.groupFormOpen = true;
  }

  submitGroup() {
    if (!this.groupForm.name.trim()) { this.groupFormError = 'admin.common.nameRequired'; return; }
    this.saving = true;
    const body = { name: this.groupForm.name.trim(), displayOrder: this.groupForm.displayOrder };
    const req = this.editingGroupId
      ? this.api.adminUpdateSpecGroup(this.editingGroupId, body)
      : this.api.adminCreateSpecGroup(body);
    req.subscribe({
      next: () => { this.saving = false; this.closeGroupForm(); this.fetchGroups(); },
      error: () => { this.saving = false; this.groupFormError = 'admin.common.saveFailed'; }
    });
  }

  deleteGroup(id: number) {
    if (!confirm(this.transloco.translate('admin.specs.confirmDeleteGroup'))) return;
    this.api.adminDeleteSpecGroup(id).subscribe({ next: () => this.fetchGroups(), error: () => alert(this.transloco.translate('admin.common.deleteFailed')) });
  }

  // ---- Attrs ----

  fetchAttrs() {
    this.loadingAttrs = true;
    this.api.adminGetSpecAttrs().subscribe({ next: a => { this.attrs = a; this.loadingAttrs = false; }, error: () => { this.loadingAttrs = false; } });
  }

  openAttrForm() { this.editingAttrId = null; this.attrForm = { name: '', groupId: null, displayOrder: 0 }; this.attrFormError = null; this.attrFormOpen = true; }
  closeAttrForm() { this.attrFormOpen = false; this.attrFormError = null; }

  editAttr(a: SpecificationAttributeDef) {
    this.editingAttrId = a.id;
    this.attrForm = { name: a.name, groupId: a.specificationAttributeGroupId, displayOrder: a.displayOrder };
    this.attrFormError = null;
    this.attrFormOpen = true;
  }

  submitAttr() {
    if (!this.attrForm.name.trim()) { this.attrFormError = 'admin.common.nameRequired'; return; }
    this.saving = true;
    const body = { name: this.attrForm.name.trim(), groupId: this.attrForm.groupId, displayOrder: this.attrForm.displayOrder };
    const req = this.editingAttrId
      ? this.api.adminUpdateSpecAttr(this.editingAttrId, body)
      : this.api.adminCreateSpecAttr(body);
    req.subscribe({
      next: () => { this.saving = false; this.closeAttrForm(); this.fetchAttrs(); },
      error: () => { this.saving = false; this.attrFormError = 'admin.common.saveFailed'; }
    });
  }

  deleteAttr(id: number) {
    if (!confirm(this.transloco.translate('admin.specs.confirmDeleteAttribute'))) return;
    this.api.adminDeleteSpecAttr(id).subscribe({ next: () => this.fetchAttrs(), error: () => alert(this.transloco.translate('admin.common.deleteFailed')) });
  }

  viewOptions(a: SpecificationAttributeDef) {
    this.selectedAttrId = a.id;
    this.setPanel('options');
    this.loadOptions(a.id);
  }

  groupName(id: number | null): string {
    if (id == null) return '—';
    return this.groups.find(g => g.id === id)?.name ?? '—';
  }

  // ---- Options ----

  loadOptions(attrId: number | null) {
    if (attrId == null) { this.options = []; return; }
    this.loadingOptions = true;
    this.api.adminGetSpecOptions(attrId).subscribe({ next: o => { this.options = o; this.loadingOptions = false; }, error: () => { this.loadingOptions = false; } });
  }

  openOptionForm() { this.editingOptionId = null; this.optionForm = { name: '', colorSquaresRgb: null, displayOrder: 0 }; this.optionFormError = null; this.optionFormOpen = true; }
  closeOptionForm() { this.optionFormOpen = false; this.optionFormError = null; }

  editOption(o: SpecificationAttributeOption) {
    this.editingOptionId = o.id;
    this.optionForm = { name: o.name, colorSquaresRgb: o.colorSquaresRgb, displayOrder: o.displayOrder };
    this.optionFormError = null;
    this.optionFormOpen = true;
  }

  submitOption() {
    if (!this.optionForm.name.trim()) { this.optionFormError = 'admin.common.nameRequired'; return; }
    if (!this.selectedAttrId) return;
    this.saving = true;
    const body = { name: this.optionForm.name.trim(), colorSquaresRgb: this.optionForm.colorSquaresRgb || null, displayOrder: this.optionForm.displayOrder };
    const req = this.editingOptionId
      ? this.api.adminUpdateSpecOption(this.selectedAttrId, this.editingOptionId, body)
      : this.api.adminCreateSpecOption(this.selectedAttrId, body);
    req.subscribe({
      next: () => { this.saving = false; this.closeOptionForm(); this.loadOptions(this.selectedAttrId); },
      error: () => { this.saving = false; this.optionFormError = 'admin.common.saveFailed'; }
    });
  }

  deleteOption(id: number) {
    if (!confirm(this.transloco.translate('admin.specs.confirmDeleteOption'))) return;
    if (!this.selectedAttrId) return;
    this.api.adminDeleteSpecOption(this.selectedAttrId, id).subscribe({ next: () => this.loadOptions(this.selectedAttrId), error: () => alert(this.transloco.translate('admin.common.deleteFailed')) });
  }
}
