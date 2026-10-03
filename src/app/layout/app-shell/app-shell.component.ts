import { Component, computed, DestroyRef, effect, ElementRef, HostListener, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { AuthFacade } from '../../core/auth/auth.facade';
import { displayName } from '../../core/auth/display-name';
import { permissionCodes } from '../../core/auth/permission-codes';
import { CartService } from '../../core/cart/cart.service';
import { MediaApiService } from '../../core/media/media-api.service';
import { LanguageSwitcherComponent } from '../../core/i18n/language-switcher.component';
import { CurrencyService } from '../../core/money/currency.service';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { CurrencySelectorComponent } from '../../shared/components/currency-selector/currency-selector.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslocoDirective, AvatarComponent, CurrencySelectorComponent, LanguageSwitcherComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  readonly auth = inject(AuthFacade);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly currency = inject(CurrencyService);
  readonly cart = inject(CartService);
  readonly media = inject(MediaApiService);
  readonly codes = permissionCodes;

  private readonly transloco = inject(TranslocoService);
  private readonly lang = toSignal(this.transloco.langChanges$, { initialValue: this.transloco.getActiveLang() });
  /** The user's name when the profile has one, otherwise their email. */
  readonly displayName = computed(() => displayName(this.auth.session(), this.lang()));

  /** Permissions of the signed-in account; menu links follow the same rules as the route guards. */
  private readonly permissions = signal<readonly string[]>([]);
  private loadedPermissionsFor: string | null = null;

  /** Account menu (profile, orders, sign out) behind the display name. */
  readonly menuOpen = signal(false);
  private readonly accountMenu = viewChild<ElementRef<HTMLElement>>('accountMenu');
  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');

  constructor() {
    // The cart count follows the session: a guest has no cart, a customer gets their number.
    // The refresh may set the count signal, which an effect only allows when told so.
    effect(() => {
      this.auth.isAuthenticated();
      this.cart.refreshCount();
    }, { allowSignalWrites: true });

    // Reload permissions when another account signs in or the shop membership changes (approval adds the Vendors role).
    effect(() => {
      const session = this.auth.session();
      const key = session?.isAuthenticated ? `${session.customerId}:${session.vendorId ?? ''}` : null;
      if (key === this.loadedPermissionsFor) return;
      this.loadedPermissionsFor = key;
      if (key === null) { this.permissions.set([]); return; }
      // Accounts without permissions.read get 403, which simply means no admin links.
      this.auth.getPermissions().subscribe({
        next: response => this.permissions.set(response.permissions),
        error: () => this.permissions.set([])
      });
    }, { allowSignalWrites: true });

    inject(Router).events.pipe(filter(event => event instanceof NavigationStart), takeUntilDestroyed())
      .subscribe(() => this.menuOpen.set(false));

    if (isPlatformBrowser(this.platformId)) {
      this.auth.loadSession().subscribe();
      this.currency.load();
      this.refreshWhenTabReturns();
    }
  }

  can(permission: string) {
    return this.permissions().includes(permission);
  }

  toggleMenu() {
    this.menuOpen.update(open => !open);
  }

  /** Closes the menu; with returnFocus (Escape) the trigger gets focus back so keyboard users stay in place. */
  closeMenu(returnFocus = false) {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    if (returnFocus) this.menuTrigger()?.nativeElement.focus();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const menu = this.accountMenu()?.nativeElement;
    if (menu && !menu.contains(event.target as Node)) this.closeMenu();
  }

  logout() {
    this.menuOpen.set(false);
    this.auth.logout().subscribe();
  }

  /** A shop approved while this tab was open shows up as soon as the user comes back to it. */
  private refreshWhenTabReturns() {
    const document = inject(DOCUMENT);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && this.auth.isAuthenticated()) this.auth.refreshSession();
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => document.removeEventListener('visibilitychange', onVisible));
  }
}
