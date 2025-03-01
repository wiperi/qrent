import { prisma } from '../prisma/client';

async function clearDb() {
  await prisma.user.deleteMany();
}

export { clearDb };