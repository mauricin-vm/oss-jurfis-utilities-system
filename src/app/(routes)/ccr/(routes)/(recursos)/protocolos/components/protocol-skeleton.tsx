import { Skeleton } from "@/components/ui/skeleton";

export function ProtocolTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Botões de busca, filtros e novo protocolo skeleton */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-36" />
      </div>

      {/* Tabela skeleton */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
        <div className="relative w-full overflow-x-auto">
          {/* Header */}
          <div className="bg-muted p-4 border-b">
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>

          {/* Linhas */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
            <div key={i} className="p-4 border-b min-h-[49px] flex items-center">
              <div className="flex gap-4 items-center w-full">
                <Skeleton className="h-4 w-28 font-mono" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-8 w-8 rounded ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Paginação skeleton */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 px-2 py-4">
        <div className="flex items-center gap-6">
          <Skeleton className="h-8 w-16" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
