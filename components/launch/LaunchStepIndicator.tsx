'use client'

const STEPS = [
  { n: 1 as const, label: 'Token basics' },
  { n: 2 as const, label: 'Your story' },
  { n: 3 as const, label: 'Review & deploy' },
]

type Step = 1 | 2 | 3

type Props = {
  current: Step
  maxReached: Step
  onGoTo?: (step: Step) => void
}

export default function LaunchStepIndicator({ current, maxReached, onGoTo }: Props) {
  return (
    <nav aria-label="Launch steps" className="mb-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center sm:gap-0">
        {STEPS.map((s, i) => {
          const done = current > s.n
          const active = current === s.n
          const reachable = s.n <= maxReached
          const clickable = Boolean(onGoTo && reachable && s.n !== current)

          return (
            <div key={s.n} className="flex items-center sm:flex-1 sm:max-w-[11rem]">
              <div className="flex w-full items-center gap-3 sm:flex-col sm:gap-2 sm:text-center">
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onGoTo?.(s.n)}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-lg ring-4 ring-slate-900/10'
                      : done
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-400'
                  } ${clickable ? 'cursor-pointer hover:opacity-90' : 'cursor-default'}`}
                >
                  {done ? '✓' : s.n}
                </button>
                <div className="min-w-0 flex-1 sm:w-full">
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      active ? 'text-slate-900' : done ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    Step {s.n}
                  </p>
                  <p className={`truncate text-sm font-bold ${active ? 'text-slate-900' : 'text-gray-500'}`}>{s.label}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mx-2 hidden h-0.5 w-full max-w-[3rem] shrink sm:block ${done ? 'bg-emerald-400' : 'bg-gray-200'}`}
                  aria-hidden
                />
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
