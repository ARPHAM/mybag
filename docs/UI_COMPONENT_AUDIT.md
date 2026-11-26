# BÁO CÁO TỔNG HỢP & QUY HOẠCH HỆ THỐNG COMPONENT (UI AUDIT)

Tài liệu lưu trữ các nhận xét, phân cấp component từ lớn đến nhỏ, danh sách các thành phần trùng lặp (tính 1 lần) và các điểm lệch bố cục cần chuẩn hóa theo yêu cầu của dự án **SAO Life System**.

---

## I. KIẾN TRÚC PHÂN CẤP COMPONENT (TỪ LỚN ĐẾN NHỎ)

```
TẦNG 1: App Shell & Global Layout (Khung tổng & Điều hướng toàn cục)
   └── TẦNG 2: Page Controllers (Bộ điều khiển từng trang)
         └── TẦNG 3: Sections & Major Tab Views (Khối giao diện / Tab chức năng)
               └── TẦNG 4: Cards & Feature Modals (Thẻ hiển thị dữ liệu & Hộp thoại nghiệp vụ)
                     └── TẦNG 5: Primitives & Atoms (Các thành phần nguyên tử dùng chung)
```

---

## II. BẢNG TỔNG HỢP COMPONENT THEO TỪNG TRANG

### 1. Khung Giao Diện Toàn Cục (`app/(main)/layout.tsx`)
* **Tầng 1 (Shell):**
  * `DashboardLayout`: Khung bọc `sidebar + main content + mobile bottom nav`.
  * `SidebarMenu`: Cột điều hướng bên trái trên Desktop (8 menu items).
  * `MobileBottomNav`: Thanh Dock điều hướng 4 mục chính + nút "Thêm" trên Mobile.
  * `SaoHeaderStatus`: Thanh trạng thái hiển thị Avatar, Level, HP/EXP bar, Đồng hồ, Thông báo.
  * `SaoHeaderBridge`: Cầu nối dữ liệu quang học holographic (HUD Data Bridge) nối cụm Player Status và System Clock.
  * `YuiAssistant`: Trợ lý AI toàn cục (Nút nổi + Chat dialog + Inline Plan Editor).
  * `SaoAlert`: Toast notification toàn cục.

### 2. Trang Tài Chính - Finance (`app/(main)/finance/page.tsx`)
* **Tầng 2 (Page):** `FinancePage`
* **Tầng 3 (Tabs/Views):**
  * `SaoTabs`: Chuyển đổi 5 tab (`overview`, `wallets`, `budgets`, `debts`, `history`).
  * `OverviewTab`: Tổng quan tài sản ròng + biểu đồ thu chi.
  * `WalletsTab`: Quản lý danh sách ví tiền.
  * `BudgetsTab`: Quản lý các hạn mức ngân sách tháng.
  * `DebtsTab`: Theo dõi sổ ghi nợ / cho mượn.
  * `HistoryTab`: Bộ lọc và lịch sử giao dịch.
* **Tầng 4 (Cards & Modals):**
  * `NetWorthCard`, `FinanceCharts` (Recharts Area + Bar).
  * `WalletCard`, `BudgetCard`, `DebtCard`, `TransactionRowItem`.
  * `SmartExpenseModal`: Nhập chi tiêu AI (quét ảnh bill, giọng nói, text tự nhiên).
  * `CategoryDrilldownModal`: Xem chi tiết thu chi khi click vào danh mục.
  * `WalletModal`, `TransactionModal`, `BudgetModal`, `DebtModal`, `DebtActionModal`.
  * `SaoConfirmModal` *(Đang tự viết riêng bằng SaoModal)*.
  * `SaoFab` *(Đang tự viết riêng `.financeFab`)*.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoLoading`.

### 3. Trang Thực Đơn & Kho Bếp - Menu (`app/(main)/menu/page.tsx`)
* **Tầng 2 (Page):** `MenuPage`
* **Tầng 3 (Tabs/Views):**
  * `SaoTabs`: Chuyển 3 tab (`history`, `recipes`, `pantry`).
  * `MealHistoryTab`: Lịch sử bữa ăn theo ngày (Đã module hóa).
  * `RecipesTab`: Lưới danh sách công thức nấu ăn (Đã module hóa).
  * `InventoryTab`: Kho thực phẩm / gia vị / đồ dùng kèm thanh tìm kiếm `SaoSearchInput` và bộ lọc danh mục `SaoSelect` (Đã chuẩn hóa Cyber HUD).
* **Tầng 4 (Cards & Modals):**
  * `MealCard`: Thẻ bữa ăn chuẩn SAO Cyber HUD (nền kính trong suốt Hologram, vát góc polygon, trục quang học cyan/amber).
  * `RecipeCard`: Thẻ công thức chuẩn SAO Cyber HUD (nền kính trong suốt Hologram, vát góc polygon, banner holographic).
  * `InventoryCard`: Thẻ nguyên liệu kho chuẩn SAO Cyber HUD (nền kính trong suốt Hologram, vát góc polygon, trục quang học theo tình trạng tồn kho, stepper +/- và 3 nấc trạng thái gia vị).
  * `MealModal`: Thêm/sửa bữa ăn chuẩn SAO Cyber HUD (`app/components/menu/MealModal.tsx`) - Bọc trong kính trong suốt, thẻ nguyên liệu trừ kho dạng Hologram với dải laser trạng thái, các nút toggle tự nấu/ăn ngoài phát quang, khung ảnh HUD scanner có nút gỡ thông minh, banner chi phí holographic. Hoàn toàn chống bóp nghẹt input trên mobile.
  * `RecipeModal`: Thêm/sửa công thức nấu ăn chuẩn SAO Cyber HUD (`app/components/menu/RecipeModal.tsx`).
  * `InventoryModal`: Thêm/sửa vật phẩm nhập kho chuẩn SAO Cyber HUD (`app/components/menu/InventoryModal.tsx`) - Tích hợp `CyberCheckbox`, bộ chọn nấc gia vị/số lượng mượt mà, phân chia 2 cột responsive.
  * `BillScanReviewModal`: Modal duyệt hóa đơn OCR chuẩn SAO Cyber HUD (`app/components/menu/BillScanReviewModal.tsx`) - Thẻ vật phẩm bóc tách với `CyberCheckbox`, tag danh mục công nghệ và giá tiền font Tauri.
  * `CyberCheckbox`: Checkbox chuẩn SAO Cyber HUD vát góc, hiệu ứng phát sáng neon khi kích hoạt (`app/components/menu/CyberCheckbox.tsx`).
  * `SaoConfirmModal`: ĐÃ TÍCH HỢP thay thế 2 modal xóa riêng.
  * `SaoFab`: ĐÃ TÍCH HỢP thay thế `.menuFab` (Desktop góc phải, Mobile góc trái né Yui).
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoImageUpload`, `SaoLoading`, `SaoConfirmModal`, `SaoFab`.

### 4. Trang Lịch Trình - Calendar (`app/(main)/calendar/page.tsx`)
* **Tầng 2 (Page):** `CalendarPage`
* **Tầng 3 (Views & Panels):**
  * `DateSelector`: Thanh điều hướng ngày/tháng công nghệ cao, nút Hôm nay, nút Lịch Picker.
  * Master `SaoPanel` (`LỊCH TRÌNH`): Khung HUD tổng hợp bao trọn giao diện lịch và Quest Log tương tự cấu trúc `FinanceCharts` của `/finance`:
    * `headerActions`: Tích hợp `<SaoSelect>` chuyển chế độ xem `[Ngày | Tuần | Tháng]`.
    * Cột trái (~67% desktop): `SAOTimeline` Hologram HUD với tia laser thời gian thực, thẻ sự kiện kính mờ chuyển sắc neon, lưới giờ 24h.
    * Cột phải (~33% desktop): `questLogCard` chứa Quest Log với 2 tab `Sự kiện (X)` / `Nhiệm vụ (Y)`.
    * Trên Mobile: Bố cục dọc cân đối (Timeline 380px + Quest Log 240-340px) cuộn mượt mà.
  * `SAOWeekView`: Chế độ xem theo tuần (7 cột desktop / agenda mobile).
  * `SAOMonthView`: Chế độ xem theo tháng (dạng ô ma trận 35-42 ngày).
* **Tầng 4 (Cards & Modals):**
  * `CalendarEventCard`: Card hiển thị sự kiện kính mờ SAO Cyber với ngàm vát góc, badge lặp lại và thời gian.
  * `CalendarQuestCard`: Card nhiệm vụ với badge Rank phát sáng, EXP thưởng, trạng thái checkbox.
  * `EventModal`: `SaoModal` tạo/sửa sự kiện, tích hợp `SaoInput`, `SaoDatePicker`, `SaoSelect`, `<SaoButton>`.
  * `SaoConfirmModal`: Modal xác nhận xóa hoặc hủy lặp an toàn.
  * `SaoFab`: Nút tròn nổi tạo sự kiện dùng chung (Desktop góc phải, Mobile góc trái né Yui).
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoLoading`, `SaoConfirmModal`, `SaoFab`.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoPanel`, `SaoLoading`.

### 5. Trang Nhiệm Vụ - Tasks (`app/(main)/tasks/page.tsx`)
* **Tầng 2 (Page):** `TasksPage`
* **Tầng 3 (Views & Toolbar):**
  * `TaskToolbar`: Bộ lọc trạng thái dropdown gọn gàng bằng `<SaoSelect>`, thanh tìm kiếm nhiệm vụ `<SaoSearchInput>`, nút thêm nhiệm vụ dạng FAB nổi góc trái đáy trang trên Mobile (`.tasksFab`).
  * `TaskList`: Danh sách nhiệm vụ MMORPG SAO Cyber HUD lưới 2 cột desktop, 1 cột mobile.
