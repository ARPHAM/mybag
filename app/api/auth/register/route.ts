import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Wallet from '@/models/Wallet';
import { signAccessToken, signRefreshToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { email, username, password } = body;

    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const cleanUsername = typeof username === 'string' ? username.trim() : '';

    if (!cleanEmail || !cleanUsername || !password) {
      return NextResponse.json({ error: 'Vui lòng điền đủ thông tin' }, { status: 400 });
    }

    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      return NextResponse.json({ error: 'Tên nhân vật phải từ 2 đến 30 ký tự' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email: cleanEmail }),
      User.findOne({ username: cleanUsername })
    ]);

    if (existingEmail) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 400 });
    }

    if (existingUsername) {
      return NextResponse.json({ error: 'Tên nhân vật đã tồn tại' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email: cleanEmail,
      username: cleanUsername,
      password_hash,
      // Core stats default are handled in Schema (Level 1, HP 2000, MP 1000)
    });

    // Tự động tạo ví tiền mặc định để người dùng mới có thể thao tác tài chính / thực đơn ngay lập tức
    await Wallet.create({
      user_id: newUser._id.toString(),
      name: 'Tiền mặt',
      type: 'cash',
      balance: 0,
      color: '#00f0ff'
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
