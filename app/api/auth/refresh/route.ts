import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken, signAccessToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      console.log('Refresh Token Failed: No refresh token in cookies');
      const response = NextResponse.json({ error: 'Không tìm thấy refresh token' }, { status: 401 });
      response.cookies.delete('auth_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    const payload = await verifyToken(refreshToken);
    if (!payload || !payload.userId) {
      console.log('Refresh Token Failed: Invalid payload or expired', payload);
      const response = NextResponse.json({ error: 'Refresh token không hợp lệ hoặc đã hết hạn' }, { status: 401 });
      response.cookies.delete('auth_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    await dbConnect();
    const user = await User.findById(payload.userId);

    if (!user) {
      console.log('Refresh Token Failed: User not found in DB', payload.userId);
      const response = NextResponse.json({ error: 'Tài khoản không tồn tại' }, { status: 401 });
      response.cookies.delete('auth_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    if (!user.refresh_tokens || !user.refresh_tokens.includes(refreshToken)) {
      console.log('Refresh Token Failed: Token mismatch in DB');
      const response = NextResponse.json({ error: 'Refresh token không khớp' }, { status: 401 });
      response.cookies.delete('auth_token');
      response.cookies.delete('refresh_token');
      return response;
    }

    // Sinh Access Token mới
    const accessToken = await signAccessToken({ userId: user._id.toString(), username: user.username });

    const response = NextResponse.json({ message: 'Làm mới token thành công' }, { status: 200 });

    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 15, // 15 phút
    });

    return response;
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Lỗi server khi làm mới token' }, { status: 500 });
  }
}
