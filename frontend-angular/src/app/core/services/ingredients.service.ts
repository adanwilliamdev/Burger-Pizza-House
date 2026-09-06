import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ingredient } from '../models';

export interface IngredientPayload {
  name: string;
  unit: string;
  minStock: number;
  costPerUnit: number;
  currentStock?: number;
}

@Injectable({ providedIn: 'root' })
export class IngredientsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/ingredients`;

  getAll(): Promise<Ingredient[]> {
    return firstValueFrom(this.http.get<Ingredient[]>(this.baseUrl));
  }

  create(payload: IngredientPayload): Promise<Ingredient> {
    return firstValueFrom(this.http.post<Ingredient>(this.baseUrl, payload));
  }

  update(id: string, payload: Omit<IngredientPayload, 'currentStock'>): Promise<Ingredient> {
    return firstValueFrom(this.http.put<Ingredient>(`${this.baseUrl}/${id}`, payload));
  }
}
