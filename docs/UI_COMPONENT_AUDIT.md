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
  * `MealHistoryView`: Danh sách các bữa ăn đã ghi nhận kèm dinh dưỡng.
  * `RecipeBookView`: Sổ tay công thức nấu ăn.
  * `InventoryTab`: Kho thực phẩm / gia vị / đồ dùng kèm bộ lọc danh mục.
* **Tầng 4 (Cards & Modals):**
  * `MealCard`, `RecipeCard`, `InventoryItemCard`.
  * `MealModal`: Thêm/sửa bữa ăn (tính calo, chọn trừ kho, chi phí ăn ngoài).
  * `RecipeModal`: Thêm/sửa công thức nấu ăn.
  * `InventoryModal`: Thêm/sửa vật phẩm nhập kho.
  * `BillScanReviewModal`: Modal AI bóc tách hóa đơn siêu thị thành item kho.
  * `SaoConfirmModal` *(Đang tự viết riêng)*.
  * `SaoFab` *(Đang tự viết riêng `.menuFab` + Expanding FAB kho)*.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoImageUpload`, `SaoLoading`.

### 4. Trang Lịch Trình - Calendar (`app/(main)/calendar/page.tsx`)
* **Tầng 2 (Page):** `CalendarPage`
* **Tầng 3 (Views):**
  * `DateSelector`: Thanh điều hướng ngày/tháng, nút Today, nút chuyển Day/Week/Month.
  * `SAOTimeline`: Chế độ xem theo ngày (lưới 24 giờ).
  * `SAOWeekView`: Chế độ xem theo tuần (7 cột).
  * `SAOMonthView`: Chế độ xem theo tháng (dạng ô lịch bàn).
* **Tầng 4 (Cards & Modals):**
  * `CalendarEventCard`: Thẻ hiển thị sự kiện trên lưới lịch.
  * `CalendarQuestCard`: Thẻ hiển thị task/quest đến hạn trong ngày.
  * `EventModal`: Tạo/sửa sự kiện, cấu hình lặp lại.
  * `EventDetailModal`: Xem chi tiết sự kiện đã tạo.
  * `SaoConfirmModal` *(Đang tự viết riêng)*.
  * `SaoFab` *(Đang tự viết riêng `.calendarFab`)*.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`.

### 5. Trang Nhiệm Vụ - Tasks (`app/(main)/tasks/page.tsx`)
* **Tầng 2 (Page):** `TasksPage`
* **Tầng 3 (Views):**
  * `TaskToolbar`: Bộ lọc trạng thái (All / Pending / Completed) & tìm kiếm.
  * `TaskList`: Danh sách nhiệm vụ dạng danh sách thẻ RPG rank (S, A, B, C, D).
* **Tầng 4 (Cards & Modals):**
  * `TaskItemRow`: Dòng thẻ nhiệm vụ với checkbox, rank badge, deadline đếm ngược, nút sửa/xóa.
  * `TaskModal`: Thêm/sửa nhiệm vụ, rank thưởng EXP, hạn chót ngày + giờ.
  * `SaoConfirmModal` *(Đang tự viết riêng)*.
  * `SaoFab` *(Đang tự viết riêng `.tasksFab`)*.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoLoading`.

### 6. Trang Đi Chợ - Shopping (`app/(main)/shopping/page.tsx`)
* **Tầng 2 (Page):** `ShoppingPage`
* **Tầng 3 (Views):**
  * `SaoTabs`: Lọc danh mục (`all`, `food`, `household`, `other`).
  * `ShoppingListContainer`: Khung danh sách đồ cần mua.
* **Tầng 4 (Cards & Modals):**
  * `ShoppingItemRow`: Dòng item với checkbox mua, nút xóa, nút "Nhập kho".
  * `ShoppingAddModal`: Thêm món cần mua mới.
  * `TransferToInventoryModal`: Modal chuyển trực tiếp món đồ đã mua vào Kho dự trữ.
  * `SaoConfirmModal` *(Đang tự viết riêng)*.
  * `SaoFab` *(Đang tự viết riêng `.shoppingFab`)*.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoSelect`, `SaoDatePicker`, `SaoLoading`.

