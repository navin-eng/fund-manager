import { useId, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function AccordionSection({
  title,
  description = '',
  icon: Icon = null,
  badge = null,
  defaultOpen = true,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <section className={`overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-sm ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 ${headerClassName}`.trim()}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Icon className="h-5 w-5" />
            </span>
          )}

          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 sm:text-base">{title}</span>
              {badge ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  {badge}
                </span>
              ) : null}
            </span>
            {description ? (
              <span className="mt-1 block text-sm text-slate-500">{description}</span>
            ) : null}
          </span>
        </div>

        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {open ? (
        <div id={panelId} className={`border-t border-slate-200 ${bodyClassName}`.trim()}>
          {children}
        </div>
      ) : null}
    </section>
  );
}