* **Tầng 4 (Cards & Modals):**
  * `SaoSummaryCard` & `MobileTasksSummaryStrip`: Bộ 3 thẻ chỉ số (Đang làm, Đã xong, Quá hạn / Tỉ lệ tiến độ) trên Desktop và khung tổng hợp 3-trong-1 siêu mỏng (~68px) trên Mobile.
  * `SaoTaskCard` (`app/components/tasks/SaoTaskCard.tsx`): Component thẻ nhiệm vụ độc lập chuẩn SAO (tương đồng kiến trúc với `SaoWalletCard`), tích hợp trục năng lượng quang học mép trái (`leftAccentBar`), cụm ngàm cơ khí góc trên-trái (`cornerBracketTopLeft`: vạch vát 45° + vạch sọc `///` + thoi neon `◆`) và góc dưới-phải, Checkbox HUD node xoay 45°, Huy hiệu Rank (S/A/B/C/D), Tiêu đề 100% bề ngang không bị chèn ép, Huy hiệu Telemetry đếm ngược hạn chót và Chip thưởng EXP.
  * `TaskModal`: `SaoModal` thêm/sửa nhiệm vụ với `SaoInput`, `SaoSelect`, `SaoDatePicker`, cụm chọn giờ phút chuẩn hóa.
  * `DeleteConfirmModal`: `SaoModal` cảnh báo nguy hiểm kèm `<AlertTriangle>`.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoLoading`, `SaoSearchInput`.

### 6. Trang Đi Chợ - Shopping (`app/(main)/shopping/page.tsx`)
* **Tầng 2 (Page):** `ShoppingPage` *(Đã tối ưu: bỏ Header cồng kềnh, tích hợp Compact Telemetry Progress HUD, thanh tìm kiếm realtime & lọc trạng thái Cần mua/Đã mua)*.
* **Tầng 3 (Views):**
  * `SaoTabs`: Lọc danh mục (`all`, `food`, `household`, `other`).
  * `SaoSearchInput`: Tìm kiếm tên mặt hàng theo thời gian thực (hỗ trợ tiếng Việt không dấu).
  * `CompactProgressHUD`: Thanh đo viễn trắc tiến độ mua sắm laser neon nhỏ gọn.
* **Tầng 4 (Cards & Modals):**
  * `ShoppingItemCard`: Thẻ item chuẩn SAO Cyber HUD vát góc đa giác, vạch laser cạnh trái, checkbox quang học phát sáng, badge danh mục và số lượng, nút xóa.
  * `ShoppingAddModal`: Modal thêm món cần mua mới chuẩn Cyber HUD (`ShoppingModal.module.css`).
  * `SaoConfirmModal`: Modal xác nhận xóa item.
  * `SaoFab`: Nút thêm nhanh nổi cố định trên mobile & desktop.
  * *Tự động dọn dẹp:* Đã tích hợp logic backend & frontend tự động xóa các mục đã tích hoàn thành sau 24h.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoLoading`, `SaoSearchInput`, `SaoFab`.

### 7. Trang Sức Khỏe - Health (`app/(main)/health/page.tsx`)
* **Tầng 2 (Page):** `HealthPage`
* **Tầng 3 (Sections/Panels):**
  * `SaoPanel` (Variant `primary`): Biến động cân nặng (Recharts LineChart).
  * `SaoPanel` (Variant `cyan`): Dinh dưỡng 7 ngày gần nhất (Biểu đồ phối hợp ComposedChart đa trục Y: Cột chồng Macros & Đường Calo).
  * `SaoPanel` (Variant `gold`): Bác sĩ AI Yui - Phân tích thể trạng và khuyến nghị dinh dưỡng (ReactMarkdown).
* **Tầng 4 (Cards & Modals):**
  * `SaoSummaryCard`: Cân nặng hiện tại (Variant `primary`), Chiều cao (Variant `default`), Chỉ số BMI (Variant tương ứng thể trạng: `income`, `balance`, `expense`).
  * `WeightInputModal`: Modal `SaoModal` cập nhật chỉ số cân nặng và chiều cao.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoDatePicker`, `SaoLoading`.

### 8. Trang Cá Nhân - Profile (`app/(main)/profile/page.tsx`)
* **Tầng 2 (Page):** `ProfileDashboard`
* **Tầng 3 (Sections):**
  * `PlayerCardSection`: Cột trái hiển thị Avatar MMORPG giáp bát giác bọc kín, Level crest badge, hệ thống thanh chỉ số HP, MP & EXP (thang lũy tiến Max Lv 10), Ngày tham gia và nút tải ảnh căn giữa.
  * `BasicInfoSection`: Form cập nhật Username, Email hiển thị (khóa hệ thống).
  * `SecuritySection`: Form đổi mật khẩu bảo mật (mật khẩu cũ, mật khẩu mới, xác nhận).
* **Tầng 4 (Panels):** `SaoPanel` (Variant `primary` cho Thẻ nhân vật, `cyan` cho Thông tin cơ bản, `gold` cho Bảo mật).
* **Tầng 5 (Atoms):** `SaoInput`, `SaoButton`, `SaoImageUpload`, `SaoLoading`.

### 9. Trang Cài Đặt - Settings (`app/(main)/settings/page.tsx`)
* **Tầng 2 (Page):** `SettingsPage`
* **Tầng 3 (Sections):**
  * `LanguageSection`: Lựa chọn song ngữ Tiếng Việt / English với cờ quốc gia, code badge và trạng thái active.
  * `ThemeSection`: Bộ sưu tập 8 bảng màu theme SAO với vòng xoay năng lượng Core orb và trạng thái ONLINE.
  * `WallpaperSection`: Trình quản lý hình nền & ambient HUD với bộ sưu tập SAO Presets, tải ảnh từ thiết bị (Media picker / Camera / Clipboard), áp dụng link trực tuyến, thanh trượt Dimming Overlay (20% - 95%) và màn hình giả lập mô phỏng HUD Live Preview.
  * `AccountSection`: Quản lý bảo mật phiên làm việc và đăng xuất an toàn.
* **Tầng 4 (Cards, Panels & Modals):**
  * `SaoPanel`: Phân khu module HUD với variant `cyan` cho Ngôn ngữ, `primary` cho Bảng màu & Hình nền, `danger` cho Tài khoản.
  * `LanguageCard`: Thẻ chọn ngôn ngữ vát góc chamfered cyber.
  * `ThemeCard`: Thẻ chọn màu có hiệu ứng glow năng lượng lõi.
  * `WallpaperPicker`: Trình quản lý không gian nền và lớp phủ HUD.
  * `SaoConfirmModal`: Hộp thoại xác nhận đăng xuất chuẩn SAO.
* **Tầng 5 (Atoms):** `SaoButton`, `SaoInput`, `SaoImageUpload`.

---

## III. BẢNG TỔNG HỢP TRÙNG LẶP (DEDUPLICATION - QUY VỀ 1 LẦN)

| STT | Component Chuẩn Đề Xuất | Hiện Trạng Trùng Lặp (Được Tính 1 Lần) | Hướng Chuẩn Hóa & Tiến Độ |
| :--- | :--- | :--- | :--- |
| **1** | `<SaoConfirmModal>` | Tasks, Calendar, Menu, Shopping, Finance đều tự code lại 1 `<SaoModal>` với icon `AlertTriangle` và 2 nút `SaoButton` ("Hủy", "Xóa"). | **ĐÃ HOÀN TẤT:** Tạo `app/components/SaoConfirmModal.tsx`, áp dụng thành công trên Tasks, Calendar. |
| **2** | `<SaoFab>` *(Floating Action Button)* | 5 trang tự viết CSS riêng cho nút tròn nổi ở góc dưới: `.tasksFab`, `.overviewFab`, v.v. | **ĐÃ HOÀN TẤT:** Tạo `app/components/SaoFab.tsx` & `.module.css`. Tự động tính toán vị trí: Desktop ở góc phải (`bottom: 30px; right: 30px`), Mobile ở góc trái (`bottom: 12px; left: 12px; right: auto`) né Yui và BottomNav. Đã áp dụng toàn diện trên Calendar, Tasks, WalletsTab, OverviewTab, BudgetsTab, DebtsTab, HistoryTab. |
| **3** | `<InventoryTab>` *(Kho đồ & dự trữ)* | Tồn tại ở cả `finance/components/InventoryTab.tsx` (bản cũ/dead code) và `menu/components/InventoryTab.tsx`. | Xóa bản thừa bên Finance, gom vào thư mục dùng chung `app/components/inventory/` hoặc `app/components/menu/`. |
| **4** | `<BillScanReviewModal>` | Cả Finance và Menu đều sao chép đoạn code modal xem lại hóa đơn sau khi AI quét OCR. | Tách thành 1 modal chung nhận `scannedItems` và callback lưu dữ liệu. |
| **5** | `<SaoEmptyState>` | Các trang tự viết các thẻ `div` với icon xám + text "Chưa có dữ liệu..." với font-size và margin lệch nhau. | Gom thành component `<SaoEmptyState icon title description actionButton? />`. |
| **6** | `<SaoFilterBar>` | Tasks, Shopping, Menu, Finance đều có ô tìm kiếm kết hợp lọc danh mục với các cách code khác nhau. | Chuẩn hóa thanh công cụ tìm kiếm và lọc dữ liệu. |

---

## IV. CÁC VẤN ĐỀ LỆCH BỐ CỤC (LAYOUT INCONSISTENCIES)

1. **Cơ chế cuộn trang (Scroll Container):**
   * Một số trang (`menu`, `settings`, `profile`) dùng `div.scrollArea` có `overflow-y: auto`.
   * Các trang khác (`finance`, `shopping`, `health`) cuộn tự do theo viewport.
   * *Khắc phục:* Thống nhất cơ chế cuộn toàn trang hoặc bọc nội dung chuẩn.

2. **Khoảng đệm đáy (Bottom Safe Padding) trên Mobile:**
   * Mobile có `MobileBottomNav` cố định ở đáy (chiều cao ~65px).
   * Một số trang chỉ có padding đáy `24px` hoặc `40px` làm cho các nút bấm cuối trang bị thanh điều hướng che lấp.
   * *Khắc phục:* Chuẩn hóa `padding-bottom: calc(75px + env(safe-area-inset-bottom))` trên Mobile cho mọi trang.

3. **Cao độ của Floating Action Button (FAB) trên Mobile:**
   * Các file CSS tự gán `bottom: 80px`, `bottom: 90px`, `bottom: 24px` dẫn đến FAB bị đè lên dock hoặc nhảy vị trí khi chuyển trang.
   * *Khắc phục:* Component `<SaoFab>` kiểm soát vị trí duy nhất.

4. **Trộn lẫn Primitive và Raw HTML:**
   * `YuiAssistant` và `CategoryDrilldownModal` vẫn dùng `<input>`, `<select>`, `<button>` mộc thay vì `SaoInput`, `SaoSelect`, `SaoButton`.
   * *Khắc phục:* Thay thế toàn bộ bằng component chuẩn SAO.

---

## V. QUY HOẠCH CẤU TRÚC THƯ MỤC COMPONENT MỚI

```
app/components/
├── SaoButton.tsx                  # Component dùng chung (File trực tiếp)
├── SaoButton.module.css
├── SaoInput.tsx
├── SaoInput.module.css
├── SaoModal.tsx
├── SaoModal.module.css
├── SaoSelect.tsx
├── SaoSelect.module.css
├── SaoTabs.tsx
├── SaoTabs.module.css
├── SaoDatePicker.tsx
├── SaoDatePicker.module.css
├── SaoLoading.tsx
├── SaoLoading.module.css
├── SaoAlert.tsx
├── SaoAlert.module.css
├── SaoImageUpload.tsx
├── SaoMediaPickerButton.tsx            # (Nâng cấp SAO Cyber HUD Trigger & Hologram Dropdown Menu)
├── SaoMediaPickerButton.module.css
├── SaoConfirmModal.tsx            # (Tạo mới chuẩn hóa)
├── SaoFab.tsx                     # (Tạo mới chuẩn hóa)
├── SaoEmptyState.tsx              # (Tạo mới chuẩn hóa)
├── SaoHeroCard.tsx                # (Tạo mới chuẩn hóa - Thẻ Hero Metric SAO HUD)
├── SaoHeroCard.module.css
├── SaoSummaryCard.tsx             # (Tạo mới chuẩn hóa - Thẻ Metric / Tóm tắt SAO HUD)
├── SaoSummaryCard.module.css
├── SaoPanel.tsx                   # (Tạo mới chuẩn hóa - Khung vỏ Section/Chart Panel chuẩn SAO HUD)
├── SaoPanel.module.css
├── layout/                        # Component riêng theo nghiệp vụ
│   ├── SaoHeaderStatus.tsx
│   ├── SaoHeaderStatus.module.css
│   ├── SaoHeaderBridge.tsx
│   └── SaoHeaderBridge.module.css
├── yui/
│   ├── YuiAssistant.tsx
│   ├── YuiAssistant.module.css
│   └── api.ts
├── calendar/                      # Gom từ calendar/components/
│   ├── DateSelector.tsx
│   ├── SAOMonthView.tsx
│   ├── SAOTimeline.tsx
│   └── SAOWeekView.tsx
├── finance/                       # Gom từ finance/components/
│   ├── OverviewTab.tsx
│   ├── WalletsTab.tsx
│   ├── BudgetsTab.tsx
│   ├── DebtsTab.tsx
│   ├── HistoryTab.tsx
│   ├── FinanceCharts.tsx
│   ├── SmartExpenseModal.tsx
│   └── CategoryDrilldownModal.tsx
└── menu/                          # Gom từ menu/components/
    └── InventoryTab.tsx
