import { PrismaClient, user} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // ... you will write your Prisma Client queries here

  const newUser = await prisma.user.create({
    data: {
      username: "testuser",
      password: "password123",
      name: "Test User",
      gender: 1,
      phone: "12345678901",
      email: "test@example.com"
    }
  });
  const user = await prisma.user.findFirst();
  console.log("Created new user:", newUser);
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
