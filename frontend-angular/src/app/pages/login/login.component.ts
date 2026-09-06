import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import {
  LucideDynamicIcon,
  LucidePizza as Pizza,
  LucideEye as Eye,
  LucideEyeOff as EyeOff,
  LucideTrendingUp as TrendingUp,
  LucidePackage as Package,
  LucideClipboardList as ClipboardList,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

const REMEMBER_KEY = 'bph-remember-email';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly Pizza = Pizza;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly TrendingUp = TrendingUp;
  readonly Package = Package;
  readonly ClipboardList = ClipboardList;

  email = signal('');
  password = signal('');
  showPassword = signal(false);
  rememberMe = signal(false);
  loading = signal(false);

  constructor() {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      this.email.set(saved);
      this.rememberMe.set(true);
    }
  }

  async handleSubmit(): Promise<void> {
    this.loading.set(true);
    try {
      await this.auth.login({ email: this.email(), password: this.password() });
      if (this.rememberMe()) {
        localStorage.setItem(REMEMBER_KEY, this.email());
      } else {
        localStorage.removeItem(REMEMBER_KEY);
      }
      this.toast.success('Bem-vindo! 🍕');
      const from = this.route.snapshot.queryParamMap.get('from') || '/dashboard';
      this.router.navigateByUrl(from, { replaceUrl: true });
    } catch (error) {
      const message =
        error instanceof HttpErrorResponse
          ? (error.error?.error as string | undefined)
          : undefined;
      this.toast.error(message || 'Erro ao fazer login');
    } finally {
      this.loading.set(false);
    }
  }
}
