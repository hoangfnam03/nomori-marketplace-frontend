# Thiết kế Frontend: Cụm Vendor

| | |
|---|---|
| **Ứng dụng** | nomori-marketplace-frontend (Angular 18, standalone, Signals, SSR-ready) |
| **Cập nhật** | 2026-09-27 |
| **Yêu cầu** | [vendors-prd.md](../../nomori-marketplace-backend/docs/modules/vendors-prd.md), [vendor-shop-settings-prd.md](../../nomori-marketplace-backend/docs/modules/vendor-shop-settings-prd.md), [vendor-products-prd.md](../../nomori-marketplace-backend/docs/modules/vendor-products-prd.md), [vendor-orders-prd.md](../../nomori-marketplace-backend/docs/modules/vendor-orders-prd.md), [vendor-settlement-prd.md](../../nomori-marketplace-backend/docs/modules/vendor-settlement-prd.md) |
| **API** | [vendors-api.md](../../nomori-marketplace-backend/docs/modules/vendors-api.md) |
| **Kiến trúc chung** | [frontend-architecture.md](frontend-architecture.md) |
| **Đa ngôn ngữ** | [i18n-design.md](i18n-design.md) |

---

## 0. Phạm vi và mức độ chi tiết

| Giai đoạn | Nội dung | Mức chi tiết |
|---|---|---|
| **Giai đoạn 1: Vendors** | Nền tảng chung, đăng ký mở shop, admin duyệt đơn, admin quản lý vendor, vendor portal, thành viên, kích hoạt tài khoản, storefront vendor | **Đầy đủ**: route, component, state, model, gọi API, validate, lỗi, test. API đã chốt |
| **Giai đoạn 2+** | Cài đặt shop, sản phẩm vendor, đơn hàng vendor, tài chính | **Cấp màn hình**: route, bố cục, component, trạng thái. Model và service làm sau, khi API của từng module được thiết kế |

Mục 1–6 áp dụng cho mọi giai đoạn. Mục 7–9 là giai đoạn 1. Mục 10 là giai đoạn 2+.

**Về chữ hiển thị:** giao diện hỗ trợ tiếng Việt và tiếng Anh ([i18n-design.md](i18n-design.md)). Chữ trong wireframe, bảng thông báo và bảng nhãn của tài liệu này là **bản tiếng Việt**. Trong code, mọi chữ đều lấy qua key dịch; bản tiếng Anh nằm trong `src/app/i18n/en.json`.

---

## 1. Nguyên tắc

1. **Theo đúng ranh giới trong `frontend-architecture.md`.** Mỗi tính năng có `pages/`, `components/`, `data-access/` (facade) và file `*.routes.ts`. Component chỉ hiển thị state và phát sự kiện; không tạo URL, không xử lý cookie, không chứa quy tắc nghiệp vụ.
2. **Một API service cho mỗi tài nguyên backend.** Backend đã gộp route (mục 2 của vendors-api.md), nên frontend cũng có đúng một service cho vendor, đơn đăng ký, thành viên và ghi chú, dùng chung cho storefront, customer, admin và portal. Các service này nằm ở `core/vendors/` vì nhiều ranh giới cùng dùng.
3. **Mỗi trang có một facade** (`*.facade.ts`), khai báo trong `providers` của component trang, nên state mất đi khi rời trang. Facade giữ state bằng Signals và gọi API service.
4. **Luôn hiển thị đủ 5 trạng thái:** đang tải, có dữ liệu, trống, lỗi, không có quyền.
5. **Bộ lọc, phân trang và mục đang chọn nằm trong query params** để chia sẻ link và giữ được khi tải lại trang.
6. **Frontend không tự quyết định quyền.** Guard và việc ẩn nút chỉ để trải nghiệm tốt hơn; backend vẫn là nơi kiểm tra quyền. Khi backend trả `403`, `404` hoặc `409`, giao diện luôn xử lý được, kể cả khi nút lẽ ra đã bị ẩn.
7. **Không viết chữ cứng trong template hay TypeScript.** Mọi chữ lấy qua key dịch của Transloco. Toàn bộ text nằm trong 2 file chung `src/app/i18n/vi.json` và `en.json`, mỗi tính năng là một nhóm key trong đó; key phải có ở cả hai file, nếu thiếu thì build báo lỗi. Facade trả về key hoặc `ApiError`, trang mới dịch khi hiển thị bằng `{{ t('key') }}` ([i18n-design.md](i18n-design.md), mục 4).

---

## 2. Nền tảng cần bổ sung ở `core/`

### 2.1. Chuẩn hóa lỗi API

**Vấn đề:** `error.interceptor.ts` lấy `code` từ `error.error.code`, nhưng backend đặt mã lỗi nghiệp vụ trong `ProblemDetails.detail` (ví dụ `"vendor_application.already_pending"`). Vì vậy `code` hiện luôn là `null`.

**Thay đổi:** tạo `core/http/api-error.ts` và sửa interceptor.

```ts
// core/http/api-error.ts
export interface ApiError {
  status: number;                         // 0 = lỗi mạng
  code: string | null;                    // mã lỗi nghiệp vụ, ví dụ 'vendor_member.last_member'
  fieldErrors: Record<string, string[]>;  // từ ValidationProblemDetails.errors, luôn là object
  message: string;                        // detail hoặc message kỹ thuật, không hiển thị thẳng cho người dùng
  traceId: string | null;                 // X-Correlation-Id
}

export function isApiError(value: unknown): value is ApiError { /* kiểm tra field status */ }
```

```ts
// core/http/error.interceptor.ts (sau khi sửa)
const body = error.error ?? {};
const detail = typeof body.detail === 'string' ? body.detail : null;
const normalized: ApiError = {
  status: error.status,
  code: body.code ?? (error.status === 409 ? detail : null),
  fieldErrors: body.errors ?? {},
  message: detail ?? error.message,
  traceId: error.headers.get('X-Correlation-Id') ?? body.traceId ?? null
};
```

`AuthFacade.getErrorMessage` đang đọc `error.message` để nhận `auth.email_not_verified`; cần đọc thêm `error.code`. Việc này tương thích ngược vì `message` vẫn giữ `detail`.

**Hiển thị lỗi chung:** dịch bằng `apiErrorKey(error)` ([i18n-design.md](i18n-design.md), mục 8), key nằm dưới `errors.` ở nhóm gốc:

| Trường hợp | Thông báo | Hành động |
|---|---|---|
| `status = 0` | "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." | Nút **Thử lại** |
| `401` | "Phiên đăng nhập đã hết hạn." | Chuyển tới `/auth/login?returnUrl=...` |
| `403` | "Bạn không có quyền thực hiện thao tác này." | Hiện trạng thái không có quyền |
| `404` | Tùy màn hình | Hiện trạng thái "Không tìm thấy" |
| `409` có `code` | Tra bảng mã lỗi (mục 7.4) | Tùy màn hình |
| `400` | "Vui lòng sửa các ô được đánh dấu." | Gắn `fieldErrors` vào từng ô |
| `5xx` | "Đã có lỗi xảy ra. Mã lỗi: {traceId}" | Nút **Thử lại** |

### 2.2. Session có `vendorId`

`core/auth/auth.models.ts`:

```ts
export interface AuthSession {
  isAuthenticated: boolean;
  customerId: number | null;
  email: string | null;
  emailVerified: boolean | null;
  emailOtpEnabled: boolean | null;
  vendorId: number | null;   // mới
}
```

`AuthFacade`:

- `anonymousSession` có thêm `vendorId: null`.
- Thêm `readonly vendorId = computed(() => this.sessionState()?.vendorId ?? null)`.
- `refreshSession()` **trả về `Observable<AuthSession>`** thay vì `void`, để các luồng như duyệt đơn hoặc rời shop đợi được session mới trước khi chuyển trang.

### 2.3. `PermissionStore`: lưu permission một lần

**Vấn đề:** `permissionGuard` gọi `/auth/permissions` mỗi lần chuyển trang, và menu không biết người dùng có quyền gì.

```ts
// core/auth/permission.store.ts
@Injectable({ providedIn: 'root' })
export class PermissionStore {
  private readonly state = signal<ReadonlySet<string> | null>(null);
  private request$: Observable<ReadonlySet<string>> | null = null;

  readonly permissions = this.state.asReadonly();
  readonly loaded = computed(() => this.state() !== null);

  has(code: string): Signal<boolean>;        // computed, dùng trong template
  hasNow(code: string): boolean;             // dùng trong code
  load(): Observable<ReadonlySet<string>>;   // gọi API một lần, dùng lại kết quả (shareReplay)
  refresh(): Observable<ReadonlySet<string>>;// bỏ cache, gọi lại
  clear(): void;                             // khi đăng xuất hoặc đăng nhập tài khoản khác
}
```

