import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AddressService {
  private http = inject(HttpClient);
  private apiUrl = 'https://provinces.open-api.vn/api/v2';

  getProvinces(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/p/`);
  }

  // API V2 trả về mảng wards trực tiếp bên trong province khi dùng depth=2
  getWardsByProvinceCode(provinceCode: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/p/${provinceCode}?depth=2`);
  }
}
