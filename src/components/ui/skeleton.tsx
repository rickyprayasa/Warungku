import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>

      <div className="flex flex-wrap gap-2">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>

      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border-2 border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-5 w-5 bg-gray-200 rounded"></div>
            </div>
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border-2 border-gray-200 rounded-lg p-3 h-64"></div>
        <div className="border-2 border-gray-200 rounded-lg p-3 h-64"></div>
      </div>
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="border-2 border-gray-200 rounded-lg p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-16 h-16 bg-gray-200 rounded flex-shrink-0"></div>
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 p-3 border border-gray-200 rounded">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid gap-2 grid-cols-2 md:grid-cols-${cols} animate-pulse`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="border-2 border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-5 w-5 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function TableHeaderSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex gap-2 p-3 border-2 border-gray-200 bg-gray-50">
        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
        <div className="h-5 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded w-full"></div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-gray-200 rounded w-24"></div>
        <div className="h-10 bg-gray-200 rounded w-24"></div>
      </div>
    </div>
  );
}

export { Skeleton }
