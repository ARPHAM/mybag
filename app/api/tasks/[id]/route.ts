import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { getExpForNextLevel, MAX_LEVEL } from '@/lib/gameLevel';
import { getRequestNow } from '@/lib/simClock';

const EXP_REWARDS = {
  S: 1000,
  A: 600,
  B: 300,
  C: 150,
  D: 50,
};

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });
    }

    const body = await req.json();
    const { status, title, description, quest_rank, due_date } = body;
    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }

    const task = await Task.findOne({ _id: taskId, user_id: decoded.userId });
    if (!task) {
      return NextResponse.json({ error: 'Quest không tồn tại' }, { status: 404 });
    }

    const now = getRequestNow(req);
    // Nếu chuyển status thành COMPLETED (chống race condition bằng atomic claim)
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      const claimed = await Task.findOneAndUpdate(
        { _id: taskId, user_id: decoded.userId, status: { $ne: 'COMPLETED' } },
        { $set: { status: 'COMPLETED', completed_at: now } },
        { returnDocument: 'after' }
      );
      if (!claimed) {
        return NextResponse.json({ message: 'Quest đã được hoàn thành trước đó', task, reward: { exp: 0, leveledUp: false } });
      }
      // Cấp phát EXP
      const user = await User.findById(decoded.userId);
      if (user) {
        // 1. Kiểm tra giới hạn EXP nhận mỗi ngày theo giờ Việt Nam
        const vnDate = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const todayKey = `${vnDate.getUTCFullYear()}-${String(vnDate.getUTCMonth() + 1).padStart(2, '0')}-${String(vnDate.getUTCDate()).padStart(2, '0')}`;

        if (user.last_task_exp_date !== todayKey) {
          user.last_task_exp_date = todayKey;
          user.today_task_exp = 0;
        }

        const baseRewardExp = EXP_REWARDS[claimed.quest_rank as keyof typeof EXP_REWARDS] || 50;
        const MAX_DAILY_EXP = 3000;
        const currentTodayExp = user.today_task_exp || 0;
        const availableExp = Math.max(0, MAX_DAILY_EXP - currentTodayExp);
        const actualRewardExp = Math.min(baseRewardExp, availableExp);

        user.current_exp += actualRewardExp;
        user.today_task_exp = currentTodayExp + actualRewardExp;

        let leveledUp = false;
        let requiredExp = getExpForNextLevel(user.level);

        // Level up logic (Max level = 10)
        while (user.level < MAX_LEVEL && user.current_exp >= requiredExp) {
          user.current_exp -= requiredExp;
          user.level += 1;
          leveledUp = true;
          requiredExp = getExpForNextLevel(user.level);
        }
        if (user.level >= MAX_LEVEL) {
          user.level = MAX_LEVEL;
        }

        // Hồi lại MP khi hoàn thành task (có chút ngẫu nhiên)
        const mpReward = Math.floor(Math.random() * 21) + 40; // 40 - 60 MP
        user.current_mp = Math.min(user.max_mp, user.current_mp + mpReward);

        await user.save();

        claimed.mp_rewarded = mpReward;
        claimed.exp_rewarded = actualRewardExp;
        await claimed.save();

        return NextResponse.json({ 
          message: actualRewardExp < baseRewardExp ? 'Quest Cleared! (Đạt giới hạn EXP ngày)' : 'Quest Cleared!', 
          task: claimed, 
          reward: { exp: actualRewardExp, leveledUp, newLevel: user.level } 
        });
      }
    } else if (status && status !== 'COMPLETED' && task.status === 'COMPLETED') {
      // Thu hồi EXP & MP khi hoàn tác Quest sang BẤT KỲ trạng thái nào khác COMPLETED (chống farm vô hạn)
      if (!['PENDING', 'IN_PROGRESS', 'OVERDUE'].includes(status)) {
        return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
      }
      const user = await User.findById(decoded.userId);
      if (user) {
        const penaltyExp = task.exp_rewarded !== undefined ? task.exp_rewarded : (EXP_REWARDS[task.quest_rank as keyof typeof EXP_REWARDS] || 50);
        user.current_exp -= penaltyExp;

        // Chỉ hoàn lại hạn mức EXP ngày nếu task này được hoàn thành trong hôm nay (giờ VN)
        const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const todayKey = `${vnNow.getUTCFullYear()}-${String(vnNow.getUTCMonth() + 1).padStart(2, '0')}-${String(vnNow.getUTCDate()).padStart(2, '0')}`;
        const completedVn = task.completed_at ? new Date(new Date(task.completed_at).getTime() + 7 * 60 * 60 * 1000) : null;
        const completedKey = completedVn ? `${completedVn.getUTCFullYear()}-${String(completedVn.getUTCMonth() + 1).padStart(2, '0')}-${String(completedVn.getUTCDate()).padStart(2, '0')}` : '';

        if (completedKey === todayKey && user.last_task_exp_date === todayKey && user.today_task_exp) {
          user.today_task_exp = Math.max(0, user.today_task_exp - penaltyExp);
        }

        let leveledDown = false;
        while (user.current_exp < 0 && user.level > 1) {
          user.level -= 1;
          const requiredExpForPrevLevel = getExpForNextLevel(user.level);
          user.current_exp += requiredExpForPrevLevel;
          leveledDown = true;
        }
        if (user.current_exp < 0) user.current_exp = 0;

        const mpToDeduct = task.mp_rewarded || 50;
        user.current_mp = Math.max(0, user.current_mp - mpToDeduct);
        if (user.current_hp > user.max_hp) user.current_hp = user.max_hp;
        if (user.current_mp > user.max_mp) user.current_mp = user.max_mp;

        await user.save();

        task.status = status;
        task.completed_at = undefined;
        task.mp_rewarded = 0;
        task.exp_rewarded = 0;
        await task.save();

        return NextResponse.json({ 
          message: 'Đã hoàn tác Quest', 
          task,
          penalty: { expLost: penaltyExp, mpLost: mpToDeduct, leveledDown, newLevel: user.level }
        });
      }
    } else {
      // Đổi sang status khác hoặc cập nhật thông tin task
      if (status) {
        if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'].includes(status)) {
          return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
        }
        task.status = status;
      }
      if (title !== undefined) {
        const titleStr = String(title).trim();
        if (!titleStr || titleStr.length > 200) {
          return NextResponse.json({ error: 'Tiêu đề nhiệm vụ không hợp lệ (1-200 ký tự)' }, { status: 400 });
        }
        task.title = titleStr;
      }
      if (description !== undefined) {
        task.description = String(description).trim();
      }
      if (quest_rank) {
        if (!['S', 'A', 'B', 'C', 'D'].includes(quest_rank)) {
          return NextResponse.json({ error: 'Xếp hạng Quest không hợp lệ' }, { status: 400 });
        }
        task.quest_rank = quest_rank;
      }
      
      if (due_date) {
        const d = new Date(due_date);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Hạn chót không hợp lệ' }, { status: 400 });
        }
        task.due_date = d;
        
        // Nếu thay đổi hạn và task đang OVERDUE, kiểm tra xem ngày mới đã qua chưa
        // Nếu ngày mới lớn hơn hiện tại thì reset lại về PENDING
        if (task.status === 'OVERDUE' && task.due_date > now) {
          task.status = 'PENDING';
        }
      }
      
      await task.save();
    }

    return NextResponse.json({ message: 'Cập nhật trạng thái thành công', task });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const resolvedParams = await params;
    const taskId = resolvedParams.id;
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'ID không hợp lệ' }, { status: 400 });
    }
    await Task.findOneAndDelete({ _id: taskId, user_id: decoded.userId });
    return NextResponse.json({ message: 'Quest Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
