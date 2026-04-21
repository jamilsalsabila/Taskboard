import crypto from 'crypto';
import { env } from '../config/env.js';

const base64url = (input) => Buffer.from(input).toString('base64url');

const sign = (payloadBase64) =>
  crypto.createHmac('sha256', env.authSecret).update(payloadBase64).digest('base64url');

export class AuthTokenService {
  issueToken(user) {
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: user.id,
      name: user.name,
      iat: now,
      exp: now + 60 * 60 * 24 * 30
    };

    const payloadBase64 = base64url(JSON.stringify(payload));
    const signature = sign(payloadBase64);
    return `${payloadBase64}.${signature}`;
  }

  verifyToken(token) {
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      throw new Error('AUTH_INVALID');
    }

    const [payloadBase64, signature] = token.split('.');
    const expected = sign(payloadBase64);

    if (signature.length !== expected.length) {
      throw new Error('AUTH_INVALID');
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new Error('AUTH_INVALID');
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    } catch {
      throw new Error('AUTH_INVALID');
    }

    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < now) {
      throw new Error('AUTH_EXPIRED');
    }

    return {
      userId: payload.sub,
      name: payload.name
    };
  }

  extractFromAuthorizationHeader(authorization) {
    if (!authorization || typeof authorization !== 'string') {
      throw new Error('AUTH_REQUIRED');
    }

    const [type, token] = authorization.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new Error('AUTH_REQUIRED');
    }

    return this.verifyToken(token);
  }
}
