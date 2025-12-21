import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const p = new PrismaClient();

interface PropertyData {
  addressLine2: string;
  [key: string]: any;
}

function parseAddressLine2(addressLine2: string) {
  const parts = addressLine2.split('-');
  if (parts.length >= 3) {
    const nswIndex = parts.findIndex(part => part.toLowerCase() === 'nsw');
    if (nswIndex > 0 && nswIndex < parts.length - 1) {
      const name = parts.slice(0, nswIndex).join(' ').toLowerCase();
      const state = parts[nswIndex].toUpperCase();
      const postcode = parseInt(parts[nswIndex + 1]);

      return {
        name,
        state,
        postcode,
      };
    }
  }
  return null;
}

async function cleanDatabase() {
  console.log('clean...');

  await (p as any).propertySchool.deleteMany();
  console.log(' property_school');

  await (p as any).property.deleteMany();
  console.log('properties');

  await (p as any).region.deleteMany();
  console.log('regions');

  await (p as any).school.deleteMany();
  console.log('schools ');

  await p.$executeRaw`ALTER TABLE schools AUTO_INCREMENT = 1`;
  await p.$executeRaw`ALTER TABLE regions AUTO_INCREMENT = 1`;
  await p.$executeRaw`ALTER TABLE properties AUTO_INCREMENT = 1`;

  console.log('cleaned');
}

async function seedSchools() {
  console.log('starting...');

  const schools = [
    { id: 1, name: 'UNSW' },
    { id: 2, name: 'USYD' },
  ];

  for (const school of schools) {
    await (p as any).school.create({
      data: school,
    });
  }

  console.log('school finish');
}

async function seedRegions() {
  console.log('init...');

  const propertyDataPath = path.join(__dirname, '../../scraper/property_data_250623.json');
  const propertyData: PropertyData[] = JSON.parse(fs.readFileSync(propertyDataPath, 'utf8'));

  const uniqueRegions = new Map<string, { name: string; state: string; postcode: number }>();

  for (const property of propertyData) {
    const regionInfo = parseAddressLine2(property.addressLine2);
    if (regionInfo) {
      const key = `${regionInfo.name}-${regionInfo.state}-${regionInfo.postcode}`;
      if (!uniqueRegions.has(key)) {
        uniqueRegions.set(key, regionInfo);
      }
    }
  }

  console.log(`find ${uniqueRegions.size} region`);

  const regionsArray = Array.from(uniqueRegions.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  for (let i = 0; i < regionsArray.length; i++) {
    const region = regionsArray[i];
    await (p as any).region.create({
      data: {
        id: i + 1,
        name: region.name,
        state: region.state,
        postcode: region.postcode,
      },
    });

    if ((i + 1) % 10 === 0) {
      console.log(`insert ${i + 1}/${regionsArray.length} `);
    }
  }

  console.log('finish region');
}

async function main() {
  try {
    await cleanDatabase();

    await seedSchools();

    await seedRegions();
  } catch (error) {
    console.error('error', error);
    throw error;
  } finally {
    await p.$disconnect();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