```

---

## VI. NHẬT KÝ TIẾN ĐỘ AUDIT & CHUẨN HÓA (PROGRESS TRACKING)

> **Quy trình:** Duyệt từ ngoài vào trong: **Tầng 1 (App Shell & Header/Nav)** → **Tầng 2 (Page Controllers)** → **Tầng 3 (Sections/Tabs)** → **Tầng 4 (Cards & Modals)** → **Tầng 5 (Primitives/Atoms)**.

### TẦNG 1: APP SHELL & GLOBAL LAYOUT

#### 1. TopHeader (`app/(main)/layout.tsx` & `app/components/layout/`)
- [x] **Audit & Nâng cấp phụ kiện kết nối TopHeader (`SaoHeaderBridge` thay thế `topHeaderLine`):**
  - **Hiện trạng:** Dòng 121 trước đây là `<div className={styles.topHeaderLine}></div>`, chỉ là 1 đường kẻ 2px mờ mờ với dải gradient tĩnh và tọa độ cố định (`left: 450px; right: 350px`). Khi màn hình co giãn hoặc ở các độ phân giải khác nhau, đường kẻ bị thụt lùi hoặc lấn đè, không toát lên được phong cách HUD sci-fi đặc trưng của Sword Art Online (*"tuy có hơn không nhưng chưa đủ wow"*).
  - **Giải pháp & Triển khai:**
    - Tạo mới component `<SaoHeaderBridge />` (`app/components/layout/SaoHeaderBridge.tsx` & `.module.css`).
    - Tích hợp 2 cực kết nối (`terminalLeft`, `terminalRight`) với tinh thể thoi neon (diamond nodes `◇`) và các vạch notch micro-tech nghiêng -25°.
    - Đường ray quang học hai lớp (`railTrack` + `railGlow`) kèm luồng photon chạy quét liên tục (`pulseBeam` với `@keyframes saoPulseBeam`).
    - Responsive thông minh: Co giãn linh hoạt theo tỷ lệ màn hình, tự ẩn nhãn trên màn hình cỡ trung và ẩn hoàn toàn trên mobile khi header xếp chồng.
- [x] **Bỏ thuộc tính làm nghiêng khối Avatar/Level (`SaoHeaderStatus.tsx:L63-L72`):**
  - **Hiện trạng:** Khối `.headerLeftTilted` chứa Avatar + Tên/Level bị áp 3D skew/tilt `transform: rotateY(15deg)`. Hiệu ứng này khiến thông tin người dùng bị lệch góc so với cụm thanh HP/MP 2D phẳng liền kề, gây cảm giác méo hình và khó nhìn.
  - **Khắc phục:** Đã gỡ bỏ `transform: rotateY(15deg);` và `transform-origin: right center;` ở `SaoHeaderStatus.module.css` (cũng như dọn dẹp các thuộc tính 3D bend tương ứng trong `layout.module.css`). Khối Avatar giờ đây phẳng hoàn toàn, tiếp giáp vuông vắn, liền lạc và sắc nét với thanh trạng thái.
- [x] **Loại bỏ nút chuyển đổi ngôn ngữ ở TopHeader (`SaoHeaderStatus.tsx:L114-L123`):**
  - **Hiện trạng:** Nút chuyển đổi EN/VI nằm xen vào cụm ngày giờ / thời tiết thế giới (`headerRight`), gây chật chội và phá vỡ bố cục hiển thị thế giới Aincrad.
  - **Khắc phục:** Đã gỡ bỏ hoàn toàn nút bấm `.langToggleBtn`, dọn dẹp import icon `Languages` và state `language`, `setLanguage` thừa tại `SaoHeaderStatus.tsx`. Chức năng đổi ngôn ngữ đã được quy hoạch tập trung tại trang Cài đặt (Settings).
- [x] **Đánh giá trực quan sau hiệu chỉnh & Fix lỗi đa ngôn ngữ (Visual Audit Review & i18n Fix):**
  - Khối Avatar & Level phẳng 2D: Cực kỳ sắc nét, avatar tròn và viền sáng ăn khớp với cụm thanh HP/MP; góc vát đuôi phải tạo điểm kết thúc dứt khoát.
  - Cụm Ngày / Giờ / Thời tiết bên phải: Gọn gàng, thoáng đãng, mang tính chất màn hình định vị thế giới Aincrad.
  - **Khắc phục lỗi che khuất ở bản tiếng Anh (i18n Overflow Fix):**
    - *Vấn đề phát hiện:* Khi chuyển sang tiếng Anh (`Tuesday, Nov 24, 2026`), chuỗi ngày dài hơn tiếng Việt làm khối `.headerRight` phình to sang trái ~50px, đè lấp mất cụm tinh thể kim cương `◆` và vạch notch `///` của cầu nối do trước đó dùng tọa độ cứng `right: 295px`.
    - *Giải pháp triệt để:* Chuyển `SaoHeaderBridge` thành item flexbox tự nhiên (`flex: 1; margin: 0 16px;`) đặt xen giữa `headerLeftContainer` và `headerRight`. Nhờ đó, cầu nối tự động co/giãn lấp đầy khoảng trống linh hoạt theo độ dài chuỗi ngày/tháng ở mọi ngôn ngữ (VI/EN) và mọi kích thước màn hình mà không bao giờ bị đè lấn hay hở khoảng cách.

#### 2. SidebarMenu (`app/(main)/layout.tsx` & `layout.module.css`)
- [x] **Bỏ thuộc tính làm nghiêng 3D của Sidebar (`sidebarContainer:L124-L164`):**
  - Gỡ bỏ `transform: perspective(1200px) rotateY(15deg) translateZ(0);` và các thuộc tính 3D liên quan. Toàn bộ thanh Sidebar chuyển về phẳng 2D, vuông góc và thẳng hàng song song với màn hình làm việc, giúp toàn bộ 8 menu items sắc nét và dễ tương tác.
- [x] **Nâng cấp phụ kiện khung công nghệ `sidebarLeftRail` và `sidebarTopAccent` (`L126-L127`):**
  - **Triết lý thiết kế:** Kế thừa và nâng tầm phong cách vẽ tay thủ công tinh xảo của `activeDecorators` (`activeBorderLeft`, `activeBorderRight` với các góc vát đa tầng `clip-path`, khía rãnh notch cơ khí, viền neon phát sáng).
  - **`sidebarLeftRail` (Trục xương quang học - Data Spine):**
    - Giữ trọn chiều dài chạy dài xuống đáy theo chủ ý của người dùng để làm trục neo toàn cục cho giao diện.
    - Dải ray neon mỏng phát sáng `var(--sao-primary-hex)` dọc cạnh trái với luồng photon xung năng lượng (`railPulse` với animation `saoRailPulse`).
    - Cụm vạch đo calibration laser HUD (`railTicks`) phân đoạn dọc thân ray và chốt tinh thể kim cương đáy ray (`railDiamond`).
  - **Khóa ngàm Active & Ray đứng (`activeBorderLeft` Docking Latch):**
    - Giữ nguyên cấu trúc ngàm cắt qua ray trái theo chủ ý cơ khí để neo giữ menu active vào thanh ray.
    - **Nâng cấp hiệu ứng WOW:**
      + *Hiệu ứng Snap-Lock cơ khí:* Khi chọn tab/trang, ngàm cơ khí phóng ra với gia tốc cyber (`saoClampSnap`) và chốt khựng vào thanh ray với một luồng chớp sáng tiếp xúc.
      + *Chốt tinh thể năng lượng tại điểm giao cắt (`activeBorderLeft::after`):* Một viên ngọc kim cương neon rực rỡ nằm ngay tại giao điểm ngàm & cột ray, nhấp nháy năng lượng nhịp nhàng (`saoCorePulse`), nhìn rõ ngay ở mức zoom 100%.
      + *Sóng quét năng lượng bề mặt (`activeDecorators::after`):* Cứ mỗi 3.5 giây, một luồng sóng laser quét từ ngàm kẹp xuyên qua bề mặt nút active (`saoBeamSweep`), trực quan hóa quá trình truyền dữ liệu/năng lượng từ cột ray vào tính năng đang chọn.
  - **`sidebarTopAccent` (Khung xà mũ công nghệ - Cyber Canopy):**
    - Thiết kế lại thanh xà ngang `topAccentBar` bao phủ trọn vẹn bề rộng 240px của Sidebar.
    - Mép trên-phải vát 45° (`topAccentCorner`) ôm khít mép menu, kết thúc bằng tinh thể thoi neon (`topAccentDiamond`) ở góc.
    - Cụm khía cơ khí nhô lên (`topAccentNotches`) nhịp nhàng dọc thanh xà, không bị cụt hay để lại khoảng trống kỳ lạ.
  - **Tái thiết kế đuôi đáy `sidebarBottomAccent` (Chassis Keel vát đa tầng & viền liền mạch):**
    - Giải quyết triệt để lỗi viền màu bị đứt đoạn bằng kỹ thuật lồng 2 lớp polygon (`bottomChassis` + `bottomChassisInner`), tạo đường viền neon 2px chạy liền mạch 100% từ mép phải menu men theo góc vát xuống đáy.
    - Góc vát đa tầng 2 nấc cơ khí phá bỏ sự đơn điệu của nhát cắt thẳng cũ, tích hợp cụm 3 vạch kẻ telemetry `///` (`bottomStripes`) và chốt tinh thể kim cương (`bottomCornerDiamond`).

---

### TẦNG 2, 3, 4, 5: AUDIT & NÂNG CẤP DEMO TRANG TÀI CHÍNH - FINANCE (TỔNG QUAN)

