import {prisma} from "@qrent/shared";


async function main() {
  // ... you will write your Prisma Client queries here

  await prisma.user.deleteMany();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
