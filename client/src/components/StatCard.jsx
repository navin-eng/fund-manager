import { TrendingUp, TrendingDown } from 'lucide-react';

const colorClasses = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'bg-indigo-500/10 text-indigo-600',
    trend: 'text-indigo-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-500/10 text-emerald-600',
    trend: 'text-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-500/10 text-amber-600',
    trend: 'text-amber-600',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'bg-rose-500/10 text-rose-600',
    trend: 'text-rose-600',
  },
  sky: {
    bg: 'bg-sky-50',
    icon: 'bg-sky-500/10 text-sky-600',
    trend: 'text-sky-600',
  },
};

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, color = 'indigo' }) {
  const colors = colorClasses[color] || colorClasses.indigo;
  const isPositive = trend >= 0;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colors.icon}`}>
          {Icon && <Icon className="h-6 w-6" />}
        </div>
        {trend !== undefined && trend !== null && (
          <div
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{title}</p>
      </div>
      {trendLabel && (
        <p className="mt-2 text-xs text-slate-400">{trendLabel}</p>
      )}
    </div>
  );
}
