export default function Loading() {
  return (
    <main>
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white shadow-card ring-1 ring-slate-200 p-2 md:p-3">
            <div className="h-12 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </section>
      <section className="pb-12 md:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <aside className="lg:col-span-3 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="h-4 w-24 bg-slate-200 rounded" />
                <div className="mt-2 h-7 w-20 bg-slate-200 rounded" />
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="h-4 w-28 bg-slate-200 rounded" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full bg-slate-200 rounded" />
                  <div className="h-3 w-5/6 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="h-4 w-16 bg-slate-200 rounded" />
                <div className="mt-3 space-y-2">
                  <div className="h-3 w-full bg-slate-200 rounded" />
                  <div className="h-3 w-4/5 bg-slate-200 rounded" />
                  <div className="h-3 w-3/5 bg-slate-200 rounded" />
                </div>
              </div>
            </aside>
            <div className="lg:col-span-9">
              <div className="h-8 w-48 bg-slate-200 rounded" />
              <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="aspect-[4/3] bg-slate-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                      <div className="h-4 bg-slate-200 rounded w-1/3 mt-3" />
                      <div className="h-3 bg-slate-200 rounded w-full" />
                      <div className="h-3 bg-slate-200 rounded w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}


