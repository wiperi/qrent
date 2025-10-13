import { prisma } from '../prisma/client';

async function clearDb() {
  await prisma.user.deleteMany();
  await prisma.preference.deleteMany();
  // await prisma.property.deleteMany();
}

export { clearDb };
