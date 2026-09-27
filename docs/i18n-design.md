# Thiết kế Frontend: Đa ngôn ngữ (i18n)

| | |
|---|---|
| **Ứng dụng** | nomori-marketplace-frontend (Angular 18, standalone, SSR) |
| **Cập nhật** | 2026-09-27 |
| **Ngôn ngữ** | Tiếng Việt (`vi`, mặc định), Tiếng Anh (`en`) |
| **Phạm vi** | Chỉ frontend. Không cần thay đổi backend |
| **Liên quan** | [frontend-architecture.md](frontend-architecture.md), [vendor-frontend-design.md](vendor-frontend-design.md) |

---

## 1. Yêu cầu

| # | Yêu cầu |
|---|---|
| R1 | Mọi text trên giao diện có bản tiếng Việt và tiếng Anh |
| R2 | Toàn bộ text của ứng dụng khai báo bằng key trong đúng 2 file: `vi.json` và `en.json`; component chỉ viết `{{ t('key') }}` |
| R3 | Mỗi key bắt buộc có ở cả `vi` và `en`; thiếu thì build báo lỗi |
| R4 | Đổi ngôn ngữ ngay trên trang, không tải lại, không mất dữ liệu đang nhập |
| R5 | Ngôn ngữ đã chọn được nhớ cho lần truy cập sau |
| R6 | Nội dung do người dùng nhập (tên shop, mô tả, tên sản phẩm…) không dịch |

---

## 2. Thư viện

Dùng **`@jsverse/transloco`** (bản tương thích Angular 18), không cài plugin.

Lý do chọn: đổi ngôn ngữ ngay trên trang (R4), có sẵn directive `*transloco` để viết `t('key')` trong template, và chạy được với SSR. `@angular/localize` bị loại vì mỗi ngôn ngữ cần một bản build riêng và phải tải lại trang khi đổi ngôn ngữ.

---

## 3. Cấu trúc file

```text
src/app/core/i18n/
  i18n.providers.ts                cấu hình Transloco, chọn ngôn ngữ lúc khởi động, hàm đổi ngôn ngữ
  language-switcher.component.ts   nút VI | EN trên thanh menu

src/app/i18n/
  vi.json                          toàn bộ text tiếng Việt của ứng dụng
  en.json                          toàn bộ text tiếng Anh của ứng dụng
  translations.ts                  import 2 file trên và kiểm tra hai file có cùng bộ key
```

Chỉ vậy. Không có service, interceptor, pipe hay loader riêng.

---

## 4. Viết text trong component

Khai báo `*transloco` một lần ở đầu template, rồi dùng `t('key')`:

```html
<ng-container *transloco="let t">
  <h1>{{ t('vendor.members.title') }}</h1>
  <p>{{ t('vendor.members.count', { count: members().length, max: 20 }) }}</p>
  <button type="button">{{ t('common.actions.save') }}</button>
</ng-container>
```

Nhiều key cùng nhóm thì thêm `read` để viết ngắn hơn:

```html
<ng-container *transloco="let t; read: 'vendor.members'">
  <h1>{{ t('title') }}</h1>
</ng-container>
```

Component chỉ cần import `TranslocoDirective`:

```ts
@Component({ standalone: true, imports: [TranslocoDirective], template: `...` })
```

Trong TypeScript (ví dụ nội dung toast), dùng `TranslocoService`:

```ts
private readonly transloco = inject(TranslocoService);
this.notice.success(this.transloco.translate('vendor.members.notice.setupSent', { email }));
```

**Quy tắc:**

- Không viết text cứng trong template hay TypeScript. Nội dung do người dùng nhập thì hiển thị nguyên văn (R6).
- Facade không dịch; facade trả về dữ liệu hoặc `ApiError`, trang mới dịch khi hiển thị. Nhờ vậy khi đổi ngôn ngữ, text đang hiện cũng đổi theo.
- Tiêu đề tab trình duyệt do trang tự đặt: `inject(Title).setTitle(transloco.translate('vendor.members.pageTitle'))`.

---

## 5. File bản dịch

### 5.1. Nhóm key

Cả ứng dụng dùng chung 2 file `vi.json` và `en.json`. Bên trong mỗi file, key được chia thành các nhóm ở cấp đầu tiên để dễ tìm; key đầy đủ bắt đầu bằng tên nhóm, ví dụ `vendor.members.title`.