- Trên server (SSR) và khi chưa đăng nhập, `load()` trả tập rỗng, không gọi API.
- `AuthFacade.login`, `logout`, `verifyLoginOtp` và `changePassword` gọi `permissionStore.clear()`.
- `permissionGuard` dùng `permissionStore.load()` thay cho `auth.getPermissions()`.
- `core/auth/permission-codes.ts` giữ nguyên (`vendorManage`, `vendorPortal` đã có).

### 2.4. Guard mới cho vendor portal

```ts
// core/auth/vendor-portal.guard.ts
export const vendorPortalGuard: CanActivateFn = (_route, state) => ...
```

| Điều kiện | Kết quả |
|---|---|
| Chưa đăng nhập | `/auth/login?returnUrl=<url>` |
| Đã đăng nhập, `session.vendorId = null` | `/customer/become-vendor` |
| Có `vendorId` nhưng không có `vendor.portal` | `/auth/forbidden` |
| Có `vendorId` và `vendor.portal` | Cho vào |

### 2.5. Menu theo quyền

`layout/app-shell/app-shell.component.html` được sửa như sau:

| Link | Hiện khi |
|---|---|
| Storefront, Products, Vendors | Luôn hiện |
| **Bán hàng cùng Nomori** → `/customer/become-vendor` | Đã đăng nhập và `vendorId = null` |
| **Kênh người bán** → `/vendor` | `vendorId ≠ null` và có `vendor.portal` |
| Admin | Có `admin.access` |
| Catalog, Attributes, Spec Attrs | Có `catalog.manage` |
| **Vendors (Admin)**, **Đơn đăng ký vendor** kèm số đơn chờ duyệt | Có `vendor.manage` |

Số đơn chờ duyệt lấy từ `GET /vendor-applications?status=pending&pageSize=1` (dùng `totalCount`). Số này tải khi app shell khởi động (nếu có `vendor.manage`) và sau mỗi lần duyệt hoặc từ chối đơn. Trang duyệt đơn phát tín hiệu cập nhật qua `VendorApplicationCountStore` (signal ở `core/vendors/`).

### 2.6. Thông báo nhanh (toast)

`shared/notice/notice.service.ts` và `shared/notice/notice-outlet.component.ts`:

- `NoticeService.success(text)`, `.error(text)`, `.info(text)`; mỗi thông báo tự tắt sau 5 giây, có nút đóng.
- `NoticeOutletComponent` đặt một lần trong app shell, dùng `aria-live="polite"`.
- Dùng cho kết quả thao tác (đã duyệt, đã gửi email…). Lỗi validate vẫn hiện ngay tại ô nhập.

---

## 3. Component dùng chung (`shared/`)

| Component | Selector | Input | Output / Nội dung chiếu vào | Dùng ở |
|---|---|---|---|---|
| `PageHeaderComponent` | `app-page-header` | `eyebrow`, `title`, `description?` | `<ng-content select="[actions]">` cho nút bên phải | Mọi trang |
| `AsyncStateComponent` | `app-async-state` | `status: 'loading' \| 'ready' \| 'empty' \| 'error' \| 'forbidden' \| 'notFound'`, `emptyTitle?`, `emptyMessage?`, `errorMessage?` | `retry`; `<ng-content>` hiện khi `ready` | Mọi vùng tải dữ liệu |
| `StatusBadgeComponent` | `app-status-badge` | `tone: 'neutral' \| 'info' \| 'success' \| 'warning' \| 'danger'`, `label` | | Bảng, chi tiết |
| `ConfirmDialogComponent` | `app-confirm-dialog` | `open`, `title`, `message`, `confirmLabel`, `tone: 'default' \| 'danger'`, `busy`, `requireText?` | `confirmed`, `cancelled`; `<ng-content>` cho nội dung thêm | Mọi thao tác cần xác nhận |
| `PaginationComponent` | `app-pagination` | `page`, `totalPages`, `totalCount` | `pageChange(number)` | Danh sách |
| `FieldErrorComponent` | `app-field-error` | `control: AbstractControl`, `serverError?: string`, `messages?: Record<string,string>` | | Mọi form |
| `EmptyStateComponent` | đã có | | | Dùng lại trong `AsyncStateComponent` |

**Yêu cầu riêng:**

- `ConfirmDialogComponent` dùng thẻ `<dialog>` gốc với `showModal()`: có sẵn focus trap và đóng bằng Esc. Khi mở, focus vào nút an toàn (Hủy) nếu `tone = 'danger'`. Nếu có `requireText`, nút xác nhận chỉ bật khi người dùng gõ đúng chuỗi đó. Trong lúc `busy`, không đóng được và nút xác nhận hiện "Đang xử lý...".
- `AsyncStateComponent` khi `loading` hiện khung chờ (skeleton) sau 150 ms để tránh nháy khi API trả nhanh.
- `FieldErrorComponent` ưu tiên lỗi từ server nếu có, nếu không thì hiện lỗi validate phía client khi ô đã được chạm (`touched`).

**Style:** dùng biến CSS có sẵn trong `styles.scss` (`--paper`, `--ink`, `--muted`, `--line`, `--line-strong`, `--green`, font Manrope và DM Mono). Bổ sung biến tone cho nhãn trạng thái:

```scss
:root {
  --tone-info: #2f5d8a;    --tone-info-bg: #e6eef6;
  --tone-success: #27745d; --tone-success-bg: #e3f0ea;
  --tone-warning: #9a6412; --tone-warning-bg: #f7eddc;
  --tone-danger: #8d3128;  --tone-danger-bg: #f5e3e1;
  --tone-neutral: #687066; --tone-neutral-bg: #ecede8;
}
```

Các class form đang có trong `auth/auth-page.scss` (`.auth-panel`, `.field`, `.field-error`, `.form-error`, `.form-success`, `.submit`) được chuyển sang `src/styles/_forms.scss` và import toàn cục, để trang vendor dùng chung mà không phải trỏ tới file của module auth.

---

## 4. Cấu trúc thư mục

```text
src/app/
  core/
    auth/
      auth.models.ts                 (sửa: vendorId)
      auth.facade.ts                 (sửa: vendorId, refreshSession trả Observable, clear permission)
      auth.guard.ts                  (sửa: permissionGuard dùng PermissionStore)
      permission.store.ts            (mới)
      vendor-portal.guard.ts         (mới)
    http/
      api-error.ts                   (mới)
      error.interceptor.ts           (sửa)
    vendors/
      models/
        paged-response.ts
        vendor.models.ts             (viết lại: một VendorResponse)
        vendor-application.models.ts
        vendor-member.models.ts
        vendor-note.models.ts
      vendor-api.service.ts          (viết lại)
      vendor-application-api.service.ts
      vendor-member-api.service.ts
      vendor-note-api.service.ts
      vendor-application-count.store.ts
      vendor-labels.ts               (trạng thái → key dịch và tone)
  core/i18n/                         (i18n.providers.ts, language-switcher.component.ts; xem i18n-design.md mục 3)
  i18n/                              (vi.json, en.json, translations.ts: toàn bộ text, thêm nhóm becomeVendor,
                                      adminVendorApplications, adminVendors, vendor cho cụm này)
  shared/
    components/  page-header/ async-state/ status-badge/ confirm-dialog/ pagination/ field-error/
    notice/      notice.service.ts notice-outlet.component.ts
  customer/
    customer.routes.ts               (sửa: thêm become-vendor)
    become-vendor/
      pages/become-vendor.page.ts
      components/application-form.component.ts
      components/application-summary.component.ts
      data-access/become-vendor.facade.ts
  admin/
    admin.routes.ts                  (sửa)
    vendor-applications/
      pages/admin-vendor-applications.page.ts
      components/application-table.component.ts
      components/application-detail-panel.component.ts
      components/approve-dialog.component.ts
      components/reject-dialog.component.ts
      data-access/admin-vendor-applications.facade.ts
    vendors/
      pages/admin-vendor-list.page.ts      (thay admin/pages/admin-vendors.page.ts)
      pages/admin-vendor-detail.page.ts
      components/vendor-table.component.ts
      components/vendor-edit-form.component.ts
      components/vendor-members-panel.component.ts
      components/vendor-notes-panel.component.ts
      data-access/admin-vendor-list.facade.ts
      data-access/admin-vendor-detail.facade.ts
  vendor/                            (ranh giới lazy mới: vendor portal)
    vendor.routes.ts
    layout/vendor-shell.component.ts
    data-access/vendor-context.service.ts
    overview/pages/vendor-overview.page.ts
    members/
      pages/vendor-members.page.ts
      components/member-table.component.ts
      components/add-member-dialog.component.ts
      data-access/vendor-members.facade.ts
    (giai đoạn 2+) settings/ products/ orders/ finance/
  auth/pages/reset-password.page.ts  (sửa: chế độ setup=1)
  storefront/pages/vendor-list.page.ts, vendor-detail.page.ts (sửa: dùng VendorResponse)
```

---

## 5. Bản đồ route

