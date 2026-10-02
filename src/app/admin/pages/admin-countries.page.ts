import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Country, DirectoryApiService, SaveCountryRequest, SaveStateRequest, StateProvince } from '../../core/directory/directory-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

interface CountryForm {
  code: string;
  alpha3: string;
  name: string;
  published: boolean;
  allowsBilling: boolean;
  allowsShipping: boolean;
  postalCodeRequired: boolean;
  postalCodePattern: string;
  displayOrder: number;
}

interface StateForm {
  code: string;
  name: string;
  published: boolean;
  displayOrder: number;
}

@Component({
  standalone: true,
  imports: [FormsModule],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="countries-title">
      <div class="eyebrow">Admin / Settings</div>
      <h1 id="countries-title">Countries and states.</h1>
      <p>
        Customers can only use published countries in their addresses. A country with published states needs one of them in every address.
        A postal code can be required and checked against a pattern.
      </p>
    </section>

    <div class="panel">
      <div class="panel-header">
        <h2>Countries</h2>
        <div class="actions"><button type="button" class="btn" (click)="openCountryForm()">+ New country</button></div>
      </div>

      @if (notice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ notice }}</p></div> }
      @if (loading) {
        <p class="state">Loading…</p>
      } @else if (loadError) {
        <div class="panel-body">
          <p class="banner" role="alert">{{ loadError }}</p>
          <div class="actions"><button type="button" class="btn" (click)="load()">Try again</button></div>
        </div>
      } @else {
        <div class="table-scroll">
          <table class="data-table">
            <thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Billing</th><th>Shipping</th><th>Postal code</th><th>States</th><th></th></tr></thead>
            <tbody>
              @for (c of countries; track c.id) {
                <tr [class.selected]="statesOf?.id === c.id || editingCountryId === c.id">
                  <td><strong>{{ c.code }}</strong>@if (c.alpha3) { <span class="muted"> {{ c.alpha3 }}</span> }</td>
                  <td>{{ c.name }}</td>
                  <td><span [class]="c.published ? 'badge badge-active' : 'badge'">{{ c.published ? 'Published' : 'Hidden' }}</span></td>
                  <td>{{ c.allowsBilling ? 'Yes' : 'No' }}</td>
                  <td>{{ c.allowsShipping ? 'Yes' : 'No' }}</td>
                  <td>{{ c.postalCodeRequired ? (c.postalCodePattern ? 'Required, checked' : 'Required') : 'Optional' }}</td>
                  <td>{{ c.publishedStateCount }}</td>
                  <td class="row-actions">
                    @if (pendingDeleteCountry?.id === c.id) {
                      <span class="muted">Delete {{ c.code }} and its states?</span>
                      <button type="button" class="btn btn-danger btn-small" (click)="removeCountry(c)" [disabled]="busy">Delete</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="pendingDeleteCountry = null">Cancel</button>
                    } @else {
                      <button type="button" class="btn btn-secondary btn-small" (click)="openStates(c)">States</button>
                      <button type="button" class="btn btn-secondary btn-small" (click)="editCountry(c)">Edit</button>
                      <button type="button" class="btn btn-danger btn-small" (click)="pendingDeleteCountry = c">Delete</button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (actionError) { <div class="panel-body"><p class="banner" role="alert">{{ actionError }}</p></div> }
      }
    </div>

    @if (countryFormOpen) {
      <div class="panel">
        <div class="panel-header"><h2>{{ editingCountryId ? 'Edit country' : 'New country' }}</h2></div>
        <form class="form panel-body" (ngSubmit)="saveCountry()" novalidate>
          @if (countryFormError) { <p class="banner" role="alert">{{ countryFormError }}</p> }
          <div class="form-row">
            <label>Code *
              <input type="text" name="code" [(ngModel)]="countryForm.code" maxlength="2" [disabled]="!!editingCountryId" />
              <span class="hint">Two letters (ISO 3166-1), for example VN. It cannot change later.</span>
              @if (countryError('code')) { <span class="field-error">{{ countryError('code') }}</span> }
            </label>
            <label>Three-letter code
              <input type="text" name="alpha3" [(ngModel)]="countryForm.alpha3" maxlength="3" />
              @if (countryError('alpha3')) { <span class="field-error">{{ countryError('alpha3') }}</span> }
            </label>
            <label>Name *
              <input type="text" name="name" [(ngModel)]="countryForm.name" maxlength="100" />
              @if (countryError('name')) { <span class="field-error">{{ countryError('name') }}</span> }
            </label>
            <label>Display order
              <input type="number" name="displayOrder" [(ngModel)]="countryForm.displayOrder" step="1" />
            </label>
          </div>
          <div class="form-row">
            <label class="check-label"><input type="checkbox" name="published" [(ngModel)]="countryForm.published" /> Published</label>
            <label class="check-label"><input type="checkbox" name="billing" [(ngModel)]="countryForm.allowsBilling" /> Allows billing</label>
            <label class="check-label"><input type="checkbox" name="shipping" [(ngModel)]="countryForm.allowsShipping" /> Allows shipping</label>
            <label class="check-label"><input type="checkbox" name="zipRequired" [(ngModel)]="countryForm.postalCodeRequired" /> Postal code required</label>
          </div>
          <label>Postal code pattern
            <input type="text" name="pattern" [(ngModel)]="countryForm.postalCodePattern" maxlength="200" placeholder="for example \\d{5}(-\\d{4})?" />
            <span class="hint">Optional regular expression the whole code must match. Needs “Postal code required”.</span>
            @if (countryError('postalCodePattern')) { <span class="field-error">{{ countryError('postalCodePattern') }}</span> }
          </label>
          <div class="actions">
            <button type="submit" class="btn" [disabled]="busy">{{ busy ? 'Saving…' : 'Save country' }}</button>
            <button type="button" class="btn btn-secondary" (click)="closeCountryForm()">Cancel</button>
          </div>
        </form>
      </div>
    }

    @if (statesOf; as country) {
      <div class="panel">
        <div class="panel-header">
          <h2>States and provinces of {{ country.name }}</h2>
          <div class="actions">
            <button type="button" class="btn" (click)="openStateForm()">+ New state</button>
            <button type="button" class="btn btn-secondary" (click)="closeStates()">Close</button>
          </div>
        </div>
        @if (stateNotice) { <div class="panel-body"><p class="banner banner-ok" role="status">{{ stateNotice }}</p></div> }
        @if (stateActionError) { <div class="panel-body"><p class="banner" role="alert">{{ stateActionError }}</p></div> }
        @if (states.length === 0) {
          <p class="state">No states yet. Addresses in this country use a free text state.</p>
        } @else {
          <div class="table-scroll">
            <table class="data-table">
              <thead><tr><th>Code</th><th>Name</th><th>Status</th><th>Order</th><th></th></tr></thead>
              <tbody>
                @for (s of states; track s.id) {
                  <tr>
                    <td><strong>{{ s.code }}</strong></td>
                    <td>{{ s.name }}</td>
                    <td><span [class]="s.published ? 'badge badge-active' : 'badge'">{{ s.published ? 'Published' : 'Hidden' }}</span></td>
                    <td>{{ s.displayOrder }}</td>
                    <td class="row-actions">
                      @if (pendingDeleteState?.id === s.id) {
                        <span class="muted">Delete {{ s.code }}?</span>
                        <button type="button" class="btn btn-danger btn-small" (click)="removeState(s)" [disabled]="busy">Delete</button>
                        <button type="button" class="btn btn-secondary btn-small" (click)="pendingDeleteState = null">Cancel</button>
                      } @else {
                        <button type="button" class="btn btn-secondary btn-small" (click)="editState(s)">Edit</button>
                        <button type="button" class="btn btn-danger btn-small" (click)="pendingDeleteState = s">Delete</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (stateFormOpen) {
          <form class="form panel-body" (ngSubmit)="saveState()" novalidate>
            @if (stateFormError) { <p class="banner" role="alert">{{ stateFormError }}</p> }
            <div class="form-row">
              <label>Code *
                <input type="text" name="stateCode" [(ngModel)]="stateForm.code" maxlength="20" />
                @if (stateError('code')) { <span class="field-error">{{ stateError('code') }}</span> }
              </label>
              <label>Name *
                <input type="text" name="stateName" [(ngModel)]="stateForm.name" maxlength="100" />
                @if (stateError('name')) { <span class="field-error">{{ stateError('name') }}</span> }
              </label>
              <label>Display order
                <input type="number" name="stateOrder" [(ngModel)]="stateForm.displayOrder" step="1" />
              </label>
            </div>
            <label class="check-label"><input type="checkbox" name="statePublished" [(ngModel)]="stateForm.published" /> Published</label>
            <div class="actions">
              <button type="submit" class="btn" [disabled]="busy">{{ busy ? 'Saving…' : 'Save state' }}</button>
              <button type="button" class="btn btn-secondary" (click)="closeStateForm()">Cancel</button>
            </div>
          </form>
        }
      </div>
    }
  `
})
export class AdminCountriesPage implements OnInit {
  private readonly api = inject(DirectoryApiService);

  countries: Country[] = [];
  loading = true;
  loadError = '';
  notice = '';
  actionError = '';
  busy = false;

  countryFormOpen = false;
  editingCountryId: number | null = null;
  countryForm: CountryForm = this.emptyCountry();
  countryFormError = '';
  countryFieldErrors: Record<string, string[]> = {};
  pendingDeleteCountry: Country | null = null;

  statesOf: Country | null = null;
  states: StateProvince[] = [];
  stateNotice = '';
  stateActionError = '';
  stateFormOpen = false;
  editingStateId: number | null = null;
  stateForm: StateForm = this.emptyState();
  stateFormError = '';
  stateFieldErrors: Record<string, string[]> = {};
  pendingDeleteState: StateProvince | null = null;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.loadError = '';
    this.api.adminCountries().subscribe({
      next: list => { this.countries = list; this.loading = false; },
      error: err => { this.loading = false; this.loadError = vendorErrorMessage(err, 'Unable to load countries.'); }
    });
  }

  countryError(field: string) { return this.countryFieldErrors[field]?.[0] ?? ''; }
  stateError(field: string) { return this.stateFieldErrors[field]?.[0] ?? ''; }

  // ---- Countries ----

  openCountryForm() {
    this.editingCountryId = null;
    this.countryForm = this.emptyCountry();
    this.clearCountryErrors();
    this.countryFormOpen = true;
  }

  editCountry(c: Country) {
    this.editingCountryId = c.id;
    this.countryForm = {
      code: c.code, alpha3: c.alpha3 ?? '', name: c.name, published: c.published, allowsBilling: c.allowsBilling, allowsShipping: c.allowsShipping,
      postalCodeRequired: c.postalCodeRequired, postalCodePattern: c.postalCodePattern ?? '', displayOrder: c.displayOrder
    };
    this.clearCountryErrors();
    this.countryFormOpen = true;
  }

  closeCountryForm() { this.countryFormOpen = false; this.editingCountryId = null; this.clearCountryErrors(); }

  saveCountry() {
    this.busy = true;
    this.clearCountryErrors();
    const body: SaveCountryRequest = {
      alpha3: this.countryForm.alpha3.trim() || null,
      name: this.countryForm.name,
      published: this.countryForm.published,
      allowsBilling: this.countryForm.allowsBilling,
      allowsShipping: this.countryForm.allowsShipping,
      postalCodeRequired: this.countryForm.postalCodeRequired,
      postalCodePattern: this.countryForm.postalCodePattern.trim() || null,
      displayOrder: Number(this.countryForm.displayOrder) || 0
    };
    const request = this.editingCountryId
      ? this.api.updateCountry(this.editingCountryId, body)
      : this.api.createCountry({ ...body, code: this.countryForm.code.trim().toUpperCase() });
    request.subscribe({
      next: saved => { this.busy = false; this.closeCountryForm(); this.notice = `${saved.name} saved.`; this.load(); },
      error: err => {
        this.busy = false;
        this.countryFieldErrors = err?.fieldErrors ?? {};
        this.countryFormError = Object.keys(this.countryFieldErrors).length ? '' : vendorErrorMessage(err, 'Unable to save the country.');
      }
    });
  }

  removeCountry(c: Country) {
    this.busy = true;
    this.actionError = '';
    this.notice = '';
    this.api.deleteCountry(c.id).subscribe({
      next: () => { this.busy = false; this.pendingDeleteCountry = null; if (this.statesOf?.id === c.id) this.closeStates(); this.notice = `${c.name} deleted.`; this.load(); },
      error: err => { this.busy = false; this.pendingDeleteCountry = null; this.actionError = vendorErrorMessage(err, 'Unable to delete the country.'); }
    });
  }

  // ---- States ----

  openStates(c: Country) {
    this.statesOf = c;
    this.closeStateForm();
    this.stateNotice = '';
    this.stateActionError = '';
    this.loadStates();
  }

  closeStates() { this.statesOf = null; this.states = []; this.closeStateForm(); }

  private loadStates() {
    if (!this.statesOf) return;
    this.api.adminStates(this.statesOf.id).subscribe({
      next: list => { this.states = list; },
      error: err => { this.stateActionError = vendorErrorMessage(err, 'Unable to load the states.'); }
    });
  }

  openStateForm() {
    this.editingStateId = null;
    this.stateForm = this.emptyState();
    this.stateFormError = '';
    this.stateFieldErrors = {};
    this.stateFormOpen = true;
  }

  editState(s: StateProvince) {
    this.editingStateId = s.id;
    this.stateForm = { code: s.code, name: s.name, published: s.published, displayOrder: s.displayOrder };
    this.stateFormError = '';
    this.stateFieldErrors = {};
    this.stateFormOpen = true;
  }

  closeStateForm() { this.stateFormOpen = false; this.editingStateId = null; this.stateFormError = ''; this.stateFieldErrors = {}; }

  saveState() {
    if (!this.statesOf) return;
    this.busy = true;
    this.stateFormError = '';
    this.stateFieldErrors = {};
    const body: SaveStateRequest = { ...this.stateForm, displayOrder: Number(this.stateForm.displayOrder) || 0 };
    const request = this.editingStateId ? this.api.updateState(this.editingStateId, body) : this.api.createState(this.statesOf.id, body);
    request.subscribe({
      next: saved => { this.busy = false; this.closeStateForm(); this.stateNotice = `${saved.name} saved.`; this.loadStates(); this.load(); },
      error: err => {
        this.busy = false;
        this.stateFieldErrors = err?.fieldErrors ?? {};
        this.stateFormError = Object.keys(this.stateFieldErrors).length ? '' : vendorErrorMessage(err, 'Unable to save the state.');
      }
    });
  }

  removeState(s: StateProvince) {
    this.busy = true;
    this.stateActionError = '';
    this.stateNotice = '';
    this.api.deleteState(s.id).subscribe({
      next: () => { this.busy = false; this.pendingDeleteState = null; this.stateNotice = `${s.name} deleted.`; this.loadStates(); this.load(); },
      error: err => { this.busy = false; this.pendingDeleteState = null; this.stateActionError = vendorErrorMessage(err, 'Unable to delete the state.'); }
    });
  }

  private clearCountryErrors() { this.countryFormError = ''; this.countryFieldErrors = {}; this.actionError = ''; this.notice = ''; }

  private emptyCountry(): CountryForm {
    return { code: '', alpha3: '', name: '', published: true, allowsBilling: true, allowsShipping: true, postalCodeRequired: false, postalCodePattern: '', displayOrder: 0 };
  }

  private emptyState(): StateForm { return { code: '', name: '', published: true, displayOrder: 0 }; }
}
