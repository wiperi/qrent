// The original Sydney TARGET_AREAS, not all-city or all-campus coverage.
export const RENTAL_SCHOOLS = [
  {
    code: 'UNSW',
    slug: 'unsw',
    name: 'UNSW Sydney',
    campus: 'Kensington',
    nameZh: '新南威尔士大学',
    areas: [
      'newtown',
      'eastgardens',
      'pagewood',
      'maroubra',
      'kensington',
      'kingsford',
      'randwick',
      'mascot',
      'rosebery',
      'zetland',
    ],
    focus: {
      en: 'Compare Kensington and Kingsford with options in Randwick, Maroubra and Eastgardens. Check the full public transport journey to the Kensington campus before choosing a home.',
      zh: '可从 Kensington、Kingsford 开始，对比 Randwick、Maroubra 和 Eastgardens 等区域。选房时请核对到 Kensington 校区的完整公共交通路线。',
    },
  },
  {
    code: 'USYD',
    slug: 'usyd',
    name: 'University of Sydney',
    campus: 'Camperdown / Darlington',
    nameZh: '悉尼大学',
    areas: [
      'sydney-city',
      'wolli-creek',
      'hurstville',
      'burwood',
      'newtown',
      'glebe',
      'waterloo',
      'chippendale',
      'ultimo',
      'haymarket',
    ],
    focus: {
      en: 'Compare Newtown, Glebe and Chippendale with rail-connected options such as Burwood, Hurstville and Wolli Creek. Confirm the walk from the final stop to your building on the Camperdown or Darlington campus.',
      zh: '可对比 Newtown、Glebe、Chippendale，以及 Burwood、Hurstville、Wolli Creek 等有轨道交通的区域。请把下车后步行到 Camperdown 或 Darlington 具体教学楼的时间也算进去。',
    },
  },
  {
    code: 'UTS',
    slug: 'uts',
    name: 'University of Technology Sydney',
    campus: 'City / Broadway',
    nameZh: '悉尼科技大学',
    areas: [
      'sydney-city',
      'ultimo',
      'haymarket',
      'pyrmont',
      'chippendale',
      'surry-hills',
      'redfern',
      'waterloo',
      'glebe',
      'newtown',
    ],
    focus: {
      en: 'Start with Ultimo, Haymarket and Chippendale, then compare Redfern, Pyrmont and other areas in the existing collection. Use your actual City campus building and timetable to check the last part of the journey.',
      zh: '可先看 Ultimo、Haymarket 和 Chippendale，再对比 Redfern、Pyrmont 等既有采集区域。请以 City 校区的具体教学楼和上课时间核对通勤最后一段。',
    },
  },
] as const;

export function areaName(area: string) {
  return area === 'sydney-city'
    ? 'Sydney City'
    : area.replace(/\b\w/g, c => c.toUpperCase()).replace(/-/g, ' ');
}

export function rentalSearchPath(locale: string, school: string, area?: string) {
  const params = new URLSearchParams({ university: school });
  if (area) params.set('areas', area === 'sydney-city' ? 'sydney' : area.replace(/-/g, ' '));
  params.set('page', '1');
  return `/${locale}/search?${params}`;
}
