import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đủ thông tin' }, { status: 400 });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email,
      username,
      password_hash,
      // Core stats default are handled in Schema (Level 1, HP 2000, MP 1000)
    });

    const accessToken = await signAccessToken({ userId: newUser._id.toString(), username: newUser.username });
    const refreshToken = await signRefreshToken({ userId: newUser._id.toString() });

    newUser.refresh_tokens = [refreshToken];
    await newUser.save();

    const response = NextResponse.json({ message: 'Tạo nhân vật thành công', user: { username: newUser.username } }, { status: 201 });
    
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
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Lỗi server khi đăng ký' }, { status: 500 });
  }
}
