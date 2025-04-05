import Textbox from './priceDropDown';
import bgImg from '../../public/searchBG.jpg';
import MoreFilterModal from './MoreFilterModal';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useFilterStore } from '../store/useFilterStore';
import { useRouter } from 'next/navigation';

export default function Search() {
  const { filter, updateFilter } = useFilterStore();

  const t = useTranslations('Search');
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // if the clicked element is a form control, don't navigate
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (['input', 'select', 'textarea', 'button'].includes(tag)) return;
    router.push('/findAHome');
  };

  return (
    <>
      <section
        className="hero bg-cover h-56"
        style={{
          backgroundImage: `url(${bgImg.src})`,
        }}
      >
        <h1 className="text-white drop-shadow-2xl absolute top-28 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold font-serif">
          Find Your Dream Home
        </h1>

        <div onClick={handleClick}>
          <div className="bg-white p-4 shadow rounded-lg flex gap-4 font-semibold justify-between flex-wrap mt-8 mx-auto max-w-screen-lg w-full">
            <div className="flex-1">
              <div className="text-sm text-gray-600">{t('university')}</div>
              <select
                className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                value={filter.university}
                onChange={e => updateFilter({ ...filter, university: e.target.value })}
              >
                <option>UNSW</option>
                <option>USYD</option>
              </select>
            </div>

            <div className="flex-1">
              <div className="text-sm text-gray-600">{t('price-range')}</div>

              <div className="flex items-center space-x-1">
                <Textbox
                  label=""
                  name="priceMin"
                  filter={filter}
                  setFilter={updateFilter}
                  ph={t('min')}
                />

                <span className="text-lg">-</span>

                <Textbox
                  label=""
                  name="priceMax"
                  filter={filter}
                  setFilter={updateFilter}
                  ph={t('max')}
                />
              </div>
            </div>

            <div className="flex-1">
              <div className="text-sm text-gray-600">{t('bedrooms')}</div>

              <div className="flex items-center space-x-1">
                <Textbox
                  label=""
                  name="bedroomMin"
                  filter={filter}
                  setFilter={updateFilter}
                  ph={t('min')}
                />

                <span className="text-lg">-</span>

                <Textbox
                  label=""
                  name="bedroomMax"
                  filter={filter}
                  setFilter={updateFilter}
                  ph={t('max')}
                />
              </div>
            </div>

            <div className="flex-1">
              <div className="text-sm text-gray-600">{t('travel-time')}</div>
              <select
                className="border rounded px-2 py-1 max-h-40 overflow-y-auto w-full"
                value={filter.travelTime}
                onChange={e => updateFilter({ ...filter, travelTime: e.target.value })}
              >
                <option>Any</option>
                <option>10 min</option>
                <option>20 min</option>
                <option>30 min</option>
                <option>40 min</option>
                <option>50 min</option>
                <option>1h</option>
                <option>1.5h</option>
                <option>2h</option>
              </select>
            </div>

            <div className="flex gap-4">
              <MoreFilterModal filter={filter} setFilter={updateFilter} />
              <button className="bg-blue-primary text-white px-4 py-1 rounded mt-4">
                <Link href="/findAHome">Go</Link>
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
