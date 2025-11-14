'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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
import { MoreHorizontal, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight, Filter, Search, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { ResourceTableSkeleton } from './resource-skeleton';
import { getResourceStatusLabel, getResourceStatusColor } from '../../../../hooks/resource-status';

interface Resource {
  id: string;
  resourceNumber: string;
  sequenceNumber: number;
  year: number;
  processNumber: string;
  processName: string | null;
  status: string;
  type: string;
  createdAt: Date;
  protocol: {
    id: string;
    number: string;
    processNumber: string;
    presenter: string;
    employee: {
      id: string;
      name: string;
      email: string;
    };
  };
  parts: Array<{
    id: string;
    name: string;
    role: string;
    document: string | null;
  }>;
  subjects: Array<{
    subject: {
      id: string;
      name: string;
      parentId: string | null;
    };
  }>;
  _count?: {
    documents: number;
    sessions: number;
    registrations: number;
  };
}

interface ResourceTableProps {
  data: Resource[];
  loading: boolean;
  onRefresh: () => void;
}

const typeLabels: Record<string, string> = {
  VOLUNTARIO: 'Voluntário',
  OFICIO: 'Ofício',
};

export function ResourceTable({ data, loading, onRefresh }: ResourceTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
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

  // Filtrar dados
  const filteredData = data.filter((resource) => {
    const statusMatch = statusFilter === 'all' || (resource.status === statusFilter);
    const typeMatch = typeFilter === 'all' || (resource.type === typeFilter);

    const searchMatch = !searchQuery ||
      resource.resourceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.processNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (resource.processName && resource.processName.toLowerCase().includes(searchQuery.toLowerCase()));

    return statusMatch && typeMatch && searchMatch;
  });

  // Dados já vêm ordenados pelo backend
  const sortedData = filteredData;

  // Paginação
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Reset page when filtered data changes
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Contar por status
  const statusCounts = {
    all: data.length,
    EM_ANALISE: data.filter(r => r.status === 'EM_ANALISE').length,
    TEMPESTIVIDADE: data.filter(r => r.status === 'TEMPESTIVIDADE').length,
    CONTRARRAZAO: data.filter(r => r.status === 'CONTRARRAZAO').length,
    PARECER_PGM: data.filter(r => r.status === 'PARECER_PGM').length,
    DISTRIBUICAO: data.filter(r => r.status === 'DISTRIBUICAO').length,
    NOTIFICACAO_JULGAMENTO: data.filter(r => r.status === 'NOTIFICACAO_JULGAMENTO').length,
    JULGAMENTO: data.filter(r => r.status === 'JULGAMENTO').length,
    DILIGENCIA: data.filter(r => r.status === 'DILIGENCIA').length,
    PEDIDO_VISTA: data.filter(r => r.status === 'PEDIDO_VISTA').length,
    SUSPENSO: data.filter(r => r.status === 'SUSPENSO').length,
    PUBLICACAO_ACORDAO: data.filter(r => r.status === 'PUBLICACAO_ACORDAO').length,
    ASSINATURA_ACORDAO: data.filter(r => r.status === 'ASSINATURA_ACORDAO').length,
    NOTIFICACAO_DECISAO: data.filter(r => r.status === 'NOTIFICACAO_DECISAO').length,
    CONCLUIDO: data.filter(r => r.status === 'CONCLUIDO').length,
  };

  // Contar por tipo
  const typeCounts = {
    all: data.length,
    VOLUNTARIO: data.filter(r => r.type === 'VOLUNTARIO').length,
    OFICIO: data.filter(r => r.type === 'OFICIO').length,
  };

  if (loading) {
    return <ResourceTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Botões de Busca e Filtros */}
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
                placeholder="Buscar recursos..."
                value={searchQuery}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                className={cn(
                  "absolute right-0 top-0 h-8 w-full pr-8 text-sm border-gray-200 focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity duration-300",
                  isSearchExpanded ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
                )}
              />
              <TooltipWrapper content="Buscar por número do recurso, processo ou razão social">
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
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="all" className="cursor-pointer h-9">
                      Todos ({statusCounts.all})
                    </SelectItem>
                    <SelectItem value="EM_ANALISE" className="cursor-pointer h-9">
                      Em Análise ({statusCounts.EM_ANALISE})
                    </SelectItem>
                    <SelectItem value="TEMPESTIVIDADE" className="cursor-pointer h-9">
                      Tempestividade ({statusCounts.TEMPESTIVIDADE})
                    </SelectItem>
                    <SelectItem value="CONTRARRAZAO" className="cursor-pointer h-9">
                      Contrarrazão ({statusCounts.CONTRARRAZAO})
                    </SelectItem>
                    <SelectItem value="PARECER_PGM" className="cursor-pointer h-9">
                      Parecer PGM ({statusCounts.PARECER_PGM})
                    </SelectItem>
                    <SelectItem value="DISTRIBUICAO" className="cursor-pointer h-9">
                      Distribuição ({statusCounts.DISTRIBUICAO})
                    </SelectItem>
                    <SelectItem value="NOTIFICACAO_JULGAMENTO" className="cursor-pointer h-9">
                      Notificação Julgamento ({statusCounts.NOTIFICACAO_JULGAMENTO})
                    </SelectItem>
                    <SelectItem value="JULGAMENTO" className="cursor-pointer h-9">
                      Julgamento ({statusCounts.JULGAMENTO})
                    </SelectItem>
                    <SelectItem value="DILIGENCIA" className="cursor-pointer h-9">
                      Diligência ({statusCounts.DILIGENCIA})
                    </SelectItem>
                    <SelectItem value="PEDIDO_VISTA" className="cursor-pointer h-9">
                      Pedido de Vista ({statusCounts.PEDIDO_VISTA})
                    </SelectItem>
                    <SelectItem value="SUSPENSO" className="cursor-pointer h-9">
                      Suspenso ({statusCounts.SUSPENSO})
                    </SelectItem>
                    <SelectItem value="PUBLICACAO_ACORDAO" className="cursor-pointer h-9">
                      Publicação Acórdão ({statusCounts.PUBLICACAO_ACORDAO})
                    </SelectItem>
                    <SelectItem value="ASSINATURA_ACORDAO" className="cursor-pointer h-9">
                      Assinatura Acórdão ({statusCounts.ASSINATURA_ACORDAO})
                    </SelectItem>
                    <SelectItem value="NOTIFICACAO_DECISAO" className="cursor-pointer h-9">
                      Notificação Decisão ({statusCounts.NOTIFICACAO_DECISAO})
                    </SelectItem>
                    <SelectItem value="CONCLUIDO" className="cursor-pointer h-9">
                      Concluído ({statusCounts.CONCLUIDO})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Tipo
                </label>
                <Select
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value)}
                >
                  <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="all" className="cursor-pointer h-9">
                      Todos ({typeCounts.all})
                    </SelectItem>
                    <SelectItem value="VOLUNTARIO" className="cursor-pointer h-9">
                      Voluntário ({typeCounts.VOLUNTARIO})
                    </SelectItem>
                    <SelectItem value="OFICIO" className="cursor-pointer h-9">
                      Ofício ({typeCounts.OFICIO})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t p-3">
              <div className="text-xs text-muted-foreground text-center">
                {filteredData.length} {filteredData.length === 1 ? 'recurso' : 'recursos'} encontrado{filteredData.length !== 1 ? 's' : ''}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabela */}
      {filteredData.length === 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum recurso encontrado.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="relative w-full overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted border-b">
                    <TableHead className="font-semibold">Número</TableHead>
                    <TableHead className="font-semibold">Data</TableHead>
                    <TableHead className="font-semibold">Processo</TableHead>
                    <TableHead className="font-semibold">Razão Social</TableHead>
                    <TableHead className="font-semibold">Tipo</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((resource) => (
                    <TableRow key={resource.id} className="bg-white hover:bg-muted/40 min-h-[49px]">
                      <TableCell className="font-medium text-sm">
                        {resource.resourceNumber}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(resource.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/ccr/recursos/${resource.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {resource.processNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {resource.processName || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {typeLabels[resource.type] || resource.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                          getResourceStatusColor(resource.status)
                        )}>
                          {getResourceStatusLabel(resource.status)}
                        </span>
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
                              onClick={() => router.push(`/ccr/recursos/${resource.id}`)}
                              className="cursor-pointer h-9"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
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
                  <SelectPrimitive.Item
                    value="10"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>10</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                  <SelectPrimitive.Item
                    value="20"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>20</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                  <SelectPrimitive.Item
                    value="50"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>50</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                  <SelectPrimitive.Item
                    value="100"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>100</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Página {currentPage} de {totalPages}
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
                      disabled={currentPage === totalPages}
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
                      disabled={currentPage === totalPages}
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