| Nhóm | Nội dung |
|---|---|
| `common` | Nút, trạng thái, thời gian tương đối dùng chung |
| `nav` | Menu |
| `language` | Bộ chọn ngôn ngữ |
| `validation` | Lỗi nhập liệu phía client |
| `errors` | Lỗi HTTP chung và mã lỗi nghiệp vụ của backend |
| `vendorStatus` | Nhãn trạng thái đơn đăng ký, thành viên, vendor (dùng ở nhiều màn hình) |
| `auth` | Đăng nhập, đăng ký, khôi phục, kích hoạt |
| `customer` | Hồ sơ, cài đặt khách hàng |
| `becomeVendor` | Trang đăng ký mở shop |
| `storefront` | Storefront |
| `admin` | Khung admin, trang admin chung |
| `adminVendorApplications` | Duyệt đơn |
| `adminVendors` | Quản lý vendor |
| `vendor` | Vendor portal. Tính năng giai đoạn 2+ thêm khóa con, ví dụ `vendor.products` |

Các nhóm được sắp theo thứ tự trên ở cả hai file, để so sánh hai file dễ hơn.

### 5.2. Quy ước đặt key

- Dạng `nhóm.khu.mục`, viết lowerCamelCase: `vendor.members.table.lastLogin`.
- Mã lỗi nghiệp vụ của backend dùng nguyên làm key dưới `errors.`: `errors.vendor_application.already_pending`.
- Không dùng câu tiếng Anh làm key.
- Không ghép câu từ nhiều key. Dùng biến theo cú pháp của Transloco: `"setupSent": "Đã gửi email tới {{email}}."`.
- Key không chứa HTML.

### 5.3. `translations.ts`

```ts
// src/app/i18n/translations.ts
import viJson from './vi.json';
import enJson from './en.json';

export const vi = viJson;
export const en = enJson;

// Kiểm tra lúc build: vi và en phải có đúng cùng bộ key (R3).
// Thiếu key ở en → lỗi ở dòng thứ nhất; thiếu key ở vi → lỗi ở dòng thứ hai.
type Shape<T> = { [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
const enHasAllViKeys: Shape<typeof vi> = en;
const viHasAllEnKeys: Shape<typeof en> = vi;
```

- Cần bật `"resolveJsonModule": true` trong `tsconfig.json`.
- Cả hai ngôn ngữ nằm sẵn trong bundle, nên không có bước tải bản dịch và không có lúc hiện key thô. Với lượng text của ứng dụng này, phần đó chỉ vài chục KB sau khi nén.
- Thêm text mới: thêm key vào cả `vi.json` và `en.json`. Không cần sửa `translations.ts`.

### 5.4. Ví dụ

Phần đầu của `src/app/i18n/vi.json` (các nhóm theo tính năng như `becomeVendor`, `vendor` nằm tiếp theo trong cùng file):

```json
{
  "common": {
    "actions": { "save": "Lưu", "cancel": "Hủy", "confirm": "Xác nhận", "retry": "Thử lại", "close": "Đóng", "back": "Quay lại", "copy": "Sao chép" },
    "states": { "loading": "Đang tải...", "saving": "Đang lưu...", "processing": "Đang xử lý...", "empty": "Chưa có dữ liệu.", "notFound": "Không tìm thấy." },
    "time": { "justNow": "vừa xong", "hoursAgo": "{{count}} giờ trước", "daysAgo": "{{count}} ngày trước" }
  },
  "nav": { "storefront": "Cửa hàng", "products": "Sản phẩm", "vendors": "Shop", "becomeVendor": "Bán hàng cùng Nomori", "vendorPortal": "Kênh người bán", "admin": "Quản trị", "vendorApplications": "Đơn đăng ký vendor" },
  "language": { "label": "Ngôn ngữ", "vi": "Tiếng Việt", "en": "English" },
  "validation": {
    "required": "Trường này là bắt buộc.",
    "email": "Email không hợp lệ.",
    "maxlength": "Tối đa {{requiredLength}} ký tự.",
    "phone": "Chỉ gồm số, khoảng trắng và + - ( )."
  },
  "errors": {
    "network": "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.",
    "unauthorized": "Phiên đăng nhập đã hết hạn.",
    "forbidden": "Bạn không có quyền thực hiện thao tác này.",
    "badRequest": "Vui lòng sửa các ô được đánh dấu.",
    "server": "Đã có lỗi xảy ra. Mã lỗi: {{traceId}}",
    "vendor_application": {
      "email_not_verified": "Vui lòng xác thực email trước khi đăng ký mở shop.",
      "already_vendor": "Tài khoản của bạn đã thuộc một shop.",
      "already_pending": "Bạn đã có một đơn đang chờ duyệt.",
      "not_pending": "Đơn này đã được xử lý.",
      "applicant_already_vendor": "Người nộp đơn đã thuộc một shop khác."
    },
    "vendor_member": {
      "email_already_exists": "Email đã được sử dụng.",
      "limit_reached": "Shop đã đủ 20 thành viên.",
      "already_active": "Thành viên này đã kích hoạt tài khoản.",
      "last_member": "Shop phải còn ít nhất một thành viên."
    }
  },
  "vendorStatus": {
    "application": { "pending": "Chờ duyệt", "approved": "Đã duyệt", "rejected": "Từ chối", "cancelled": "Đã hủy" },
    "member": { "pendingSetup": "Chờ kích hoạt", "active": "Hoạt động" },
    "vendor": { "active": "Đang hoạt động", "inactive": "Đã tắt" }
  }
}
```

