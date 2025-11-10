import { Skeleton } from "@/components/ui/skeleton";

export function ProtocolFormSkeleton() {
  return (
    <div className="space-y-6">
      {/* Campo Número do Processo */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Campo Apresentante */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>

      {/* Card de Partes */}
      <div className="rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>

        {/* Parte 1 */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        <Skeleton className="h-10 w-full" />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-36" />
      </div>
    </div>
  );
}