| Route | Component | Guard | Query params | Tiêu đề tab (bản `vi`; trang tự đặt bằng key dịch) |
|---|---|---|---|---|
| `/customer/become-vendor` | `BecomeVendorPage` | `authGuard` | | Bán hàng cùng Nomori |
| `/admin/vendor-applications` | `AdminVendorApplicationsPage` | `permissionGuard(vendorManage)` | `status`, `search`, `page`, `id` | Đơn đăng ký vendor |
| `/admin/vendors` | `AdminVendorListPage` | `permissionGuard(vendorManage)` | `search`, `active`, `page` | Vendors |
| `/admin/vendors/:id` | `AdminVendorDetailPage` | `permissionGuard(vendorManage)` | `tab` = `info` \| `members` \| `notes` | Tên vendor |
| `/vendor` | `VendorShellComponent` | `vendorPortalGuard` | | |
| `/vendor` (con, `''`) | `VendorOverviewPage` | | | Kênh người bán |
| `/vendor/members` | `VendorMembersPage` | | | Thành viên |
| `/auth/reset-password` | `ResetPasswordPage` | | `token`, `setup` | Đặt lại mật khẩu / Đặt mật khẩu |
| `/storefront/vendors` | `VendorListPage` | | `search`, `page` | Vendors |
| `/storefront/vendors/:id` | `VendorDetailPage` | | | Tên vendor |

**Đăng ký route:**

```ts
// app.routes.ts: thêm vào children của AppShellComponent
{ path: 'vendor', loadChildren: () => import('./vendor/vendor.routes').then(r => r.vendorRoutes) }

// vendor/vendor.routes.ts
export const vendorRoutes: Routes = [{
  path: '',
  canActivate: [vendorPortalGuard],
  loadComponent: () => import('./layout/vendor-shell.component').then(c => c.VendorShellComponent),
  providers: [VendorContextService],
  children: [
    { path: '', loadComponent: () => import('./overview/pages/vendor-overview.page').then(p => p.VendorOverviewPage) },
    { path: 'members', loadComponent: () => import('./members/pages/vendor-members.page').then(p => p.VendorMembersPage) }
    // giai đoạn 2+: settings, products, products/new, products/:id, orders, orders/:id, finance/...
  ]
}];
```

Route `/admin/vendors` hiện đang trỏ tới `admin/pages/admin-vendors.page.ts`. Route này được thay bằng 2 route list và detail ở trên, và file cũ bị xóa.

---

## 6. Tầng dữ liệu

### 6.1. Model

```ts
// core/vendors/models/paged-response.ts
export interface PagedResponse<T> { items: T[]; totalCount: number; page: number; pageSize: number; totalPages: number; }

// core/vendors/models/vendor.models.ts
export interface VendorResponse {
  id: number; name: string; email: string; description: string | null; pictureId: number; displayOrder: number;
  // chỉ có giá trị với admin hoặc thành viên của vendor này
  active: boolean | null; addressId: number | null; createdOnUtc: string | null; updatedOnUtc: string | null;
  // chỉ admin
  adminComment: string | null;
}
export interface VendorListQuery { search?: string; active?: boolean; page?: number; pageSize?: number; }
export interface UpdateVendorRequest {
  name: string; email: string; description: string | null; adminComment: string | null; active: boolean; displayOrder: number;
}

// core/vendors/models/vendor-application.models.ts
export type VendorApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface VendorApplicationResponse {
  id: number; shopName: string; email: string; phoneNumber: string;
  description: string | null; taxCode: string | null; businessAddress: string | null;
  status: VendorApplicationStatus; rejectReason: string | null; vendorId: number | null;
  createdOnUtc: string; updatedOnUtc: string; reviewedOnUtc: string | null;
  // chỉ admin
  customerId: number | null; customerEmail: string | null; customerUsername: string | null; reviewedByCustomerId: number | null;
}
export interface VendorApplicationQuery { status?: VendorApplicationStatus; search?: string; page?: number; pageSize?: number; }
export interface SubmitVendorApplicationRequest {
  shopName: string; email: string; phoneNumber: string;
  description: string | null; taxCode: string | null; businessAddress: string | null;
}
export type ChangeVendorApplicationStatusRequest =
  | { status: 'approved'; shopName?: string | null; adminComment?: string | null }
  | { status: 'rejected'; reason: string }
  | { status: 'cancelled' };

// core/vendors/models/vendor-member.models.ts
export type VendorMemberStatus = 'pendingSetup' | 'active';
export interface VendorMemberResponse {
  customerId: number; email: string; firstName: string | null; lastName: string | null;
  status: VendorMemberStatus; isCurrentUser: boolean; createdOnUtc: string; lastLoginDateUtc: string | null;
}
export interface VendorMemberCreatedResponse extends VendorMemberResponse { developmentSetupToken: string | null; }
export interface CreateVendorMemberRequest { email: string; firstName: string | null; lastName: string | null; }
export interface SetupEmailResponse { developmentSetupToken: string | null; }

// core/vendors/models/vendor-note.models.ts
export interface VendorNoteResponse { id: number; vendorId: number; note: string; createdOnUtc: string; }
```

### 6.2. API service

Mọi service dùng `API_BASE_URL` và `HttpClient`. Không service nào tự thêm CSRF hay cookie; interceptor đã làm việc đó. Query param có giá trị `undefined`, `null` hoặc chuỗi rỗng thì không gửi.

| Service | Hàm | HTTP |
|---|---|---|
| `VendorApplicationApiService` | `submit(body)` | `POST /v1/vendor-applications` |
| | `list(query)` | `GET /v1/vendor-applications` |
| | `get(id)` | `GET /v1/vendor-applications/{id}` |
| | `update(id, body)` | `PUT /v1/vendor-applications/{id}` |
| | `changeStatus(id, body)` | `PUT /v1/vendor-applications/{id}/status` |
| `VendorApiService` | `list(query)` | `GET /v1/vendors` |
| | `get(id)` | `GET /v1/vendors/{id}` |
| | `update(id, body)` | `PUT /v1/vendors/{id}` |
| | `delete(id)` | `DELETE /v1/vendors/{id}` |
| `VendorMemberApiService` | `list(vendorId)` | `GET /v1/vendors/{vendorId}/members` |
| | `create(vendorId, body)` | `POST /v1/vendors/{vendorId}/members` |
| | `sendSetupEmail(vendorId, customerId)` | `POST /v1/vendors/{vendorId}/members/{customerId}/setup-email` |
| | `remove(vendorId, customerId)` | `DELETE /v1/vendors/{vendorId}/members/{customerId}` |
| `VendorNoteApiService` | `list(vendorId, page, pageSize)` | `GET /v1/vendors/{vendorId}/notes` |
| | `add(vendorId, note)` | `POST /v1/vendors/{vendorId}/notes` |
| | `delete(vendorId, noteId)` | `DELETE /v1/vendors/{vendorId}/notes/{noteId}` |

Các hàm `adminGetVendors`, `adminCreateVendor`, `adminAssignCustomer`… trong `vendor-api.service.ts` hiện tại bị xóa.

Khi dự án có `npm run api:generate` (theo `frontend-architecture.md`), các service này được viết lại bằng client sinh tự động. Facade và component không phải sửa, vì chỉ phụ thuộc vào chữ ký hàm ở bảng trên.

### 6.3. Mẫu state trong facade

```ts
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error' | 'forbidden' | 'notFound';

// ví dụ khung một facade
@Injectable()
export class XxxFacade {
  private readonly statusState = signal<LoadStatus>('idle');
  private readonly dataState = signal<T | null>(null);
  private readonly errorState = signal<ApiError | null>(null);
  private readonly busyState = signal<string | null>(null);   // tên thao tác đang chạy, ví dụ 'approve'

  readonly status = this.statusState.asReadonly();
  readonly data = this.dataState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly busy = this.busyState.asReadonly();
}
```

- Chuyển `ApiError` thành `LoadStatus`: `403` → `forbidden`, `404` → `notFound`, các lỗi còn lại → `error`.
- Hàm thao tác (lưu, duyệt, gỡ…) trả `Observable` cho trang, để trang tự quyết định đóng dialog hay hiện lỗi tại ô nhập. Facade tự cập nhật lại dữ liệu sau khi thao tác thành công.
- Khi một thao tác đang chạy (`busy ≠ null`), các nút thao tác khác trên cùng bản ghi bị tắt, để tránh bấm hai lần.

### 6.4. Nhãn trạng thái (`core/vendors/vendor-labels.ts`)

`vendor-labels.ts` chỉ trả về **key dịch** và tone, ví dụ `{ key: 'vendorStatus.application.pending', tone: 'warning' }`. Key nằm ở nhóm gốc (i18n-design.md, mục 5.1). Cột "Nhãn" dưới đây là bản tiếng Việt.

