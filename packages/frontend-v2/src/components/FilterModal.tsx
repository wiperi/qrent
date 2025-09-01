'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { HiX } from 'react-icons/hi'
import { PROPERTY_TYPE } from '@qrent/shared/enum'

const UNIVERSITY_OPTIONS = ['UNSW', 'UTS', 'USYD'] as const
const PROPERTY_TYPES = [
  { key: PROPERTY_TYPE.House, label: 'House' },
  { key: PROPERTY_TYPE.Apartment, label: 'Apartment' },
] as const

// University to regions mapping based on suburbOptions.ts
const UNIVERSITY_REGIONS = {
  UNSW: [
    'alexandria', 'bondi', 'botany', 'coogee', 'eastgardens', 'eastlakes', 
    'hillsdale', 'kensington', 'kingsford', 'maroubra', 'mascot', 'matraville', 
    'paddington', 'randwick', 'redfern', 'rosebery', 'waterloo', 'zetland'
  ],
  USYD: [
    'burwood', 'chippendale', 'city', 'glebe', 'haymarket', 'hurstville', 
    'mascot', 'newtown', 'ultimo', 'waterloo', 'zetland'
  ],
  UTS: [
    'sydney', 'mascot', 'zetland', 'chippendale', 'surry hills', 'burwood', 
    'waterloo', 'hurstville', 'strathfield', 'pyrmont', 'marrickville', 
    'darlinghurst', 'haymarket', 'paddington', 'ultimo', 'redfern', 
    'glebe', 'kensington', 'newtown'
  ]
} as const

