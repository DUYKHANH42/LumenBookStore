import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProductService } from '../../services/product.service'; // BookService -> ProductService
import { FavoriteService } from '../../services/favorite.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { CartService } from '../../services/cart.service';
import { ReviewService, Review } from '../../services/review.service';
import { Router } from '@angular/router';
import { Product } from '../models/product.model'; // Book -> Product
import { finalize, forkJoin, of, Subject, takeUntil } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-product-detail', // book-detail -> product-detail
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private favoriteService = inject(FavoriteService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cartService = inject(CartService);
  private reviewService = inject(ReviewService);
  private router = inject(Router);

  reviews: Review[] = [];
  userRating: number = 5;
  userComment: string = '';
  isSubmittingReview: boolean = false;
  canReview: boolean = false;
  selectedImage: string = '';

  addToCart(productParam?: Product, quantityParam?: number) {
    const targetProduct = productParam || this.product;
    if (!targetProduct) return;
    
    const qty = quantityParam || (productParam ? 1 : this.quantity);

    this.cartService.addToCart(targetProduct.id, qty).subscribe({
      next: () => {
        this.toastService.show('Đã thêm sản phẩm vào giỏ hàng!', 'success');
      },
      error: (err) => {
        console.error('Add to cart error:', err);
        this.toastService.show('Không thể thêm vào giỏ hàng. Vui lòng thử lại.', 'error');
      }
    });
  }
  buyNow() {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Vui lòng đăng nhập để tiến hành đặt hàng!', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.product) return;
    
    this.cartService.addToCart(this.product.id, this.quantity).subscribe({
      next: () => {
        this.router.navigate(['/checkout']);
      },
      error: (err) => {
        console.error('Buy now error:', err);
        this.toastService.show('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
      }
    });
  }
  product: Product | null = null; 
  isToggling = false;
  togglingId: number | null = null;
  private destroy$ = new Subject<void>();

  toggleFavorite(targetProduct?: Product) {
    const p = targetProduct || this.product;
    if (!p) return;
    
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Vui lòng đăng nhập để lưu vào danh sách yêu thích!', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    if (!targetProduct) this.isToggling = true;
    else this.togglingId = p.id;

    this.favoriteService.toggleFavorite(p.id).pipe(
      finalize(() => {
        if (!targetProduct) this.isToggling = false;
        else this.togglingId = null;
      })
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
  relatedProducts: Product[] = []; // relatedBooks -> relatedProducts
  quantity: number = 1;
  isLoading: boolean = false;
  activeTab: 'description' | 'details' | 'reviews' = 'description';
  myFavIds: number[] = [];

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = +params['id'];
      if (id) {
        this.loadProductDetail(id);
      }
    });
    this.initFavoriteSubscription();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initFavoriteSubscription() {
    this.favoriteService.favoriteIds$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ids => {
        if (this.product) {
          this.product.isFavorited = ids.includes(this.product.id);
        }
        this.relatedProducts.forEach(p => {
          p.isFavorited = ids.includes(p.id);
        });
      });
  }

  loadProductDetail(id: number) {
    this.isLoading = true;
    
    const userFavorites$ = this.authService.isLoggedIn() 
      ? this.favoriteService.getFavorites().pipe(catchError(() => of([])))
      : of([]);

    forkJoin({
      productData: this.productService.getProductById(id),
      userFavorites: userFavorites$
    }).pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res: any) => {
        let rawData = res.productData;
        if (rawData && rawData.$values && Array.isArray(rawData.$values)) {
          rawData = rawData.$values[0];
        } else if (rawData && rawData.data) {
          rawData = rawData.data;
        }

        if (rawData) {
          this.product = this.mapProduct(rawData);
          this.selectedImage = this.product.imageUrl;
          this.loadReviews(this.product.id);
          let favData = res.userFavorites;
          if (favData && favData.$values && Array.isArray(favData.$values)) {
            favData = favData.$values;
          } else if (!Array.isArray(favData)) {
            favData = [];
          }
          
          const favIds = favData.map((f: any) => f.productId || f.ProductId);
          this.myFavIds = favIds;
          
          if (favIds.includes(this.product.id)) {
            this.product.isFavorited = true;
          }
          
          // related products logic
          this.productService.getRelatedProducts(this.product.id).subscribe({
            next: (related: any) => {
              const rawRelated = this.ensureArray(related);
              this.relatedProducts = rawRelated.map((p: any) => {
                let mapped = this.mapProduct(p);
                if (this.myFavIds.includes(mapped.id)) {
                  mapped.isFavorited = true;
                }
                return mapped;
              }).filter((p: Product) => p.isActive);
            }
          });
        }
      },
      error: (err) => {
        console.error('Error loading product detail:', err);
      }
    });
  }

  private mapProduct(rawData: any): Product {
    return {
      id: rawData.id ?? rawData.Id,
      name: rawData.name ?? rawData.Name ?? rawData.title ?? rawData.Title,
      brand: rawData.brand ?? rawData.Brand ?? rawData.author ?? rawData.Author,
      price: rawData.price ?? rawData.Price,
      description: rawData.description ?? rawData.Description,
      quantity: rawData.quantity ?? rawData.Quantity ?? 0,
      imageUrl: rawData.imageUrl ?? rawData.ImageUrl,
      discountPrice: rawData.flashSale?.salePrice ?? rawData.FlashSale?.SalePrice ?? rawData.discountPrice ?? rawData.DiscountPrice,
      categoryName: rawData.categoryName ?? rawData.CategoryName,
      subCategoryName: rawData.subCategoryName ?? rawData.SubCategoryName,
      sku: rawData.sku ?? rawData.Sku,
      categoryId: rawData.categoryId ?? rawData.CategoryId,
      subCategoryId: rawData.subCategoryId ?? rawData.SubCategoryId,
      createdAt: rawData.createdAt ?? rawData.CreatedAt,
      isFavorited: rawData.isFavorited ?? rawData.IsFavorited,
      flashSale: rawData.flashSale ?? rawData.FlashSale,
      isActive: rawData.isActive ?? rawData.IsActive ?? true,
      images: this.ensureArray(rawData.images ?? rawData.Images)
    } as Product;
  }

  changeImage(imageUrl: string) {
    this.selectedImage = imageUrl;
  }

  loadReviews(productId: number) {
    this.reviewService.getProductReviews(productId).subscribe({
      next: (res: any) => {
        this.reviews = this.ensureArray(res);
      },
      error: (err) => console.error('Error loading reviews:', err)
    });

    if (this.authService.isLoggedIn()) {
      this.reviewService.checkEligibility(productId).subscribe({
        next: (res) => this.canReview = res.canReview,
        error: (err) => console.error('Error checking eligibility:', err)
      });
    }
  }

  submitReview() {
    if (!this.authService.isLoggedIn()) {
      this.toastService.show('Vui lòng đăng nhập để đánh giá!', 'warning');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.product) return;

    this.isSubmittingReview = true;
    const dto = {
      productId: this.product.id,
      rating: this.userRating,
      comment: this.userComment
    };

    this.reviewService.submitReview(dto).pipe(
      finalize(() => this.isSubmittingReview = false)
    ).subscribe({
      next: (res) => {
        this.toastService.show(res.message || 'Cảm ơn bạn đã đánh giá!', 'success');
        this.userComment = '';
        this.loadReviews(this.product!.id);
      },
      error: (err) => {
        const msg = err.error?.message || 'Có lỗi xảy ra khi gửi đánh giá.';
        this.toastService.show(msg, 'error');
      }
    });
  }

  setRating(rating: number) {
    this.userRating = rating;
  }

  incrementQuantity() {
    if (this.product && this.quantity < this.product.quantity) {
      this.quantity++;
    }
  }

  decrementQuantity() {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  setTab(tab: 'description' | 'details' | 'reviews') {
    this.activeTab = tab;
  }

  private ensureArray(data: any): any[] {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (data.$values && Array.isArray(data.$values)) return data.$values;
    return [];
  }
}