| Loại | Giá trị | Nhãn | Tone |
|---|---|---|---|
| Đơn đăng ký | `pending` | Chờ duyệt | `warning` |
| | `approved` | Đã duyệt | `success` |
| | `rejected` | Từ chối | `danger` |
| | `cancelled` | Đã hủy | `neutral` |
| Thành viên | `pendingSetup` | Chờ kích hoạt | `warning` |
| | `active` | Hoạt động | `success` |
| Vendor | `active = true` | Đang hoạt động | `success` |
| | `active = false` | Đã tắt | `neutral` |

### 6.5. Định dạng

Dùng pipe có sẵn của Angular với định dạng cố định, giống nhau ở cả hai ngôn ngữ (i18n-design.md, mục 7):

- Thời gian từ API là UTC, hiển thị theo giờ máy người dùng: `date:'dd/MM/yyyy HH:mm'` → `26/09/2026 08:15`.
- Thời gian chờ của đơn: tính số giờ hoặc số ngày trong facade, hiển thị bằng key `common.time.hoursAgo` / `common.time.daysAgo`.
- Tiền (giai đoạn 2+): `{{ value | number }} ₫` → `1.250.000 ₫`.

---

## 7. Giai đoạn 1: Các màn hình

### 7.1. Đăng ký mở shop: `/customer/become-vendor`

**Mục đích:** US-A1 đến US-A4 trong vendors-prd.

#### Dữ liệu khi mở trang

```text
1. AuthFacade.loadSession()                     → emailVerified, vendorId
2. VendorApplicationApi.list({ pageSize: 1 })   → đơn gần nhất (items[0] hoặc không có)
```

Hai lời gọi chạy song song (`forkJoin`). Nếu `session.vendorId ≠ null` thì không cần gọi bước 2.

#### Chọn giao diện theo trạng thái

Facade tính `view` (computed) theo thứ tự ưu tiên:

| # | Điều kiện | `view` |
|---|---|---|
| 1 | Đang tải | `loading` |
| 2 | Lỗi tải | `error` |
| 3 | `session.vendorId ≠ null` | `alreadyVendor` |
| 4 | Đơn gần nhất `approved` (nhưng session chưa có `vendorId`) | `approved`, đồng thời gọi `refreshSession()` và `permissionStore.refresh()` |
| 5 | `session.emailVerified = false` | `emailUnverified` |
| 6 | Không có đơn, hoặc đơn gần nhất `cancelled` | `form` |
| 7 | Đơn gần nhất `pending` và đang bấm Sửa | `editing` |
| 8 | Đơn gần nhất `pending` | `pending` |
| 9 | Đơn gần nhất `rejected` và đã bấm Nộp lại | `reapply` (form điền sẵn từ đơn cũ) |
| 10 | Đơn gần nhất `rejected` | `rejected` |

#### Bố cục từng trạng thái

```text
┌─ app-page-header ──────────────────────────────────────────────┐
│ CUSTOMER / BÁN HÀNG                                            │
│ Mở shop trên Nomori.                                           │
│ Điền thông tin shop. Admin sẽ xét duyệt và báo kết quả qua     │
│ email.                                                         │
└────────────────────────────────────────────────────────────────┘

view = form | editing | reapply
┌─ app-application-form ──────────────────┐ ┌─ Quy trình ─────────┐
│ Tên shop *          [                 ] │ │ 1. Nộp đơn          │
│ Email liên hệ *     [                 ] │ │ 2. Admin xét duyệt  │
│ Số điện thoại *     [                 ] │ │ 3. Nhận email kết   │
│ Mô tả               [                 ] │ │    quả              │
│                     [                 ] │ │ 4. Vào Kênh người   │
│ Mã số thuế          [                 ] │ │    bán              │
│ Địa chỉ kinh doanh  [                 ] │ └─────────────────────┘
│                                         │
│ (form-error nếu có)                     │
│ [Gửi đơn]   (editing: [Lưu thay đổi] [Hủy sửa])                │
└─────────────────────────────────────────┘

view = pending
┌─ app-application-summary ───────────────────────────────────────┐
│ [Chờ duyệt]  Nộp lúc 26/09/2026 08:15 · đang chờ 2 ngày         │
│ Tên shop        Mai Ceramics                                    │
│ Email liên hệ   shop@maiceramics.vn                             │
│ ... (các field còn lại)                                         │
│ [Sửa đơn]  [Hủy đơn]                                            │
└─────────────────────────────────────────────────────────────────┘

view = rejected
┌─ notice (tone danger) ──────────────────────────────────────────┐
│ Đơn của bạn chưa được duyệt.                                    │
│ Lý do: Mã số thuế không khớp với tên doanh nghiệp.              │
│ [Nộp lại]                                                       │
└─────────────────────────────────────────────────────────────────┘
+ app-application-summary (chỉ xem, không có nút)

view = emailUnverified
┌─ notice (tone warning) ─────────────────────────────────────────┐
│ Xác thực email trước khi đăng ký mở shop.                       │
│ Chúng tôi sẽ gửi link xác thực tới mai@example.com.             │
│ [Gửi lại email xác thực]                                        │
└─────────────────────────────────────────────────────────────────┘

view = approved | alreadyVendor
┌─ notice (tone success) ─────────────────────────────────────────┐
│ Shop của bạn đã sẵn sàng.                                       │
│ [Vào Kênh người bán →]                                          │
└─────────────────────────────────────────────────────────────────┘
```

Trên màn hình rộng hơn 960px, form và khung "Quy trình" nằm 2 cột; hẹp hơn thì xếp thành 1 cột.

#### Component

| Component | Input | Output | Ghi chú |
|---|---|---|---|
| `BecomeVendorPage` | | | Cung cấp `BecomeVendorFacade`, render theo `view` |
| `ApplicationFormComponent` | `initialValue?: SubmitVendorApplicationRequest`, `submitLabel`, `busy`, `serverErrors: Record<string,string[]>`, `formError: string \| null` | `submitted(SubmitVendorApplicationRequest)`, `cancelled()` | Reactive form, không gọi API |
| `ApplicationSummaryComponent` | `application: VendorApplicationResponse`, `showActions: boolean`, `busy` | `edit()`, `cancelApplication()` | |

#### Form và validate

| Ô | Control | Validator phía client | Lỗi hiển thị |
|---|---|---|---|
| Tên shop | `shopName` | `required`, `maxLength(400)`, trim | "Nhập tên shop." / "Tối đa 400 ký tự." |
| Email liên hệ | `email` | `required`, `email`, `maxLength(320)` | "Nhập email." / "Email không hợp lệ." |
| Số điện thoại | `phoneNumber` | `required`, `maxLength(50)`, `pattern(/^[0-9 +\-()]+$/)` | "Nhập số điện thoại." / "Chỉ gồm số, khoảng trắng và + - ( )." |
| Mô tả | `description` | không | |
| Mã số thuế | `taxCode` | `maxLength(50)` | "Tối đa 50 ký tự." |
| Địa chỉ kinh doanh | `businessAddress` | `maxLength(1000)` | "Tối đa 1000 ký tự." |

- Trước khi gửi: trim mọi chuỗi; chuỗi rỗng ở ô không bắt buộc gửi `null`.
- Trùng tên shop chỉ biết khi server trả `400 errors.shopName`; lỗi này hiện dưới ô Tên shop.
- Trong lúc gửi, nút hiện "Đang gửi..." và cả form bị khóa.

#### Thao tác

| Thao tác | API | Thành công | Lỗi |
|---|---|---|---|
| Gửi đơn | `submit` | Chuyển `view = pending`, toast "Đã gửi đơn đăng ký." | `400` → lỗi tại ô; `409` → xem bảng dưới |
| Lưu thay đổi | `update(id)` | `view = pending`, toast "Đã cập nhật đơn." | `409 not_pending` → tải lại trang, toast "Đơn đã được xử lý." |
| Hủy đơn | `ConfirmDialog` (danger: "Hủy đơn đăng ký? Bạn có thể nộp đơn mới sau.") → `changeStatus(id, {status:'cancelled'})` | `view = form`, toast "Đã hủy đơn." | `409 not_pending` → tải lại |
| Gửi lại email xác thực | `AuthFacade.sendEmailVerification(email)` | Toast "Đã gửi email xác thực." | Toast lỗi chung |
| Vào Kênh người bán | Điều hướng `/vendor` | | |

#### Mã lỗi `409` trên trang này

| `code` | Xử lý |
|---|---|
| `vendor_application.email_not_verified` | Chuyển `view = emailUnverified` |
| `vendor_application.already_vendor` | Gọi `refreshSession()`, chuyển `view = alreadyVendor` |
| `vendor_application.already_pending` | Tải lại đơn gần nhất, chuyển `view = pending`, toast "Bạn đã có một đơn đang chờ duyệt." |
| `vendor_application.not_pending` | Tải lại đơn gần nhất |

### 7.2. Admin duyệt đơn: `/admin/vendor-applications`

**Mục đích:** US-B1 đến US-B3.

#### Bố cục

