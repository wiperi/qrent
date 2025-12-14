import { OAuth2Client } from 'google-auth-library';
import HttpError from '@/error/HttpError';

interface GoogleTokenPayload {
  sub: string; // Google User ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

class OAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      throw new Error('GOOGLE_OAUTH_CLIENT_ID is not configured');
    }
    this.googleClient = new OAuth2Client(clientId);
  }

  /**
   * 验证 Google ID Token 并返回用户信息
   */
  async verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload> {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new HttpError(400, 'Invalid Google token payload');
      }

      if (!payload.email_verified) {
        throw new HttpError(400, 'Google email not verified');
      }

      return {
        sub: payload.sub,
        email: payload.email!,
        email_verified: payload.email_verified,
        name: payload.name,
        picture: payload.picture,
      };
    } catch (error) {
      console.error('Google token verification failed:', error);
      throw new HttpError(400, 'Invalid Google token');
    }
  }

  /**
   * 验证微信 OAuth（预留接口）
   */
  async verifyWeChatToken(code: string): Promise<any> {
    // TODO: 实现微信 OAuth 验证
    throw new HttpError(501, 'WeChat OAuth not implemented yet');
  }
}

export const oauthService = new OAuthService();
