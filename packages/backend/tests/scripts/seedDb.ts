// import { prisma as p } from '@qrent/shared';
// import { PROPERTY_TYPE, SCHOOL } from '@qrent/shared/enum';

// const all_regions = {
//   [SCHOOL.UNSW]: [
//     'alexandria',
//     'arncliffe',
//     'banksia',
//     'beaconsfield',
//     'botany',
//     'brighton-le-sands',
//     'bronte',
//     'camperdown',
//     'chifley',
//     'chippendale',
//     'clovelly',
//     'coogee',
//     'darlington',
//     'eastgardens',
//     'eastlakes',
//     'enmore',
//     'erskineville',
//     'hillsdale',
//     'kensington',
//     'kingsford',
//     'kyeemagh',
//     'malabar',
//     'maroubra',
//     'marrickville',
//     'mascot',
//     'matraville',
//     'newtown',
//     'paddington',
//     'pagewood',
//     'randwick',
//     'redfern',
//     'rockdale',
//     'rosebery',
//     'stanmore',
//     'sydenham',
//     'tempe',
//     'turrella',
//     'waterloo',
//     'waverley',
//     'zetland',
//     'bondi-junction',
//     'centennial-park',
//     'la-perouse',
//     'little-bay',
//     'moore-park',
//     'phillip-bay',
//     'queens-park',
//     'south-coogee',
//     'st-peters',
//     'wolli-creek',
//   ],
//   [SCHOOL.USYD]: [
//     'abbotsford',
//     'alexandria',
//     'allawah',
//     'annandale',
//     'arncliffe',
//     'banksia',
//     'barangaroo',
//     'beaconsfield',
//     'bexley',
//     'blakehurst',
//     'botany',
//     'brighton-le-sands',
//     'burwood',
//     'camperdown',
//     'carlton',
//     'chippendale',
//     'chiswick',
//     'concord',
//     'croydon',
//     'darlinghurst',
//     'darlington',
//     'earlwood',
//     'eastlakes',
//     'enfield',
//     'enmore',
//     'erskineville',
//     'glebe',
//     'haymarket',
//     'hurstville',
//     'kensington',
//     'kingsgrove',
//     'kyeemagh',
//     'maroubra',
//     'marrickville',
//     'mascot',
//     'mortlake',
//     'narwee',
//     'newtown',
//     'paddington',
//     'pagewood',
//     'penshurst',
//     'pyrmont',
//     'redfern',
//     'rockdale',
//     'rosebery',
//     'stanmore',
//     'strathfield',
//     'sydenham',
//     'sydney',
//     'tempe',
//     'turrella',
//     'ultimo',
//     'wareemba',
//     'waterloo',
//     'woolloomooloo',
//     'zetland',
//     'bardwell-valley',
//     'beverly-hills',
//     'breakfast-point',
//     'canada-bay',
//     'carss-park',
//     'centennial-park',
//     'clemton-park',
//     'connells-point',
//     'dawes-point',
//     'five-dock',
//     'forest-lodge',
//     'kyle-bay',
//     'millers-point',
//     'moore-park',
//     'north-strathfield',
//     'russell-lea',
//     'south-coogee',
//     'st-peters',
//     'surry-hills',
//     'the-rocks',
//     'walsh-bay',
//     'wolli-creek',
//   ],
// };

// async function seed_school() {
//   await p.propertySchool.deleteMany({});
//   await p.school.deleteMany({});
//   for (const school of Object.values(SCHOOL)) {
//     await p.school.create({
//       data: {
//         name: school,
//       },
//     });
//   }
// }

// async function seed_region() {
//   await p.property.deleteMany({});
//   await p.region.deleteMany({});

//   for (const region of all_regions[SCHOOL.UNSW]) {
//     await p.region.upsert({
//       where: {
//         name: region,
//       },
//       create: {
//         name: region,
//         state: 'NSW',
//         postcode: 2000,
//       },
//       update: {
//         name: region,
//         state: 'NSW',
//         postcode: 2000,
//       },
//     });
//   }

//   for (const region of all_regions[SCHOOL.USYD]) {
//     await p.region.upsert({
//       where: {
//         name: region,
//       },
//       create: {
//         name: region,
//         state: 'NSW',
//         postcode: 2000,
//       },
//       update: {
//         name: region,
//         state: 'NSW',
//         postcode: 2000,
//       },
//     });
//   }
// }

// async function seed_property(num: number) {
//   await p.property.deleteMany({});

//   const upper = await p.region.findFirst({
//     orderBy: {
//       id: 'asc',
//     },
//   });

//   const lower = await p.region.findFirst({
//     orderBy: {
//       id: 'desc',
//     },
//   });

//   const upper_bound = upper?.id!;
//   const lower_bound = lower?.id!;

//   for (let i = 0; i < num; i++) {
//     await p.property.create({
//       data: {
//         address: `123 Main St ${i}`,
//         price: Math.floor(500 + Math.random() * 3000),
//         propertyType: PROPERTY_TYPE.Apartment,
//         houseId: i,
//         publishedAt: new Date(),
//         regionId: Math.floor(Math.random() * (upper_bound - lower_bound) + lower_bound),
//         bathroomCount: Math.floor(Math.random() * 3),
//         bedroomCount: Math.floor(Math.random() * 3),
//         parkingCount: Math.floor(Math.random() * 3),
//         keywords: 'This is a test description',
//         averageScore: Math.floor(13 + Math.random() * 18),
//       },
//     });
//   }
// }

// async function seed_property_school() {
//   await p.propertySchool.deleteMany({});
//   const properties = await p.property.findMany({
//     include: {
//       region: true,
//     },
//   });

//   const schools = await p.school.findMany();

//   properties.forEach(async property => {
//     for (const school of schools) {
//       const schoolName = school.name.toLowerCase();
//       const regionName = property.region.name.toLowerCase();

//       // Check if the region is related to the school
//       const isRelated =
//         (schoolName === 'unsw' && all_regions.UNSW.includes(regionName)) ||
//         (schoolName === 'usyd' && all_regions.USYD.includes(regionName));

//       if (isRelated) {
//         await p.propertySchool.create({
//           data: {
//             propertyId: property.id,
//             schoolId: school.id,
//             commuteTime: Math.floor(Math.random() * 180) + 10,
//           },
//         });
//       }
//     }
//   });
// }

// async function main() {
//   await seed_school();
//   await seed_region();
//   await seed_property(100);
//   await seed_property_school();
// }

// main()
//   .then(async () => {
//     console.log('done');
//     await p.$disconnect();
//   })
//   .catch(async e => {
//     console.error(e);
//     await p.$disconnect();
//     process.exit(1);
//   });
