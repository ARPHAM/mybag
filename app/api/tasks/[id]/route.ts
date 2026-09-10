import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

const EXP_REWARDS = {
  S: 1000,
  A: 600,
  B: 300,
  C: 150,
  D: 50,
};

// Calculate required EXP for next level (simple scaling)
const getExpForNextLevel = (level: number) => level * 500;

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

    const { status } = await req.json();
    const resolvedParams = await params;
    const taskId = resolvedParams.id;

    const task = await Task.findOne({ _id: taskId, user_id: decoded.userId });
    if (!task) {
      return NextResponse.json({ error: 'Quest không tồn tại' }, { status: 404 });
    }

    // Nếu chuyển status thành COMPLETED
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      task.status = 'COMPLETED';
      task.completed_at = new Date();
      await task.save();

      // Cấp phát EXP
      const user = await User.findById(decoded.userId);
      if (user) {
        const rewardExp = EXP_REWARDS[task.quest_rank as keyof typeof EXP_REWARDS] || 50;
        user.current_exp += rewardExp;

        let leveledUp = false;
        let requiredExp = getExpForNextLevel(user.level);

        // Level up logic
        while (user.current_exp >= requiredExp) {
          user.current_exp -= requiredExp;
          user.level += 1;
          // Tăng giới hạn base máu và MP khi level up
          user.max_hp += 50; 
          user.max_mp += 20;
          
          leveledUp = true;
          requiredExp = getExpForNextLevel(user.level);
        }

        // Hồi lại máu và MP một chút khi hoàn thành task (Optional)
        if (user.current_mp < user.max_mp) {
          user.current_mp = Math.min(user.max_mp, user.current_mp + 20); // +20 MP
        }

        await user.save();

        return NextResponse.json({ 
          message: 'Quest Cleared!', 
          task, 
          reward: { exp: rewardExp, leveledUp, newLevel: user.level } 
        });
      }
    } else if (status === 'PENDING' && task.status === 'COMPLETED') {
      // Undo a completed task
      task.status = 'PENDING';
      task.completed_at = undefined;
      await task.save();

      const user = await User.findById(decoded.userId);
      if (user) {
        const penaltyExp = EXP_REWARDS[task.quest_rank as keyof typeof EXP_REWARDS] || 50;
        user.current_exp -= penaltyExp;

        let leveledDown = false;
        
        while (user.current_exp < 0 && user.level > 1) {
          user.level -= 1;
          const requiredExpForPrevLevel = getExpForNextLevel(user.level);
          user.current_exp += requiredExpForPrevLevel;
          user.max_hp = Math.max(100, user.max_hp - 50); // don't go below base
          user.max_mp = Math.max(50, user.max_mp - 20); // don't go below base
          leveledDown = true;
        }

        if (user.current_exp < 0) {
          user.current_exp = 0; // Floor at level 1
        }
        
        // Capping HP/MP if max dropped
        if (user.current_hp > user.max_hp) user.current_hp = user.max_hp;
        if (user.current_mp > user.max_mp) user.current_mp = user.max_mp;

        await user.save();

        return NextResponse.json({ 
          message: 'Đã hoàn tác Quest', 
          task,
          penalty: { expLost: penaltyExp, leveledDown, newLevel: user.level }
        });
      }
    } else {
      // Đổi sang status khác (PENDING -> IN_PROGRESS) hoặc ko ảnh hưởng EXP
      task.status = status;
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
    await Task.findOneAndDelete({ _id: taskId, user_id: decoded.userId });
    return NextResponse.json({ message: 'Quest Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
