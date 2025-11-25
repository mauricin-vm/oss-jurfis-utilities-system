import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function MinutesTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Botões superiores */}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-[100px]" />
        <Skeleton className="h-8 w-[120px]" />
      </div>

      {/* Tabela */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <TableHead>Número</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Sessão</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Presidente</TableHead>
              <TableHead>Presentes</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                <TableCell><Skeleton className="h-6 w-[140px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                <TableCell><Skeleton className="h-4 w-[30px]" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex justify-end gap-4 px-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-[200px]" />
      </div>
    </div>
  );
}
