import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private inMemoryToken: string | null = null;

  setToken(token: string | null): void {
    this.inMemoryToken = token;
  }

  getToken(): string | null {
    return this.inMemoryToken;
  }

  clearToken(): void {
    this.inMemoryToken = null;
  }
}
