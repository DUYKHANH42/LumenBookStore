import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { FavoriteDto } from '../app/models/favorite.model';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/favorites`;

  private favoriteIdsSubject = new BehaviorSubject<number[]>([]);
  public favoriteIds$ = this.favoriteIdsSubject.asObservable();

  constructor() {}

  refreshFavorites(): Observable<FavoriteDto[]> {
    return this.http.get<FavoriteDto[]>(`${this.apiUrl}`).pipe(
      tap(favs => {
        const data = this.ensureArray(favs);
        const ids = data.map(f => f.productId || f.ProductId);
        this.favoriteIdsSubject.next(ids);
      })
    );
  }

  getFavorites(): Observable<FavoriteDto[]> {
    return this.refreshFavorites();
  }

  toggleFavorite(productId: number): Observable<{ isFavorited: boolean }> {
    return this.http.post<{ isFavorited: boolean }>(`${this.apiUrl}/toggle/${productId}`, {}).pipe(
      tap(res => {
        const currentIds = this.favoriteIdsSubject.value;
        const isFav = res.isFavorited ?? (res as any).IsFavorited;
        
        let newIds: number[];
        if (isFav) {
          newIds = [...currentIds, productId];
        } else {
          newIds = currentIds.filter(id => id !== productId);
        }
        this.favoriteIdsSubject.next(newIds);
      })
    );
  }

  private ensureArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    return [];
  }
}