`src/app/i18n/en.json` có cùng cấu trúc:

```json
{
  "common": {
    "actions": { "save": "Save", "cancel": "Cancel", "confirm": "Confirm", "retry": "Try again", "close": "Close", "back": "Back", "copy": "Copy" },
    "states": { "loading": "Loading...", "saving": "Saving...", "processing": "Processing...", "empty": "Nothing here yet.", "notFound": "Not found." },
    "time": { "justNow": "just now", "hoursAgo": "{{count}} h ago", "daysAgo": "{{count}} d ago" }
  },
  "nav": { "storefront": "Storefront", "products": "Products", "vendors": "Shops", "becomeVendor": "Sell on Nomori", "vendorPortal": "Seller center", "admin": "Admin", "vendorApplications": "Vendor applications" },
  "language": { "label": "Language", "vi": "Tiếng Việt", "en": "English" },
  "validation": {
    "required": "This field is required.",
    "email": "Enter a valid email address.",
    "maxlength": "Use at most {{requiredLength}} characters.",
    "phone": "Use digits, spaces and + - ( ) only."
  },
  "errors": {
    "network": "Cannot reach the server. Check your connection and try again.",
    "unauthorized": "Your session has expired.",
    "forbidden": "You do not have permission to do this.",
    "badRequest": "Please fix the highlighted fields.",
    "server": "Something went wrong. Error code: {{traceId}}",
    "vendor_application": {
      "email_not_verified": "Verify your email before applying to open a shop.",
      "already_vendor": "Your account already belongs to a shop.",
      "already_pending": "You already have an application waiting for review.",
      "not_pending": "This application has already been processed.",
      "applicant_already_vendor": "The applicant already belongs to another shop."
    },
    "vendor_member": {
      "email_already_exists": "This email is already in use.",
      "limit_reached": "The shop already has 20 members.",
      "already_active": "This member has already activated their account.",
      "last_member": "A shop must keep at least one member."
    }
  },
  "vendorStatus": {
    "application": { "pending": "Pending", "approved": "Approved", "rejected": "Rejected", "cancelled": "Cancelled" },
    "member": { "pendingSetup": "Awaiting setup", "active": "Active" },
    "vendor": { "active": "Active", "inactive": "Inactive" }
  }
}
```

Tên ngôn ngữ trong bộ chọn luôn viết bằng chính ngôn ngữ đó ("Tiếng Việt", "English") ở cả hai file.

Không dùng cú pháp số nhiều. Câu có số được viết sao cho đúng ở mọi giá trị, ví dụ `"{{count}} / {{max}} thành viên"` và `"Members: {{count}} / {{max}}"`.

---

## 6. Chọn và lưu ngôn ngữ

### 6.1. `i18n.providers.ts`

