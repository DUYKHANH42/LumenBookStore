import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { CheckoutDto, Order, OrderFullDetail } from '../app/models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/orders`;

  checkout(checkoutData: CheckoutDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/checkout`, checkoutData);
  }

  getHistory(page: number = 1, pageSize: number = 5): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/history?page=${page}&pageSize=${pageSize}`);
  }

  getOrderDetails(id: number): Observable<OrderFullDetail> {
    return this.http.get<OrderFullDetail>(`${this.apiUrl}/${id}`);
  }

  cancelOrder(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/cancel`, {});
  }
}
