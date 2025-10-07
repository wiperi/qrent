import { IoBed } from 'react-icons/io5';
import { FaBath } from 'react-icons/fa';

interface PropertyCardProps {
  address: string;
  region: string;
  price: number;
  bedroomCount?: number;
  bathroomCount?: number;
  propertyType: number;
  descriptionEn?: string;
  commuteTime?: number;
  url: string;
  averageScore: number;
  keywords: string;
  availableDate?: string | null;
}

export default function PropertyCard({
  address,
  region,
  price,
  bedroomCount,
  bathroomCount,
  propertyType,
  commuteTime,
  url,
  averageScore,
  keywords,
  availableDate,
}: PropertyCardProps) {
  const propertyTypeName = propertyType === 1 ? 'House' : 'Apartment';

  const capitalizeEnglishWords = (text: string) => {
    return text.replace(/\b[a-zA-Z]+\b/g, word => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  };

  const formatAddress = (address: string) => {
    const firstDashIndex = address.indexOf('-');
    if (firstDashIndex === -1) return capitalizeEnglishWords(address);

    const unitNumber = address.substring(0, firstDashIndex);
    const remainder = address.substring(firstDashIndex + 1).replace(/-/g, ' ');

    return `${unitNumber} / ${capitalizeEnglishWords(remainder)}`;
  };

  const formatRegion = (region: string) => {
    const formatted = region.replace(/-/g, ' ');
    return capitalizeEnglishWords(formatted);
  };

  const keywordList = keywords.trim() ? keywords.split(' ').filter(Boolean).slice(0, 10) : [];

  const getScoreColor = (score: number): string => {
    if (score >= 18.3) return 'bg-orange-600 text-white';
    if (score >= 18) return 'bg-orange-500 text-white';
    return 'bg-orange-400 text-white';
  };

  const formatAvailableDate = (date: string | null | undefined): string | null => {
    if (date === null || date === undefined) {
      return null;
    }

    const now = new Date();
    const availableDate = new Date(date);
    const diffTime = availableDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // If date is in the past or today
    if (diffDays <= 0) {
      return 'Available now';
    }

    // If within the next week
    if (diffDays <= 7) {
      return `Available in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    }

    // For dates further out, show the actual date
    const options: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      year: availableDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    };

    return `Available ${availableDate.toLocaleDateString('en-US', options)}`;
  };

  const content = (
    <>
      {/* Score badge in top right */}
      <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${getScoreColor(averageScore)}`}>
        <span>{averageScore.toFixed(1)}</span>
        <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      </div>

      <h3 className="text-base font-semibold text-slate-900 pr-16">{formatAddress(address)}</h3>
      <p className="mt-1 text-sm text-slate-500">{formatRegion(region)}</p>
      <p className="mt-3 text-brand font-semibold text-lg">
        ${price.toLocaleString()}
        <span className="text-sm text-slate-500 font-normal">/week</span>
      </p>
      <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
        {bedroomCount && (
          <span className="flex items-center gap-1">
            <IoBed className="w-4 h-4" />
            {bedroomCount}
          </span>
        )}
        {bathroomCount && (
          <span className="flex items-center gap-1">
            <FaBath className="w-4 h-4" />
            {bathroomCount}
          </span>
        )}
        <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full text-xs font-medium">
          {propertyTypeName}
        </span>
        {availableDate && formatAvailableDate(availableDate) && (
          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full text-xs font-medium border border-green-200">
            {formatAvailableDate(availableDate)}
          </span>
        )}
      </div>
      {commuteTime !== undefined && (
        <p className="mt-1 text-sm text-slate-500">{commuteTime} min to university</p>
      )}

      {/* Keywords as capsules */}
      {keywordList.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {keywordList.map((keyword, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {keyword}
            </span>
          ))}
        </div>
      )}
    </>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card"
      >
        <article className="relative p-4">{content}</article>
      </a>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card">
      <div className="relative p-4">{content}</div>
    </article>
  );
}