```ts
export type AppLang = 'vi' | 'en';
export const LANG_COOKIE = 'nomori_lang';
export const REQUEST_LANG = new InjectionToken<AppLang>('REQUEST_LANG');   // server.ts truyền vào khi render SSR

export function provideI18n() {
  return [
    provideTransloco({
      config: { availableLangs: ['vi', 'en'], defaultLang: 'vi', reRenderOnLangChange: true, prodMode: !isDevMode() },
      loader: StaticLoader          // class nhỏ trong cùng file: getTranslation(lang) => of(lang === 'en' ? en : vi)
    }),
    { provide: APP_INITIALIZER, multi: true, useFactory: initLanguage }   // chọn ngôn ngữ trước khi render
  ];
}

export function setLanguage(lang: AppLang): void {
  // gọi từ LanguageSwitcherComponent:
  // 1. TranslocoService.setActiveLang(lang)
  // 2. ghi cookie nomori_lang (Path=/, Max-Age=1 năm, SameSite=Lax)
  // 3. document.documentElement.lang = lang
}
```

`app.config.ts` chỉ thêm `provideI18n()` vào `providers`.

### 6.2. Ngôn ngữ lúc khởi động

| # | Nguồn | Ghi chú |
|---|---|---|
| 1 | Cookie `nomori_lang` | Giá trị khác `vi` và `en` thì bỏ qua |
| 2 | Mặc định | `vi` |

- Trên trình duyệt, `initLanguage` đọc cookie từ `document.cookie`.
- Trên server, `initLanguage` đọc `REQUEST_LANG`. `server.ts` lấy giá trị này từ cookie của request, thêm đúng một dòng vào `providers` khi gọi `commonEngine.render`:

```ts
// server.ts
{ provide: REQUEST_LANG, useValue: /(?:^|;\s*)nomori_lang=(vi|en)/.exec(req.headers.cookie ?? '')?.[1] ?? 'vi' }
```

Vì server và trình duyệt cùng đọc một cookie, trang render ở server đã đúng ngôn ngữ; khi trình duyệt tiếp quản thì chữ không bị nháy. Các trang cần đăng nhập vốn chỉ render ở trình duyệt (quyết định D3 trong vendor-frontend-design.md), nên không bị ảnh hưởng.

Ngôn ngữ chỉ lưu trong cookie của trình duyệt, không lưu theo tài khoản (mục 12).

---

## 7. Ngày giờ, số và tiền

Không làm pipe riêng. Dùng pipe có sẵn của Angular với **định dạng cố định**, giống nhau ở cả hai ngôn ngữ:

| Dữ liệu | Cách viết trong template | Kết quả (cả `vi` và `en`) |
|---|---|---|
| Ngày giờ (API trả UTC) | `{{ value \| date:'dd/MM/yyyy HH:mm' }}` | `26/09/2026 08:15` (giờ theo máy người dùng) |
| Ngày | `{{ value \| date:'dd/MM/yyyy' }}` | `26/09/2026` |
| Số | `{{ value \| number }}` | `1.250` |
| Tiền | `{{ value \| number }} ₫` | `1.250.000 ₫` |

- `app.config.ts` đặt `{ provide: LOCALE_ID, useValue: 'vi' }` và gọi `registerLocaleData(localeVi)`, để số dùng dấu chấm phân cách hàng nghìn.
- Định dạng ngày ở trên chỉ gồm số, nên không phụ thuộc ngôn ngữ.
- Thời gian tương đối ("2 ngày trước") dùng key: `t('common.time.daysAgo', { count: 2 })`.

---

## 8. Dịch lỗi API

Không cần bảng chuyển đổi riêng. Mã lỗi nghiệp vụ trong `ApiError.code` (xem vendor-frontend-design.md, mục 2.1) được ghép thẳng thành key:

```ts
// core/http/api-error.ts (cùng file với kiểu ApiError)
export function apiErrorKey(error: ApiError): string {
  if (error.code) return `errors.${error.code}`;
  if (error.status === 0) return 'errors.network';
  if (error.status === 401) return 'errors.unauthorized';
  if (error.status === 403) return 'errors.forbidden';
  if (error.status === 400) return 'errors.badRequest';
  return 'errors.server';
}
```

Trong template: `{{ t(apiErrorKey(error), { traceId: error.traceId }) }}`.

**Lỗi nhập liệu:**

- Lỗi validate phía client dùng key `validation.<tên validator>`, ví dụ `t('validation.maxlength', { requiredLength: 400 })`.
- Lỗi validate từ server (`fieldErrors`) hiện là câu tiếng Anh. Validate phía client đã bắt các lỗi bắt buộc, độ dài và định dạng, nên lỗi server còn lại chủ yếu là trùng dữ liệu. Mỗi form tự khai báo key cho các lỗi này trong nhóm của mình, ví dụ `becomeVendor.form.shopNameTaken` = "Tên shop đã được sử dụng.", và dùng key đó khi server trả lỗi cho ô `shopName`.

