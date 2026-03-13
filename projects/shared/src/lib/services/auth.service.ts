import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

/** Minimal auth contract for shared use (e.g. guards). Implement in site/elearn with real auth. */
export interface IAuthService {
  isLoggedIn(): boolean;
  getToken(): string | null;
  logout(): void;
}

@Injectable({ providedIn: 'root' })
export class AuthService implements IAuthService {
  private _token: string | null = null;

  isLoggedIn(): boolean {
    return !!this._token;
  }

  getToken(): string | null {
    return this._token;
  }

  setToken(token: string | null): void {
    this._token = token;
  }

  logout(): void {
    this._token = null;
  }
}
