import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'Đã đăng xuất' }, { status: 200 });
  
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    path: '/',
    expires: new Date(0), // Expire immediately
  });

  return response;
}
