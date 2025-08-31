import { EmailPreference, prisma, User } from '@qrent/shared';
import { EMAIL_PREFERENCE, GENDER } from '@qrent/shared/enum';

class UserService {
  async updateProfile(
    userId: number,
    profileData: Pick<User, 'name' | 'gender'> & { emailPreferences: EmailPreference[] }
  ) {
    if (profileData.gender && !Object.values(GENDER).includes(profileData.gender)) {
      throw new Error('Invalid gender');
    }

    // Update basic user profile information
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: profileData.name,
        gender: profileData.gender,
      },
    });

    // Update email preferences
    await this.updateEmailPreferences(userId, profileData.emailPreferences);

    // Return updated profile
    return this.getProfile(userId);
  }

  private async updateEmailPreferences(userId: number, newPreferences: EmailPreference[]) {
    // Validate email preferences
    for (const preference of newPreferences) {
      if (preference.type !== EMAIL_PREFERENCE.DailyPropertyRecommendation) {
        throw new Error('Invalid email preference type');
      }
    }

    // Get current email preferences
    const existingPreferences = await prisma.emailPreference.findMany({
      where: { userId },
    });
    const existingPreferenceTypes = existingPreferences.map(pref => pref.type);
    const newPreferenceTypes = newPreferences.map(pref => pref.type);

    // Remove preferences that are no longer selected
    for (const preference of existingPreferences) {
      if (!newPreferenceTypes.includes(preference.type)) {
        await prisma.emailPreference.delete({
          where: {
            userId_type: {
              userId: preference.userId,
              type: preference.type,
            },
          },
        });
      }
    }

    // Add newly selected preferences
    for (const preferenceType of newPreferenceTypes) {
      if (!existingPreferenceTypes.includes(preferenceType)) {
        await prisma.emailPreference.create({
          data: {
            userId,
            type: preferenceType,
          },
        });
      }
    }
  }

  async getProfile(userId: number) {
    const user = await prisma.user.findUnique({
      include: {
        emailPreferences: true,
      },
      where: { id: userId },
    });

    return user;
  }
}

export const userService = new UserService();
