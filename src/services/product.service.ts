import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Product } from '../app/models/product.model'; 
import { PagedResult } from '../app/models/paged-result.model';

@Injectable({
  providedIn: 'root'
})

export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`; 

  constructor(private http: HttpClient) { }

  getProductsPaged(
    page: number = 1, 
    pageSize: number = 12, 
    minPrice?: number, 
    maxPrice?: number, 
    sortBy?: string,
    categoryId?: number,
    subCategoryId?: number,
    searchTerm?: string
  ): Observable<PagedResult<Product>> {
    let params = new HttpParams()
      .set('PageNumber', page.toString()) 
      .set('PageSize', pageSize.toString());
    
    if (minPrice != null) params = params.set('MinPrice', minPrice.toString());
    if (maxPrice != null) params = params.set('MaxPrice', maxPrice.toString());
    if (sortBy) params = params.set('SortBy', sortBy);
    if (categoryId && categoryId > 0) params = params.set('CategoryId', categoryId.toString());
    if (subCategoryId && subCategoryId > 0) params = params.set('SubCategoryId', subCategoryId.toString());
    if (searchTerm) params = params.set('Search', searchTerm);

    return this.http.get<PagedResult<Product>>(this.apiUrl, { params });
  }

  getProductById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  getNewArrivals(count: number = 10): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/new-arrivals`, { params: { count: count.toString() } });
  }

  getRelatedProducts(productId: number, count: number = 4): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/${productId}/related`, { params: { count: count.toString() } });
  }

  getFlashSale(count: number = 10): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/flash-sale`, { params: { count: count.toString() } });
  }
}