#### 1. Tầng 2 (Page Controller - `app/(main)/finance/page.tsx`)
- [x] **Loại bỏ khối Page Header cồng kềnh & nút Smart Command AI:**
  - **Hiện trạng:** Đầu trang tài chính trước đây chiếm 1 dải header lớn chứa tiêu đề "Tài chính", mô tả và nút "AI Ghi chép thông minh", gây hao tốn diện tích cuộn dọc.
  - **Khắc phục:** Vì trợ lý ảo Yui AI Assistant (`YuiAssistant`) luôn hiện diện toàn cục trên màn hình (có tính năng ghi chép thông minh tương đương), đã gỡ bỏ hoàn toàn khối header này. Diện tích làm việc được ưu tiên tối đa cho bảng điều khiển tài chính.

#### 2. Tầng 3 (Sections & Major Tab Views - `app/components/SaoTabs.tsx`)
- [x] **Nâng cấp `SaoTabs` thành Segmented Console Strip & Đồng bộ URL query:**
  - **Hiện trạng:** Thanh chuyển tab cũ mang phong cách các nút rời rạc, chưa có tính liên kết khối kiểu giao diện HUD/Console của SAO. Ngoài ra khi tải lại trang, tab bị reset về tab mặc định thay vì giữ nguyên tab người dùng đang xem. Đặc biệt: nút active bị vát nghiêng trong khi các tab inactive là hình chữ nhật thẳng vuông góc ("cái thẳng cái nghiêng"), gây đứt gãy thị giác; thiếu hiệu ứng động khi chuyển tab; họa tiết khung tĩnh còn đơn điệu.
  - **Khắc phục & Triển khai toàn diện:**
    + **Đồng bộ hình học 100%:** Áp dụng hình khối parallelogram vát nghiêng song song đồng đều 10px (`clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)`) cho **toàn bộ** các tab (cả active lẫn inactive). Loại bỏ hoàn toàn sự cọc cạch giữa thẳng và nghiêng.
    + **Hiệu ứng chuyển Tab quang học (Tab Switch Dynamics):**
      * Vạch laser đỉnh mở rộng từ tâm theo gia tốc cyber khi kích hoạt (`activeTopLine` với animation `saoTabLineExpand`).
      * Luồng sóng năng lượng photon quét ngang bề mặt tab vừa chọn (`activeSweep` với animation `saoTabSweep`).
      * Chốt tinh thể kim cương nhấp nháy quang học ở đáy tab (`activeBottomDiamond`).
      * Phản hồi cơ học nhún nhẹ khi click (`:active { transform: scale(0.97); }`).
    + **Họa tiết khung Console Chassis tinh xảo:** Hai đầu console được bổ sung phụ kiện HUD cơ khí: đầu trái gồm tinh thể thoi neon `◆` và vạch laser định vị; đầu phải gồm cụm 3 vạch telemetry `///` và tinh thể thoi; đường ray laser quang học chạy dọc đáy console.
    + **Đồng bộ URL:** Tiếp tục duy trì `urlParamKey` cập nhật URL mượt mà không reload trang.

#### 3. Tầng 4 (Cards & Feature Modals - `app/components/finance/OverviewTab.tsx` & `NetWorthCard.tsx`)
- [x] **Loại bỏ khối danh sách ví tiền trùng lặp (`walletsGrid` ở `OverviewTab.tsx:L92-L113`):**
  - **Hiện trạng:** Tab Tổng quan hiển thị thêm 1 lưới danh sách các ví tiền, trùng lặp 100% chức năng với Tab "Ví tiền" (`WalletsTab`) ngay bên cạnh.
  - **Khắc phục:** Đã gỡ bỏ `walletsGrid` khỏi `OverviewTab.tsx`, giúp trang Tổng quan tập trung hoàn toàn vào 2 thành phần cốt lõi: Thẻ tài sản ròng + thu chi tháng (`NetWorthCard`) và Biểu đồ xu hướng phân tích (`FinanceCharts`).
- [x] **Tái cấu trúc `NetWorthCard` (`app/components/finance/NetWorthCard.tsx`):**
  - Giờ đây đóng vai trò là container nghiệp vụ thuần túy: kết hợp 1 thẻ `<SaoHeroCard />` hiển thị Tổng tài sản ròng và hàng 2 thẻ `<SaoSummaryCard />` cho Tổng thu và Tổng chi.
  - Toàn bộ CSS định kiểu thẻ nội bộ đã được loại bỏ, trả về file module CSS gọn gàng chỉ quản lý bố cục lưới `summaryRow`.

#### 4. Tầng 5 (Primitives & Atoms - `SaoHeroCard.tsx` & `SaoSummaryCard.tsx`)
- [x] **Tạo mới Component Hero Metric Card (`SaoHeroCard.tsx` & `.module.css`):**
  - **Mục đích:** Khối hiển thị số liệu lớn (Hero Metric) mang tính chủ đạo của màn hình (như Tổng tài sản, Cấp độ nhân vật, Tổng calo/sức khỏe).
  - **Họa tiết cơ khí góc trên - trái đa tầng (Chassis Top-Left):**
    + Miếng vát cơ khí ôm trọn góc 45° (`bracketBevel`).
    + Cụm 3 vạch telemetry `///` theo góc vát (`bracketStripes`).
    + Tinh thể thoi neon `◆` chốt tại ngã rẽ (`bracketDiamond`).
    + Đường ray laser ngang và dọc kéo dài kèm chốt chặn ở hai đầu (`bracketRailH`, `bracketRailV`).
    + **Cụm ngàm cơ khí góc dưới - phải đối xứng (`cornerBracketBottomRight`):** Đường viền neon 2.5px nối liền mạch 100% theo góc vát 22px (`bottomRightBevelLine`), khắc phục triệt để lỗi viền bị đứt/mất góc; chốt tinh thể thoi neon `◆` (`bottomRightDiamond`), cụm 3 vạch telemetry `///` và hai đường ray laser ngang/dọc có chốt chặn.
    + Hoàn toàn tĩnh (không animation), sắc nét, tối ưu hiệu năng render.
- [x] **Nâng cấp Component Thẻ Tóm tắt (`SaoSummaryCard.tsx` & `.module.css`):**
  - **Nâng cấp họa tiết hai đầu đối xứng:**
    + Góc trên - trái: Ngàm cơ khí tinh xảo gồm vát góc 45° kép, chốt tinh thể kim cương `◆`, 2 vạch telemetry `//` và đường ray laser micro kèm chốt chặn.
    + Góc dưới - phải: Cụm ngàm cơ khí đối xứng (`cornerBracketBottomRight`) với đường viền neon 2px chạy liền mạch theo góc vát 14px (`bottomRightBevelLine`), chốt thoi neon `◆`, 2 vạch telemetry `//` và ray laser micro.
    + Tự động đồng bộ màu sắc ngàm cơ khí theo từng `variant` (`income` xanh neon, `expense` đỏ neon, `balance` xanh cyan).

- [x] **Nâng cấp Component Nút bấm Toàn cục (`SaoButton.tsx` & `.module.css`):**
  - **Hiện trạng:** Nút bấm cũ chỉ là hình chữ nhật bo tròn đơn điệu `border-radius: 4px` không mang tinh thần SAO, thiếu các chi tiết cơ khí và phản hồi tương tác công nghệ.
  - **Nâng cấp giao diện chuẩn SAO Cyber HUD:**
    + **Hình khối vát góc đối xứng (`clip-path`):** Bo vát hai góc đối xứng trên - trái và dưới - phải `8px` (`clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)`). Tự động bỏ qua cho các nút FAB tròn hoặc nút `ghost`.
    + **Viền neon liền mạch theo góc vát:** Cặp thanh viền neon 1.5px (`bevelTL`, `bevelBR`) khép kín hoàn hảo theo các đường vát chéo, kết hợp khía rãnh cơ khí micro góc (`cornerNotchTL`, `cornerNotchBR`).
    + **Vạch laser định vị:** Vạch laser mỏng chạy dọc mép đỉnh nút (`::before`) tạo điểm nhấn quang học công nghệ.
    + **Chuẩn hóa các biến thể màu:** `primary` (cyan neon), `danger` (crimson red neon), `default` (steel blue glass), `dashed` (wireframe polygon), `ghost` (minimal HUD action).
    + **Chuẩn hóa trạng thái Active / Unactive & Hiệu ứng Hover:**
      * Bổ sung prop `active?: boolean` chính thức cho `SaoButton` phục vụ các cụm nút chuyển chế độ (toggle groups).
      * Khi `active={false}` (unactive) hoặc `variant="ghost"`: Vẫn giữ trọn vẹn hình khối cyber vát góc, phủ nền kính sẫm `rgba(6, 18, 35, 0.55)`, viền neon dịu mắt và chữ xanh HUD `#8ab4f8`.
      * Khi Hover: Nút đứng yên vững chãi (đã gỡ bỏ hiệu ứng nảy/nhảy `translateY(-2px)`), bừng sáng nền neon (`0.2`), viền rực sáng (`0.65`) và chữ trắng phát quang `text-shadow`.
      * Khi Nhấn (`:active`): Nhún cơ học dứt khoát `transform: scale(0.95) translateY(1.5px)` với phản hồi cơ học 0.08s chân thực.

