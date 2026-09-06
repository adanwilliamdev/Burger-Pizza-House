import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Order } from '../models';

export interface CreateOrderPayload {
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  type: string;
  paymentMethod: string;
  discount: number;
  deliveryFee: number;
  note?: string;
  items: Array<{ productId: string; quantity: number }>;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/orders`;

  getAll(): Promise<Order[]> {
    return firstValueFrom(this.http.get<Order[]>(this.baseUrl));
  }

  create(payload: CreateOrderPayload): Promise<Order> {
    return firstValueFrom(this.http.post<Order>(this.baseUrl, payload));
  }

  updateStatus(id: string, status: string): Promise<Order> {
    return firstValueFrom(this.http.patch<Order>(`${this.baseUrl}/${id}/status`, { status }));
  }
}
