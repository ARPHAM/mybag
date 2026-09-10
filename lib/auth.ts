import { jwtVerify, SignJWT } from 'jose';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'sao_link_start_secret_key_change_in_production';
  if (!secret) {
    throw new Error('JWT_SECRET env variable is not set');
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: { userId: string; username: string }) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d') // Token lives for 30 days
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
