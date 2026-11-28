# [ PROTOCOL // MHCP-001 ] HƯỚNG DẪN HUẤN LUYỆN & HỌC LIÊN TỤC CHO YUI (CONTINUOUS LEARNING GUIDE)

> **Mục đích tài liệu:** Lưu trữ quy trình, cấu trúc dữ liệu và hướng dẫn vận hành cơ chế **"Huấn luyện Yui" (Continuous Learning Loop)**. Khi Papa (User) yêu cầu:  
> *"Train Yui"*, *"Train bổ sung Yui"*, *"Đọc báo cáo và huấn luyện Yui"* hoặc dẫn link tài liệu này, **AI Assistant (Antigravity)** sẽ tự động thực hiện toàn bộ quy trình mà Papa không cần gõ lệnh thủ công nào.

---

## 1. KIẾN TRÚC & LUỒNG HOẠT ĐỘNG (ARCHITECTURE OVERVIEW)

```mermaid
flowchart TD
    A["Papa nhắn tin với Yui"] --> B{"Yui xử lý đạt kỳ vọng?"}
    B -- "Đạt" --> C["Chấp nhận Action & Thực thi"]
    B -- "Chưa chuẩn / Có lỗi" --> D["Papa bấm nút 'Huấn luyện Yui' (Biểu tượng Mũ cử nhân)"]
    D --> E["Popup Modal: Nhập kỳ vọng thực sự"]
    E --> F["Lưu vào MongoDB: Collection 'yuireports' (status: 'pending')"]
    F --> G["Papa yêu cầu AI: 'Train bổ sung Yui'"]
    G --> H["AI Assistant đọc báo cáo pending & cập nhật lib/yuiEngine.ts"]
    H --> I["AI Assistant đánh dấu 'trained' và kiểm tra type check"]
    I --> J["Yui thông minh hơn ở các lần trò chuyện tiếp theo!"]
```

---

## 2. QUY TRÌNH DÀNH CHO AI ASSISTANT (ANTIGRAVITY PLAYBOOK)

Khi Papa gửi yêu cầu huấn luyện Yui, Antigravity **TỰ ĐỘNG** thực hiện 5 bước sau theo thứ tự:

### BƯỚC 1: Đọc tất cả báo cáo đang chờ (`status: "pending"`)
Chạy lệnh kiểm tra báo cáo:
```bash
node scripts/train_yui_from_reports.mjs
```
*Script sẽ in ra danh sách các case gồm:*
- `user_message`: Câu nói thực tế của Papa.
- `yui_reply`: Lời Yui trả lời tại thời điểm đó.
- `suggested_actions`: Các actions Yui từng sinh ra.
- `expected_behavior`: Mô tả mong muốn thực sự của Papa.
- `context_snapshot`: Ngữ cảnh ví, kho đồ, danh mục tại lúc xảy ra.

### BƯỚC 2: Phân tích & Cập nhật Engine ([lib/yuiEngine.ts](file:///d:/myproject/mybag/lib/yuiEngine.ts))
Dựa vào `expected_behavior`, xác định phương án xử lý:
1. **Bổ sung / Tinh chỉnh Grounding Rules** trong `SYSTEM_PROMPT` của Yui:
   - Quy tắc xử lý từ ngữ (ví dụ: "trả hộ", "hết gia vị", "nấu ăn",...).
   - Quy tắc sinh schema Actions (`actionType`, `meal`, `update_inventory`, `transfer`, `create_shopping_item`,...).
2. **Cập nhật Logic Sanitizer (`sanitizeActions`)**:
   - Tự động chuẩn hóa dữ liệu đầu ra từ LLM trước khi gửi về client (ví dụ: gộp cặp Chi trả hộ + Thu hồi lại thành 1 action `transfer`).
3. **Thêm Few-Shot Examples**:
   - Nếu là ca hội thoại phức tạp hoặc dễ nhầm lẫn, bổ sung mẫu hỏi-đáp vào phần Few-Shot trong prompt.

### BƯỚC 3: Kiểm tra tính toàn vẹn (Type Check & Test)
Kiểm tra TypeScript để đảm bảo không gãy build:
```bash
npx tsc --noEmit
```

### BƯỚC 4: Đánh dấu các báo cáo đã được học (`status: "trained"`)
Chạy script với cờ `--mark-trained`:
```bash
node scripts/train_yui_from_reports.mjs --mark-trained
```
Tất cả các bản ghi pending vừa xử lý sẽ được cập nhật sang `status: "trained"`, kèm thời gian cập nhật.

