import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product } from '../models';

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  cost: number;
  category: string;
  preparationTime: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/products`;

  getAll(params?: { isActive?: boolean }): Promise<Product[]> {
    return firstValueFrom(this.http.get<Product[]>(this.baseUrl, { params: params as any }));
  }

  create(payload: ProductPayload): Promise<Product> {
    return firstValueFrom(this.http.post<Product>(this.baseUrl, payload));
  }

  update(id: string, payload: ProductPayload): Promise<Product> {
    return firstValueFrom(this.http.put<Product>(`${this.baseUrl}/${id}`, payload));
  }

  delete(id: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.baseUrl}/${id}`));
  }
}
