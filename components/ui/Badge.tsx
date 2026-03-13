interface BadgeProps {
  label: string;
  variant?: "green" | "red" | "yellow" | "gray" | "brand";
}

const variants: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-1 ring-red-200",
  yellow: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  gray: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
};

export default function Badge({ label, variant = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
    >
      {label}
    </span>
  );
}
