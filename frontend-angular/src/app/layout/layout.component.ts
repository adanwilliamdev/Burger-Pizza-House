import { ChangeDetectionStrategy, Component, ElementRef, HostListener, ViewChild, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import {
  LucideDynamicIcon,
  LucideIconInput,
  LucideLayoutDashboard as LayoutDashboard,
  LucidePizza as Pizza,
  LucideClipboardList as ClipboardList,
  LucidePackage as Package,
  LucideLogOut as LogOut,
  LucideUser as User,
  LucideHome as Home,
  LucideChevronsLeft as ChevronsLeft,
  LucideChevronsRight as ChevronsRight,
  LucideSearch as Search,
  LucideBell as Bell,
  LucideSun as Sun,
  LucideMoon as Moon,
  LucideMenu as Menu,
  LucideX as X,
} from '@lucide/angular';
import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';

interface NavItem {
  to: string;
  icon: LucideIconInput;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/products', icon: Pizza, label: 'Produtos' },
  { to: '/orders', icon: ClipboardList, label: 'Pedidos' },
  { to: '/ingredients', icon: Package, label: 'Estoque' },
];

const SIDEBAR_STORAGE_KEY = 'bph-sidebar-collapsed';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './layout.component.html',
})
export class LayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  private router = inject(Router);

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  readonly navItems = NAV_ITEMS;

  readonly collapsed = signal(localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1');
  readonly mobileOpen = signal(false);
  readonly userMenuOpen = signal(false);
  readonly notifOpen = signal(false);

  // Ícones usados no template
  readonly LogOut = LogOut;
  readonly Home = Home;
  readonly ChevronsLeft = ChevronsLeft;
  readonly ChevronsRight = ChevronsRight;
  readonly Search = Search;
  readonly Bell = Bell;
  readonly Sun = Sun;
  readonly Moon = Moon;
  readonly Menu = Menu;
  readonly X = X;
  readonly User = User;

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.mobileOpen.set(false));
  }

  toggleCollapsed(): void {
    this.collapsed.update((c) => {
      const next = !c;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  closeMobileMenu(): void {
    this.mobileOpen.set(false);
  }

  openMobileMenu(): void {
    this.mobileOpen.set(true);
  }

  toggleNotif(): void {
    this.notifOpen.update((o) => !o);
    this.userMenuOpen.set(false);
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((o) => !o);
    this.notifOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  // Atalhos de teclado: Ctrl/Cmd+K busca, Ctrl/Cmd+N produtos, Ctrl/Cmd+P pedidos
  @HostListener('window:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const meta = e.ctrlKey || e.metaKey;
    if (!meta) return;
    const key = e.key.toLowerCase();
    if (key === 'k') {
      e.preventDefault();
      this.searchInput?.nativeElement.focus();
    } else if (key === 'n') {
      e.preventDefault();
      this.router.navigate(['/products']);
    } else if (key === 'p') {
      e.preventDefault();
      this.router.navigate(['/orders']);
    }
  }
}