```text
┌─ app-page-header ───────────────────────────────────────────────────────┐
│ ADMIN / VENDOR                                                          │
│ Đơn đăng ký vendor.                                                     │
└─────────────────────────────────────────────────────────────────────────┘
┌─ Bộ lọc ────────────────────────────────────────────────────────────────┐
│ [Chờ duyệt (12)] [Đã duyệt] [Từ chối] [Đã hủy] [Tất cả]   [🔍 Tìm...  ] │
└─────────────────────────────────────────────────────────────────────────┘
┌─ app-application-table (≥1200px: 60%) ────┐ ┌─ app-application-detail-panel ┐
│ Nộp lúc   Tên shop      Người nộp   Chờ   │ │ [Chờ duyệt]  #7               │
│ 24/09     Mai Ceramics  a@x.com     2 ngày│ │ Mai Ceramics                  │
│ 25/09     Gốm Chu Đậu   b@x.com     1 ngày│ │ Người nộp  a@x.com (id 12)    │
│ ...                                       │ │ Email shop shop@...           │
│                                           │ │ SĐT        +84 ...            │
│ app-pagination                            │ │ Mã số thuế 0101234567         │
└───────────────────────────────────────────┘ │ Địa chỉ    ...                │
                                              │ Mô tả      ...                │
                                              │ Nộp lúc    24/09 08:15        │
                                              │ ─────────────────             │
                                              │ [Từ chối]        [Duyệt]      │
                                              └───────────────────────────────┘
```

- Rộng từ 1200px: bảng và khung chi tiết nằm 2 cột.
- Hẹp hơn: khung chi tiết phủ lên bảng, có nút **← Quay lại danh sách**.
- Tab bộ lọc là các link, cập nhật query param `status`. Tab "Tất cả" không gửi `status`. Mặc định (không có `status`) là `pending`.
- Ô tìm kiếm cập nhật query param `search` sau 300 ms kể từ lần gõ cuối.
- Chọn một dòng thì cập nhật query param `id`; khung chi tiết tải `get(id)`. Dòng đang chọn được tô nền.
- Số trên tab "Chờ duyệt" lấy từ `VendorApplicationCountStore`.

#### Cột của bảng

| Cột | Nguồn | Ghi chú |
|---|---|---|
| Nộp lúc | `createdOnUtc` | `dd/MM HH:mm` |
| Tên shop | `shopName` | |
| Người nộp | `customerEmail` | |
| Trạng thái | `status` | `app-status-badge`, chỉ hiện ở tab "Tất cả" |
| Chờ | `createdOnUtc` | Chỉ ở tab Chờ duyệt; tô `warning` nếu hơn 2 ngày |
| Xử lý lúc | `reviewedOnUtc` | Ở tab Đã duyệt và Từ chối |

Mỗi dòng là một `<button>` trong ô đầu tiên, để dùng được bằng bàn phím. Bảng có `aria-label`.

#### Dialog duyệt đơn (`ApproveDialogComponent`)

```text
┌ Duyệt đơn #7 ───────────────────────────────────┐
│ Khi duyệt, hệ thống sẽ tạo shop, thêm a@x.com   │
│ làm thành viên đầu tiên và cấp quyền người bán. │
│                                                 │
│ Tên shop *      [Mai Ceramics              ]    │
│ Ghi chú nội bộ  [                          ]    │
│                                                 │
│               [Hủy]  [Duyệt và tạo shop]        │
└─────────────────────────────────────────────────┘
```

- Tên shop điền sẵn từ đơn; validate `required`, `maxLength(400)`. Chỉ gửi `shopName` nếu admin đã đổi.
- Thành công: đóng dialog; toast "Đã duyệt. Shop #15 đã được tạo." kèm link **Mở shop** tới `/admin/vendors/15`; tải lại danh sách và số đếm; khung chi tiết hiện trạng thái mới.
- `400 errors.shopName`: hiện lỗi dưới ô, giữ dialog mở.
- `409 not_pending`: đóng dialog, toast "Đơn đã được xử lý bởi người khác.", tải lại.
- `409 applicant_already_vendor`: giữ dialog mở, hiện "Người nộp đơn đã thuộc một shop khác. Hãy từ chối đơn này."

#### Dialog từ chối (`RejectDialogComponent`)

```text
┌ Từ chối đơn #7 ─────────────────────────────────┐
│ Lý do sẽ được gửi cho người nộp đơn.            │
│ Lý do *                                         │
│ [                                          ]    │
│ [                                          ]    │
│                                   120 / 2000    │
│                        [Hủy]  [Từ chối đơn]     │
└─────────────────────────────────────────────────┘
```

- `reason`: `required`, trim, `maxLength(2000)`; có bộ đếm ký tự. Nút **Từ chối đơn** chỉ bật khi hợp lệ. Nút dùng tone `danger`.
- Thành công và lỗi được xử lý giống dialog duyệt.

#### Facade: `AdminVendorApplicationsFacade`

| Signal / hàm | Mô tả |
|---|---|
| `query` | Đọc từ query params: `status`, `search`, `page` |
| `list`, `listStatus` | Kết quả `list(query)` |
| `selectedId`, `selected`, `selectedStatus` | Đơn đang chọn |
| `approve(id, {shopName?, adminComment?})` | `changeStatus(id, {status:'approved', ...})`, xong thì tải lại danh sách, đơn đang chọn và số đếm |
| `reject(id, reason)` | Tương tự với `rejected` |

Khi `query` đổi, facade hủy request cũ (`switchMap`).

### 7.3. Admin quản lý vendor

#### 7.3.1. Danh sách: `/admin/vendors`

```text
┌─ app-page-header ───────────────────────────────────────────────┐
│ ADMIN / VENDOR                                                  │
│ Vendors.                                    [Đơn chờ duyệt (12)]│
└─────────────────────────────────────────────────────────────────┘
[🔍 Tìm tên hoặc email ]  Trạng thái: (•) Tất cả ( ) Đang hoạt động ( ) Đã tắt
┌───────────────────────────────────────────────────────────────────┐
│ Tên              Email              Trạng thái      Thứ tự  Tạo lúc│
│ Mai Ceramics     shop@...           [Đang hoạt động] 0     20/09   │
│ ...                                                               │
└───────────────────────────────────────────────────────────────────┘
app-pagination
```

- Không có nút "Tạo vendor" (quyết định D8).
- Nút ở header dẫn tới `/admin/vendor-applications`.
- Bấm vào tên vendor thì mở `/admin/vendors/:id`.
- Query params: `search`, `active` (`true` \| `false` \| không có), `page`.

#### 7.3.2. Chi tiết: `/admin/vendors/:id`

```text
← Vendors
┌─ app-page-header ───────────────────────────────────────────────┐
│ VENDOR #15                                     [Đang hoạt động] │
│ Mai Ceramics.                                                   │
└─────────────────────────────────────────────────────────────────┘
[Thông tin] [Thành viên (3)] [Ghi chú]          ← query param tab

tab = info: app-vendor-edit-form
  Tên *           [Mai Ceramics            ]
  Email *         [shop@maiceramics.vn     ]
  Mô tả           [                        ]
  Ghi chú nội bộ  [                        ]
  Đang hoạt động  [x]
  Thứ tự hiển thị [0   ]
  [Lưu thay đổi]
  ── Vùng nguy hiểm ─────────────────────
  Xóa vendor: 3 thành viên sẽ mất quyền người bán. [Xóa vendor]

tab = members: app-vendor-members-panel
  Thành viên           Trạng thái        Thêm lúc   Đăng nhập cuối
  Mai Nguyễn           [Hoạt động]       20/09      26/09 07:40   [Gỡ]
  mai@example.com
  Lan Trần             [Chờ kích hoạt]   26/09      —             [Gỡ]
  staff@...

tab = notes: app-vendor-notes-panel
  [Thêm ghi chú...                            ] [Thêm]
  26/09 08:00  Đã xác minh qua điện thoại.          [Xóa]
  app-pagination
```

| Thao tác | API | Xác nhận | Thành công | Lỗi đặc thù |
|---|---|---|---|---|
| Lưu thông tin | `VendorApi.update` | Không | Toast "Đã lưu." | `400` → lỗi tại ô |
| Xóa vendor | `VendorApi.delete` | `ConfirmDialog` danger, `requireText` = tên vendor | Toast "Đã xóa vendor.", điều hướng `/admin/vendors` | `404` → toast, điều hướng về danh sách |
| Gỡ thành viên | `VendorMemberApi.remove` | `ConfirmDialog` danger: "Gỡ {email} khỏi shop? Tài khoản sẽ bị đăng xuất và mất quyền người bán." | Toast, tải lại danh sách | `409 last_member` → "Shop phải còn ít nhất một thành viên. Muốn đóng shop, hãy xóa vendor." |
| Thêm ghi chú | `VendorNoteApi.add` | Không | Xóa nội dung ô, tải lại | `400` → lỗi tại ô |
| Xóa ghi chú | `VendorNoteApi.delete` | `ConfirmDialog` | Tải lại | |

