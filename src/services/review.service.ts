import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';

export interface Review {
  id: number;
  productId: number;
  productName: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  adminReply?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateReviewDTO {
  productId: number;
  rating: number;
  comment: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/reviews`;

  submitReview(dto: CreateReviewDTO): Observable<any> {
    return this.http.post(this.apiUrl, dto);
  }

  getProductReviews(productId: number): Observable<Review[]> {
    return this.http.get<Review[]>(`${this.apiUrl}/product/${productId}`);
  }

  checkEligibility(productId: number): Observable<{canReview: boolean}> {
    return this.http.get<{canReview: boolean}>(`${this.apiUrl}/check-eligibility/${productId}`);
  }
}
