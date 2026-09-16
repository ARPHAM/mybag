import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Vui lòng nhập Email và Mật khẩu' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Sai mật khẩu' }, { status: 401 });
    }

    // Update last active time upon login
    user.last_active_at = new Date();
    
    const accessToken = await signAccessToken({ userId: user._id.toString(), username: user.username });
    const refreshToken = await signRefreshToken({ userId: user._id.toString() });

    // Save refresh token to user (keep up to 5 concurrent sessions)
    user.refresh_tokens = user.refresh_tokens || [];
    user.refresh_tokens.push(refreshToken);
    if (user.refresh_tokens.length > 5) {
      user.refresh_tokens = user.refresh_tokens.slice(-5);
    }
    await user.save();

    const response = NextResponse.json({ message: 'Link Start!', user: { username: user.username } }, { status: 200 });
    
    // Set HTTP-only cookies
    response.cookies.set({
      name: 'auth_token',
      value: accessToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 15, // 15 minutes
    });

    response.cookies.set({
      name: 'refresh_token',
      value: refreshToken,
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Lỗi server khi đăng nhập' }, { status: 500 });
  }
}
