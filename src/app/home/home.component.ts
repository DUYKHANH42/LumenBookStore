import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ProductService } from '../../services/product.service'; // BookService -> ProductService
import { CategoryService } from '../../services/category.service';
import { SubCategoryService } from '../../services/subcategory.service';
import { FavoriteService } from '../../services/favorite.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CartService } from '../../services/cart.service';
import { Router } from '@angular/router';
import { Product } from '../models/product.model'; // Book -> Product
import { Category } from '../models/category.model';
import { SubCategory } from '../models/subcategory.model';
import { forkJoin, finalize, of, Subject, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html'
})
export class HomeComponent implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private subCategoryService = inject(SubCategoryService);
  private favoriteService = inject(FavoriteService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cartService = inject(CartService);
  private router = inject(Router);

  addToCart(product: Product) {
    this.cartService.addToCart(product.id, 1).subscribe({
      next: () => {
        this.toastService.show(`Đã thêm "${product.name}" vào giỏ hàng!`, 'success');
      },
      error: (err) => {
        console.error('Add to cart error:', err);
        this.toastService.show('Không thể thêm vào giỏ hàng.', 'error');
      }
    });
  }
  products: Product[] = []; 
  togglingId: number | null = null;

  toggleFavorite(product: Product) {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Đăng nhập ngay để "thả tim" bạn nhé! ❤️', 'info');
      this.router.navigate(['/login']);
      return;
    }

    this.togglingId = product.id;
    this.favoriteService.toggleFavorite(product.id).pipe(
      finalize(() => this.togglingId = null)
    ).subscribe({
      next: (res: any) => {
        const isFav = res.isFavorited ?? (res as any).IsFavorited;
        if (isFav) {
          this.toastService.show('Đã thêm vào Yêu thích! 💖', 'success');
        } else {
          this.toastService.show('Đã bỏ khỏi Yêu thích.', 'info');
        }
      },
      error: (err) => {
        console.error('Favorite toggle error:', err);
        this.toastService.show('Có lỗi xảy ra, vui lòng thử lại sau.', 'error');
      }
    });
  }
  categories: Category[] = [];
  subCategories: SubCategory[] = [];
  
  navCategories: Category[] = [];
  flashSaleProducts: Product[] = []; // flashSaleBooks -> flashSaleProducts
  myFavoriteProducts: Product[] = []; 
  countdown = { hours: '00', minutes: '00', seconds: '00' };
  private countdownInterval: any;
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.startCountdown();
    this.loadData();
    this.initFavoriteSubscription();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  initFavoriteSubscription() {
    this.favoriteService.favoriteIds$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ids => {
        this.syncFavoriteState(ids);
      });
  }

  syncFavoriteState(favIds: number[]) {
    this.products.forEach(p => {
      p.isFavorited = favIds.includes(p.id);
    });
    this.myFavoriteProducts = this.products.filter(p => p.isFavorited);
    this.flashSaleProducts = this.products.filter(p => !!p.flashSale);
  }

  loadData() {
    const userFavorites$ = this.authService.isLoggedIn() 
      ? this.favoriteService.getFavorites().pipe(catchError(() => of([])))
      : of([]);

    forkJoin({
      productsPaged: this.productService.getProductsPaged(1, 20, undefined, undefined, 'newest'),
      categories: this.categoryService.getCategories(),
      subCategories: this.subCategoryService.getSubcategories(),
      flashSaleProducts: this.productService.getFlashSale(10),
      userFavorites: userFavorites$
    }).subscribe({
      next: (result: any) => {
        const favData = this.ensureArray(result.userFavorites);
        const favIds = favData.map((f: any) => f.productId || f.ProductId);

        const rawProducts = result.productsPaged.items || (result.productsPaged as any).$values || [];
        this.products = rawProducts.map((p: any) => {
          let mapped = this.mapProduct(p);
          if (favIds.includes(mapped.id)) {
            mapped.isFavorited = true;
          }
          return mapped;
        }).filter((p: Product) => p.isActive);
        
        const rawFlashSale = this.ensureArray(result.flashSaleProducts);
        this.flashSaleProducts = rawFlashSale.map((p: any) => {
          let mapped = this.mapProduct(p);
          if (favIds.includes(mapped.id)) {
            mapped.isFavorited = true;
          }
          return mapped;
        }).filter((p: Product) => p.isActive);

        this.myFavoriteProducts = this.products.filter(p => p.isFavorited);
        this.subCategories = this.ensureArray(result.subCategories);
        
        this.categories = this.ensureArray(result.categories).map(cat => ({
          ...cat,
          subCategories: this.subCategories.filter(sub => (sub.categoryId || (sub as any).CategoryId) === cat.id)
        }));
        
        this.navCategories = this.categories;
      },
      error: (err) => console.error('Lỗi khi tải dữ liệu Home:', err)
    });
  }

  private ensureArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    return [];
  }

  startCountdown() {
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 5); 
    this.countdownInterval = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;
      if (distance < 0) {
        clearInterval(this.countdownInterval);
        return;
      }
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);
      this.countdown = {
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0')
      };
    }, 1000);
  }

  getProductsByCategory(categoryId: number): Product[] {
    return this.products.filter(p => p.categoryId === categoryId).slice(0, 4);
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
    return iconMap[name] || 'inventory_2'; // book_2 -> inventory_2
  }

  private mapProduct(rawData: any): Product {
    return {
      ...rawData,
      id: rawData.id ?? rawData.Id,
      name: rawData.name ?? rawData.Name ?? rawData.title ?? rawData.Title,
      brand: rawData.brand ?? rawData.Brand ?? rawData.author ?? rawData.Author,
      price: rawData.price ?? rawData.Price,
      quantity: rawData.quantity ?? rawData.Quantity ?? 0,
      imageUrl: rawData.imageUrl ?? rawData.ImageUrl,
      discountPrice: rawData.flashSale?.salePrice ?? rawData.FlashSale?.SalePrice ?? rawData.discountPrice ?? rawData.DiscountPrice,
      categoryId: rawData.categoryId ?? rawData.CategoryId,
      isFavorited: rawData.isFavorited ?? rawData.IsFavorited ?? false,
      flashSale: rawData.flashSale ?? rawData.FlashSale,
      isActive: rawData.isActive ?? rawData.IsActive ?? true
    } as Product;
  }
}
