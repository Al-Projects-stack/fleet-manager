type DotColor = 'green' | 'yellow' | 'red' | 'gray';

const colorMap: Record<string, DotColor> = {
  active: 'green',
  inactive: 'gray',
  maintenance: 'yellow',
  low: 'gray',
  medium: 'yellow',
  high: 'red',
  critical: 'red',
  ok: 'green',
};

const dotClasses: Record<DotColor, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  gray: 'bg-gray-400',
};

interface StatusDotProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusDot({ status, size = 'md' }: StatusDotProps) {
  const color = colorMap[status] ?? 'gray';
  const sizeClass = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';
  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${sizeClass} ${dotClasses[color]}`}
    />
  );
}
