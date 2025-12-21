import { HiBookOpen, HiClipboardCheck, HiCollection } from 'react-icons/hi'
import Section from './Section'

interface ProgressCardProps {
  title: string
  description: string
  icon: React.ReactNode
  progress?: { current: number; total: number }
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const percentage = Math.min(100, Math.max(0, Math.round((current / total) * 100)))
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{current}/{total}</span>
        <span>{percentage}%</span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-blue-600" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function GuideCard({ title, description, icon, progress }: ProgressCardProps) {
  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-card">
      <div className="flex items-center gap-4">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
      </div>
      {progress ? <ProgressBar current={progress.current} total={progress.total} /> : null}
    </article>
  )
}

export default function UsefulGuide() {
  return (
    <Section title="Useful Guide">
      <div id="guide" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <GuideCard 
          title="Rental Guide"
          description="Step-by-step guide to renting your next home."
          icon={<HiBookOpen className="h-5 w-5" />} 
          progress={{ current: 3, total: 10 }}
        />
        <GuideCard 
          title="Document Preparation"
          description="Prepare and organize application documents."
          icon={<HiClipboardCheck className="h-5 w-5" />} 
          progress={{ current: 1, total: 6 }}
        />
        <GuideCard 
          title="Resource Center"
          description="Browse tips, checklists, and local resources."
          icon={<HiCollection className="h-5 w-5" />} 
        />
      </div>
    </Section>
  )
}


