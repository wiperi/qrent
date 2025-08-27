import { prisma } from '@qrent/shared/prisma/client';

export async function cleanupTestData() {
  // Clean up test data by deleting records with test email patterns
  await prisma.$transaction([
    prisma.emailPreference.deleteMany({
      where: {
        user: {
          email: {
            contains: '@qrent-test.com'
          }
        }
      }
    }),
    prisma.propertySchool.deleteMany(),
    prisma.preference.deleteMany({
      where: {
        user: {
          email: {
            contains: '@qrent-test.com'
          }
        }
      }
    }),
    prisma.userSession.deleteMany({
      where: {
        user: {
          email: {
            contains: '@qrent-test.com'
          }
        }
      }
    }),
    prisma.property.deleteMany({
      where: {
        users: {
          some: {
            email: {
              contains: '@qrent-test.com'
            }
          }
        }
      }
    }),
    prisma.user.deleteMany({
      where: {
        email: {
          contains: '@qrent-test.com'
        }
      }
    }),
  ]);
}

export async function createTestUser(userData?: Partial<any>) {
  const defaultUser = {
    email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@qrent-test.com`,
    password: '$2b$10$dummy.hash.for.testing',
    name: 'Test User',
    gender: 1,
    emailVerified: true,
  };

  return await prisma.user.create({
    data: { ...defaultUser, ...userData },
  });
}

export async function createTestProperty(propertyData?: Partial<any>) {
  // First create a test region if needed
  const region = await prisma.region.upsert({
    where: { name: 'Test Region' },
    update: {},
    create: {
      name: 'Test Region',
      state: 'NSW',
      postcode: 2000,
    },
  });

  const defaultProperty = {
    price: 500,
    address: '123 Test St',
    regionId: region.id,
    bedroomCount: 2,
    bathroomCount: 1,
    propertyType: 1,
    houseId: Math.floor(Math.random() * 1000000),
    publishedAt: new Date(),
  };

  return await prisma.property.create({
    data: { ...defaultProperty, ...propertyData },
  });
}

export async function createTestSchool(schoolData?: Partial<any>) {
  const defaultSchool = {
    name: `Test School ${Date.now()}`,
  };

  return await prisma.school.create({
    data: { ...defaultSchool, ...schoolData },
  });
}

export async function setupTestDatabase() {
  await cleanupTestData();
}

export async function teardownTestDatabase() {
  await cleanupTestData();
  await prisma.$disconnect();
}