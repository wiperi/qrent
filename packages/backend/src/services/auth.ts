import { Prisma, prisma, UserDTO } from '@qrent/shared';
import HttpError from '@/error/HttpError';

export async function userRegisterService(userData: UserDTO) {
  try {
    const user = await prisma.user.create({
      data: userData,
    });
    return user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new HttpError(400, 'User already exists');
      }
    }
    throw error;
  }
}
