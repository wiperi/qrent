interface PropertyCardProps {
  address: string;
  region: string;
  price: number;
  bedroomCount?: number;
  bathroomCount?: number;
  propertyType: number;
  descriptionEn?: string;
  commuteTime?: number;
  url?: string;
}

export default function PropertyCard({
  address,
  region,
  price,
  bedroomCount,
  bathroomCount,
  propertyType,
  descriptionEn,
  commuteTime,
  url,
}: PropertyCardProps) {
  const propertyTypeName = propertyType === 1 ? 'House' : 'Apartment';

  const content = (
    <>
      <h3 className="text-base font-semibold text-slate-900">{address}</h3>
      <p className="mt-1 text-sm text-slate-500">{region}</p>
      <p className="mt-3 text-brand font-semibold text-lg">
        ${price.toLocaleString()}
        <span className="text-sm text-slate-500 font-normal">/week</span>
      </p>
      <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
        {bedroomCount && (
          <span>
            {bedroomCount} bed{bedroomCount !== 1 ? 's' : ''}
          </span>
        )}
        {bathroomCount && (
          <span>
            {bathroomCount} bath{bathroomCount !== 1 ? 's' : ''}
          </span>
        )}
        <span>{propertyTypeName}</span>
      </div>
      {commuteTime !== undefined && (
        <p className="mt-1 text-sm text-slate-500">{commuteTime} min to university</p>
      )}
      {descriptionEn && <p className="mt-2 text-sm text-slate-600 line-clamp-2">{descriptionEn}</p>}
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
        <article className="p-4">{content}</article>
      </a>
    );
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-card">
      <div className="p-4">{content}</div>
    </article>
  );
}
