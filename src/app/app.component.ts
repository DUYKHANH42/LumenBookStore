import { Component, OnInit, inject } from '@angular/core';
import { ProductService } from '../services/product.service'; // BookService -> ProductService
import { CategoryService } from '../services/category.service';
import { SubCategoryService } from '../services/subcategory.service';
import { Product } from './models/product.model'; // Book -> Product
import { Category } from './models/category.model';
import { SubCategory } from './models/subcategory.model';
import { forkJoin } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { CartService } from '../services/cart.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  public authService = inject(AuthService);
  public toastService = inject(ToastService);
  public cartService = inject(CartService);
  private categoryService = inject(CategoryService);
  private subCategoryService = inject(SubCategoryService);
  private productService = inject(ProductService);
  private router = inject(Router);

  categories: Category[] = [];
  subCategories: SubCategory[] = [];
  navCategories: Category[] = [];
  
  toast$ = this.toastService.toastState$;
  cart$ = this.cartService.cart$;

  searchTerm: string = '';
  suggestions: Product[] = [];
  searchTimeout: any;
  isMenuOpen = false;

  onSearchInput() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    if (!this.searchTerm.trim()) {
      this.suggestions = [];
      return;
    }
    this.searchTimeout = setTimeout(() => {
      this.productService.getProductsPaged(1, 5, undefined, undefined, 'newest').subscribe({
        next: (res) => {
          this.suggestions = res.items || (res as any).$values || [];
        },
        error: (err) => console.error('Search error:', err)
      });
    }, 300);
  }

  onSelectProduct(productId: number) {
    this.suggestions = [];
    this.searchTerm = '';
    this.router.navigate(['/product', productId]);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  onKeywordSearch() {
    if (!this.searchTerm.trim()) return;
    const query = this.searchTerm;
    this.suggestions = [];
    this.searchTerm = '';
    this.router.navigate(['/search'], { queryParams: { q: query } });
  }

  closeSearch() {
    setTimeout(() => {
      this.suggestions = [];
    }, 200);
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  ngOnInit() {
    forkJoin({
      categories: this.categoryService.getCategories(),
      subCategories: this.subCategoryService.getSubcategories()
    }).subscribe({
      next: (result) => {
        const categories = this.ensureArray(result.categories);
        const subCategories = this.ensureArray(result.subCategories);
        this.categories = categories.map(cat => ({
          ...cat,
          subCategories: subCategories.filter(sub => (sub.categoryId || (sub as any).CategoryId) === cat.id)
        }));
        this.navCategories = this.categories;
      },
      error: (err) => console.error('Navbar load error:', err)
    });
  }

  private ensureArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    return [];
  }

  getCategoryIcon(name: string): string {
    const iconMap: { [key: string]: string } = {
      'Văn Học': 'history_edu',
      'Khoa Học & Công Nghệ': 'biotech',
      'Kỹ Năng Sống': 'psychology',
      'Kinh Tế': 'payments',
      'Nghệ Thuật': 'palette',
      'Sổ Tay': 'auto_stories',
      'Văn Phòng Phẩm': 'edit_note'
    };
    return iconMap[name] || 'inventory_2';
  }
}
