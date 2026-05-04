import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/product.service';
import { CategoryService } from '../../services/category.service';
import { SubCategoryService } from '../../services/subcategory.service';
import { FavoriteService } from '../../services/favorite.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CartService } from '../../services/cart.service';
import { Router } from '@angular/router';
import { Product } from '../models/product.model'; 
import { Category } from '../models/category.model';
import { SubCategory } from '../models/subcategory.model';
import { PagedResult } from '../models/paged-result.model';
import { forkJoin, Observable, of, finalize } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-product-listing',
  templateUrl: './product-listing.component.html'
})
export class ProductListingComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private categoryService = inject(CategoryService);
  private subCategoryService = inject(SubCategoryService);
  private favoriteService = inject(FavoriteService);
  private authService = inject(AuthService);
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
      this.toastService.show('Vui lòng đăng nhập để sử dụng tính năng này!', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    this.togglingId = product.id;
    this.favoriteService.toggleFavorite(product.id).pipe(
      finalize(() => this.togglingId = null)
    ).subscribe({
      next: (res: any) => {
        const isFav = res.isFavorited ?? res.IsFavorited;
        product.isFavorited = isFav;
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
  title: string = '';
  description: string = 'Khám phá bộ sưu tập được tuyển chọn kỹ lưỡng.';
  
  categories: Category[] = [];
  subCategories: SubCategory[] = [];
  currentType: 'category' | 'subcategory' = 'category';
  currentId: number = 0;
  parentCategory: Category | null = null; 

  isLoading: boolean = false;
  currentPage: number = 1;
  totalPages: number = 1;
  pageSize: number = 12; // Adjusted to common grid size
  totalItems: number = 0;

  minPrice: number = 0;
  maxPrice: number = 2000000;
  sortBy: string = 'newest';
  searchTerm: string = '';

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.currentId = +params['id'];
      
      this.route.queryParams.subscribe(queryParams => {
        this.searchTerm = queryParams['q'] || '';
        
        const url = this.route.snapshot.url;
        if (url.length > 0 && url[0].path === 'search') {
          this.currentType = 'category'; 
          this.title = `Kết quả tìm kiếm cho "${this.searchTerm}"`;
          this.currentId = 0;
        } else {
          this.currentType = url.length > 0 && url[0].path === 'category' ? 'category' : 'subcategory';
        }
        
        this.resetFilters();
        this.loadData();
      });
    });

    this.categoryService.getCategories().subscribe(res => {
      this.categories = this.ensureArray(res);
    });
  }

  resetFilters() {
    this.currentPage = 1;
    this.minPrice = 0;
    this.maxPrice = 2000000;
    this.sortBy = 'newest';
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.products = []; 

    let request$: Observable<PagedResult<Product>>;

    if (this.currentType === 'category') {
        request$ = this.productService.getProductsPaged(this.currentPage, this.pageSize, this.minPrice, this.maxPrice, this.sortBy, this.currentId, undefined, this.searchTerm);
    } else {
        request$ = this.productService.getProductsPaged(this.currentPage, this.pageSize, this.minPrice, this.maxPrice, this.sortBy, undefined, this.currentId, this.searchTerm);
    }

    const userFavorites$ = this.authService.isLoggedIn() 
      ? this.favoriteService.getFavorites().pipe(catchError(() => of([])))
      : of([]);

    forkJoin({
      allCats: this.categoryService.getCategories(),
      allSubCats: this.subCategoryService.getSubcategories(),
      pagedResult: request$,
      userFavorites: userFavorites$
    }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res) => {
        const favData = this.ensureArray(res.userFavorites);
        const favIds = favData.map(f => f.productId || f.ProductId);

        const categories = this.ensureArray(res.allCats);
        const subCategories = this.ensureArray(res.allSubCats);
        
        if (this.currentType === 'category') {
          const cat = categories.find(c => c.id === this.currentId);
          if (!this.searchTerm) {
            this.title = cat ? (cat.name || (cat as any).Name) : 'Danh mục';
            this.subCategories = subCategories.filter(s => (s.categoryId || (s as any).CategoryId) === this.currentId);
          }
          this.parentCategory = null;
        } else {
          const sub = subCategories.find(s => s.id === this.currentId);
          this.title = sub ? (sub.name || (sub as any).Name) : 'Mục con';
          const parentId = sub ? (sub.categoryId || (sub as any).CategoryId) : 0;
          this.parentCategory = categories.find(c => c.id === parentId) || null;
          this.subCategories = subCategories.filter(s => (s.categoryId || (s as any).CategoryId) === parentId);
        }

        this.processPagedResult(res.pagedResult, favIds);
      },
      error: (err) => console.error('Data load error:', err)
    });
  }

  private processPagedResult(res: any, favIds: number[]) {
    if (!res) return;
    
    const rawItems = res.items || res.Items || (res.$values) || []; 
    this.products = this.ensureArray(rawItems).map(p => {
      let mapped = this.mapProduct(p);
      if (favIds.includes(mapped.id)) {
        mapped.isFavorited = true;
      }
      return mapped;
    }).filter((p: Product) => p.isActive);
    this.totalItems = Number(res.totalItems || res.TotalItems || 0);
    this.totalPages = Number(res.totalPages || res.TotalPages || 1);
    this.currentPage = Number(res.currentPage || res.CurrentPage || 1);
    this.pageSize = Number(res.pageSize || res.PageSize || this.pageSize);
  }

  private ensureArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    return [];
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadData();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
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
