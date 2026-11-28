import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';
import { getRequestNow } from '@/lib/simClock';
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

    const now = getRequestNow(req);
    
    // 1. Tối ưu read-path: đọc gọn 1 lần các task chưa hoàn thành, chỉ updateMany khi thực sự có task mới quá hạn
    const Task = (await import('@/models/Task')).default;
    const openTasks = await Task.find({
      user_id: user._id,
      status: { $in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] }
    }).select('_id status due_date').lean();

    const newlyOverdueIds: any[] = [];
    let overdueCount = 0;
    for (const t of openTasks as any[]) {
      if (t.status === 'OVERDUE') {
        overdueCount += 1;
      } else if (t.due_date && new Date(t.due_date) < now) {
        newlyOverdueIds.push(t._id);
        overdueCount += 1;
      }
    }
    if (newlyOverdueIds.length > 0) {
      await Task.updateMany(
        { _id: { $in: newlyOverdueIds }, user_id: user._id },
        { $set: { status: 'OVERDUE' } }
      );
    }

    // 2. Tính toán HP/MP theo thời gian (cân bằng v1.1: dịu nhịp tụt HP/MP và giới hạn mức phạt mỗi phiên check-in)
    const lastUpdate = user.last_hp_mp_update || user.last_active_at || now;
    const hoursPassed = (now.getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60);

    if (hoursPassed >= (5 / 60)) {
      const hpLoss = Math.min(600, Math.floor(hoursPassed * 20));
      user.current_hp = Math.max(0, Math.round(user.current_hp - hpLoss));

      if (overdueCount > 0) {
        const mpRatePerHour = Math.min(40, 8 * overdueCount);
        const mpLoss = Math.min(250, Math.floor(hoursPassed * mpRatePerHour));
        user.current_mp = Math.max(0, Math.round(user.current_mp - mpLoss));
      } else {
        const mpRegen = Math.floor(hoursPassed * 30);
        user.current_mp = Math.min(user.max_mp, Math.round(user.current_mp + mpRegen));
      }

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
    
    let oldAvatarKeyToDelete: string | null = null;
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

      // 2. Ghi nhận ảnh cũ trên S3 để xóa SAU khi lưu DB thành công (tránh mất ảnh nếu đổi mật khẩu sai)
      if (user.avatar_url && user.avatar_url.includes('.amazonaws.com/avatars/')) {
        const oldKey = user.avatar_url.split('.amazonaws.com/')[1];
        if (oldKey && oldKey.startsWith('avatars/') && !oldKey.includes('..')) {
          oldAvatarKeyToDelete = oldKey;
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

    // Đồng bộ màu chủ đề (theme_color) & cỡ chữ hỗ trợ đọc (font_scale) đa thiết bị (v1.2)
    if (body.theme_color !== undefined) {
      const allowedThemes = ['cyan', 'yellow', 'red', 'green', 'purple', 'magenta', 'orange', 'white'];
      if (!allowedThemes.includes(String(body.theme_color))) {
        return NextResponse.json({ error: 'Màu chủ đề không hợp lệ' }, { status: 400 });
      }
      user.theme_color = String(body.theme_color);
    }

    if (body.font_scale !== undefined) {
      const allowedScales = ['normal', 'large', 'xlarge'];
      if (!allowedScales.includes(String(body.font_scale))) {
        return NextResponse.json({ error: 'Cỡ chữ hiển thị không hợp lệ' }, { status: 400 });
      }
      user.font_scale = body.font_scale;
    }

    await user.save();

    if (oldAvatarKeyToDelete) {
      try {
        await deleteS3Object(oldAvatarKeyToDelete);
      } catch (e) {
        console.error("Lỗi khi xóa ảnh cũ trên S3:", e);
      }
    }
    
    const userResponse = user.toObject();
    delete userResponse.password_hash;
    delete userResponse.refresh_tokens;

    return NextResponse.json({ user: userResponse, message: 'Cập nhật thành công' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
