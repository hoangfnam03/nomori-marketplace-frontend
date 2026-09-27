import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LANG_COOKIE, provideI18n, readLangCookie } from './i18n.providers';
import { LanguageSwitcherComponent } from './language-switcher.component';

describe('LanguageSwitcherComponent', () => {
  beforeEach(async () => {
    document.cookie = `${LANG_COOKIE}=; Path=/; Max-Age=0`;
    await TestBed.configureTestingModule({
      imports: [LanguageSwitcherComponent],
      providers: [provideI18n()]
    }).compileComponents();
    await TestBed.inject(ApplicationInitStatus).donePromise;
  });

  afterEach(() => {
    document.cookie = `${LANG_COOKIE}=; Path=/; Max-Age=0`;
  });

  function render() {
    const fixture = TestBed.createComponent(LanguageSwitcherComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const button = (lang: string) => element.querySelector<HTMLButtonElement>(`button[lang="${lang}"]`)!;
    return { fixture, element, button };
  }

  it('renders one button per language with an accessible group label', () => {
    const { element, button } = render();

    expect(element.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Ngôn ngữ');
    expect(button('vi').getAttribute('aria-pressed')).toBe('true');
    expect(button('en').getAttribute('aria-pressed')).toBe('false');
    expect(button('en').title).toBe('English');
  });

  it('switches to English when EN is clicked', () => {
    const { fixture, element, button } = render();

    button('en').click();
    fixture.detectChanges();

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
    expect(button('en').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Language');
    expect(readLangCookie(document.cookie)).toBe('en');
  });
});
