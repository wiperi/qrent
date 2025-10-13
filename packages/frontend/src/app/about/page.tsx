export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">About QRent</h1>

        <div className="prose prose-slate max-w-none">
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Our Mission</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              QRent is dedicated to simplifying the rental property search experience for students and young professionals.
              We understand that finding the perfect place to live can be overwhelming, time-consuming, and stressful.
              That&apos;s why we&apos;ve built a platform that aggregates rental listings, analyzes them with intelligent scoring,
              and helps you make informed decisions quickly.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              Our smart scoring system evaluates properties based on multiple factors including location, price,
              amenities, and proximity to universities, giving you a comprehensive view at a glance.
            </p>
          </section>

          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">What We Do</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Smart Aggregation</h3>
                <p className="text-slate-600">
                  We collect and organize rental listings from multiple sources, saving you hours of searching across different platforms.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Intelligent Scoring</h3>
                <p className="text-slate-600">
                  Our proprietary algorithm scores each property based on value, location, amenities, and other key factors.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Real-Time Updates</h3>
                <p className="text-slate-600">
                  Stay informed with up-to-date listings and availability information, so you never miss out on great opportunities.
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Personalized Experience</h3>
                <p className="text-slate-600">
                  Save your preferences, track favorite properties, and receive notifications about new listings that match your criteria.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-slate-800 mb-4">Our Story</h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-4">
              QRent was born from personal experience. As students ourselves, we faced the challenges of finding quality,
              affordable housing while balancing studies and limited budgets. We realized that the rental market needed
              a better solution—one that combines technology with genuine understanding of renters&apos; needs.
            </p>
            <p className="text-lg text-slate-600 leading-relaxed">
              Today, we&apos;re proud to help thousands of renters find their ideal homes, making the process easier,
              faster, and more transparent. We&apos;re constantly evolving our platform based on user feedback and
              market trends to serve you better.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
