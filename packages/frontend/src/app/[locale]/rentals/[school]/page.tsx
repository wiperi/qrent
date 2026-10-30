import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale } from '@qrent/shared/utils/helper';
import Breadcrumbs from '@/components/Breadcrumbs';
import RentalLinks from '@/components/RentalLinks';
import { RENTAL_SCHOOLS, areaName, rentalSearchPath } from '@/lib/rental-schools';
import { getRentalPreview } from '@/lib/rental-preview';
import { getNotionBlogPosts } from '@/lib/notion-blog';
import { pageMetadata, SITE_URL, jsonLd } from '@/lib/seo';
import { HiArrowRight, HiExternalLink } from 'react-icons/hi';
import styles from '@/styles/discovery.module.css';

type Props = { params: Promise<{ locale: string; school: string }> };
export const revalidate = 600;
export const dynamicParams = false;
export function generateStaticParams() {
  return RENTAL_SCHOOLS.map(school => ({ school: school.slug }));
}
export async function generateMetadata({ params }: Props) {
  const { locale, school: slug } = await params;
  const school = RENTAL_SCHOOLS.find(item => item.slug === slug);
  if (!school)
    return {
      title: locale === 'zh' ? '找不到学校页面 | QRent' : 'University page not found | QRent',
      robots: { index: false },
    };
  return pageMetadata(
    locale,
    `/rentals/${school.slug}`,
    locale === 'zh'
      ? `${school.nameZh}（${school.code}）周边租房与通勤 | QRent`
      : `${school.code} Student Rentals & Commute Guide | QRent`,
    locale === 'zh'
      ? `浏览${school.nameZh}既有采集区域，比较 Domain 与 Real Estate 周租、房型和到 ${school.campus} 校区的通勤，查看申请与看房指南。`
      : `Compare Domain and Real Estate rental prices in the existing ${school.code} collection. Explore areas, weekly rent and public transport commutes to ${school.campus}, with practical rental guides.`
  );
}