- Khi shop chỉ còn 1 thành viên, nút **Gỡ** bị tắt và có dòng giải thích bên cạnh.
- Tab Thành viên không có nút thêm thành viên hay gửi lại email; admin gọi các thao tác đó sẽ nhận `403` (quyết định D8).
- Dữ liệu mỗi tab chỉ tải khi mở tab đó lần đầu, và được giữ lại khi chuyển qua lại giữa các tab.

### 7.4. Bảng mã lỗi nghiệp vụ

Key dịch là `errors.<code>` ở nhóm gốc (i18n-design.md, mục 5.2). Cột "Thông báo" là bản tiếng Việt.

| `code` | Thông báo |
|---|---|
| `vendor_application.email_not_verified` | Vui lòng xác thực email trước khi đăng ký mở shop. |
| `vendor_application.already_vendor` | Tài khoản của bạn đã thuộc một shop. |
| `vendor_application.already_pending` | Bạn đã có một đơn đang chờ duyệt. |
| `vendor_application.not_pending` | Đơn này đã được xử lý. |
| `vendor_application.applicant_already_vendor` | Người nộp đơn đã thuộc một shop khác. |
| `vendor_member.email_already_exists` | Email đã được sử dụng. |
| `vendor_member.limit_reached` | Shop đã đủ 20 thành viên. |
| `vendor_member.already_active` | Thành viên này đã kích hoạt tài khoản. |
| `vendor_member.last_member` | Shop phải còn ít nhất một thành viên. |

`apiErrorKey(error)` trả về `errors.<code>` nếu có mã nghiệp vụ, nếu không thì trả key lỗi chung theo mã HTTP ở mục 2.1.

### 7.5. Vendor portal: khung chung (`VendorShellComponent`)

```text
┌─ Thanh trên của app shell (giữ nguyên) ────────────────────────────────┐
└────────────────────────────────────────────────────────────────────────┘
┌─ Sidebar (≥960px) ─┐ ┌─ Nội dung ──────────────────────────────────────┐
│ KÊNH NGƯỜI BÁN     │ │ (banner nếu vendor đã tắt:                      │
│ Mai Ceramics       │ │  "Shop đang bị tắt. Liên hệ admin để biết thêm.")│
│ [Đang hoạt động]   │ │                                                 │
│                    │ │ <router-outlet>                                 │
│ ▸ Tổng quan        │ │                                                 │
│ ▸ Thành viên       │ │                                                 │
│ (giai đoạn 2+)     │ │                                                 │
│ ▸ Cài đặt shop     │ │                                                 │
│ ▸ Sản phẩm         │ │                                                 │
│ ▸ Đơn hàng         │ │                                                 │
│ ▸ Tài chính        │ │                                                 │
│                    │ │                                                 │
│ Xem shop trên      │ │                                                 │
│ storefront ↗       │ │                                                 │
└────────────────────┘ └─────────────────────────────────────────────────┘
```

- Hẹp hơn 960px: sidebar thành thanh tab cuộn ngang ở đầu nội dung.
- Mục của giai đoạn 2+ chỉ thêm vào sidebar khi màn hình tương ứng đã làm xong. Không hiện mục "sắp có".
- Link "Xem shop trên storefront" mở `/storefront/vendors/:id`. Link bị ẩn khi vendor đang tắt, vì khi đó storefront trả "Không tìm thấy".

**`VendorContextService`** (cung cấp ở route `/vendor`):

| Signal / hàm | Mô tả |
|---|---|
| `vendorId` | Từ `AuthFacade.vendorId()` |
| `vendor`, `status` | Từ `VendorApi.get(vendorId)`; tải một lần khi vào portal |
| `isActive` | `vendor()?.active === true` |
| `reload()` | Tải lại (dùng sau khi sửa thông tin shop ở giai đoạn 2) |

Nếu `VendorApi.get` trả `404` (shop vừa bị xóa), service gọi `refreshSession()` và `permissionStore.refresh()`, rồi điều hướng về `/storefront` kèm toast "Shop không còn tồn tại."

### 7.6. Tổng quan: `/vendor`

```text
┌─ app-page-header ───────────────────────────────────────────────┐
│ KÊNH NGƯỜI BÁN                                                  │
│ Chào mừng tới Mai Ceramics.                                     │
└─────────────────────────────────────────────────────────────────┘
┌─ Thông tin shop ─────────────────┐ ┌─ Thành viên ─────────────────┐
│ Tên       Mai Ceramics           │ │ 3 / 20 thành viên            │
│ Email     shop@maiceramics.vn    │ │ 1 đang chờ kích hoạt         │
│ Mô tả     Gốm thủ công ...       │ │ [Quản lý thành viên →]       │
│ Tham gia  20/09/2026             │ └──────────────────────────────┘
│ Trạng thái [Đang hoạt động]      │
│ Muốn đổi thông tin shop, hãy liên│
│ hệ admin.  (giai đoạn 2: nút Sửa)│
└──────────────────────────────────┘
```

Dữ liệu: `VendorContextService.vendor()` và `VendorMemberApi.list(vendorId)` (chỉ để đếm).

### 7.7. Thành viên: `/vendor/members`

```text
┌─ app-page-header ───────────────────────────────────────────────┐
│ KÊNH NGƯỜI BÁN / THÀNH VIÊN                                     │
│ Thành viên shop.                              [+ Thêm tài khoản]│
│ Mọi thành viên có quyền như nhau. 3 / 20 thành viên.            │
└─────────────────────────────────────────────────────────────────┘
┌─ app-member-table ──────────────────────────────────────────────────────┐
│ Thành viên              Trạng thái       Thêm lúc  Đăng nhập cuối       │
│ Mai Nguyễn  (Bạn)       [Hoạt động]      20/09     26/09 07:40  [Rời shop]│
│ mai@example.com                                                         │
│ Lan Trần                [Chờ kích hoạt]  26/09     —   [Gửi lại email][Gỡ]│
│ staff@maiceramics.vn                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

Trên màn hình hẹp hơn 720px, mỗi thành viên hiện dạng thẻ; nút thao tác xếp ở cuối thẻ.

**Quy tắc bật và tắt nút**

| Nút | Hiện khi | Tắt khi |
|---|---|---|
| + Thêm tài khoản | Luôn hiện | Đã có 20 thành viên (có dòng giải thích "Shop đã đủ 20 thành viên.") |
| Gửi lại email | `status = pendingSetup` | Đang gửi |
| Gỡ | Dòng không phải của mình | Chỉ còn 1 thành viên |
| Rời shop | Dòng của mình (`isCurrentUser`) | Chỉ còn 1 thành viên (có dòng giải thích "Bạn là thành viên cuối cùng.") |

**Dialog thêm tài khoản (`AddMemberDialogComponent`)**

```text
┌ Thêm tài khoản cho shop ────────────────────────┐
│ Người được thêm sẽ nhận email để tự đặt mật     │
│ khẩu. Link có hạn 72 giờ.                       │
│ Email *     [                            ]      │
│ Tên         [              ]                    │
│ Họ          [              ]                    │
│                      [Hủy]  [Tạo tài khoản]     │
└─────────────────────────────────────────────────┘

