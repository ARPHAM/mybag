import { jwtVerify, SignJWT } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SECURITY CRITICAL: JWT_SECRET environment variable is required in production.');
    }
    console.warn('⚠️ WARNING: Using fallback JWT_SECRET in development. Set JWT_SECRET in .env for security.');
    return new TextEncoder().encode('sao_link_start_secret_key_change_in_production');
  }
  return new TextEncoder().encode(secret);
};

export async function signAccessToken(payload: { userId: string; username: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m') // Access token lives for 15 minutes
    .sign(getJwtSecretKey());
  return token;
}

export async function signRefreshToken(payload: { userId: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Refresh token lives for 30 days
    .sign(getJwtSecretKey());
  return token;
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as { userId: string; username: string };
  } catch (error) {
    return null;
  }
}
