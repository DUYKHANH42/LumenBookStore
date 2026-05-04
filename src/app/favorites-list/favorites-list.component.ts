import { Component, OnInit, inject } from '@angular/core';
import { FavoriteService } from '../../services/favorite.service';
import { FavoriteDto } from '../models/favorite.model';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-favorites-list',
  templateUrl: './favorites-list.component.html'
})
export class FavoritesListComponent implements OnInit {
  private favoriteService = inject(FavoriteService);
  
  favorites: FavoriteDto[] = [];
  isLoading = false;

  ngOnInit() {
    this.loadFavorites();
  }

  loadFavorites() {
    this.isLoading = true;
    this.favoriteService.getFavorites()
      .pipe(finalize(() => this.isLoading = false))
      .subscribe({
        next: (res: any) => {
          this.favorites = this.ensureArray(res);
        },
        error: (err) => console.error('Error loading favorites:', err)
      });
  }

  removeFavorite(productId: number) {
    this.favoriteService.toggleFavorite(productId).subscribe({
      next: (res) => {
        if (!res.isFavorited) {
          this.favorites = this.favorites.filter(f => f.productId !== productId);
        }
      }
    });
  }

  private ensureArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    return [];
  }
}
