import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'orderStatus'
})
export class OrderStatusPipe implements PipeTransform {
  transform(value: string, type: 'text' | 'class' = 'text'): string {
    if (!value) return '';
    
    const status = value.toLowerCase();
    
    if (type === 'text') {
      switch (status) {
        case 'pending': return 'Chờ xác nhận';
        case 'paid': return 'Đã thanh toán';
        case 'shipping': return 'Đang giao hàng';
        case 'completed': return 'Hoàn thành';
        case 'cancelled': return 'Đã hủy';
        default: return value;
      }
    } else {
      switch (status) {
        case 'pending': return 'bg-yellow-50 text-yellow-600 border-yellow-100';
        case 'paid': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'shipping': return 'bg-purple-50 text-purple-600 border-purple-100';
        case 'completed': return 'bg-green-50 text-green-600 border-green-100';
        case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
        default: return 'bg-slate-50 text-slate-600 border-slate-100';
      }
    }
  }
}
