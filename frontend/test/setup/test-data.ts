import { faker } from '@faker-js/faker';

export const generateTestUser = () => ({
  email: faker.internet.email(),
  password: faker.internet.password({ length: 8 }),
  name: faker.person.fullName(),
  gender: faker.number.int({ min: 0, max: 1 }),
  phone: faker.string.numeric(11),
});

export const generatePropertySearch = () => ({
  targetSchool: faker.helpers.arrayElement(['UNSW', 'USYD', 'UTS']),
  minPrice: faker.number.int({ min: 300, max: 500 }),
  maxPrice: faker.number.int({ min: 600, max: 1000 }),
  minBedrooms: faker.number.int({ min: 1, max: 3 }),
  maxBedrooms: faker.number.int({ min: 4, max: 6 }),
  minBathrooms: faker.number.int({ min: 1, max: 2 }),
  maxBathrooms: faker.number.int({ min: 2, max: 4 }),
  propertyType: faker.helpers.arrayElement([1, 2]),
  page: 1,
  pageSize: 10,
});

export const generateUserProfile = () => ({
  name: faker.person.fullName(),
  gender: faker.number.int({ min: 0, max: 1 }),
  emailPreferences: [
    {
      userId: 1,
      type: 1,
    },
  ],
});

export const createTestEmail = () => `test-${faker.string.alphanumeric(8)}@qrent-test.com`;

export const createTestProperty = () => ({
  price: faker.number.int({ min: 300, max: 2000 }),
  address: faker.location.streetAddress(),
  bedroomCount: faker.number.float({ min: 1, max: 6, fractionDigits: 1 }),
  bathroomCount: faker.number.float({ min: 1, max: 4, fractionDigits: 1 }),
  parkingCount: faker.number.float({ min: 0, max: 3, fractionDigits: 1 }),
  propertyType: faker.helpers.arrayElement([1, 2]),
  houseId: faker.number.int({ min: 100000, max: 999999 }),
  availableDate: faker.date.future(),
  keywords: faker.lorem.words(5),
  averageScore: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
  descriptionEn: faker.lorem.paragraph(),
  descriptionCn: faker.lorem.paragraph(),
  url: faker.internet.url(),
  publishedAt: faker.date.recent(),
});
