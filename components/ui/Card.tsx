interface CardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

export default function Card({ title, value, subtitle }: CardProps) {
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-card hover:shadow-card-hover transition-shadow">
      {/* Gradient accent bar */}
      <div className="h-1 w-full bg-gradient-card-accent" />
      <div className="p-6">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
