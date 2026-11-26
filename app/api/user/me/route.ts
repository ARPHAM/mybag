import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { copyS3Object, deleteS3Object, BUCKET_NAME } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const user = await User.findById(decoded.userId).select('-password_hash');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const now = new Date();
    
    // 1. Chuyển các task quá hạn thành OVERDUE
    const Task = (await import('@/models/Task')).default;
    await Task.updateMany({
      user_id: user._id,
      status: 'PENDING',
      due_date: { $lt: now }
    }, {
      $set: { status: 'OVERDUE' }
    });

    // 2. Tính toán số lượng task đang OVERDUE
    const overdueCount = await Task.countDocuments({
      user_id: user._id,
      status: 'OVERDUE'
    });

    // 3. Tính toán HP/MP theo thời gian (Throttled: chỉ ghi DB khi trôi qua ít nhất 1 phút)
    // Nếu last_hp_mp_update chưa có (tài khoản cũ), khởi tạo bằng last_active_at hoặc now
    const lastUpdate = user.last_hp_mp_update || user.last_active_at || now;
    const hoursPassed = (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);

    if (hoursPassed >= (1 / 60)) {
      // HP tụt 50 mỗi giờ (làm tròn số nguyên không để số lẻ thập phân)
      const hpLoss = hoursPassed * 50;
      user.current_hp = Math.round(Math.max(0, user.current_hp - hpLoss));

      // MP Drain or Regen
      if (overdueCount > 0) {
        // Drain 20 MP / hour for each overdue task
        const mpLoss = hoursPassed * 20 * overdueCount;
        user.current_mp = Math.round(Math.max(0, user.current_mp - mpLoss));
      } else {
        // Regen 30 MP / hour if no overdue tasks
        const mpRegen = hoursPassed * 30;
        user.current_mp = Math.round(Math.min(user.max_mp, user.current_mp + mpRegen));
      }

      // 4. Cập nhật thời gian
      user.last_hp_mp_update = now;
      user.last_active_at = now;
      await user.save();
    }

    return NextResponse.json({ user, overdueCount }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await dbConnect();
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const decoded = await verifyToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid Token' }, { status: 401 });

    const user = await User.findById(decoded.userId);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await req.json();
    
    if (body.username !== undefined) {
      const cleanUsername = String(body.username).trim();
      if (cleanUsername.length < 2 || cleanUsername.length > 30) {
        return NextResponse.json({ error: 'Tên nhân vật phải từ 2 đến 30 ký tự' }, { status: 400 });
      }
      user.username = cleanUsername;
    }
    
    if (body.avatar_url && body.avatar_url !== user.avatar_url) {
      let finalAvatarUrl = body.avatar_url;

      // 1. Nếu ảnh mới nằm trong thư mục temp/, copy sang avatars/
      if (BUCKET_NAME && typeof body.avatar_url === 'string' && body.avatar_url.includes('.amazonaws.com/temp/')) {
        try {
          const tempKey = body.avatar_url.split('.amazonaws.com/')[1];
          // Chống path traversal và đảm bảo an toàn S3
          if (tempKey && tempKey.startsWith('temp/') && !tempKey.includes('..')) {
            const filename = tempKey.replace('temp/', '');
            const newKey = `avatars/${user._id}-${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            
            await copyS3Object(tempKey, newKey);
            finalAvatarUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${newKey}`;
          }
        } catch (e) {
          console.error("Lỗi khi copy ảnh từ temp sang avatars:", e);
        }
      }

      // 2. Xóa ảnh cũ trên S3 (chỉ xóa nếu an toàn trong thư mục avatars/)
      if (user.avatar_url && user.avatar_url.includes('.amazonaws.com/avatars/')) {
        try {
          const oldKey = user.avatar_url.split('.amazonaws.com/')[1];
          if (oldKey && oldKey.startsWith('avatars/') && !oldKey.includes('..')) {
            await deleteS3Object(oldKey);
          }
        } catch (e) {
          console.error("Lỗi khi xóa ảnh cũ trên S3:", e);
        }
      }

      user.avatar_url = finalAvatarUrl;
    }
    
    if (body.password && body.new_password) {
      if (typeof body.new_password !== 'string' || body.new_password.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
      }
      const isMatch = await bcrypt.compare(body.password, user.password_hash);
      if (!isMatch) {
        return NextResponse.json({ error: 'Mật khẩu cũ không chính xác' }, { status: 400 });
      }
      user.password_hash = await bcrypt.hash(body.new_password, 10);
      // Thu hồi toàn bộ refresh tokens cũ trên các thiết bị khi đổi mật khẩu
      user.refresh_tokens = [];
    }

    // Nâng cấp phân hệ hình nền đa thiết bị (Desktop vs Mobile)
    if (body.custom_wallpapers) {
      const desktop = typeof body.custom_wallpapers.desktop === 'string' 
        ? body.custom_wallpapers.desktop 
        : (user.custom_wallpapers?.desktop || '');
      const mobile = typeof body.custom_wallpapers.mobile === 'string' 
        ? body.custom_wallpapers.mobile 
        : (user.custom_wallpapers?.mobile || '');
      const overlay_dim = typeof body.custom_wallpapers.overlay_dim === 'number'
        ? Math.max(0.1, Math.min(0.99, body.custom_wallpapers.overlay_dim))
        : (user.custom_wallpapers?.overlay_dim ?? 0.6);

      user.custom_wallpapers = { desktop, mobile, overlay_dim };
    }

    await user.save();
    
    const userResponse = user.toObject();
    delete userResponse.password_hash;
    delete userResponse.refresh_tokens;

    return NextResponse.json({ user: userResponse, message: 'Cập nhật thành công' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