### BƯỚC 5: Báo cáo kết quả cho Papa
- Tóm tắt ngắn gọn các case vừa học được.
- Giải thích các logic / quy tắc mới đã được nạp vào não bộ Yui.
- Tạo liên kết `file://` tới các file đã cập nhật (VD: [lib/yuiEngine.ts](file:///d:/myproject/mybag/lib/yuiEngine.ts)).

---

## 3. CẤU TRÚC DỮ LIỆU BÁO CÁO (SCHEMA REFERENCE)

Model: [models/YuiReport.ts](file:///d:/myproject/mybag/models/YuiReport.ts)  
Collection: `yuireports`

```typescript
export interface IYuiReport {
  user_id: string;              // ID người dùng (hoặc 'default_user')
  user_message: string;         // Câu nói của Papa
  yui_reply?: string;           // Lời đáp Yui đưa ra
  suggested_actions?: any[];    // Actions Yui đề xuất bị sai/thiếu
  expected_behavior: string;    // Mong muốn thực sự của Papa
  context_snapshot?: {          // Snapshot trạng thái kho đồ, ví, v.v.
    wallets?: any[];
    inventory_items?: any[];
  };
  status: 'pending' | 'reviewed' | 'trained' | 'dismissed';
  notes?: string;               // Ghi chú của AI khi cập nhật
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 4. CÁC ĐIỂM MỞ RỘNG TRONG CODEBASE (KEY EXTENSION POINTS)

1. **Prompt & Quy tắc nền tảng:**
   - [lib/yuiEngine.ts](file:///d:/myproject/mybag/lib/yuiEngine.ts): `YUI_SYSTEM_INSTRUCTION`, `GROUNDING_RULES`, `sanitizeActions`.
2. **API Tiếp nhận Feedback:**
   - [app/api/ai/yui/report/route.ts](file:///d:/myproject/mybag/app/api/ai/yui/report/route.ts): Nhận POST từ giao diện người dùng.
3. **Giao diện Báo cáo:**
   - [app/components/yui/YuiAssistant.tsx](file:///d:/myproject/mybag/app/components/yui/YuiAssistant.tsx): Nút `GraduationCap` và Modal Góp ý.
   - [app/components/yui/YuiAssistant.module.css](file:///d:/myproject/mybag/app/components/yui/YuiAssistant.module.css): Styling SAO Cyberpunk HUD.
4. **Script Huấn Luyện Tự Động:**
   - [scripts/train_yui_from_reports.mjs](file:///d:/myproject/mybag/scripts/train_yui_from_reports.mjs): Truy xuất DB, hiển thị case và cập nhật trạng thái `trained`.

---

## 5. NHẬT KÝ BÀI HỌC ĐÃ TÍCH HỢP (KNOWLEDGE BASE HISTORY)

| Mã Case | Ngày | Ngữ cảnh thực tế | Cách Yui xử lý chuẩn |
|---|---|---|---|
| **KB-001** | 26/11/2026 | "hết cả dầu ăn" khi xào thịt bò | Dầu ăn (Gia vị / `spices`) cập nhật `stock_status: 'out'` và gợi ý mua sắm (`create_shopping_item`), KHÔNG nhét số lượng lớn vào `ingredients_used` của bữa ăn. |
| **KB-002** | 26/11/2026 | "trả hộ anh A 40k ví X, anh A trả lại 40k ví Y" | Đây là luân chuyển dòng tiền qua 2 ví, Yui tự động gộp thành 1 action `transfer` (Ví X -> Ví Y) thay vì tách thành Chi tiêu + Thu nhập làm sai lệch báo cáo tài chính. |
| **KB-003** | 26/11/2026 | "Chuyển 200k từ MB sang tiền mặt do em Tú muốn đổi" | Mô tả hành động/giao dịch viết súc tích, trực diện (2-5 từ) như sổ tay cá nhân: "Em Tú đổi tiền", loại bỏ câu chữ rườm rà robot "Đổi tiền mặt theo yêu cầu của...". |
| **KB-004** | 27/11/2026 | Tạo lịch lấy mẫu và khám sức khỏe định kỳ theo văn bản/ảnh thông báo (tòa GP / Golden Park) | Bắt buộc đối soát chính xác theo dòng/bảng địa điểm trong tài liệu (tòa GP ngày 10/12 lúc 08:00, khám chính ngày 14/12 tại DYM), tuyệt đối không tự bịa hoặc đoán mò ngày lệch ngoài tài liệu. |
| **KB-005** | 27/11/2026 | "Trong kho từ nguyên liệu chính đến gia vị còn thiếu gì cần mua không" | Tự động đối soát nguyên liệu của các công thức nấu ăn (`cong_thuc_nau_an`, đặc biệt món vừa tạo) với kho đồ và danh sách mua, chủ động đề xuất mua bổ sung nguyên liệu/gia vị còn thiếu (như đường, dầu ăn...). |
| **KB-006** | 27/11/2026 | Thêm gia vị vào kho & chỉnh sửa form hành động trên UI | Gia vị (`spices`) quản lý theo `stock_status` ('stable' \| 'low' \| 'out') đồng bộ như popup thủ công. Sửa ngày giờ chuyển sang `SaoDatePicker` portal và xử lý `min-width: 0` chống tràn chatbox. |
| **KB-007** | 27/11/2026 | "Kiểm tra xem bao lâu rồi chưa có ghi chép về lãi suất momo" | Mở rộng lịch sử giao dịch gần nhất lên 40 bản ghi và bổ sung truy vấn tìm kiếm theo từ khóa trong DB (`giao_dich_khop_tu_khoa`), đối soát và tính số ngày chính xác từ lần ghi cuối. |
| **KB-008** | 27/11/2026 | Dán toàn văn thông báo có nhiều cơ sở (như KSK SotaTek: CIC Tower vs Golden Park) mà không kèm yêu cầu cụ thể | Yui chỉ tóm tắt các lựa chọn/mốc thời gian và hỏi người dùng thuộc cơ sở nào; tuyệt đối không tự ý chọn cơ sở (Golden Park) và không tự tạo lịch khi người dùng chưa yêu cầu. |
| **KB-009** | 27/11/2026 | "Ăn cay cay chỉ còn 36 gói", "Ăn đến khi kho còn 36 gói", "Ăn 3 gói cay cay" | Khi ăn thực phẩm trong kho (dù nói xuôi hay nói ngược), chỉ tạo DUY NHẤT 1 action `meal` (`source: 'home'`) với `ingredients_used: [{ invId, qty }]` để backend `/api/meals` tự động trừ kho. Tuyệt đối không tạo thêm action `update_inventory` riêng rẽ (tránh trừ kho 2 lần `*2`). Code sanitizer tự động tính số lượng ăn và triệt tiêu `update_inventory` trùng lặp. |
| **KB-010** | 28/11/2026 | Văn phong thường dân tiếng lóng ("1 xị", "2 củ", "3 củ rưỡi"), câu gộp nhiều việc ("đổ xăng 80k ăn cơm tấm 40k chạy 550k"), câu tự nấu kèm báo hết gia vị | Mở rộng `detectFastScopesAndParams` & Rule 2/5: tự giải mã tiếng lóng tiền Việt (`xị/lít/lốp = 100k`, `củ/chai = 1tr`), ép mọi món ăn/đồ uống ngoài dùng action `meal` (`eat_out`, đủ 4 macros + hồi HP + trừ ví) thay vì `expense`, và giữ trọn vẹn cả `meal` (nhiều nguyên liệu) lẫn `update_inventory` (`stock_status: 'out'`) trong cùng 1 câu. |
| **KB-011** | 28/11/2026 | Chống trừ kép kho/ví (`purchase_shopping`/`create_inventory` + `expense`, và ăn ngoài trùng tên món kho C7) | Bổ sung sanitizer triệt tiêu `expense` trùng tổng/từng món khi đã có `purchase_shopping`/`create_inventory` có `amount > 0`, bảo vệ tuyệt đối bữa ăn ngoài (`source: 'eat_out'`) và bữa tự nấu nhiều nguyên liệu không bị ghi đè nhầm, đồng thời escape regex chống crash với tên kho có ký tự đặc biệt `()`. |
| **KB-012** | 28/11/2026 | Hỏi tổng kết 2 tháng, xu hướng cân nặng 30 ngày & dinh dưỡng 7 ngày ("7 ngày qua ăn đường với dầu mỡ có quá tải không?") | Bổ sung `thang_truoc`, `tong_2_thang_gan_nhat` vào `context.tai_chinh`; `thong_ke_dinh_duong_7_ngay` (tb calo/protein/fat/carbs/sugar) và lịch sử cân nặng 30 ngày (`bien_dong_can_nang_kg`) vào `context.suc_khoe_va_bua_an`, kèm chốt an toàn không bao giờ trả `reply` rỗng. |
