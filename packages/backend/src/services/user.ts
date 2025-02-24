import { prisma } from '@qrent/shared';

export const getUser = async (id: number) => {
  return prisma.user.findUnique({
    where: { id }
  });
};