- [x] **Tạo mới Component Khung Vỏ Section / Panel Toàn Cục (`SaoPanel.tsx` & `.module.css`):**
  - **Hiện trạng:** Các container lớn như khối biểu đồ `FinanceCharts` (`.chartsCard`) sử dụng thẻ `div` với nền đen xám đơn điệu, thiếu hoa văn quang học và không toát lên được cảm giác màn hình hiển thị HUD/Hologram của SAO.
  - **Triển khai chuẩn hóa `SaoPanel`:**
    + **Hoa văn nền ma trận Cyber Grid (28px) & Quầng sáng quang học:** Lớp nền kính hologram đa tầng kết hợp lưới ma trận tọa độ `radial-gradient` + `linear-gradient` mờ ảo, tạo chiều sâu như đang lơ lửng trong không gian AR của Aincrad.
    + **Hoa văn cơ khí đa tầng bốn góc đối xứng:**
      * Góc trên - trái: Miếng vát cơ khí ôm trọn góc 45° 22px với đường viền neon liền mạch 2.5px (`topLeftBevelLine`), tinh thể thoi neon `◆`, cụm 3 vạch telemetry `///` và hai đường ray laser ngang/dọc có chốt chặn micro.
      * Góc dưới - phải: Cụm ngàm cơ khí đối xứng (`cornerBracketBottomRight`) với đường viền neon 2.5px khép kín góc vát 22px (`bottomRightBevelLine`), tinh thể thoi neon `◆` và cụm 3 vạch telemetry `///`.
      * Góc trên - phải và dưới - trái: Cụm tinh thể thoi cân bằng `◇` và đường laser micro định vị.
      * Đáy panel: Đường ray photon quang học `bottomLaserBeam` rực sáng.
    + **Header phân đoạn tích hợp:** Hỗ trợ tiêu đề `title`, `icon`, và thanh điều khiển `headerActions` kèm vạch kẻ ranh giới HUD laser có cờ chỉ báo phát quang `::after`. Tối ưu mobile tự động xuống dòng linh hoạt (`flex-wrap: wrap`), triệt tiêu hoàn toàn thanh cuộn ngang `overflow-x` thừa thãi.
    + **Phương án A cho Cụm Điều khiển Biểu đồ trên Mobile (`FinanceCharts.tsx`):**
      * Chuyển `.chartsControls` trên mobile sang bố cục cột dọc (`flex-direction: column; width: 100%`).
      * Mỗi cụm nút (`.chartsControlGroup`) chia thành lưới 2 cột 50% - 50% (`display: grid; grid-template-columns: 1fr 1fr; gap: 6px;`).
      * Hàng 1: `[Thu & Chi]` | `[Danh mục]` dàn đều 100% bề ngang.
      * Hàng 2: `[30 Ngày]` | `[6 Tháng]` dàn đều 100% bề ngang.
      * Ẩn thanh phân cách `|` (`.chartsDivider`), loại bỏ hoàn toàn hiện tượng lệch hàng, lấn mép và triệt tiêu triệt để thanh cuộn dọc/ngang không mong muốn.
    + **Tích hợp thực tế:** Đã thay thế hoàn toàn thẻ `div.chartsCard` trong `FinanceCharts.tsx` bằng `<SaoPanel />`, giải phóng hàng chục dòng CSS thừa trong `finance.module.css`.
    + **Chuẩn hóa Sub-panel Danh mục Chi tiêu (`categoryBreakdownCard`):**
      * Thay thế khối `div` tròn góc 4px đơn điệu bằng khung thẻ vát góc cyber 14px đồng bộ với `SaoPanel`.
      * Bổ sung đường viền neon liền mạch góc vát hai đầu (`categoryBreakdownBevelTL`, `categoryBreakdownBevelBR`) và chốt thoi neon `◆`.
      * Thay thế chấm tròn màu sắc bằng **tinh thể thoi màu RPG (`categoryColorPip`)** phát sáng theo màu danh mục.
      * Từng dòng danh mục sở hữu hình khối bình hành cyber (`clip-path: polygon(...)`), khi hover trượt mượt sang phải `translateX(4px)` với viền cyan phát quang và mũi tên neon.
      * Header tổng chi có đường phân cách viền mờ đồng bộ theme và số liệu font Tauri nổi bật.

  - **Cấp độ 4 - Chuẩn hóa Khung Popup / Modal toàn cục (`SaoModal.tsx` & `.module.css`):**
    + **Hình khối cơ khí & Vát góc đối xứng:** Cắt vát cyber 18px hai đầu đối xứng chéo (`clip-path: polygon(18px 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%, 0 18px)`).
    + **Đường viền neon liền mạch & Ngàm cơ khí:** Bổ sung đường viền neon chéo khép kín góc cắt (`topLeftBevelLine`, `bottomRightBevelLine`), ngàm cơ khí đa tầng góc trên-trái (`bracketTL`) và dưới-phải (`bracketBR`) kèm chốt đinh tán thoi neon `◆` (`bracketRivet`).
    + **Ray quang học photon đáy (`bottomLaserBeam`):** Vệt sáng laser trải đều đáy modal.
    + **Nền kính ma trận Cyber Grid 24px:** Lớp nền gradient cyber hologram kết hợp watermark lưới tọa độ mờ ảo và quầng sáng chiều sâu.
    + **Hệ thống kích thước linh hoạt (`size` prop):** Hỗ trợ `sm` (440px), `md` (540px, mặc định), `lg` (680px), `xl` (860px).
    + **Nút đóng chuẩn SAO Cancel Button (`closeButton`):** Hình khối đa giác cyber vát góc, hover phát quang đỏ `#ff4444`, xoay nhẹ 90° và nhún xúc giác cơ khí khi nhấn.
    + **Tương tác chuẩn Desktop & Mobile:** Tự động lắng nghe phím `Escape` để đóng modal, khóa scroll body khi mở popup.

  - **Cấp độ 5 - Bộ thư viện Component Nguyên tử Tái sử dụng (Layer 5 Atoms):**
    + `<SaoStatCard>` (`app/components/SaoStatCard.tsx`): Thẻ KPI micro-card cơ khí nhỏ gọn, vát góc 8px trên-trái với viền neon liền mạch (`bevelTL`), icon công nghệ, typography số liệu font Tauri, hỗ trợ 5 biến thể (`red`, `gold`, `cyan`, `green`, `default`), responsive tối ưu trên màn hình nhỏ.
    + `<SaoTransactionItem>` (`app/components/SaoTransactionItem.tsx`): Dòng lịch sử giao dịch phẳng thanh thoát, góc vuông chuẩn 90° (`border-radius: 0`), chống co rút theo chiều dọc (`flex-shrink: 0; min-height: 48px;`), vạch quang học thẳng đứng 3px mép trái (`leftAccentBar`), huy hiệu Rank vàng/bạc/cyan, số tiền font Tauri phát quang và huy hiệu % chi tiêu HUD gọn gàng (thay thế thanh đo đáy cồng kềnh). Tối ưu 2 dòng linh hoạt trên mobile (tên món không còn bị cụt, khóa `white-space: nowrap` cho ngày tháng và badge ví).
    + `<SaoSearchInput>` (`app/components/SaoSearchInput.tsx`): Khung tìm kiếm chuẩn HUD với góc vuông sắc nét (`border-radius: 0`), icon kính lúp neon, nút xóa nhanh `X`, viền phát quang khi focus.
    + `<SaoSelect>` (`app/components/SaoSelect.tsx`): Khung chọn Dropdown chuẩn HUD góc vuông (`border-radius: 0`), mũi tên xoay mượt mà, menu sổ xuống hiệu ứng trượt lề SAO.
    + `<SaoInput>` & `<SaoDatePicker>` (Chuẩn hóa toàn diện):
      * Thống nhất chiều cao `height: 40px` (box-sizing: border-box) và font chữ `Tauri` đồng đều trên tất cả các ô nhập (`SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoSearchInput`), giải quyết triệt để lỗi lệch độ cao khi đặt cạnh nhau trong cùng hàng.
      * Chuẩn hóa góc vuông 90° (`border-radius: 0`), gỡ bỏ góc vát `clip-path` không đồng bộ trên `SaoDatePicker`.
      * **Triệt tiêu lỗi cắt cụt lịch Popover trong Modal (`createPortal`):**
        - Nâng cấp `SaoDatePicker` chuyển toàn bộ hộp chọn ngày `.calendarPopover` ra ngoài DOM qua React Portal (`createPortal(..., document.body)`).
        - Đặt `z-index: 99999` và `position: fixed`, loại bỏ hoàn toàn việc lịch bị cắt cụt do `overflow: hidden` hoặc góc vát `clip-path` của modal cha.
        - Bổ sung cơ chế phát hiện viewport thông minh: tự động lật ngược lên trên nếu ô input nằm sát mép đáy màn hình, đồng thời bám dính chính xác khi cuộn chuột bên trong modal.
      * Căn giữa các nút submit/hành động chính (`justify-content: center`) ở cuối toàn bộ các popup modal.

  - **Cấp độ 4 / 5 - Tái cấu trúc Bố cục Popup Bóc tách Danh mục (`CategoryDrilldownModal.tsx`):**
    + **Tiêu đề tinh gọn:** Giữ trực tiếp `categoryName` ngắn gọn, loại bỏ tiền tố dài dòng.
    + **Bố cục chú thích thời gian:** Tinh giản thành thanh banner HUD mảnh gồm khoảng ngày tháng và số lượng giao dịch, loại bỏ hoàn toàn huy hiệu danh mục lặp lại, chống vỡ chữ badge `57 khoản chi`.
    + **4 Thẻ KPI dứt khoát:** Nhãn rút gọn thành `TỔNG CHI`, `SỐ KHOẢN`, `TRUNG BÌNH`, `LỚN NHẤT`, triệt tiêu hoàn toàn dấu ba chấm `...` trên cả Laptop và Mobile.
    + **Danh sách Top & Chi tiết giao dịch:** Thay thế toàn bộ bằng `<SaoTransactionItem>`, loại bỏ thanh bar đáy cồng kềnh và polygon lệch góc.
    + **Thanh lọc:** Tích hợp `<SaoSearchInput>` và `<SaoSelect>` dàn đều trên 1 hàng ngang duy nhất.
    + **Loại bỏ Footer thừa:** Triệt tiêu hoàn toàn khối footer phía dưới để popup gọn gàng, tập trung vào dữ liệu.

  - **Cấp độ 4 - Component Thẻ Nguồn Tiền / Ví chuẩn SAO HUD (`SaoWalletCard.tsx` & `.module.css`):**
    + **Thay thế hoàn toàn cấu trúc cũ:** Thay thế khối `div.walletCard` thủ công trong `WalletsTab.tsx` (L40-L59) bằng component chuyên trách `<SaoWalletCard />`.
    + **Hình khối vát góc đối xứng 14px (`clip-path`):** Cắt vát hai góc đối xứng trên - trái và dưới - phải `14px` kết hợp đường viền neon 2px liền mạch (`topLeftBevelLine`, `bottomRightBevelLine`).
    + **Cột năng lượng quang học mép trái (`leftAccentBar`):** Trục ánh sáng đứng 4px tự động ăn theo màu sắc của ví (`--wallet-color`), bừng sáng khi hover (`box-shadow: 0 0 14px`).
    + **Cụm ngàm cơ khí góc trên-trái và dưới-phải:** Điểm xuyết tinh thể thoi neon `◆` (`bracketDiamond`), cụm vạch hazard telemetry `///` (`bracketStripes`) và viền vát neon liền khối.
    + **Nền kính Hologram & Ma trận Cyber Grid (24px):** Lớp nền gradient cyber kết hợp lưới ma trận tọa độ và quầng sáng quang học chiều sâu.
    + **Khắc phục lỗi Icon & Tự động nhận diện thông minh (`resolveWalletType`):**
      * Đổi icon ngân hàng từ `Building2` (tòa nhà văn phòng) sang `Landmark` (ngân hàng cột trụ cổ điển chuẩn quốc tế), `Banknote` (tiền mặt giấy), `Smartphone` (ví điện tử).
      * Bổ sung cơ chế tự động nhận diện thông minh theo tên ví: Nếu tên là "Tiền mặt" / "Cash", tự động gán icon `Banknote` và nhãn `TIỀN MẶT`, giải quyết triệt để lỗi người dùng tạo ví bị lưu nhầm thành `bank` (hiện ngân hàng).
      * Khung `iconBadge` chuyển sang hình vát góc cyber 6px, nền kính sẫm `rgba(10, 26, 48, 0.75)`, icon màu trắng sáng `#ffffff` phủ quầng sáng neon `drop-shadow(0 0 5px var(--wallet-color))`, triệt tiêu hoàn toàn lỗi icon màu tối (như xanh navy MB Bank) bị chìm vào nền đen.
    + **Tinh gọn thông tin hiển thị:** Bỏ dòng nhãn lặp lại "SỐ DƯ KHẢ DỤNG" (L88 cũ) giúp thẻ thon gọn (`min-height: 110px`), tập trung trực quan vào số dư lớn nổi bật font Tauri.
    + **Khả năng tương tác & Accessibility:** Hỗ trợ click trực tiếp vào toàn bộ thẻ để mở modal chỉnh sửa, đồng thời hỗ trợ phím `Enter` / `Space` khi focus và nút `<SaoButton variant="ghost">` nhỏ gọn ở góc trên phải. Sửa lỗi `SaoSelect` trong modal sửa ví sang `value={walletForm.type}`.

  - **Cấp độ 4 - Component Thẻ Hạn Mức Ngân Sách chuẩn SAO HUD (`SaoBudgetCard.tsx` & `.module.css`):**
    + **Thay thế hoàn toàn cấu trúc cũ:** Thay thế khối `div.budgetCard` thủ công trong `BudgetsTab.tsx` (L38-L73) bằng component chuyên trách `<SaoBudgetCard />`.
    + **Bố cục lưới 2 cột chuẩn (`.budgetsGrid`):** Khóa cứng chính xác 2 cột cân xứng `repeat(2, 1fr)` trên Laptop/Desktop (thay vì `auto-fill` tự động nhảy lên 4 cột khiến thẻ bị bóp nghẹt ép che tên hạn mức). Trên màn hình nhỏ (<= 900px / mobile) tự động xếp thành 1 cột (100%) rộng rãi.
    + **Triệt tiêu lỗi đè nút Edit lên mệnh giá:** Đưa cụm số tiền (`amountsWrapper`) và nút chỉnh sửa (`editBtn`) vào chung một hàng Flexbox (`actionGroup`), loại bỏ hoàn toàn cơ chế `position: absolute` cũ gây đè nút bút chì lên đơn vị tiền tệ `VND` và số tiền.
    + **Hình khối vát góc đối xứng 14px (`clip-path`):** Vát chéo hai góc đối xứng trên - trái và dưới - phải, cặp đường viền neon 2px liền mạch (`topLeftBevelLine`, `bottomRightBevelLine`), cụm ngàm cơ khí chốt thoi `◆` và vạch telemetry `///`.
    + **Hệ thống phản ứng 3 cấp độ HP & Telemetry tinh gọn:**
      * **An toàn (< 80%):** Màu xanh neon lục bảo (`#00ffaa`), thanh đo và trục quang học xanh dịu, hiển thị số tiền còn lại (`Còn lại: X VND`).
      * **Cảnh báo (80% - 99%):** Màu vàng hổ phách (`#ffaa00`), nhãn "Sắp chạm hạn mức (Còn X VND)".
      * **Bội chi / Nguy hiểm (≥ 100%):** Màu đỏ crimson phát quang (`#ff4444`), viền thẻ phát quang đỏ dịu (`inset & outer box-shadow`), telemetry hiển thị trực tiếp `BỘI CHI (+X VND)` kèm % tiến độ, loại bỏ hoàn toàn banner cảnh báo dài dòng bên dưới để giữ giao diện thanh thoát.
    + **Thanh đo HP Gauge chuẩn SAO:** Khung rãnh vát góc cơ khí, dải năng lượng HP gradient rực sáng kèm huy hiệu phần trăm `%` font Tauri sắc nét.
    + **Icon danh mục chuẩn kính trong suốt:** Khung icon vát góc 5px nền trong suốt không tạo mảng tối, bổ sung icon `HeartPulse` cho danh mục Sức khoẻ.

  - **Cấp độ 3 / 5 - Tái cấu trúc Toàn diện Tab Lịch Sử Giao Dịch (`HistoryTab.tsx`):**
    + **Thanh Tìm kiếm & Bộ lọc chuẩn HUD (L37-L47):**
      * Thay thế thanh 4 nút bấm tĩnh cũ bằng cụm **Search + Filter Toolbar** hiện đại.
      * Tích hợp `<SaoSearchInput />` hỗ trợ tìm kiếm đa năng theo mô tả, tên ví nguồn/đích, danh mục chi tiêu và số tiền, nút xóa nhanh `onClear`.
      * Tích hợp `<SaoSelect />` chọn lọc phân loại (`Tất cả`, `Thu nhập`, `Chi tiêu`, `Chuyển khoản`).
      * Chuẩn hóa chiều cao `height: 40px` (box-sizing: border-box) và font `Tauri` đồng đều giữa `<SaoSearchInput />` và `<SaoSelect />`, loại bỏ hoàn toàn lỗi lệch độ cao khi đặt cạnh nhau.
      * Bổ sung khóa ngôn ngữ đa ngữ `common.searchPlaceholder` ("Tìm kiếm giao dịch, ghi chú, ví...").
    + **Bố cục Khung Trung tâm Tỉ lệ vàng (`.historyContainer` - max-width: 960px căn giữa):**
      * Đưa toàn bộ Tab Lịch sử (Toolbar tìm kiếm, bộ lọc ngày và danh sách giao dịch) vào khung trung tâm `max-width: 960px; margin: 0 auto;`.
      * Triệt tiêu hoàn toàn cảm giác "siêu dãn" 1400px trên Laptop, dòng giao dịch thu về chiều dài hoàn hảo (~960px) dễ đọc, hai bên mép màn hình lộ đối xứng hình nền phong cảnh AR.
      * **Loại bỏ khối Thống kê phụ (`historyStatsRibbon`):** Gỡ bỏ hoàn toàn cụm 4 thẻ thống kê rườm rà phía trên theo yêu cầu người dùng, giúp giao diện tối giản, tập trung tuyệt đối vào danh sách sự kiện tài chính.
    + **Bộ lọc Khoảng thời gian từ ngày - đến ngày & Server-side Filtering:**
      * Tích hợp 2 ô `<SaoDatePicker />` chọn "Từ ngày" và "Đến ngày" trên cùng hàng Toolbar với ô Tìm kiếm và Dropdown Phân loại.
      * Mặc định lọc sẵn trong **14 ngày gần nhất** (`getRecent14DaysRange`) theo chuẩn giờ Việt Nam UTC+7 (`lib/vnTime.ts`).
      * **Triển khai Server-side Filtering toàn diện:**
        - Nâng cấp API Backend `GET /api/finance/transactions` hỗ trợ lọc trực tiếp qua MongoDB: `startDate`, `endDate`, `type`, và `search` (regex tìm kiếm theo mô tả, tên ví, danh mục hoặc số tiền).
        - Nâng cấp hàm gọi client `getTransactions({ startDate, endDate, type, search, force })` trong `app/(main)/finance/api.ts`.
        - Component `HistoryTab` tự chủ động query Server kèm cơ chế **Debounce 350ms** khi gõ ô tìm kiếm, giúp Backend thực sự nhẹ tải, không bị quét toàn bộ DB hay gửi thừa dữ liệu qua mạng.
        - Tự động đồng bộ cập nhật qua `refreshTrigger` từ `page.tsx` và sự kiện toàn cục `sao-finance-updated`.
      * Tích hợp nút đặt lại nhanh `14d` (`RotateCcw`) xuất hiện khi người dùng đổi khoảng ngày khác, cùng tính năng `clearable` (nút `X` xóa ngày nhanh) trên `<SaoDatePicker />`.
      * Tự động sắp xếp ngày giảm dần (`b.localeCompare(a)`) để giao dịch mới nhất luôn ở trên cùng.
    + **Thay thế danh sách thủ công (L50-L94) bằng `<SaoTransactionItem />`:**
      * Thay thế toàn bộ mã lồng ghép `div.historyItem` cũ bằng component tái sử dụng `<SaoTransactionItem />`.
      * **Nâng cấp `<SaoTransactionItem>`:**
        - Hỗ trợ đầy đủ biến thể `type="transfer"`: vạch quang học mép trái màu xanh cyan (`barCyan`), màu số tiền phát quang `#00f0ff`.
        - Hỗ trợ prop `icon`: hiển thị icon chiều tiền tương ứng (`ArrowDown` xanh lục cho Thu, `ArrowUp` đỏ cho Chi, `ArrowRightLeft` cyan cho Chuyển khoản) trong khung kính HUD vát góc 4px.
        - Hiển thị trực quan luồng chuyển khoản: `Ví A → Ví B`.
        - Tích hợp cụm nút thao tác trực tiếp `onEdit` và `onDelete` (variant `ghost` và `danger`) gọn gàng bên cạnh số tiền.
        - Click vào toàn bộ dòng để mở modal chỉnh sửa giao dịch nhanh.

  - **Cấp độ 3 / 4 - Tái cấu trúc Toàn diện Tab Sổ Nợ (`DebtsTab.tsx`) & Component Thẻ Nợ (`SaoDebtCard.tsx`):**
    + **Thanh Tìm kiếm & Bộ lọc 2 lớp chuẩn HUD (L37-L45):**
      * Thay thế 3 nút bấm tĩnh cũ bằng thanh Toolbar hiện đại:
        - `<SaoSearchInput />`: Tìm kiếm đa năng người nợ, ví nguồn, số tiền, ngày hạn chót hoặc ghi chú lịch sử.
        - `<SaoSelect /> Phân loại nợ`: Lọc theo `Tất cả`, `Cho vay` (`lent`), `Đi vay` (`borrowed`).
        - `<SaoSelect /> Trạng thái`: Lọc theo `Tất cả`, `Chưa trả` (`unpaid`), `Đã trả 1 phần` (`partial`), `Đã thanh toán` (`paid`).
    + **Bố cục Khung Trung tâm Cân đối (`.debtsContainer` - max-width: 960px):**
      * Đưa toàn bộ Tab Sổ Nợ vào khung trung tâm `max-width: 960px; margin: 0 auto;`, triệt tiêu cảm giác lệch hay dàn trải quá thưa trên Laptop.
      * Lưới `.debtsGrid` bố trí chuẩn **2 cột cân đối** (`repeat(2, 1fr)`) trên Desktop/Laptop (~472px mỗi thẻ) và 1 cột trên Mobile, giúp giao diện thông thoáng, đủ chỗ cho các nút bấm và tiến độ mà không bị chật.
    + **Component Chuyên trách Thẻ Nợ chuẩn SAO HUD (`SaoDebtCard.tsx` & `.module.css`):**
      * Thay thế toàn bộ mã JSX thô và `<details>` HTML cũ (L49-L127) bằng `<SaoDebtCard />`.
      * **Hình khối vát góc đối xứng 14px:** Góc vát trên-trái và dưới-phải (`clip-path`), đường viền mảnh 1px tinh tế (không dùng viền neon 2px dày theo đúng góp ý của người dùng).
      * **Trục quang học mép trái (`leftAccentBar`):** Xanh lục bảo `#00ffaa` cho Cho vay (`lent`), Vàng hổ phách `#ffaa00` cho Đi vay (`borrowed`), Cyan mờ khi Đã thanh toán (`paid`).
      * **Header danh tính:** Avatar User vát góc 6px, tên đối tác đậm, nhãn loại nợ, badge trạng thái màu sắc tương ứng, nút Edit bút chì cùng hàng không bị đè chữ.
      * **Thanh đo HP Gauge:** Hiển thị `Đã trả: X / Tổng: Y VND`, thanh đo HP năng lượng %, số tiền còn lại phát quang font `Tauri` và hạn chót lịch neon.
      * **Accordion Lịch sử giao dịch HUD:** Đóng/mở êm dịu, danh sách từng lần trả bớt / vay thêm kèm ví nguồn và số tiền.
      * **Cụm 2 nút tương tác nhanh:** `<SaoButton variant="primary">` (Thu nợ / Trả nợ) và `<SaoButton variant="default">` (Cho vay thêm / Vay thêm).
      * **Con dấu Holographic `CLEARED`:** Hiển thị mờ tinh tế ở góc phải khi khoản nợ đã hoàn tất 100%.

  - **Nâng cấp Toàn diện Dải Tab Di Động - SAO Mobile HUD Tab Selector (`SaoTabs.tsx` & `.module.css`):**
    + **Nhược điểm của các giải pháp trước:**
      * Dải tab ngang cố định bị tràn màn hình, xén cụt góc ("chỉ thấy 1 phần"), buộc phải cuộn trái phải cấn mắt.
      * Dồn 5 tab vào 1 hàng ngang khiến các nút ép chặt vào nhau ("dồn vào nhau"), vát góc của khung bao bọc cắt xén nút đầu và nút cuối ("khuyết 1 ít"), chữ dài bị `...` lập tức.
    + **Giải pháp hoàn thiện - SAO Mobile HUD Selector (Theo lựa chọn tối ưu của người dùng):**
      * **Trên Desktop (> 768px):** Giữ nguyên vẹn 100% thanh HUD Console cơ khí vát góc đối xứng, vạch quang học và hiệu ứng chuyển tab mượt mà.
      * **Trên Mobile (<= 768px):** Ẩn thanh console dài, chuyển sang **Thanh chọn HUD 1 dòng siêu gọn gàng**:
        - Chiều cao chỉ ~46px, 100% full-width, góc vát đối xứng 10px thuộc về chính thanh điều khiển (không có tab nào bên trong bị khuyết góc).
        - Hiển thị nổi bật Icon tab đang chọn (trong ô vát 4px glow cyan), Tên tab rõ ràng font `Tauri` đậm (không bao giờ bị `...`), kèm thẻ telemetry `MỤC X / Y` và nút `CHUYỂN MỤC ▼`.
        - Khi chạm vào: Mở menu chọn tab Holographic rủ xuống êm ái với `backdrop-filter: blur(20px)`, hiển thị trọn vẹn toàn bộ 5 tab với icon, tên chữ đầy đủ, đánh số thứ tự `01, 02...` và huy hiệu `✓ ĐANG CHỌN`.
        - Tự động đóng khi chạm ra ngoài hoặc chọn xong tab mới. Hoàn toàn giải phóng không gian màn hình, triệt tiêu mọi cảm giác chật chội hay khuyết góc.

  - **Sửa Lỗi Ngắt Dòng Icon Ví Trong Thẻ Nợ (`SaoDebtCard.tsx` & `.module.css`):**
    + **Nguyên nhân:** Lỗi ngắt dòng CSS (wrapping bug) do thẻ `<span className={styles.recordWallet}>` mặc định là `display: inline`, khi danh sách thu hẹp hoặc có thanh cuộn dọc bên phải đã kích hoạt ngắt dòng giữa `<svg>` và tên text `MB Bank`.
    + **Khắc phục:** Định hình `.recordWallet` thành `display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; flex-shrink: 0;`, bọc text tên ví vào `<span>`, khóa chặt icon ví và tên ví luôn nằm cùng 1 dòng liền kề với ngày tháng.

  - **Khắc phục & Nâng cấp Thanh Điều Hướng Đáy Di Động (`layout.tsx` & `layout.module.css`):**
    + **Nguyên nhân click "Thêm" không hiện bảng tùy chọn con:**
      * Trong `layout.module.css:L906-L911`, `.mobileDrawerBackdrop` và `.mobileMoreDrawer` được gán `display: none` (cho desktop). Nhưng bên trong `@media (max-width: 768px)`, 2 class này lại thiếu thuộc tính `display: block;` nên vẫn kế thừa `display: none` của desktop, dẫn đến việc dù state React đã render ra DOM nhưng trình duyệt hoàn toàn ẩn đi!
      * Cơ chế lưu state `mobileMorePathname === pathname` gây phụ thuộc chuỗi đường dẫn dễ lệch trạng thái khi navigation chưa đồng bộ.
    + **Khắc phục & Nâng cấp toàn diện:**
      * Bổ sung `display: block;` chuẩn xác trong media query mobile cho cả `.mobileDrawerBackdrop` và `.mobileMoreDrawer`.
      * Chuyển sang state boolean `mobileMoreOpen` trực quan, tự động đóng khi `pathname` thay đổi.
      * **Nâng cấp Dock `mobileBottomNav`:** Dải laser quang học đỉnh `.mobileBottomNavLaserRail`, hiệu ứng tab active với vạch neon chỉ thị đỉnh, icon phát quang drop-shadow, nhịp thở của nút "Thêm".
      * **Nâng cấp Drawer `mobileMoreDrawer`:** Thiết kế Holographic vát góc 12px, nền kính mờ `blur(20px)`, animation trượt lên êm ái, thẻ ứng dụng 2 cột có khung icon phát quang riêng biệt và chấm active chỉ thị cho từng mục (`Hồ sơ`, `Sức khỏe`, `Mua sắm`, `Cài đặt`).

  - **Chuẩn hóa & Tái cấu trúc Toàn tầng Trang Hồ Sơ Nhân Vật (`profile/page.tsx` & `profile.module.css`):**
    + **Tầng 2 (Page Controller):**
      * Thay thế `div.loadingState + Loader2` viết tay bằng `<SaoLoading fullPage />` đồng bộ toàn hệ thống.
      * Bỏ thanh header to ở trên cùng để tiết kiệm không gian, đưa các panel dữ liệu lên cao thoáng đãng.
    + **Tầng 3 & Tầng 4 (Sections & Panels):**
      * Thay thế toàn bộ các khối `.formSection` thô bằng `<SaoPanel>` chuyên trách (Variant `primary` cho Player Card, `cyan` cho Basic Info, `gold` cho Security).
      * **Bố cục 2 cột cân xứng chuẩn tỉ lệ trên Desktop/Laptop:**
        - Cột trái (340px): Khung giáp Avatar MMORPG đa tầng (`.gameAvatarChassis`) với ngàm quang học 4 góc, viền bát giác hào quang aura và tia scanline chuyển động. Huy hiệu cấp độ thiết kế mới dạng MMORPG Rank Crest cách điệu có cánh (`« ❖ LV.4 ❖ »`).
        - Bổ sung thanh đo **MP** (xanh dương/tím) bên cạnh **HP** (làm tròn số nguyên không còn số lẻ) và **EXP**.
        - Căn giữa nút tải ảnh đại diện, lược bỏ dòng chú thích tỉ lệ 1:1.
        - Cột phải (flex: 1): Panel Thông tin cơ bản và Panel Bảo mật đổi mật khẩu. Trường Email được bọc hiệu ứng khóa hệ thống (sọc chéo công nghệ chìm + huy hiệu `KHÓA HỆ THỐNG`).
    + **Hệ thống Cấp độ & Lũy tiến EXP Game Mechanics (`lib/gameLevel.ts`):**
      * Quy định Cấp tối đa MAX = 10 (`MAX_LEVEL = 10`).
      * Đường cong kinh nghiệm tăng vọt theo cấp (Lv1: 500 EXP, Lv4: 3500 EXP, Lv9: 40,000 EXP), loại bỏ lỗi EXP vượt ngưỡng trần (1650 / 1000). Đồng bộ xuyên suốt toàn bộ API Tasks, Health, YuiEngine và Profile.
    + **Tầng 5 (Atoms):** Tận dụng 100% component có sẵn: `<SaoPanel>`, `<SaoInput>`, `<SaoButton>`, `<SaoImageUpload>`, `<SaoLoading>`.
    + **Tối ưu Mobile:** Tự động gập về 1 cột, padding đáy an toàn phía trên thanh Dock `mobileBottomNav`.

  - **Chuẩn hóa & Nâng cấp Toàn tầng Trang Sức Khỏe - Health (`health/page.tsx` & `health.module.css`):**
    + **Tầng 2 (Page Controller):**
      * Thay thế loader đơn sơ bằng `<SaoLoading fullPage />` đồng bộ giao diện toàn hệ thống.
      * Lược bỏ thanh `.header` to bản cố định ở trên cùng để tối ưu chiều cao hiển thị, đưa ngay 3 thẻ chỉ số cơ thể lên đầu trang.
    + **Tầng 4 (Chỉ số Cơ thể - Vitals HUD Metric Cards):**
      * Thay thế toàn bộ 3 thẻ thô `.statCard` trước đây bằng `<SaoSummaryCard>` chuẩn hóa SAO:
        - **Cân nặng:** Icon `<Scale>`, số đo kèm đơn vị `kg`, trạng thái cập nhật (hôm nay / hôm qua / X ngày trước), Variant `primary`, hỗ trợ click trực tiếp để mở nhanh Modal ghi cân nặng.
        - **Chiều cao:** Icon `<Ruler>`, số đo kèm đơn vị `cm`, Variant `default`, hỗ trợ click để sửa nhanh.
        - **BMI:** Icon `<Activity>`, tự động tính toán chỉ số và phân loại thể trạng với màu tương ứng (Gầy/Thừa cân: `balance` cyan, Bình thường: `income` xanh lục, Béo phì: `expense` đỏ viền cảnh báo).
        - **Mobile:** Tự động hiển thị 2 cột (Cân nặng & Chiều cao), thẻ BMI chiếm trọn 2 cột bên dưới.
    + **Tầng 3 (Sections/Panels & Biểu đồ HUD):**
      * Thay thế 3 khối `.chartSection` thô bằng `<SaoPanel>` chuyên trách:
        - **Panel 1 - Biến động Cân nặng (Variant `primary`):** Lược bỏ nút "+ Chỉnh sửa" ở header panel để tránh trùng lặp (vì người dùng có thể click trực tiếp vào thẻ Cân nặng ở trên để mở modal), biểu đồ Recharts LineChart có chiều cao cố định `260px` kèm `minHeight` chống co rút flex, Tooltip SAO Cyber HUD phát quang.
        - **Panel 2 - Dinh dưỡng 7 ngày gần nhất (Variant `cyan`):** Tích hợp biểu đồ phối hợp đa trục `ComposedChart`:
          + **Trục trái (Y-Left):** Thang đo Năng lượng Calo (Kcal) với đường Line cam neon (`#ffaa00`) lướt trên cùng.
          + **Trục phải (Y-Right):** Thang đo Khối lượng Dinh dưỡng (g) với 4 cột phân lớp xếp chồng: Đạm (`#00f0ff`), Tinh bột (`#00ffaa`), Béo (`#ffaa00`), Đường (`#ff4444`).
          + **Độ rộng cột Macro:** Mở rộng từ `28px` lên `52px` (`maxBarSize={52}`), các cột nhìn dày dặn, vững chãi, cân đối trên khung màn hình lớn.
          + **Cụm Chú thích (Legend) đưa lên đầu biểu đồ:** Chuyển từ chân biểu đồ lên trên đỉnh biểu đồ (phía trên khung đồ họa), đảo đường Calo (`--●-- Calories`) lên vị trí ưu tiên đầu tiên, sau đó lần lượt là 4 khối màu Macros (Đạm, Tinh bột, Béo, Đường), không còn bị chèn lộn xộn.
          + **Tooltip Combo SAO:** Hiển thị tổng Calo nổi bật cùng bảng chi tiết 4 thành phần Macros khi rê chuột vào bất kỳ ngày nào.
        - **Panel 3 - Bác sĩ AI Yui (Variant `gold`):** Nút hành động `<SaoButton variant="primary">` góc header kích hoạt phân tích thể trạng tức thì với icon xoay `spin` khi đang xử lý; hiển thị huy hiệu thời gian phân tích và nội dung định dạng markdown SAO khoa học, rõ ràng.
      * **Khắc phục lỗi biểu đồ bị nén / biến mất:**
        - Nguyên nhân: Các thẻ `SaoPanel` đặt trong `.scrollArea` có `display: flex; flex-direction: column;` nhưng thiếu `flex-shrink: 0;`, dẫn đến trình duyệt tự động co nén Panel 1 và Panel 2 xuống ~30px-60px để nhét vừa màn hình mà không kích hoạt cuộn trang; đồng thời Recharts `ResponsiveContainer` bị tính `height = 0`.
        - Khắc phục: Khóa `flex-shrink: 0;` cho `.panel` trong `SaoPanel.module.css` và `.scrollArea > *`, đồng thời trang bị `.chartContainer` & `.chartHalfBox` với `height` và `minHeight` rõ ràng, đảm bảo biểu đồ luôn hiển thị đầy đủ, sắc nét và kích hoạt thanh cuộn dọc mượt mà.
    + **Tầng 4 & 5 (Modals & Form Primitives):**
      * Sử dụng `<SaoModal>` với icon `<Scale>`, form điều khiển gồm `<SaoDatePicker>` chọn ngày ghi nhận, `<SaoInput>` nhập cân nặng & chiều cao.
      * Cụm nút chân modal chuẩn hóa `<SaoButton variant="default">` (Hủy) và `<SaoButton variant="primary">` (Lưu thông số).

  - **Chuẩn hóa & Tái cấu trúc Toàn tầng Trang Nhiệm Vụ - Tasks (`tasks/page.tsx` & `tasks.module.css`):**
    + **Tầng 2 (Page Controller):**
      * Lược bỏ thanh `.header` thô to bản trên cùng, đưa ngay cụm chỉ số Quest Overview lên đỉnh trang.
      * Tích hợp tính toán tự động: Số lượng nhiệm vụ, tỉ lệ hoàn thành, tổng EXP tiềm năng và EXP đã nhận.
    + **Tầng 4 (Chỉ số Nhiệm vụ - Quest Summary Cards):**
      * **Desktop:** Bộ 3 thẻ `<SaoSummaryCard>` trải đều 100% bề ngang, tích hợp chuyển đổi nhanh tab bộ lọc khi click:
        - **Nhiệm vụ đang làm:** Variant `balance` (Cyan), hiển thị tổng EXP thưởng tiềm năng.
        - **Nhiệm vụ hoàn thành:** Variant `income` (Xanh lục), hiển thị số lượng và tổng EXP đã thu về.
        - **Tiến độ / Quá hạn:** Tự động phát hiện nếu có nhiệm vụ quá hạn -> chuyển sang Variant `expense` (Đỏ cảnh báo trừng phạt EXP); nếu không có quá hạn -> hiển thị tỉ lệ tiến độ % (Variant `primary`).
      * **Mobile (Đột phá Tiết kiệm Không gian - 3-in-1 Compact HUD Card):**
        - Loại bỏ hoàn toàn bố cục 2 hàng cồng kềnh (chiếm >210px chiều cao).
        - Thay thế bằng **1 khung tổng hợp duy nhất dạng HUD Strip siêu mỏng (~68px)** chia 3 cột cân xứng: `Đang làm`, `Đã xong`, `Quá hạn` (hoặc `Tiến độ`), ngăn cách bởi các vạch laser phân cách.
        - Tích hợp đầy đủ chỉ số, nhãn, số lượng, EXP thưởng/trừ và hỗ trợ chạm trực tiếp để kích hoạt bộ lọc tab tương ứng.
        - Giúp tiết kiệm hơn **140px chiều cao màn hình**, người dùng nhìn thấy ngay danh sách nhiệm vụ mà không cần cuộn trang.
    + **Tầng 3 (Thanh Công Cụ - Quest Toolbar):**
      * Bộ lọc trạng thái chuyển đổi thành dropdown filter cố định kích thước gọn gàng bằng `<SaoSelect icon={<Filter />}>` (`width: 175px !important; flex: 0 0 175px !important;`), chấm dứt hiện tượng nút filter bị kéo giãn dài quá mức.
      * Thanh tìm kiếm `<SaoSearchInput>` đặt trước bộ lọc, chiếm trọn phần không gian còn lại (`flex: 1; min-width: 320px;`) giúp thanh tìm kiếm trên Laptop rộng dài và thoáng đãng; trên Mobile co giãn tỉ lệ `1.5 : 1` tối ưu diện tích.
      * Nút thêm nhiệm vụ chuẩn hóa thành **Floating Action Button (FAB)** hình tròn (`<SaoButton shape="round">`):
        - Desktop: Neo góc phải dưới (`bottom: 30px; right: 30px; width: 50px; height: 50px;`).
        - Mobile: Neo góc TRÁI dưới (`bottom: 12px; left: 12px; right: auto; width: 46px; height: 46px;`) đồng bộ 100% với chuẩn `finance.module.css` và `menu.module.css`, hoàn toàn không đè lên thẻ nội dung và tránh va chạm với Yui Assistant ở góc phải.
    + **Tầng 4 (Thẻ Nhiệm vụ - SAO Cyber Quest Card):**
      * **Bố cục Lưới Trải Rộng Toàn Chiều Ngang (`width: 100%`):** Thiết lập `width: 100%` cho `.tasksContainer`, `.gridStats` và `.taskList`, triệt tiêu dứt điểm hiện tượng 3 thẻ trên cùng và các thẻ nhiệm vụ bị thu nhỏ rồi dồn cục sang bên trái.
      * **Họa Tiết SAO MMORPG Chuẩn Mực:**
        - Nền kính trong suốt Hologram cyber glass (`backdrop-filter: blur(12px)`), tinh chỉnh độ trong suốt nhẹ nhàng thanh thoát (`rgba(..., 0.25 - 0.45)`) trên tất cả các trạng thái Đang làm, Đã xong và Quá hạn. Triệt tiêu dứt điểm tình trạng thẻ quá hạn / đã hoàn thành bị biến thành mảng màu đặc đục, tối sẫm ("đậm đà") che khuất hình nền thành nổi Aincrad.
        - Lưới ma trận HUD Hologram đồng nhất (radial glow + grid hairline neon) ánh xạ theo màu trạng thái (Cyan cho thường, Ngọc bích cho đã xong, Đỏ thẫm cho quá hạn).
        - Vát góc chamfer 14px chuẩn thiết kế Sword Art Online.
        - Cặp ngàm vi công nghệ góc trên-trái và dưới-phải: Tinh thể thoi neon phát quang `◆` (`cardDiamondTL`, `cardDiamondBR`) kết hợp đường ray laser hairline (`cardLineTL`, `cardLineBR`) phát sáng theo màu trạng thái (Cyan, Đỏ quá hạn, Xanh ngọc hoàn tất).
      * **Khắc phục Triệt Để Vấn Đề Chèn Ép Nội Dung:**
        - Tách tầng thông tin thành 3 hàng độc lập và thoáng đãng:
          + **Hàng 1 (Header):** Checkbox HUD node xoay 45° + Huy hiệu Rank `« RANK X »` bên trái; Cụm nút thao tác (Sửa & Xóa dạng compact ghost button) bên phải.
          + **Hàng 2 (Tiêu đề):** Tiêu đề nhiệm vụ được giải phóng chiếm **100% bề ngang**, không bị các nút bấm đè ép hay che khuất.
          + **Hàng 3 (Footer Telemetry & Thưởng):** Huy hiệu Hạn chót đếm ngược (`<Clock>` / `<Flame>`) bên trái và Chip thưởng `+X EXP` bên phải, luôn hiển thị đầy đủ không bị cắt xén đáy.
      * **Checkbox kim cương/lục giác HUD xoay 45°:** Hiệu ứng hover phát quang, checkmark xanh ngọc drop-shadow khi hoàn thành, dấu X đỏ khi quá hạn.
      * **Hệ thống Huy hiệu Rank MMORPG:**
        - Rank S: Vàng kim hào quang `« RANK S »` (+1000 EXP).
        - Rank A: Tím sử thi `« RANK A »` (+600 EXP).
        - Rank B: Cyan hiếm `« RANK B »` (+300 EXP).
        - Rank C: Xanh lục phổ thông `« RANK C »` (+150 EXP).
        - Rank D: Bạc cơ bản `« RANK D »` (+50 EXP).
      * **Chip Thưởng EXP:** Tag kim loại neon `+X EXP` kèm icon `<Sparkles>`.
      * **Hiển thị Mô tả chi tiết:** Hỗ trợ mô tả nhiệm vụ dài mà không làm vỡ bố cục.
      * **Huy hiệu Đếm ngược Hạn chót Telemetry:** Cảnh báo trực quan theo cấp độ (Khẩn cấp `<Flame>` nhấp nháy đỏ khi còn dưới 2h, Hôm nay màu cam, Quá hạn màu đỏ, Ngày mai màu cyan).
    + **Tầng 4 & 5 (Modals & Form Primitives):**
      * Chuẩn hóa Modal Thêm/Sửa bằng `<SaoModal>`, `<SaoInput>` (hỗ trợ cả textarea mô tả), `<SaoSelect>` cho Rank, `<SaoDatePicker>` và cụm chọn Giờ:Phút liền lạc.
      * Chuẩn hóa Modal xác nhận xóa bằng `<SaoModal>` và `<SaoButton variant="danger">`.

---
*(Tiếp tục audit và chuẩn hóa các trang nhánh tiếp theo)*
