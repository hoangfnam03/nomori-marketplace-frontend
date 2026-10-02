import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthFacade } from '../../core/auth/auth.facade';
import {
  OptionCatalog, SaveVariantsRequest, VariantAttributeInput, VariantCombinationInput, VariantsResponse, VendorProduct, VendorProductApiService
} from '../../core/catalog/vendor-product-api.service';
import { vendorErrorMessage } from '../../core/vendors/vendor-errors';

const MAX_ATTRIBUTES = 3;
const MAX_VALUES = 20;
const MAX_COMBINATIONS = 100;
const MAX_TAGS = 20;

type Section = 'variants' | 'specs' | 'tags';

@Component({
  standalone: true,
  imports: [FormsModule, RouterLink],
  styleUrls: ['../../shared/styles/vendor-pages.scss'],
  template: `
    <section class="page-intro" aria-labelledby="details-title">
      <div class="eyebrow">Vendor portal / Products / Details</div>
      <h1 id="details-title">{{ product?.name ?? 'Product details' }}</h1>
      <p>Variants, specifications and tags. <a routerLink="/vendor/products">Back to products</a></p>
    </section>

    @if (loading) {
      <p class="state">Loading…</p>
    } @else if (loadError) {
      <div class="panel"><div class="panel-body">
        <p class="banner" role="alert">{{ loadError }}</p>
        <div class="actions"><button type="button" class="btn" (click)="load()">Try again</button></div>
      </div></div>
    } @else {
      <!-- Variants -->
      <div class="panel">
        <div class="panel-header"><h2>Variants</h2></div>
        <div class="panel-body">
          <p class="muted">Pick up to {{ maxAttributes }} attributes defined by the platform, list the values you sell, then describe each sellable combination. The product stock is the sum of the combination stocks.</p>
          @if (messages.variants) { <p class="banner banner-ok" role="status">{{ messages.variants }}</p> }
          @if (errors.variants) { <p class="banner" role="alert">{{ errors.variants }}</p> }

          @for (attr of attrs; track $index; let a = $index) {
            <fieldset class="block">
              <legend>Attribute {{ a + 1 }}</legend>
              <div class="form-row">
                <label>Attribute
                  <select [(ngModel)]="attr.productAttributeId" [name]="'attr' + a" (ngModelChange)="onAttributeChanged()">
                    <option [ngValue]="0" disabled>Choose…</option>
                    @for (o of catalog.attributes; track o.id) { <option [ngValue]="o.id">{{ o.name }}</option> }
                  </select>
                </label>
                <label class="check-label"><input type="checkbox" [(ngModel)]="attr.isRequired" [name]="'req' + a" /> Customer must choose</label>
                <button type="button" class="btn btn-danger btn-small" (click)="removeAttribute(a)">Remove attribute</button>
              </div>
              @for (value of attr.values; track $index; let v = $index) {
                <div class="value-row">
                  <input type="text" [(ngModel)]="value.name" [name]="'val' + a + '-' + v" maxlength="100" placeholder="Value, for example Red" [attr.aria-label]="'Value ' + (v + 1) + ' of attribute ' + (a + 1)" (ngModelChange)="onValueRenamed()" />
                  <input type="text" [(ngModel)]="value.colorSquaresRgb" [name]="'col' + a + '-' + v" maxlength="7" placeholder="#RRGGBB (optional)" aria-label="Colour" />
                  <input type="number" [(ngModel)]="value.priceAdjustment" [name]="'adj' + a + '-' + v" step="0.01" aria-label="Price adjustment" title="Price adjustment" />
                  <button type="button" class="btn btn-danger btn-small" (click)="removeValue(a, v)" [attr.aria-label]="'Remove value ' + (v + 1)">×</button>
                </div>
              }
              <div class="actions">
                <button type="button" class="btn btn-secondary btn-small" (click)="addValue(a)" [disabled]="attr.values.length >= maxValues">+ Value</button>
              </div>
            </fieldset>
          }
          <div class="actions">
            <button type="button" class="btn btn-secondary" (click)="addAttribute()" [disabled]="attrs.length >= maxAttributes">+ Attribute</button>
            <button type="button" class="btn btn-secondary" (click)="generateCombinations()" [disabled]="!canGenerate()">Generate all combinations</button>
          </div>

          @if (attrs.length > 0) {
            @if (combos.length === 0) {
              <p class="muted">No combinations yet. Generate them or save with none to clear the variants.</p>
            } @else {
              <div class="table-scroll">
                <table class="data-table">
                  <thead><tr><th>Combination</th><th>SKU</th><th>Stock</th><th>Price</th><th></th></tr></thead>
                  <tbody>
                    @for (combo of combos; track $index; let c = $index) {
                      <tr>
                        <td>{{ comboLabel(combo) }}</td>
                        <td><input type="text" [(ngModel)]="combo.sku" [name]="'sku' + c" maxlength="100" [attr.aria-label]="'SKU of combination ' + (c + 1)" /></td>
                        <td><input type="number" [(ngModel)]="combo.stockQuantity" [name]="'stock' + c" min="0" [attr.aria-label]="'Stock of combination ' + (c + 1)" /></td>
                        <td><input type="number" [(ngModel)]="combo.overriddenPrice" [name]="'price' + c" min="0" step="0.01" placeholder="product price" [attr.aria-label]="'Price of combination ' + (c + 1)" /></td>
                        <td><button type="button" class="btn btn-danger btn-small" (click)="removeCombo(c)">Remove</button></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <p class="muted">Total stock: {{ totalStock() }}. Leave the price empty to use the product price plus the value adjustments.</p>
            }
          }
          <div class="actions">
            <button type="button" class="btn" (click)="saveVariants()" [disabled]="busy.variants">{{ busy.variants ? 'Saving…' : 'Save variants' }}</button>
          </div>
        </div>
      </div>

      <!-- Specifications -->
      <div class="panel">
        <div class="panel-header"><h2>Specifications</h2></div>
        <div class="panel-body">
          @if (messages.specs) { <p class="banner banner-ok" role="status">{{ messages.specs }}</p> }
          @if (errors.specs) { <p class="banner" role="alert">{{ errors.specs }}</p> }
          @if (catalog.specAttributes.length === 0) { <p class="muted">The platform has not defined specifications yet.</p> }
          @for (spec of catalog.specAttributes; track spec.id) {
            <fieldset class="block">
              <legend>{{ spec.name }}@if (spec.groupName) { <span class="muted"> · {{ spec.groupName }}</span> }</legend>
              @for (o of spec.options; track o.id) {
                <label class="check-label"><input type="checkbox" [checked]="specIds.includes(o.id)" (change)="toggleSpec(o.id)" [name]="'spec' + o.id" /> {{ o.name }}</label>
              }
              @if (spec.options.length === 0) { <span class="muted">No values defined.</span> }
            </fieldset>
          }
          <div class="actions">
            <button type="button" class="btn" (click)="saveSpecs()" [disabled]="busy.specs">{{ busy.specs ? 'Saving…' : 'Save specifications' }}</button>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div class="panel">
        <div class="panel-header"><h2>Tags</h2></div>
        <div class="panel-body">
          @if (messages.tags) { <p class="banner banner-ok" role="status">{{ messages.tags }}</p> }
          @if (errors.tags) { <p class="banner" role="alert">{{ errors.tags }}</p> }
          <label class="form">Tags
            <input type="text" name="tags" [(ngModel)]="tagText" placeholder="gift, summer, cotton" />
            <span class="hint">Separate with commas. Up to {{ maxTags }}; they are saved in lower case.</span>
          </label>
          <div class="actions">
            <button type="button" class="btn" (click)="saveTags()" [disabled]="busy.tags">{{ busy.tags ? 'Saving…' : 'Save tags' }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .block { border: 1px solid var(--line); border-radius: 6px; padding: .6rem .9rem; display: grid; gap: .6rem; }
    .block legend { font-size: .8rem; padding: 0 .3rem; }
    .value-row { display: grid; grid-template-columns: 2fr 1.2fr 1fr auto; gap: .5rem; align-items: center; }
    a.btn { text-decoration: none; display: inline-block; }
  `]
})
export class VendorProductDetailsPage implements OnInit {
  private readonly api = inject(VendorProductApiService);
  private readonly auth = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);

  readonly maxAttributes = MAX_ATTRIBUTES;
  readonly maxValues = MAX_VALUES;
  readonly maxTags = MAX_TAGS;

  vendorId = 0;
  productId = 0;
  product: VendorProduct | null = null;
  catalog: OptionCatalog = { attributes: [], specAttributes: [] };
  loading = true;
  loadError = '';

  attrs: VariantAttributeInput[] = [];
  combos: VariantCombinationInput[] = [];
  specIds: number[] = [];
  tagText = '';

  busy: Record<Section, boolean> = { variants: false, specs: false, tags: false };
  errors: Record<Section, string> = { variants: '', specs: '', tags: '' };
  messages: Record<Section, string> = { variants: '', specs: '', tags: '' };

  ngOnInit() { this.load(); }

  load() {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loading = true;
    this.loadError = '';
    this.auth.loadSession().subscribe({
      next: session => {
        if (!session.vendorId || !this.productId) { this.loading = false; this.loadError = 'Your account does not belong to a shop.'; return; }
        this.vendorId = session.vendorId;
        this.loadAll();
      },
      error: () => { this.loading = false; this.loadError = 'Unable to load your account.'; }
    });
  }

  private loadAll() {
    const fail = (err: { status?: number }) => {
      this.loading = false;
      this.loadError = err.status === 404 ? 'Product not found in your shop.' : 'Unable to load the product details.';
    };
    this.api.get(this.vendorId, this.productId).subscribe({
      next: product => {
        this.product = product;
        this.api.getOptions(this.vendorId).subscribe({
          next: catalog => {
            this.catalog = catalog;
            this.api.getVariants(this.vendorId, this.productId).subscribe({
              next: variants => {
                this.applyVariants(variants);
                this.api.getSpecs(this.vendorId, this.productId).subscribe({
                  next: specs => {
                    this.specIds = [...specs.optionIds];
                    this.api.getTags(this.vendorId, this.productId).subscribe({
                      next: tags => { this.tagText = tags.tagNames.join(', '); this.loading = false; },
                      error: fail
                    });
                  },
                  error: fail
                });
              },
              error: fail
            });
          },
          error: fail
        });
      },
      error: fail
    });
  }

  // ---- Variants ----

  addAttribute() {
    if (this.attrs.length >= MAX_ATTRIBUTES) return;
    this.attrs = [...this.attrs, { productAttributeId: 0, isRequired: true, values: [{ name: '', colorSquaresRgb: null, priceAdjustment: 0 }] }];
    this.combos = [];
  }

  removeAttribute(index: number) {
    this.attrs = this.attrs.filter((_, i) => i !== index);
    // Combinations are tied to the attribute list, so they are rebuilt.
    this.combos = [];
  }

  addValue(attrIndex: number) {
    const attr = this.attrs[attrIndex];
    if (attr.values.length < MAX_VALUES) attr.values = [...attr.values, { name: '', colorSquaresRgb: null, priceAdjustment: 0 }];
  }

  removeValue(attrIndex: number, valueIndex: number) {
    const attr = this.attrs[attrIndex];
    attr.values = attr.values.filter((_, i) => i !== valueIndex);
    // Drop combinations that used the value and shift the indexes after it.
    this.combos = this.combos
      .filter(c => c.valueIndexes[attrIndex] !== valueIndex)
      .map(c => ({ ...c, valueIndexes: c.valueIndexes.map((v, a) => (a === attrIndex && v > valueIndex ? v - 1 : v)) }));
  }

  onAttributeChanged() { /* values stay; only the saved attribute id changes */ }
  onValueRenamed() { /* labels are computed from the current names */ }

  canGenerate() {
    return this.attrs.length > 0 && this.attrs.every(a => a.productAttributeId > 0 && a.values.length > 0 && a.values.every(v => v.name.trim()));
  }

  /** Builds every combination of the current values; existing rows keep their SKU, stock and price. */
  generateCombinations() {
    if (!this.canGenerate()) return;
    let rows: number[][] = [[]];
    for (const attr of this.attrs) rows = rows.flatMap(row => attr.values.map((_, i) => [...row, i]));
    if (rows.length > MAX_COMBINATIONS) {
      this.errors.variants = `That would make ${rows.length} combinations; the limit is ${MAX_COMBINATIONS}. Remove some values.`;
      return;
    }
    this.errors.variants = '';
    const existing = new Map(this.combos.map(c => [c.valueIndexes.join(','), c]));
    this.combos = rows.map(indexes => existing.get(indexes.join(',')) ?? { valueIndexes: indexes, sku: null, stockQuantity: 0, overriddenPrice: null });
  }

  removeCombo(index: number) { this.combos = this.combos.filter((_, i) => i !== index); }

  comboLabel(combo: VariantCombinationInput) {
    return combo.valueIndexes.map((v, a) => this.attrs[a]?.values[v]?.name || '?').join(' / ');
  }

  totalStock() { return this.combos.reduce((sum, c) => sum + (Number(c.stockQuantity) || 0), 0); }

  saveVariants() {
    this.clear('variants');
    const body: SaveVariantsRequest = {
      attributes: this.attrs.map(a => ({
        productAttributeId: a.productAttributeId,
        isRequired: a.isRequired,
        values: a.values.map(v => ({ name: v.name, colorSquaresRgb: v.colorSquaresRgb?.trim() || null, priceAdjustment: Number(v.priceAdjustment) || 0 }))
      })),
      combinations: this.combos.map(c => ({
        valueIndexes: c.valueIndexes,
        sku: c.sku?.trim() || null,
        stockQuantity: Number(c.stockQuantity) || 0,
        overriddenPrice: c.overriddenPrice === null || c.overriddenPrice === undefined || (c.overriddenPrice as unknown) === '' ? null : Number(c.overriddenPrice)
      }))
    };
    this.busy.variants = true;
    this.api.setVariants(this.vendorId, this.productId, body).subscribe({
      next: saved => { this.busy.variants = false; this.applyVariants(saved); this.messages.variants = 'Variants saved. The product stock was updated.'; },
      error: err => { this.busy.variants = false; this.errors.variants = this.writeError(err, 'Unable to save the variants.'); }
    });
  }

  /** Turns the saved structure back into the editable one: each combination key maps a mapping id to a value id. */
  private applyVariants(variants: VariantsResponse) {
    const mappings = [...variants.mappings].sort((a, b) => a.displayOrder - b.displayOrder);
    this.attrs = mappings.map(m => ({
      productAttributeId: m.attribute.id,
      isRequired: m.isRequired,
      values: [...m.values].sort((a, b) => a.displayOrder - b.displayOrder)
        .map(v => ({ name: v.name, colorSquaresRgb: v.colorSquaresRgb, priceAdjustment: v.priceAdjustment }))
    }));
    this.combos = variants.combinations.flatMap(c => {
      let key: Record<string, number>;
      try { key = JSON.parse(c.attributesJson) as Record<string, number>; } catch { return []; }
      const indexes = mappings.map(m => [...m.values].sort((a, b) => a.displayOrder - b.displayOrder).findIndex(v => v.id === key[String(m.id)]));
      // A combination that does not match the structure (made elsewhere) cannot be shown here.
      return indexes.some(i => i < 0) ? [] : [{ valueIndexes: indexes, sku: c.sku, stockQuantity: c.stockQuantity, overriddenPrice: c.overriddenPrice }];
    });
  }

  // ---- Specifications ----

  toggleSpec(id: number) {
    this.specIds = this.specIds.includes(id) ? this.specIds.filter(x => x !== id) : [...this.specIds, id];
  }

  saveSpecs() {
    this.clear('specs');
    this.busy.specs = true;
    this.api.setSpecs(this.vendorId, this.productId, this.specIds).subscribe({
      next: saved => { this.busy.specs = false; this.specIds = [...saved.optionIds]; this.messages.specs = 'Specifications saved.'; },
      error: err => { this.busy.specs = false; this.errors.specs = this.writeError(err, 'Unable to save the specifications.'); }
    });
  }

  // ---- Tags ----

  saveTags() {
    this.clear('tags');
    const names = this.tagText.split(',').map(t => t.trim()).filter(Boolean);
    this.busy.tags = true;
    this.api.setTags(this.vendorId, this.productId, names).subscribe({
      next: saved => { this.busy.tags = false; this.tagText = saved.tagNames.join(', '); this.messages.tags = 'Tags saved.'; },
      error: err => { this.busy.tags = false; this.errors.tags = this.writeError(err, 'Unable to save the tags.'); }
    });
  }

  private clear(section: Section) { this.errors[section] = ''; this.messages[section] = ''; }

  // A 403 on a write means the shop is switched off.
  private writeError(err: { status?: number; message?: string; fieldErrors?: Record<string, string[]> }, fallback: string) {
    return err.status === 403
      ? 'Your shop is inactive, so products cannot be changed right now.'
      : vendorErrorMessage(err, fallback);
  }
}