Sau khi tạo thành công (dialog chuyển sang bước 2):
┌ Đã tạo tài khoản ───────────────────────────────┐
│ ✓ Đã gửi email đặt mật khẩu tới                 │
│   staff@maiceramics.vn.                         │
│                                                 │
│ (chỉ hiện khi developmentSetupToken ≠ null)     │
│ ┌ DEV ONLY ──────────────────────────────────┐  │
│ │ /auth/reset-password?token=…&setup=1  [Copy]│  │
│ └────────────────────────────────────────────┘  │
│                                  [Xong]         │
└─────────────────────────────────────────────────┘
```

- Validate: `email` bắt buộc, đúng định dạng, tối đa 320 ký tự; `firstName` và `lastName` tối đa 100 ký tự.
- `409 email_already_exists`: hiện lỗi dưới ô Email: "Email đã được sử dụng. Người này cần dùng email khác."
- `409 limit_reached`: đóng dialog, tải lại danh sách, toast lỗi.
- Khối DEV ONLY dùng lại cho kết quả của **Gửi lại email**, hiện trong toast có nút Copy.

**Thao tác**

| Thao tác | API | Xác nhận | Thành công | Lỗi đặc thù |
|---|---|---|---|---|
| Tạo tài khoản | `create(vendorId, body)` | Không | Bước 2 của dialog; tải lại danh sách | Xem ở trên |
| Gửi lại email | `sendSetupEmail` | Không | Toast "Đã gửi lại email tới {email}." | `409 already_active` → tải lại danh sách, toast; `404` → tải lại danh sách |
| Gỡ thành viên | `remove` | Danger: "Gỡ {email} khỏi shop? Tài khoản sẽ bị đăng xuất và mất quyền người bán." | Toast, tải lại | `409 last_member`; `404` → tải lại |
| Rời shop | `remove(vendorId, myId)` | Danger, `requireText` = tên shop: "Bạn sẽ mất quyền truy cập Kênh người bán của {shop}." | `refreshSession()` → `permissionStore.refresh()` → điều hướng `/storefront`, toast "Bạn đã rời shop." | `409 last_member` |

Khi tự rời shop, backend đặt `RequireReLogin`, nên request tiếp theo có thể trả `401`. Luồng rời shop xử lý như sau: nếu `refreshSession()` trả phiên chưa đăng nhập thì chuyển tới `/auth/login` kèm thông báo "Bạn đã rời shop. Vui lòng đăng nhập lại."

### 7.8. Kích hoạt tài khoản thành viên: `/auth/reset-password?setup=1`

Dùng lại `ResetPasswordPage`, thêm chế độ setup khi query có `setup=1`.

| Phần | Chế độ thường | Chế độ setup |
|---|---|---|
| Eyebrow | AUTH / RECOVERY | KÊNH NGƯỜI BÁN / KÍCH HOẠT |
| Tiêu đề | Đặt lại mật khẩu. | Đặt mật khẩu cho tài khoản shop. |
| Mô tả | (giữ nguyên) | Bạn đã được thêm vào một shop trên Nomori. Đặt mật khẩu để bắt đầu. |
| Nút | Reset password | Kích hoạt tài khoản |
| Thành công | (giữ nguyên) | "Tài khoản đã được kích hoạt và email đã được xác thực." + nút **Đăng nhập** → `/auth/login?returnUrl=/vendor` |
| Token sai hoặc hết hạn | (giữ nguyên) | "Link đã hết hạn hoặc đã được dùng. Hãy nhờ một thành viên của shop gửi lại email." |

Chính sách mật khẩu và cách hiện lỗi giữ nguyên như chế độ thường.

### 7.9. Storefront vendor

- `VendorListPage` và `VendorDetailPage` chuyển sang `VendorApiService.list/get` mới và model `VendorResponse`.
- Chỉ dùng các field công khai: `id`, `name`, `description`, `pictureId`, `displayOrder`. Không hiển thị `email` (PRD Cài đặt shop, Q2), dù API vẫn trả field này.
- `get` trả `404` thì trang chi tiết hiện trạng thái `notFound`: "Không tìm thấy shop này." kèm link về danh sách.
- Danh sách lưu `search` và `page` trong query params.

---

## 8. Khả năng truy cập và responsive

| Chủ đề | Yêu cầu |
|---|---|
| Bàn phím | Mọi thao tác dùng được bằng bàn phím. Dòng trong bảng mở bằng Enter. Dialog đóng bằng Esc và trả focus về nút đã mở nó |
| Nhãn | Mọi ô nhập có `<label for>`. Ô bắt buộc có dấu \* và `aria-required="true"`. Lỗi được nối với ô bằng `aria-describedby` |
| Thông báo | Toast và kết quả thao tác dùng `role="status"`; lỗi dùng `role="alert"` |
| Trạng thái | Nhãn trạng thái luôn có chữ, không chỉ dựa vào màu. Độ tương phản chữ và nền tối thiểu 4.5:1 |
| Tiêu đề | Mỗi trang có đúng một `<h1>`; `title` của route được cập nhật |
| Breakpoint | 720px: bảng chuyển thành thẻ. 960px: sidebar portal chuyển thành tab ngang; form 2 cột thành 1 cột. 1200px: trang duyệt đơn hiện 2 cột |
| Hiệu ứng | Tôn trọng `prefers-reduced-motion`: tắt animation `rise-in` đang dùng ở các trang admin |

---

## 9. Test

### 9.1. Unit test (Karma + Jasmine, theo cấu hình hiện có)

| Đối tượng | Nội dung kiểm tra |
|---|---|
| `errorInterceptor` | `409` có `detail` → `code = detail`; `400` → `fieldErrors`; lỗi mạng → `status = 0` |
| `PermissionStore` | Chỉ gọi API một lần khi `load()` nhiều lần; `refresh()` gọi lại; `clear()` khi đăng xuất; SSR trả tập rỗng |
| `vendorPortalGuard` | 4 trường hợp ở mục 2.4 |
| 4 API service | Đúng method, URL, body; bỏ query param rỗng (`HttpTestingController`) |
| `BecomeVendorFacade` | Bảng chọn `view` ở mục 7.1, viết dạng table-driven; xử lý từng mã `409` |
| `AdminVendorApplicationsFacade` | Đổi query thì hủy request cũ; duyệt hoặc từ chối xong thì tải lại danh sách và số đếm |
| `VendorMembersFacade` | Quy tắc bật và tắt nút; luồng rời shop gọi `refreshSession` rồi `permissionStore.refresh` rồi điều hướng |
| `ConfirmDialogComponent` | `requireText`; không đóng được khi `busy`; focus mặc định |
| `StatusBadgeComponent` | Nhãn và tone theo bảng mục 6.4 |
| `ResetPasswordPage` | Chế độ `setup=1` đổi nội dung và link sau khi thành công |
| Mọi component của cụm vendor | Test dùng `TranslocoTestingModule` với cả `en` và `vi`; không có cảnh báo "Missing translation" trên console (i18n-design.md, mục 10) |

### 9.2. Kịch bản kiểm thử thủ công

Chạy theo mục "Manual test guide" trong [vendors.vi.md](../../nomori-marketplace-backend/docs/modules/vendors.vi.md), bổ sung các kiểm tra giao diện:

1. Menu hiện đúng link theo từng loại tài khoản: khách chưa đăng nhập, khách hàng, thành viên shop, admin.
2. Tải lại trang (F5) ở `/admin/vendor-applications?status=rejected&id=7` vẫn giữ tab và đơn đang chọn.
3. Hai admin cùng duyệt một đơn: người thứ hai thấy toast "Đơn đã được xử lý bởi người khác."
4. Duyệt đơn xong, người nộp mở `/customer/become-vendor` mà không đăng nhập lại: thấy link Kênh người bán, và menu hiện "Kênh người bán".
5. Ở màn hình rộng 375px, mọi trang dùng được, không có thanh cuộn ngang.
6. Chỉ dùng bàn phím: duyệt một đơn, thêm một thành viên, gỡ một thành viên.
7. Đổi ngôn ngữ khi đang mở dialog duyệt đơn và khi đang nhập form đăng ký mở shop: chữ đổi theo, dữ liệu đang nhập vẫn còn.

---

## 10. Giai đoạn 2+: Thiết kế cấp màn hình

Model, service và mã lỗi của các module này được bổ sung khi API tương ứng đã thiết kế xong. Các quyết định còn chờ trong PRD có thể làm thay đổi phần dưới đây.

### 10.1. Cài đặt shop: `/vendor/settings`

Tham chiếu: vendor-shop-settings-prd.md.

```text
┌─ app-page-header: Cài đặt shop ───────────────────────── [Lưu] ┐
┌─ Nhận diện ─────────────────────────────────────────────────────┐
│ [Ảnh bìa 4:1 ──────────────────────────────────── ] [Đổi] [Xóa] │
│ [Logo ◻]  [Đổi] [Xóa]                                           │
└─────────────────────────────────────────────────────────────────┘
┌─ Thông tin ─────────────────────────────────────────────────────┐
│ Tên shop *, Email liên hệ *, Số điện thoại *, Mô tả,            │
│ Địa chỉ kinh doanh, Mã số thuế                                  │
│ (Tên shop: "Đổi được 1 lần mỗi 30 ngày" nếu Q1 được chốt)       │
└─────────────────────────────────────────────────────────────────┘
┌─ Tạm nghỉ ──────────────────────────────────────────────────────┐
│ [ ] Tạm nghỉ bán hàng   Lời nhắn cho khách [          ] 0/200   │
└─────────────────────────────────────────────────────────────────┘
```

- Component: `ShopSettingsFormComponent`, `ImageUploadComponent` (dùng chung với sản phẩm), `VacationToggleComponent`.
- Khi shop bị admin khóa: toàn bộ form chỉ xem, và banner khóa ở `VendorShellComponent` hiện lý do.
- Rời trang khi còn thay đổi chưa lưu: hỏi xác nhận (guard `canDeactivate`).
- Lưu xong: gọi `VendorContextService.reload()` để sidebar cập nhật tên shop.
- Admin: thêm nút **Khóa shop** (dialog nhập lý do bắt buộc) và **Mở khóa** ở tab Thông tin của `/admin/vendors/:id`.

### 10.2. Sản phẩm: `/vendor/products`, `/vendor/products/new`, `/vendor/products/:id`

Tham chiếu: vendor-products-prd.md.

```text
Danh sách
┌─ app-page-header: Sản phẩm ─────────────────── [+ Thêm sản phẩm] ┐
[Tất cả][Nháp][Đang bán][Ngừng bán][Bị admin ẩn][Hết hàng]  [🔍 Tên, SKU]  Sắp xếp ▾
┌──────────────────────────────────────────────────────────────────┐
│ [ảnh] Tên sản phẩm         Giá         Tồn kho   Trạng thái   ⋯  │
│ [ảnh] Bình gốm men lam     450.000 ₫   3 ⚠      [Đang bán]    ⋯  │
└──────────────────────────────────────────────────────────────────┘

