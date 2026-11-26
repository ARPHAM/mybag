import mongoose from 'mongoose';
import dbConnect from '../lib/db';
import User from '../models/User';
import Wallet from '../models/Wallet';
import Inventory from '../models/Inventory';
import { parseYuiRequest } from '../lib/yuiEngine';

interface TestCase {
  id: number;
  title: string;
  userMessage: string;
  validate: (res: any, userContext: any) => { passed: boolean; details: string };
}

async function runTests() {
  console.log('=== KHỞI ĐỘNG KIỂM TRA 5 KỊCH BẢN THỰC TẾ CỦA YUI ASSISTANT ===\n');
  await dbConnect();

  // Tìm người dùng chính
  const user = await User.findOne().sort({ createdAt: 1 }).lean();
  if (!user) {
    console.error('Không tìm thấy người dùng trong cơ sở dữ liệu để test.');
    process.exit(1);
  }
  const userId = (user as any)._id.toString();
  console.log(`- Sử dụng User ID: ${userId} (${(user as any).name || (user as any).email})`);

  // Lấy ngữ cảnh ví và kho để hiển thị
  const wallets = await Wallet.find({ user_id: userId }).lean();
  const inventory = await Inventory.find({ user_id: userId }).lean();
  console.log(`- Danh sách ví hiện có: ${wallets.map(w => `${w.name} (id: ${w._id})`).join(', ')}`);
  console.log(`- Một số món trong kho: ${inventory.slice(0, 5).map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ')}\n`);

  const testCases: TestCase[] = [
    {
      id: 1,
      title: 'Ăn đồ ăn vặt trong kho có tính toán số dư còn lại',
      userMessage: 'Papa vừa ăn 2 gói cay cay, trong kho giờ còn 15*2 gói nha con gái',
      validate: (res) => {
        const hasMeal = res.actions.some((a: any) => a.actionType === 'meal' && /cay\s*cay/i.test(a.food_name || ''));
        const hasInv = res.actions.some((a: any) => a.actionType === 'update_inventory' && (a.quantity === 30 || a.operation === 'set' || a.operation === 'deduct'));
        const meal = res.actions.find((a: any) => a.actionType === 'meal');
        const macrosOk = meal && meal.calo > 0 && meal.protein > 0 && meal.fat > 0 && meal.carbs > 0;
        const passed = Boolean(hasMeal && hasInv && macrosOk);
        return {
          passed,
          details: `Meal action: ${hasMeal ? 'CÓ' : 'THIẾU'}, Update inventory (qty 30): ${hasInv ? 'CÓ' : 'THIẾU'}, Đủ 4 macros: ${macrosOk ? 'ĐẠT' : 'CHƯA ĐỦ'}`
        };
      }
    },
    {
      id: 2,
      title: 'Ghi nhận cân nặng và kiểm tra tính chuẩn xác của điểm EXP',
      userMessage: 'Sáng nay cân thấy lên 47.2 kg rồi Yui ơi, vui quá',
      validate: (res) => {
        const weightAct = res.actions.find((a: any) => a.actionType === 'record_weight');
        const hasWeight = Boolean(weightAct && weightAct.weight === 47.2);
        const reply = res.reply || '';
        const hasFake100Exp = /\+100\s*(?:exp|EXP|điểm)/i.test(reply);
        const passed = hasWeight && !hasFake100Exp;
        return {
          passed,
          details: `Record weight (47.2 kg): ${hasWeight ? 'CÓ' : 'THIẾU'}, Không bịa +100 EXP: ${!hasFake100Exp ? 'ĐẠT' : 'LỖI (vẫn bịa 100 EXP)'}`
        };
      }
    },
    {
      id: 3,
      title: 'Ăn ngoài có trả tiền qua ví - Không sinh duplicate expense',
      userMessage: 'Trưa nay Papa vừa ăn bát bún bò huế 45k trả bằng ví momo',
      validate: (res) => {
        const mealAct = res.actions.find((a: any) => a.actionType === 'meal');
        const hasMeal = Boolean(mealAct && mealAct.amount === 45000 && mealAct.source === 'eat_out');
        const hasDuplicateExpense = res.actions.some((a: any) => a.actionType === 'expense');
        const macrosOk = mealAct && mealAct.calo > 0 && mealAct.protein > 0 && mealAct.fat > 0 && mealAct.carbs > 0;
        const passed = hasMeal && !hasDuplicateExpense && Boolean(macrosOk);
        return {
          passed,
          details: `Meal eat_out (45k): ${hasMeal ? 'CÓ' : 'THIẾU'}, Không tạo duplicate expense: ${!hasDuplicateExpense ? 'ĐẠT' : 'LỖI (trùng expense)'}, Đủ 4 macros: ${macrosOk ? 'ĐẠT' : 'CHƯA ĐỦ'}`
        };
      }
    },
    {
      id: 4,
      title: 'Thanh toán hộ và được hoàn trả ngay qua ví khác (Bản chất Transfer)',
      userMessage: 'Trưa nay Papa trả hộ anh Nam 60k tiền cơm bằng ví Momo, xong anh ấy bắn lại 60k vào tài khoản MB cho Papa rồi',
      validate: (res) => {
        const transferAct = res.actions.find((a: any) => a.actionType === 'transfer');
        const hasTransfer = Boolean(transferAct && transferAct.amount === 60000 && transferAct.wallet_id && transferAct.to_wallet_id);
        const hasExpenseOrIncome = res.actions.some((a: any) => a.actionType === 'expense' || a.actionType === 'income');
        const passed = hasTransfer && !hasExpenseOrIncome;
        return {
          passed,
          details: `Transfer action (60k): ${hasTransfer ? 'CÓ' : 'THIẾU'}, Không sinh expense/income giả: ${!hasExpenseOrIncome ? 'ĐẠT' : 'LỖI (sinh trùng)'}`
        };
      }
    },
    {
      id: 5,
      title: 'Ăn món từ kho đồ/tủ lạnh mà không có phép tính số dư',
      userMessage: 'Tối đói bụng quá nên Papa vừa luộc 2 quả trứng gà trong tủ lạnh ăn rồi nhé',
      validate: (res) => {
        const mealAct = res.actions.find((a: any) => a.actionType === 'meal');
        const hasMeal = Boolean(mealAct && /trứng/i.test(mealAct.food_name || ''));
        const noExpense = !res.actions.some((a: any) => a.actionType === 'expense');
        const macrosOk = mealAct && mealAct.calo > 0 && mealAct.protein > 0;
        const passed = hasMeal && noExpense && Boolean(macrosOk);
        return {
          passed,
          details: `Meal action (trứng): ${hasMeal ? 'CÓ' : 'THIẾU'}, Không trừ tiền oan: ${noExpense ? 'ĐẠT' : 'LỖI'}, Đủ dinh dưỡng: ${macrosOk ? 'ĐẠT' : 'CHƯA ĐỦ'}`
        };
      }
    }
  ];

  let passedCount = 0;

  for (const tc of testCases) {
    console.log(`================================================================================`);
    console.log(`[TEST CASE #${tc.id}] ${tc.title}`);
    console.log(`- Câu nói của Papa: "${tc.userMessage}"`);

    const startTime = Date.now();
    try {
      const result = await parseYuiRequest(userId, tc.userMessage, [], undefined, 'vi');
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      console.log(`- Yui phản hồi (${duration}s):`);
      console.log(`  Summary: "${result.summary}"`);
      console.log(`  Reply:   "${result.reply}"`);
      console.log(`  Actions (${result.actions.length}):`, JSON.stringify(result.actions, null, 2));

      const validation = tc.validate(result, { wallets, inventory });
      if (validation.passed) {
        console.log(`\n=> KẾT QUẢ: [PASSED] ✓`);
        passedCount++;
      } else {
        console.log(`\n=> KẾT QUẢ: [FAILED] ✗`);
      }
      console.log(`- Chi tiết đối soát: ${validation.details}`);
    } catch (err: any) {
      console.error(`=> KẾT QUẢ: [ERROR] Lỗi khi chạy test:`, err?.message || err);
    }
    console.log(`--------------------------------------------------------------------------------\n`);
  }

  console.log(`=== TỔNG KẾT: ${passedCount}/${testCases.length} TEST CASES ĐẠT YÊU CẦU ===\n`);
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});
