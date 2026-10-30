import { prisma, Property, Region } from '@qrent/shared';
import sgMail from '@sendgrid/mail';
import { createHash } from 'crypto';
import redis from '../utils/redisClient';
import HttpError from '../error/HttpError';
import { reserveIncludedEmail } from '../utils/auth-security';

type MailAvailability = { available: boolean; remaining: number; periodEnd: string };

export class EmailService {
  private quota?: { keyHash: string; until: number; value: MailAvailability };
  private pendingQuota?: { keyHash: string; promise: Promise<MailAvailability> };

  isConfigured() {
    return !!process.env.SENDGRID_API_KEY?.startsWith('SG.');
  }

  async availability(): Promise<MailAvailability> {
    const unavailable = { available: false, remaining: 0, periodEnd: '' };
    const key = process.env.SENDGRID_API_KEY;
    if (!this.isConfigured() || !key) return unavailable;
    const keyHash = createHash('sha256').update(key).digest('hex');
    if (
      this.quota?.keyHash === keyHash &&
      this.quota.until > Date.now() &&
      (!this.quota.value.available || Date.parse(this.quota.value.periodEnd) > Date.now() + 10000)
    )
      return this.quota.value;
    if (this.pendingQuota?.keyHash === keyHash) return this.pendingQuota.promise;
    const promise = (async () => {
      let value = unavailable;
      try {
        const response = await fetch('https://api.sendgrid.com/v3/user/credits', {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          const quota = (await response.json()) as {
            remain?: number;
            overage?: number;
            next_reset?: string;
          };
          const end = Date.parse(quota.next_reset || '');
          if (
            Number.isSafeInteger(quota.remain) &&
            Number(quota.remain) > 0 &&
            quota.overage === 0 &&
            end > Date.now() + 10000 &&
            end - Date.now() < 45 * 86400000
          ) {
            value = {
              available: true,
              remaining: Number(quota.remain),
              periodEnd: quota.next_reset!,
            };
          }
        }
      } catch {
        /* Unknown quota must not enable paid/overage sending. */
      }
      this.quota = { keyHash, until: Date.now() + 60000, value };
      return value;
    })();
    this.pendingQuota = { keyHash, promise };
    try {
      return await promise;
    } finally {
      if (this.pendingQuota?.promise === promise) this.pendingQuota = undefined;
    }
  }

  private async reserveIncludedCredit() {
    const quota = await this.availability();
    if (!quota.available) throw new HttpError(503, 'Included email quota is unavailable');
    const identity = createHash('sha256').update(process.env.SENDGRID_API_KEY!).digest('hex');
    await reserveIncludedEmail(redis, identity, quota.periodEnd, quota.remaining);
  }

  setApiKey() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendVerificationCode(to: string, code: number) {
    this.setApiKey();
    const msg = {
      to,
      from: 'support@qrent.rent',
      subject: 'Email Verification Code',
      text: `Your email verification code is ${code}. This code will expire in 30 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333;">Email Verification</h2>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="margin-bottom: 15px;">Hello,</p>
            <p style="margin-bottom: 15px;">Thank you for registering with Qrent. To verify your email address, please use the verification code below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 24px; font-weight: bold; padding: 10px 20px; background-color: #f0f0f0; border-radius: 5px;">${code}</span>
            </div>
            <p style="margin-bottom: 15px;"><strong>This code will expire in 30 minutes.</strong></p>
            <p style="margin-bottom: 15px;">If you did not request this verification, please ignore this email.</p>
          </div>
          <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Qrent. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await this.reserveIncludedCredit();
    await sgMail.send(msg);
  }

  async sendDailyPropertyRecommendation(
    to: string,
    properties: Array<Property & { region: Region }>
  ) {
    this.setApiKey();

    const propertyListHtml = properties
      .map(
        property => `
      <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #eaeaea; border-radius: 5px;">
        <h3 style="margin-top: 0; color: #333;">${property.address || 'Property Listing'}</h3>
        <p><strong>Address:</strong> ${property.address || 'N/A'}</p>
        <p><strong>Region:</strong> ${property.region?.name || 'N/A'}</p>
        <p><strong>Price:</strong> $${property.price?.toLocaleString() || 'N/A'}</p>
        <p><strong>Rating:</strong> ${property.averageScore?.toFixed(1) || 'N/A'}/5</p>
        <p><strong>Bedrooms:</strong> ${property.bedroomCount || 'N/A'}</p>
        <p><strong>Bathrooms:</strong> ${property.bathroomCount || 'N/A'}</p>
        <p><strong>Property Type:</strong> ${property.propertyType || 'N/A'}</p>
        <p><strong>Keywords:</strong> ${property.keywords || 'N/A'}</p>
      </div>
    `
      )
      .join('');

    const msg = {
      to,
      from: 'support@qrent.rent',
      subject: 'Daily Property Recommendation',
      text: `Here are the properties that match your preferences: ${properties
        .map(
          property =>
            `${property.address || 'Property'} - ${property.region?.name || 'N/A'} - $${property.price || 'N/A'}`
        )
        .join(
          ', '
        )}\n\nTo unsubscribe from these emails, please visit your account settings or click the unsubscribe link in the email.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #333;">Your Daily Property Recommendations</h2>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="margin-bottom: 15px;">Hello,</p>
            <p style="margin-bottom: 20px;">Here are today's property recommendations based on your preferences:</p>
            ${propertyListHtml}
          </div>
          <div style="margin-top: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Qrent. All rights reserved.</p>
            <p style="margin-top: 10px;">If you no longer wish to receive these emails, <a href="https://qrent.rent/account/notifications" style="color: #666; text-decoration: underline;">click here to unsubscribe</a>.</p>
          </div>
        </div>
      `,
    };

    await this.reserveIncludedCredit();
    await sgMail.send(msg);
  }
}

export const emailService = new EmailService();