---

## 9. Bộ chọn ngôn ngữ

`LanguageSwitcherComponent` nằm trên thanh menu của app shell, bên trái khu vực tài khoản.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ N Nomori Marketplace   [Cửa hàng] [Sản phẩm] ...   [VI | EN]  ● mai@…│
└──────────────────────────────────────────────────────────────────────┘
```

- Nhóm 2 nút, nút đang chọn được tô nền. Bấm thì gọi `setLanguage(lang)`.
- Nhóm có `role="group"` và `aria-label` = `t('language.label')`. Mỗi nút có `aria-pressed`, thuộc tính `lang` tương ứng, và `title` là tên đầy đủ ("Tiếng Việt", "English").
- Ngôn ngữ đang dùng lấy từ `TranslocoService.langChanges$` (chuyển thành signal bằng `toSignal`).

---

## 10. Kiểm tra

| Kiểm tra | Cách làm |
|---|---|
| `vi` và `en` có cùng bộ key | TypeScript kiểm tra trong `translations.ts` (mục 5.3); `ng build` và `npm run typecheck` báo lỗi nếu thiếu |
| Key dùng trong template nhưng chưa khai báo | Ở chế độ development, Transloco ghi cảnh báo "Missing translation" ra console. Kiểm tra console khi làm mỗi màn hình |
| Unit test component | Dùng `TranslocoTestingModule.forRoot({ langs: { vi, en } })` với `vi` và `en` từ `translations.ts` |
| Kiểm thử thủ công | Đổi ngôn ngữ khi đang nhập dở một form: dữ liệu còn nguyên, nhãn và lỗi đổi ngôn ngữ. Tải lại trang: vẫn giữ ngôn ngữ đã chọn. Text tiếng Việt dài hơn không làm vỡ bố cục ở màn hình rộng 375px |

---

## 11. Chuyển đổi code hiện có

Các trang hiện có viết text tiếng Anh trực tiếp trong template. Kế hoạch:

| Bước | Nội dung |
|---|---|
| 1 | Nền tảng: cài Transloco, tạo `i18n.providers.ts`, `translations.ts`, `vi.json` và `en.json` với các nhóm dùng chung, bộ chọn ngôn ngữ, sửa `server.ts` và `app.config.ts` |
| 2 | Cụm vendor (vendor-frontend-design.md) viết bằng key ngay từ đầu |
| 3 | App shell, trang lỗi và trang không có quyền |
| 4 | Nhóm `auth` |
| 5 | Nhóm `customer` |
| 6 | Nhóm `storefront` |
| 7 | Nhóm `admin`: catalog, thuộc tính, thông số |

Mỗi bước là một pull request riêng. Trang chưa chuyển vẫn hiện tiếng Anh ở cả hai chế độ ngôn ngữ trong thời gian chuyển đổi.

---

## 12. Ngoài phạm vi

| Nội dung | Ghi chú |
|---|---|
| Lưu ngôn ngữ theo tài khoản | Backend có thuộc tính `preferred_language`, nhưng chưa dùng. Có thể bổ sung sau mà không đổi cách viết text |
| Email và lỗi validate từ backend theo ngôn ngữ | Việc của backend |
| Nội dung do người dùng nhập bằng nhiều ngôn ngữ | Tính năng riêng, chưa có kế hoạch |
| URL theo ngôn ngữ (`/en/...`) cho SEO | Làm sau nếu cần |

---

## 13. Quyết định

| # | Quyết định |
|---|---|
| D1 | Hỗ trợ tiếng Việt và tiếng Anh; mặc định tiếng Việt |
| D2 | Dùng `@jsverse/transloco`, không plugin; component viết `{{ t('key') }}` |
| D3 | Toàn bộ text khai báo trong đúng 2 file `src/app/i18n/vi.json` và `en.json`, đóng gói sẵn vào bundle; TypeScript bắt buộc hai file có cùng bộ key |
| D4 | Ngôn ngữ lưu trong cookie `nomori_lang`; `server.ts` đọc cookie để render SSR đúng ngôn ngữ |
| D5 | Ngày, số và tiền dùng định dạng cố định giống nhau ở cả hai ngôn ngữ |
| D6 | Mã lỗi nghiệp vụ của backend được dùng nguyên làm key dưới `errors.` |
