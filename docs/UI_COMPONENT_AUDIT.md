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
    - Huy hiệu thông số hệ thống holographic trung tâm: `[ • SYSTEM LINK // ACTIVE ]` với viền vát góc cyber và hiệu ứng thở nhịp chấm tín hiệu.
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
  - Phụ kiện cầu nối `SaoHeaderBridge`: Đường ray laser với luồng photon chuyển động và huy hiệu `[ SYSTEM LINK // ACTIVE ]` tạo điểm nhấn công nghệ HUD mạnh mẽ.
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
*(Tiếp tục audit Tầng 1: MobileBottomNav, YuiAssistant, Toast/Alert...)*