export default async function SchoolRentals({ params }: Props) {
  const { locale, school: slug } = await params;
  const school = RENTAL_SCHOOLS.find(item => item.slug === slug);
  if (!school || !isLocale(locale)) notFound();
  setRequestLocale(locale);
  const zh = locale === 'zh';
  const [rows, guides] = await Promise.all([
    getRentalPreview(school.code, locale),
    getNotionBlogPosts(locale),
  ]);
  const title = zh
    ? `${school.nameZh}（${school.code}）租房`
    : `Rentals near ${school.name} (${school.code})`;
  return (
    <main className={styles.page}>
      <Breadcrumbs
        locale={locale}
        items={[
          { name: zh ? '首页' : 'Home', path: '' },
          { name: zh ? '悉尼租房目录' : 'Sydney rental directory', path: '/rentals' },
          { name: school.code, path: `/rentals/${school.slug}` },
        ]}
      />
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lead}>{school.focus[zh ? 'zh' : 'en']}</p>
      <p className={styles.note}>
        {zh
          ? 'QRent 已恢复既有悉尼范围的更新，展示 Domain 和 Real Estate 租金。周租通常是整套报价，请核对房源页的出租范围；通勤是公共交通参考值。房源可能已出租或改价，请在申请前到源站和中介确认。'
          : 'QRent has resumed updates within its existing Sydney scope, using Domain and Real Estate rental prices. Weekly rent is usually for the entire property; check the listing for its rental scope. Public transport times are indicative. Listings may be leased or repriced, so confirm with the source and agent before applying.'}
      </p>
      <Link href={rentalSearchPath(locale, school.code)} className={styles.primaryAction}>
        {zh ? `筛选 ${school.code} 房源` : `Search ${school.code} rentals`}
        <HiArrowRight aria-hidden="true" />
      </Link>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {zh ? '既有采集区域' : 'Areas in the existing collection'}
        </h2>
        <p className={styles.lead}>
          {zh
            ? '沿用项目历史的学校—区域匹配；并非所有区域都紧邻学校。点击区域后可继续调整预算和通勤条件。'
            : 'These areas follow the project’s historical university–area mapping. Some are farther from campus. Select an area to refine your budget and commute filters.'}
        </p>
        <ul className={styles.areaList}>
          {school.areas.map(area => (
            <li key={area}>
              <Link className={styles.areaLink} href={rentalSearchPath(locale, school.code, area)}>
                {areaName(area)}
                <HiArrowRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {zh ? '当前数据库房源预览' : 'Rental preview from the current database'}
        </h2>
        <p className={styles.note}>
          {zh
            ? '预览最多缓存 10 分钟，不等于实时可租确认；完整筛选请使用上方搜索。'
            : 'Previews are cached for up to 10 minutes and do not confirm live availability. Use the search above for full filters.'}
        </p>
        {rows && rows.length ? (
          <ul className={styles.listingList}>
            {rows.map(row => (
              <li key={row.id} className={styles.listing}>
                <div>
                  <h3>
                    <a href={row.url} target="_blank" rel="noopener noreferrer">
                      <span>
                        {row.address}, {row.region}
                      </span>
                      <HiExternalLink aria-hidden="true" />
                      <span className="sr-only">
                        {zh ? '（新窗口打开）' : ' (opens in a new tab)'}
                      </span>
                    </a>
                  </h3>
                  <p className={styles.listingSource}>
                    {new URL(row.url).hostname.includes('domain') ? 'Domain' : 'Real Estate'}
                  </p>
                </div>
                <p className={styles.price}>
                  A${row.price.toLocaleString('en-AU')}
                  <span>{zh ? '／周' : ' / week'}</span>
                </p>
                <ul className={styles.listingDetails}>
                  {Number.isFinite(row.bedroomCount) && (
                    <li>
                      {row.bedroomCount}{' '}
                      {zh ? '卧室' : row.bedroomCount === 1 ? 'bedroom' : 'bedrooms'}
                    </li>
                  )}
                  {Number.isFinite(row.commuteTime) && row.commuteTime! > 0 && (
                    <li>
                      {row.commuteTime} {zh ? '分钟公交参考' : 'min transit estimate'}
                    </li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <div>
            <p className={styles.lead}>
              {zh
                ? '暂时无法显示房源预览，请打开搜索查看。'
                : 'The preview is temporarily unavailable. Open the search to check listings.'}
            </p>
            <Link href={rentalSearchPath(locale, school.code)} className={styles.textLink}>
              {zh ? `筛选 ${school.code} 房源` : `Search ${school.code} rentals`}
            </Link>
          </div>
        )}
      </section>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {zh ? '申请前核对什么' : 'What to check before applying'}
        </h2>
        <ul className={styles.checklist}>
          <li>
            {zh
              ? '把周租、水电网、交通和押金一起纳入预算，并核对是否整租。'
              : 'Budget for weekly rent, utilities, transport and bond, and check whether the price is for the whole property.'}
          </li>
          <li>
            {zh
              ? '按真实上课时间核对换乘、候车和步行；不同校区不可共用同一个通勤值。'
              : 'Check transfers, waits and walking at your actual class time. A commute to one campus does not apply to every campus.'}
          </li>
          <li>
            {zh
              ? '先安排看房、检查合同与付款对象，再提交申请或支付款项。'
              : 'Arrange an inspection and verify the lease and payment recipient before applying or paying.'}
          </li>
        </ul>
        <ul className={styles.guideList}>
          {guides.slice(0, 3).map(guide => (
            <li key={guide.id}>
              <Link href={`/${locale}/blog/${encodeURIComponent(guide.slug)}`}>
                {zh ? guide.title : guide.title_en}
                <HiArrowRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <Link href={`/${locale}/blog`} className={styles.textLink}>
          {zh ? '查看全部租房指南' : 'Browse all rental guides'}
        </Link>
      </section>
      <RentalLinks locale={locale} compact />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: title,
            url: `${SITE_URL}/${locale}/rentals/${school.slug}`,
            inLanguage: zh ? 'zh-CN' : 'en-AU',
          }),
        }}
      />
    </main>
  );
}