Trình sửa sản phẩm (tab)
[Thông tin] [Ảnh] [Biến thể] [Thông số & tag]
Thanh dưới cố định: Trạng thái [Nháp] · [Lưu nháp] [Đăng bán]
```

- Component: `ProductTableComponent`, `ProductEditorPage` (4 tab: `ProductInfoFormComponent`, `ProductImagesComponent` kéo thả để sắp xếp, `ProductVariantsComponent` tạo tổ hợp, `ProductSpecsTagsComponent`), `CategoryPickerComponent` (cây danh mục, chọn nhiều), `PublishChecklistComponent`.
- Nút **Đăng bán** bị tắt kèm checklist còn thiếu: tên, giá, danh mục, ảnh (FR-05).
- Sản phẩm bị admin ẩn: banner hiện lý do; nút **Yêu cầu xem lại**; nút Đăng bán bị ẩn.
- Tồn kho ≤ 5 hiện biểu tượng cảnh báo.
- Admin: `/admin/catalog` thêm bộ lọc theo shop, nút **Ẩn** (dialog nhập lý do) và danh sách "Chờ xem lại".
- Storefront: trang chi tiết sản phẩm hiện tên shop kèm link; trang shop có danh sách sản phẩm với bộ lọc danh mục.

### 10.3. Đơn hàng: `/vendor/orders`, `/vendor/orders/:id`

Tham chiếu: vendor-orders-prd.md.

```text
Danh sách
[Chờ xác nhận (5)][Chờ giao (2)][Đang giao][Đã giao][Hoàn tất][Đã hủy]
[🔍 Mã đơn, tên, SĐT]  Từ [__/__] đến [__/__]
┌───────────────────────────────────────────────────────────────────────┐
│ [ ] Mã đơn con       Đặt lúc     SP  Tổng        TT     Hạn xử lý      │
│ [ ] NM260926-0001-2  26/09 08:15  3  1.030.000 ₫  COD   còn 20 giờ ⚠   │
└───────────────────────────────────────────────────────────────────────┘
Khi chọn nhiều đơn: [Xác nhận các đơn đã chọn]

Chi tiết
┌ Dòng hàng ──────────────────────┐ ┌ Người nhận ──────────────┐
│ [ảnh] Bình gốm (Lam, M) x2 ...  │ │ Tên, SĐT, địa chỉ, ghi chú│
│ Tiền hàng / Phí ship / Tổng     │ ├ Thanh toán ──────────────┤
└─────────────────────────────────┘ │ COD · Chưa thanh toán     │
┌ Lịch sử trạng thái ─────────────┐ ├ Giao hàng ───────────────┤
│ 26/09 08:15 Đặt hàng (Khách)    │ │ Đơn vị, mã vận đơn        │
└─────────────────────────────────┘ └──────────────────────────┘
Thanh thao tác theo trạng thái: [Xác nhận] [Hủy đơn] / [Nhập vận đơn] / [Đã giao thành công]
```

- Component: `OrderTableComponent`, `OrderStatusTabsComponent`, `OrderDetailPage`, `ShipmentDialogComponent`, `CancelOrderDialogComponent` (chọn lý do bắt buộc), `OrderTimelineComponent`.
- Nút thao tác chỉ hiện đúng với vòng đời ở mục 5 của PRD.
- Hạn xử lý hiện đếm ngược; còn dưới 6 giờ thì tô `warning`.
- Khách hàng: `/customer/orders` và `/customer/orders/:id` hiện đơn hàng, bên trong là các đơn con theo shop.
- Admin: `/admin/orders`.

### 10.4. Tài chính: `/vendor/finance`, `/ledger`, `/payouts`, `/bank-account`

Tham chiếu: vendor-settlement-prd.md.

```text
Tổng quan
┌ Số dư chờ ───────┐ ┌ Số dư khả dụng ──┐ ┌ Đã chi trả ──────┐ ┌ Chi trả tiếp theo ┐
│ 2.350.000 ₫      │ │ 950.000 ₫        │ │ 12.400.000 ₫     │ │ Thứ Hai 05/10     │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └───────────────────┘
Tỷ lệ hoa hồng hiện hành: 8%
(cảnh báo nếu chưa có tài khoản nhận tiền: "Chưa có tài khoản nhận tiền. [Khai báo]")
Biểu đồ doanh thu và hoa hồng theo tháng

Bút toán: bảng Ngày · Loại · Mã đơn con · Giá trị hàng · Hoa hồng · Số tiền · Kỳ; lọc theo loại, khoảng ngày
Kỳ chi trả: bảng Kỳ · Doanh thu · Hoa hồng · Điều chỉnh · Chi trả · Trạng thái · Mã GD · [CSV]
Tài khoản nhận tiền: form Ngân hàng *, Số TK *, Chủ TK *, Chi nhánh; dialog nhập lại mật khẩu khi lưu;
  sau khi đổi: "Tài khoản mới có hiệu lực từ 27/09 10:00 (sau 48 giờ)"
```

- Component: `FinanceSummaryCardsComponent`, `LedgerTableComponent`, `PayoutTableComponent`, `BankAccountFormComponent`, `PasswordConfirmDialogComponent`.
- Số tài khoản chỉ hiện 4 số cuối.
- Số tiền âm hiện dấu trừ và tone `danger`.
- Thư viện biểu đồ được chọn khi làm module này.
- Admin: `/admin/finance/commission`, `/admin/finance/balances`, `/admin/finance/payouts`.

---

## 11. Thứ tự làm (giai đoạn 1)

| Bước | Nội dung | Hoàn thành khi |
|---|---|---|
| 0 | Nền tảng đa ngôn ngữ: bước 1 trong [i18n-design.md](i18n-design.md), mục 11 | Đổi được ngôn ngữ ở menu; SSR render đúng ngôn ngữ theo cookie |
| 1 | Nền tảng: `ApiError` và interceptor, `vendorId` trong session, `PermissionStore`, `vendorPortalGuard`, menu theo quyền, chuyển style form sang `_forms.scss` | Unit test mục 9.1 cho các phần này pass; các trang auth và customer vẫn chạy như cũ |
| 2 | Component dùng chung và `NoticeService` | Unit test pass; dùng thử được ở một trang |
| 3 | Model và 4 API service; chuyển storefront vendor sang service mới | Storefront vendor hoạt động với API mới |
| 4 | Trang đăng ký mở shop | Đủ 10 trạng thái ở mục 7.1 |
| 5 | Trang duyệt đơn của admin | Duyệt, từ chối, lọc, tìm, phân trang, giữ state khi F5 |
| 6 | Danh sách và chi tiết vendor của admin; xóa trang `admin-vendors.page.ts` cũ | Đủ 3 tab và thao tác ở mục 7.3 |
| 7 | Vendor portal: khung chung, tổng quan, thành viên | Đủ thao tác và quy tắc nút ở mục 7.7 |
| 8 | Chế độ setup của trang đặt mật khẩu | Luồng thêm thành viên chạy trọn vẹn |
| 9 | Kiểm thử thủ công mục 9.2 | Mọi kịch bản đạt |

Bước 1–3 phụ thuộc backend có `vendorId` trong session và các route `/vendors` đã gộp. Nếu backend chưa xong, có thể dùng dữ liệu giả bằng `HttpInterceptor` chỉ bật ở môi trường development.

---

## 12. Quyết định

| # | Quyết định | Cách làm |
|---|---|---|
| D1 | Giao diện hỗ trợ tiếng Việt và tiếng Anh | Theo [i18n-design.md](i18n-design.md). Cụm vendor viết bằng key dịch ngay từ đầu; các trang cũ chuyển dần theo mục 11 của tài liệu đó |
| D2 | Chưa dùng client sinh từ OpenAPI | Viết tay 4 service mỏng theo mục 6.2. Khi có `npm run api:generate`, chỉ viết lại phần bên trong các service; facade và component giữ nguyên |
| D3 | Trang cần đăng nhập không render ở server | Trên server, guard luôn thấy phiên chưa đăng nhập nên sẽ chuyển hướng sai về trang đăng nhập. Trong `server.ts`, request tới `/vendor/**`, `/admin/**`, `/customer/**` và `/auth/account` được trả thẳng file `index.csr.html` trong thư mục `browser` (bản build SSR của Angular 18 có sẵn file này), không đi qua `CommonEngine`. Các trang công khai (storefront, đăng nhập, đăng ký) vẫn render ở server |
| D4 | Chi tiết đơn trong trang admin hiện ở khung bên cạnh danh sách | Đơn đang chọn lưu trong query param `id` (mục 7.2), để duyệt nhiều đơn liên tục mà không rời danh sách |