### 7. Trang Sức Khỏe - Health (`app/(main)/health/page.tsx`)
* **Tầng 2 (Page):** `HealthPage`
* **Tầng 3 (Sections):**
  * `VitalsSummaryCard`: Chiều cao, cân nặng hiện tại, BMI status, nút ghi cân nặng.
  * `WeightHistoryChart`: Biểu đồ Recharts Line theo dõi biến động cân nặng.
  * `NutritionMacrosChart`: Biểu đồ Recharts Bar thể hiện Calo & Macros nạp vào.
  * `AiHealthAdviceCard`: Khối phân tích thể trạng và khuyến nghị từ AI.
* **Tầng 4 (Modals):**
  * `WeightInputModal`: Cập nhật chỉ số cân nặng và chiều cao.
* **Tầng 5 (Atoms):** `SaoModal`, `SaoButton`, `SaoInput`, `SaoDatePicker`, `SaoLoading`.

### 8. Trang Cá Nhân - Profile (`app/(main)/profile/page.tsx`)
* **Tầng 2 (Page):** `ProfileDashboard`
* **Tầng 3 (Sections):**
  * `AvatarSection`: Hiển thị ảnh đại diện và nút tải ảnh mới lên Cloudinary.
  * `BasicInfoSection`: Form cập nhật Username, Email hiển thị.
  * `SecuritySection`: Form đổi mật khẩu bảo mật.
* **Tầng 5 (Atoms):** `SaoInput`, `SaoButton`, `SaoImageUpload`.

### 9. Trang Cài Đặt - Settings (`app/(main)/settings/page.tsx`)
* **Tầng 2 (Page):** `SettingsPage`
* **Tầng 3 (Sections):**
  * `LanguageSection`: Lựa chọn song ngữ Tiếng Việt / English.
  * `ThemeSection`: Bộ sưu tập 8 bảng màu theme SAO.
  * `AccountSection`: Đăng xuất tài khoản.
* **Tầng 4 (Cards & Modals):**
  * `ThemeCard`: Thẻ chọn màu có hiệu ứng glow.
  * `LanguageCard`: Thẻ chọn ngôn ngữ.
  * `SaoConfirmModal` *(Đang dùng `showConfirm` từ Context)*.

---

## III. BẢNG TỔNG HỢP TRÙNG LẶP (DEDUPLICATION - QUY VỀ 1 LẦN)

| STT | Component Chuẩn Đề Xuất | Hiện Trạng Trùng Lặp (Được Tính 1 Lần) | Hướng Chuẩn Hóa |
| :--- | :--- | :--- | :--- |
| **1** | `<SaoConfirmModal>` | Tasks, Calendar, Menu, Shopping, Finance đều tự code lại 1 `<SaoModal>` với icon `AlertTriangle` và 2 nút `SaoButton` ("Hủy", "Xóa"). | Gom thành 1 component `<SaoConfirmModal>` nhận `isOpen, title, message, onConfirm, onCancel, variant`. |
| **2** | `<SaoFab>` *(Floating Action Button)* | 5 trang tự viết CSS riêng cho nút tròn nổi ở góc dưới phải: `.tasksFab`, `.calendarFab`, `.menuFab`, `.financeFab`, `.shoppingFab`. | Gom thành 1 component `<SaoFab icon onClick actions? />`. Tự động tính toán vị trí để né `MobileBottomNav`. |
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
├── SaoMediaPickerButton.tsx
├── SaoMediaPickerButton.module.css
├── SaoConfirmModal.tsx            # (Tạo mới chuẩn hóa)
├── SaoFab.tsx                     # (Tạo mới chuẩn hóa)
├── SaoEmptyState.tsx              # (Tạo mới chuẩn hóa)
├── layout/                        # Component riêng theo nghiệp vụ
│   ├── SaoHeaderStatus.tsx
│   └── SaoHeaderStatus.module.css
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
