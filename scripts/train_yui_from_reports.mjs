import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const envContent = fs.readFileSync('.env', 'utf8');
const uriMatch = envContent.match(/MONGO_URI=(.+)/);
if (!uriMatch) {
  console.error('Không tìm thấy MONGO_URI trong .env');
  process.exit(1);
}
const MONGO_URI = uriMatch[1].trim();

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('--- KẾT NỐI DATABASE THÀNH CÔNG ---');

  const collection = mongoose.connection.collection('yuireports');
  const pendingReports = await collection.find({ status: 'pending' }).sort({ createdAt: 1 }).toArray();

  console.log(`\n=== TÌM THẤY ${pendingReports.length} BÁO CÁO CẦN HUẤN LUYỆN YUI ===\n`);

  if (pendingReports.length === 0) {
    console.log('Không có báo cáo nào đang chờ xử lý.');
    await mongoose.disconnect();
    return;
  }

  for (let i = 0; i < pendingReports.length; i++) {
    const r = pendingReports[i];
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`[CASE #${i + 1}] ID: ${r._id} | Ngày gửi: ${new Date(r.createdAt).toLocaleString('vi-VN')}`);
    console.log(`- Câu nói của Papa:   "${r.user_message}"`);
    console.log(`- Yui đã trả lời:    "${r.yui_reply}"`);
    if (r.suggested_actions && r.suggested_actions.length > 0) {
      console.log(`- Actions Yui đề xuất:`, JSON.stringify(r.suggested_actions, null, 2));
    }
    console.log(`>>> MONG MUỐN THỰC SỰ: "${r.expected_behavior}"`);
    console.log(`--------------------------------------------------------------------------------\n`);
  }

  console.log(`\n[HƯỚNG DẪN]`);
  console.log(`1. Đọc các ca thực tế trên và cập nhật Rule/Grounding/Few-shot tương ứng trong lib/yuiEngine.ts.`);
  console.log(`2. Để đánh dấu đã huấn luyện xong, chạy script với flag: node scripts/train_yui_from_reports.mjs --mark-trained\n`);

  if (process.argv.includes('--mark-trained')) {
    const ids = pendingReports.map(r => r._id);
    await collection.updateMany(
      { _id: { $in: ids } },
      { $set: { status: 'trained', updatedAt: new Date(), notes: 'Đã tích hợp vào Yui Engine' } }
    );
    console.log(`=> Đã cập nhật trạng thái "trained" cho ${ids.length} báo cáo!`);
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Lỗi khi chạy script:', err);
  process.exit(1);
});