export default function FilterModal() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isOpen = searchParams.get('filters') === 'open'

  // Local state initialized from URL
  const [university, setUniversity] = useState<string>('UNSW')
  const [selectedTypes, setSelectedTypes] = useState<number[]>([])
  const [priceMin, setPriceMin] = useState<string>('')
  const [priceMax, setPriceMax] = useState<string>('')
  const [bedroomsMin, setBedroomsMin] = useState<string>('')
  const [bedroomsMax, setBedroomsMax] = useState<string>('')
  const [bathroomsMin, setBathroomsMin] = useState<string>('')
  const [bathroomsMax, setBathroomsMax] = useState<string>('')
  const [carMin, setCarMin] = useState<string>('')
  const [carMax, setCarMax] = useState<string>('')
  const [availableFrom, setAvailableFrom] = useState<string>('')
  const [availableTo, setAvailableTo] = useState<string>('')
  const [commuteMin, setCommuteMin] = useState<string>('')
  const [commuteMax, setCommuteMax] = useState<string>('')
  const [rating, setRating] = useState<number>(13)
  const [areas, setAreas] = useState<string[]>([])

  // Initialize from URL whenever modal opens
  useEffect(() => {
    if (!isOpen) return
    setUniversity(searchParams.get('university') || 'UNSW')
    setSelectedTypes((searchParams.get('propertyType') || '').split(',').filter(Boolean).map(Number))
    setPriceMin(searchParams.get('priceMin') || '')
    setPriceMax(searchParams.get('priceMax') || '')
    setBedroomsMin(searchParams.get('bedroomsMin') || '')
    setBedroomsMax(searchParams.get('bedroomsMax') || '')
    setBathroomsMin(searchParams.get('bathroomsMin') || '')
    setBathroomsMax(searchParams.get('bathroomsMax') || '')
    setCarMin(searchParams.get('carSpacesMin') || '')
    setCarMax(searchParams.get('carSpacesMax') || '')
    setAvailableFrom(searchParams.get('availableFrom') || '')
    setAvailableTo(searchParams.get('availableTo') || '')
    setCommuteMin(searchParams.get('commutingMin') || '')
    setCommuteMax(searchParams.get('commutingMax') || '')
    setRating(Number(searchParams.get('rating') || 13))
    setAreas((searchParams.get('areas') || '').split(',').filter(Boolean))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Scroll lock & basic focus handling
  const previouslyFocused = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
      previouslyFocused.current?.focus()
    }
  }, [isOpen])

  const close = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('filters')
    const href = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(href)
  }
  const onClear = () => {
    // Clear all form state
    setUniversity('UNSW')
    setSelectedTypes([])
    setPriceMin('')
    setPriceMax('')
    setBedroomsMin('')
    setBedroomsMax('')
    setBathroomsMin('')
    setBathroomsMax('')
    setCarMin('')
    setCarMax('')
    setAvailableFrom('')
    setAvailableTo('')
    setCommuteMin('')
    setCommuteMax('')
    setRating(13) // Reset to default rating
    setAreas([])
    
    // Update URL params but keep modal open
    const params = new URLSearchParams(searchParams.toString())
    ;[
      'university',
      'propertyType',
      'priceMin', 'priceMax',
      'bedroomsMin', 'bedroomsMax',
      'bathroomsMin', 'bathroomsMax',
      'carSpacesMin', 'carSpacesMax',
      'availableFrom', 'availableTo',
      'commutingMin', 'commutingMax',
      'rating',
      'areas',
    ].forEach(k => params.delete(k))
    // keep modal open
    params.set('filters', 'open')
    const href = `${pathname}?${params.toString()}`
    router.replace(href)
  }

  const onApply = () => {
    const params = new URLSearchParams(searchParams.toString())
    const setOrDelete = (key: string, val?: string) => {
      if (val && val.trim() !== '') params.set(key, val)
      else params.delete(key)
    }
    setOrDelete('university', university)
    setOrDelete('propertyType', selectedTypes.join(','))
    setOrDelete('priceMin', priceMin)
    setOrDelete('priceMax', priceMax)
    setOrDelete('bedroomsMin', bedroomsMin)
    setOrDelete('bedroomsMax', bedroomsMax)
    setOrDelete('bathroomsMin', bathroomsMin)
    setOrDelete('bathroomsMax', bathroomsMax)
    setOrDelete('carSpacesMin', carMin)
    setOrDelete('carSpacesMax', carMax)
    setOrDelete('availableFrom', availableFrom)
    setOrDelete('availableTo', availableTo)
    setOrDelete('commutingMin', commuteMin)
    setOrDelete('commutingMax', commuteMax)
    setOrDelete('rating', String(rating))
    setOrDelete('areas', areas.join(','))
    // reset page and close modal
    params.set('page', '1')
    params.delete('filters')
    const href = `${pathname}?${params.toString()}`
    if (pathname === '/search') {
      router.push(href)
    } else {
      router.push(`/search?${params.toString()}`)
    }
  }

  const toggleType = (key: number) => {
    setSelectedTypes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }
  const toggleArea = (area: string) => {
    setAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])
  }

  // Get regions based on selected university
  const availableRegions = useMemo(() => {
    const universityKey = university as keyof typeof UNIVERSITY_REGIONS
    return UNIVERSITY_REGIONS[universityKey] || []
  }, [university])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" aria-hidden={!isOpen}>
      {/* overlay */}
      <div className="absolute inset-0 bg-slate-900/50" onClick={close} />

      {/* dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="filter-modal-title"
        className="absolute inset-x-0 top-0 mx-auto mt-28 w-[min(900px,92vw)] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 id="filter-modal-title" className="text-base font-semibold text-slate-900">Filters</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close filters"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-slate-100"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-6">
          {/* University (single-select) */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-3">University</h3>
            <div className="grid grid-cols-3 gap-3">
              {UNIVERSITY_OPTIONS.map(u => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUniversity(u)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    university === u ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </section>

          {/* Property Type (multi-select) */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-3">Property Type</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PROPERTY_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => toggleType(t.key)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    selectedTypes.includes(t.key) ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {/* Price */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-2">Price ($/week)</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={priceMin} onChange={e => setPriceMin(e.target.value)} type="number" placeholder="Min" className="rounded-xl border border-slate-200 px-3 py-2" />
              <input value={priceMax} onChange={e => setPriceMax(e.target.value)} type="number" placeholder="Max" className="rounded-xl border border-slate-200 px-3 py-2" />
            </div>
          </section>

          {/* Bedrooms */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-2">Bedrooms</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={bedroomsMin} onChange={e => setBedroomsMin(e.target.value)} type="number" placeholder="Min" className="rounded-xl border border-slate-200 px-3 py-2" />
              <input value={bedroomsMax} onChange={e => setBedroomsMax(e.target.value)} type="number" placeholder="Max" className="rounded-xl border border-slate-200 px-3 py-2" />
            </div>
          </section>

          {/* Bathrooms */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-2">Bathrooms</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={bathroomsMin} onChange={e => setBathroomsMin(e.target.value)} type="number" placeholder="Min" className="rounded-xl border border-slate-200 px-3 py-2" />
              <input value={bathroomsMax} onChange={e => setBathroomsMax(e.target.value)} type="number" placeholder="Max" className="rounded-xl border border-slate-200 px-3 py-2" />
            </div>
          </section>

          {/* Car spaces */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-2">Car spaces</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={carMin} onChange={e => setCarMin(e.target.value)} type="number" placeholder="Min" className="rounded-xl border border-slate-200 px-3 py-2" />
              <input value={carMax} onChange={e => setCarMax(e.target.value)} type="number" placeholder="Max" className="rounded-xl border border-slate-200 px-3 py-2" />
            </div>
          </section>

          {/* Available Date */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-2">Available Date</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} type="date" className="rounded-xl border border-slate-200 px-3 py-2" />
              <input value={availableTo} onChange={e => setAvailableTo(e.target.value)} type="date" className="rounded-xl border border-slate-200 px-3 py-2" />
            </div>
          </section>

          {/* Commuting Time */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-2">Commuting Time (min)</h3>
            <div className="grid grid-cols-2 gap-3">
              <input value={commuteMin} onChange={e => setCommuteMin(e.target.value)} type="number" placeholder="Min" className="rounded-xl border border-slate-200 px-3 py-2" />
              <input value={commuteMax} onChange={e => setCommuteMax(e.target.value)} type="number" placeholder="Max" className="rounded-xl border border-slate-200 px-3 py-2" />
            </div>
          </section>

          {/* Rating */}
          <section>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-800">Rating</h3>
              <span className="text-sm text-slate-600">{rating}</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={rating}
              onChange={e => setRating(Number(e.target.value))}
              className="w-full"
            />
          </section>

          {/* Region (multi-select) */}
          <section>
            <h3 className="text-sm font-medium text-slate-800 mb-3">Region</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {availableRegions.map(region => (
                <button
                  key={region}
                  type="button"
                  onClick={() => toggleArea(region)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition capitalize ${
                    areas.includes(region) ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-700 hover:border-blue-300'
                  }`}
                >
                  {region.replace('-', ' ')}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t px-5 py-3">
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-600"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


