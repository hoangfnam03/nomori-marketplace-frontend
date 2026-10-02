import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_BASE_URL } from '../config/api-config';

/** A country a customer can choose for an address. The postal pattern is only a hint: the server decides. */
export interface PublicCountry {
  code: string;
  name: string;
  hasStates: boolean;
  postalCodeRequired: boolean;
  postalCodePattern: string | null;
  allowsBilling: boolean;
  allowsShipping: boolean;
}

export interface PublicState {
  id: number;
  code: string;
  name: string;
}

export interface Country {
  id: number;
  code: string;
  alpha3: string | null;
  name: string;
  published: boolean;
  allowsBilling: boolean;
  allowsShipping: boolean;
  postalCodeRequired: boolean;
  postalCodePattern: string | null;
  displayOrder: number;
  publishedStateCount: number;
}

export interface StateProvince {
  id: number;
  countryId: number;
  code: string;
  name: string;
  published: boolean;
  displayOrder: number;
}

export interface SaveCountryRequest {
  /** Only used when creating; a code never changes. */
  code?: string;
  alpha3: string | null;
  name: string;
  published: boolean;
  allowsBilling: boolean;
  allowsShipping: boolean;
  postalCodeRequired: boolean;
  postalCodePattern: string | null;
  displayOrder: number;
}

export interface SaveStateRequest {
  code: string;
  name: string;
  published: boolean;
  displayOrder: number;
}

/** Countries and states: public lists for forms, and the administrator routes (permission settings.manage). */
@Injectable({ providedIn: 'root' })
export class DirectoryApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(API_BASE_URL)}/v1`;

  countries() { return this.http.get<PublicCountry[]>(`${this.base}/directory/countries`); }
  states(countryCode: string) { return this.http.get<PublicState[]>(`${this.base}/directory/countries/${encodeURIComponent(countryCode)}/states`); }

  adminCountries() { return this.http.get<Country[]>(`${this.base}/admin/directory/countries`); }
  createCountry(body: SaveCountryRequest) { return this.http.post<Country>(`${this.base}/admin/directory/countries`, body); }
  updateCountry(id: number, body: SaveCountryRequest) { return this.http.put<Country>(`${this.base}/admin/directory/countries/${id}`, body); }
  deleteCountry(id: number) { return this.http.delete<void>(`${this.base}/admin/directory/countries/${id}`); }

  adminStates(countryId: number) { return this.http.get<StateProvince[]>(`${this.base}/admin/directory/countries/${countryId}/states`); }
  createState(countryId: number, body: SaveStateRequest) { return this.http.post<StateProvince>(`${this.base}/admin/directory/countries/${countryId}/states`, body); }
  updateState(id: number, body: SaveStateRequest) { return this.http.put<StateProvince>(`${this.base}/admin/directory/states/${id}`, body); }
  deleteState(id: number) { return this.http.delete<void>(`${this.base}/admin/directory/states/${id}`); }
}
