import type { Prisma } from '@qrent/shared';

const streetTypes = [
  ['street', 'st'],
  ['road', 'rd'],
  ['avenue', 'ave'],
  ['drive', 'dr'],
  ['lane', 'ln'],
  ['court', 'ct'],
  ['place', 'pl'],
  ['circuit', 'cct'],
  ['crescent', 'cres'],
  ['parade', 'pde'],
  ['terrace', 'tce'],
  ['boulevard', 'blvd'],
];

const addressSeparators = [' ', '/', '-', ','];

function addressWord(
  word: string,
  leadingSeparators: string[],
  trailingSeparators: string[]
): Prisma.PropertyWhereInput[] {
  return [
    { address: word },
    ...trailingSeparators.map(after => ({ address: { startsWith: word + after } })),
    ...leadingSeparators.flatMap(before => [
      { address: { endsWith: before + word } },
      ...trailingSeparators.map(after => ({ address: { contains: before + word + after } })),
    ]),
  ];
}

export function propertyAddressFilter(query: string): Prisma.PropertyWhereInput {
  const tokens = query
    .toLowerCase()
    .replace(/^(?:unit|apt|apartment)\.?\s+(?=\d)/, '')
    .match(/\d[\p{L}\p{N}]*(?:\s*[-/]\s*\d[\p{L}\p{N}]*)*|[\p{L}][\p{L}\p{N}]*/gu);
  if (!tokens) return { id: { in: [] } };

  const terms = new Set(tokens.map(token => token.replace(/\s+/g, '')));
  return {
    AND: [...terms].map(term => {
      if (/^\d/.test(term)) {
        const matches = addressWord(term, addressSeparators, addressSeparators);
        if (/^\d{4}$/.test(term)) matches.push({ region: { postcode: Number(term) } });
        return { OR: matches };
      }

      const streetType = streetTypes.find(variants => variants.includes(term));
      const matches = streetType
        ? streetType.flatMap(variant => addressWord(variant, [' '], [' ', ',', '.']))
        : [{ address: { contains: term } }, { region: { name: { contains: term } } }];
      if (['nsw', 'vic'].includes(term)) {
        matches.push({ region: { state: { equals: term } } });
      }
      return { OR: matches };
    }),
  };
}
