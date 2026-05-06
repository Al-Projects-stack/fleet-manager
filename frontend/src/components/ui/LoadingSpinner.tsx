interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  return (
    <div
      className={`${sizeMap[size]} ${className} animate-spin rounded-full border-2 border-gray-200 border-t-blue-600`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export function InlineSpinner() {
  return <LoadingSpinner size="sm" className="inline-block" />;
}
