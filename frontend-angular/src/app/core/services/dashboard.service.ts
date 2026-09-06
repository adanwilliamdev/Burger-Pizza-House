import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardStats, RevenueData } from '../models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/dashboard`;

  getStats(): Promise<DashboardStats> {
    return firstValueFrom(this.http.get<DashboardStats>(`${this.baseUrl}/stats`));
  }

  getRevenue(days: number): Promise<RevenueData[]> {
    return firstValueFrom(
      this.http.get<RevenueData[]>(`${this.baseUrl}/revenue`, { params: { days } })
    );
  }
}
