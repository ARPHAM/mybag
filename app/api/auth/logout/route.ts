import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { verifyToken } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (refreshToken) {
      await dbConnect();
      const decoded = await verifyToken(refreshToken, 'refresh');
      if (decoded?.userId) {
        await User.updateOne(
          { _id: decoded.userId },
          { $pull: { refresh_tokens: refreshToken } }
        );
      }
    }
  } catch (err) {
    console.error('Logout token revocation error:', err);
  }

  const response = NextResponse.json({ message: 'Đã đăng xuất' }, { status: 200 });
  
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    path: '/',
    expires: new Date(0), // Expire immediately
  });

  response.cookies.set({
    name: 'refresh_token',
    value: '',
    httpOnly: true,
    path: '/',
    expires: new Date(0),
  });

  return response;
}
