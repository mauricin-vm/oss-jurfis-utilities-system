'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  Trash2,
  ChevronLeft,
  ChevronsLeft,
  ChevronRight,
  ChevronsRight,
  Plus,
  Filter,
  Search,
  Clock,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationList {
  id: string;
  listNumber: string;
  sequenceNumber: number;
  year: number;
  type: string;
  status: string;
  items: {
    id: string;
    resource: {
      id: string;
      resourceNumber: string;
      processNumber: string;
      processName: string | null;
    };
    attempts: {
      id: string;
      channel: string;
      status: string;
      deadline: Date;
    }[];
  }[];
  createdByUser: {
    id: string;
    name: string | null;
  };
  _count: {
    items: number;
  };
  createdAt: Date;
}

interface NotificationListTableProps {
  data: NotificationList[];
  loading: boolean;
  onRefresh: () => void;
  onNewList: () => void;
  userRole?: string;
}

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  FINALIZADA: 'Finalizada',
};

const statusStyles: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  FINALIZADA: 'bg-green-100 text-green-800 hover:bg-green-100',
};

const typeLabels: Record<string, string> = {
  ADMISSIBILIDADE: 'Admissibilidade',
  SESSAO: 'Sessão',
  DILIGENCIA: 'Diligência',
  DECISAO: 'Decisão',
  OUTRO: 'Outro',
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDENTE: <Clock className="h-3.5 w-3.5" />,
  FINALIZADA: <CheckCircle className="h-3.5 w-3.5" />,
};

function NotificationListTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="rounded-lg border bg-card">
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function NotificationListTable({ data, loading, onRefresh, onNewList, userRole }: NotificationListTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canDelete = userRole === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearchExpanded(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const response = await fetch(`/api/ccr/intimacoes/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Lista removida com sucesso');
        onRefresh();
      } else {
        const error = await response.text();
        toast.error(error || 'Erro ao remover lista');
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Erro ao remover lista');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtrar dados
  const filteredData = data.filter((list) => {
    const statusMatch = statusFilter === 'all' || list.status === statusFilter;

    const searchMatch = !searchQuery ||
      list.listNumber.toLowerCase().includes(searchQuery.toLowerCase());

    return statusMatch && searchMatch;
  });

  // Paginação
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Contar por status
  const statusCounts = {
    all: data.length,
    PENDENTE: data.filter(l => l.status === 'PENDENTE').length,
    FINALIZADA: data.filter(l => l.status === 'FINALIZADA').length,
  };

  if (loading) {
    return <NotificationListTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Botões de Busca, Filtros e Nova Lista */}
      <div className="flex justify-end gap-2">
        {/* Busca Animada */}
        <div className="relative flex items-center">
          <div
            className={cn(
              "relative flex items-center justify-end transition-all duration-300 ease-in-out",
              isSearchExpanded ? "w-[200px] sm:w-[250px]" : "w-8"
            )}
          >
            <div className="relative w-full h-8">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar por número..."
                value={searchQuery}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                className={cn(
                  "absolute right-0 top-0 h-8 w-full pr-8 text-sm border-gray-200 focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity duration-300",
                  isSearchExpanded ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
                )}
              />
              <TooltipWrapper content="Buscar por número">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearchClick}
                  className={cn(
                    "absolute right-0 top-0 h-8 w-8 p-0 cursor-pointer transition-opacity duration-300",
                    isSearchExpanded ? "opacity-0 pointer-events-none" : "opacity-100 z-10"
                  )}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipWrapper>
            </div>
          </div>
          {isSearchExpanded && (
            <Search className="absolute right-2 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 cursor-pointer">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px] sm:w-[320px] p-0">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Situação
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Selecione a situação" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="all" className="cursor-pointer h-9">Todas ({statusCounts.all})</SelectItem>
                    <SelectItem value="PENDENTE" className="cursor-pointer h-9">Pendente ({statusCounts.PENDENTE})</SelectItem>
                    <SelectItem value="FINALIZADA" className="cursor-pointer h-9">Finalizada ({statusCounts.FINALIZADA})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t p-3">
              <div className="text-xs text-muted-foreground text-center">
                {filteredData.length} {filteredData.length === 1 ? 'lista encontrada' : 'listas encontradas'}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" onClick={onNewList} className="h-8 gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Lista</span>
        </Button>
      </div>

      {/* Tabela */}
      {filteredData.length === 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma lista de intimações encontrada.</p>
            <p className="text-sm text-muted-foreground mt-2">Clique em &quot;Nova Lista&quot; para criar.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="relative w-full overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted border-b">
                    <TableHead className="font-semibold">Número</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Qtd. Processos</TableHead>
                    <TableHead className="font-semibold">Situação</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((list) => (
                    <TableRow key={list.id} className="bg-white hover:bg-muted/40 min-h-[49px]">
                      <TableCell className="font-medium text-sm">
                        {list.listNumber}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{typeLabels[list.type] || list.type}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(list.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{list._count.items}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            statusStyles[list.status] || 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                          )}
                        >
                          {statusIcons[list.status]}
                          {statusLabels[list.status] || list.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/ccr/intimacoes/${list.id}`)}
                              className="cursor-pointer h-9"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Visualizar
                            </DropdownMenuItem>
                            {canDelete && list._count.items === 0 && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(list.id)}
                                disabled={deletingId === list.id}
                                className="cursor-pointer h-9"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer com Paginação */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 px-2 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 rounded-md border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md min-w-[4rem]">
                  {[10, 20, 50, 100].map((value) => (
                    <SelectPrimitive.Item
                      key={value}
                      value={value.toString()}
                      className={cn(
                        "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                      )}
                    >
                      <SelectPrimitive.ItemText>{value}</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Página {currentPage} de {totalPages || 1}
                </span>
                <div className="flex items-center gap-1">
                  <TooltipWrapper content="Primeira página">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Página anterior">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Próxima página">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Última página">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
