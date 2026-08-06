const clampPercent = (n: number) => Math.max(0, Math.min(100, n));

export function StatCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  footerLeft,
  footerRight,
  onClick,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${
        clickable ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-600">{title}</p>
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center ${iconBg}`}
        >
          <span className={iconColor}>{icon}</span>
        </div>
      </div>

      <div className="mt-4 text-4xl font-black text-slate-900">{value}</div>

      {(footerLeft || footerRight) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="text-xs text-slate-600">{footerLeft}</div>
          <div className="text-xs text-slate-500">{footerRight}</div>
        </div>
      )}
    </div>
  );
}

export function ProgressCard({
  title,
  valuePct,
  subtitle,
  barClass,
  icon,
}: {
  title: string;
  valuePct: number;
  subtitle: string;
  barClass: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold tracking-wider uppercase text-slate-500">
            {title}
          </p>
          <div className="mt-2 text-4xl font-black text-slate-900">
            {Math.round(valuePct)}%
          </div>
          <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700">
          {icon}
        </div>
      </div>

      <div className="mt-5 w-full bg-slate-100 h-3 rounded-full overflow-hidden">
        <div
          className={`h-full ${barClass}`}
          style={{ width: `${clampPercent(valuePct)}%` }}
        />
      </div>
    </div>
  );
}