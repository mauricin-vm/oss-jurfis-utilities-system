'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../../../components/ccr-page-wrapper';
import { StatCard } from '../../../components/stat-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import * as SelectPrimitive from "@radix-ui/react-select";
import { TramitationCard } from './components/tramitation-card';
import { DeleteModal } from './components/delete-modal';
import { TramitationSkeleton } from './components/tramitation-skeleton';
import { AlertCircle, ArrowRightLeft, CheckCircle2, Clock, Filter, Plus, Search, ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

interface Tramitation {
  id: string;
  processNumber: string;
  purpose: string;
  status: string;
  requestDate: Date;
  deadline?: Date | null;
  returnDate?: Date | null;
  observations?: string | null;
  destination?: string | null;
  protocol?: {
    id: string;
    number: string;
    presenter: string;
  } | null;
  sector?: {
    id: string;
    name: string;
    abbreviation?: string | null;
  } | null;
  member?: {
    id: string;
    name: string;
    role?: string | null;
  } | null;
  resource?: {
    id: string;
    processNumber: string;
  } | null;
  createdByUser: {
    id: string;
    name: string;
  };
}

const purposeLabels: Record<string, string> = {
  SOLICITAR_PROCESSO: 'Solicitar Processo',
  CONTRARRAZAO: 'Contrarrazão',
  PARECER_PGM: 'Parecer PGM',
  JULGAMENTO: 'Julgamento',
  DILIGENCIA: 'Diligência',
  OUTRO: 'Outro',
};

export default function TramitacoesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tramitations, setTramitations] = useState<Tramitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [purposeFilter, setPurposeFilter] = useState<string>('all');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tramitationToDelete, setTramitationToDelete] = useState<{ id: string; processNumber: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchTramitations();
  }, []);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const fetchTramitations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ccr/tramitations');
      if (response.ok) {
        const data = await response.json();
        setTramitations(data);
      }
    } catch (error) {
      console.error('Error fetching tramitations:', error);
      toast.error('Erro ao carregar tramitações');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsReceived = async (id: string) => {
    try {
      const response = await fetch(`/api/ccr/tramitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENTREGUE', returnDate: new Date() }),
      });

      if (response.ok) {
        toast.success('Tramitação marcada como recebida');
        fetchTramitations();
      } else {
        throw new Error('Erro ao atualizar tramitação');
      }
    } catch (error) {
      console.error('Error marking as received:', error);
      toast.error('Erro ao marcar tramitação como recebida');
    }
  };

  const handleDeleteClick = (id: string, processNumber: string) => {
    setTramitationToDelete({ id, processNumber });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!tramitationToDelete) return;

    try {
      setDeletingId(tramitationToDelete.id);
      const response = await fetch(`/api/ccr/tramitations/${tramitationToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Tramitação removida com sucesso');
        setIsDeleteModalOpen(false);
        setTramitationToDelete(null);
        fetchTramitations();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Erro ao remover tramitação');
      }
    } catch (error) {
      console.error('Error deleting tramitation:', error);
      toast.error('Erro ao remover tramitação');
    } finally {
      setDeletingId(null);
    }
  };

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

  // Calcular estatísticas
  const overdueCount = tramitations.filter(
    (t) =>
      t.status === 'PENDENTE' &&
      t.deadline &&
      new Date(t.deadline) < new Date()
  ).length;
  const pendingCount = tramitations.filter(
    (t) =>
      t.status === 'PENDENTE' &&
      (!t.deadline || new Date(t.deadline) >= new Date())
  ).length;
  const deliveredCount = tramitations.filter((t) => t.status === 'ENTREGUE').length;

  // Filtrar tramitações
  const filteredTramitations = tramitations.filter((t) => {
    let statusMatch = false;

    if (statusFilter === 'all') {
      statusMatch = true;
    } else if (statusFilter === 'VENCIDA') {
      statusMatch = t.status === 'PENDENTE' && t.deadline && new Date(t.deadline) < new Date();
    } else if (statusFilter === 'PENDENTE') {
      statusMatch = t.status === 'PENDENTE' && (!t.deadline || new Date(t.deadline) >= new Date());
    } else {
      statusMatch = t.status === statusFilter;
    }

    const purposeMatch = purposeFilter === 'all' || t.purpose === purposeFilter;

    const searchMatch =
      !searchQuery ||
      t.processNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.protocol?.presenter?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.destination?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sector?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.sector?.abbreviation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.member?.name?.toLowerCase().includes(searchQuery.toLowerCase());

    return statusMatch && purposeMatch && searchMatch;
  });

  // Paginação
  const totalPages = Math.ceil(filteredTramitations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTramitations = filteredTramitations.slice(startIndex, endIndex);

  // Reset page when filtered data changes
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Status counts para o filtro
  const statusCounts = {
    all: tramitations.length,
    PENDENTE: pendingCount,
    VENCIDA: overdueCount,
    ENTREGUE: deliveredCount,
  };

  // Purpose counts para o filtro
  const purposeCounts = {
    all: tramitations.length,
    SOLICITAR_PROCESSO: tramitations.filter(t => t.purpose === 'SOLICITAR_PROCESSO').length,
    CONTRARRAZAO: tramitations.filter(t => t.purpose === 'CONTRARRAZAO').length,
    PARECER_PGM: tramitations.filter(t => t.purpose === 'PARECER_PGM').length,
    JULGAMENTO: tramitations.filter(t => t.purpose === 'JULGAMENTO').length,
    DILIGENCIA: tramitations.filter(t => t.purpose === 'DILIGENCIA').length,
    OUTRO: tramitations.filter(t => t.purpose === 'OUTRO').length,
  };

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title="Tramitações">
        <TramitationSkeleton />
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Tramitações">
      <div className="space-y-4">
        {/* Botões de Busca, Filtros e Nova Tramitação */}
        <div className="flex justify-end gap-2">
          {/* Busca Animada */}
          <div className="relative flex items-center">
            <div
              className={cn(
                'relative flex items-center justify-end transition-all duration-300 ease-in-out',
                isSearchExpanded ? 'w-[200px] sm:w-[250px]' : 'w-8'
              )}
            >
              <div className="relative w-full h-8">
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar tramitações..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onBlur={handleSearchBlur}
                  className={cn(
                    'absolute right-0 top-0 h-8 w-full pr-8 text-sm border-gray-200 focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity duration-300',
                    isSearchExpanded ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                  )}
                />
                <TooltipWrapper content="Buscar por número do processo, destino, setor ou conselheiro">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSearchClick}
                    className={cn(
                      'absolute right-0 top-0 h-8 w-8 p-0 cursor-pointer transition-opacity duration-300',
                      isSearchExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100 z-10'
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
                  <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="cursor-pointer h-9">
                        Todos ({statusCounts.all})
                      </SelectItem>
                      <SelectItem value="PENDENTE" className="cursor-pointer h-9">
                        Pendentes ({statusCounts.PENDENTE})
                      </SelectItem>
                      <SelectItem value="VENCIDA" className="cursor-pointer h-9">
                        Vencidas ({statusCounts.VENCIDA})
                      </SelectItem>
                      <SelectItem value="ENTREGUE" className="cursor-pointer h-9">
                        Entregues ({statusCounts.ENTREGUE})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Finalidade
                  </label>
                  <Select value={purposeFilter} onValueChange={(value) => {
                    setPurposeFilter(value);
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione a finalidade" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="cursor-pointer h-9">
                        Todas ({purposeCounts.all})
                      </SelectItem>
                      <SelectItem value="SOLICITAR_PROCESSO" className="cursor-pointer h-9">
                        {purposeLabels.SOLICITAR_PROCESSO} ({purposeCounts.SOLICITAR_PROCESSO})
                      </SelectItem>
                      <SelectItem value="CONTRARRAZAO" className="cursor-pointer h-9">
                        {purposeLabels.CONTRARRAZAO} ({purposeCounts.CONTRARRAZAO})
                      </SelectItem>
                      <SelectItem value="PARECER_PGM" className="cursor-pointer h-9">
                        {purposeLabels.PARECER_PGM} ({purposeCounts.PARECER_PGM})
                      </SelectItem>
                      <SelectItem value="JULGAMENTO" className="cursor-pointer h-9">
                        {purposeLabels.JULGAMENTO} ({purposeCounts.JULGAMENTO})
                      </SelectItem>
                      <SelectItem value="DILIGENCIA" className="cursor-pointer h-9">
                        {purposeLabels.DILIGENCIA} ({purposeCounts.DILIGENCIA})
                      </SelectItem>
                      <SelectItem value="OUTRO" className="cursor-pointer h-9">
                        {purposeLabels.OUTRO} ({purposeCounts.OUTRO})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t p-3">
                <div className="text-xs text-muted-foreground text-center">
                  {filteredTramitations.length} {filteredTramitations.length === 1 ? 'tramitação' : 'tramitações'} encontrada{filteredTramitations.length !== 1 ? 's' : ''}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="h-8 gap-2 cursor-pointer"
            onClick={() => router.push('/ccr/tramitacoes/nova')}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Tramitação</span>
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total"
            value={tramitations.length}
            description="Tramitações registradas"
            icon={ArrowRightLeft}
          />
          <StatCard
            title="Pendentes"
            value={pendingCount}
            description="Aguardando recebimento"
            icon={Clock}
          />
          <StatCard
            title="Vencidas"
            value={overdueCount}
            description="Fora do prazo"
            icon={AlertCircle}
          />
          <StatCard
            title="Entregues"
            value={deliveredCount}
            description="Recebidas do destino"
            icon={CheckCircle2}
          />
        </div>

        {/* Lista de Tramitações */}
        {filteredTramitations.length === 0 ? (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma tramitação encontrada.</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Clique em "Nova Tramitação" para adicionar.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedTramitations.map((tramitation) => (
                <TramitationCard
                  key={tramitation.id}
                  tramitation={tramitation}
                  onMarkAsReceived={handleMarkAsReceived}
                  onDelete={handleDeleteClick}
                  userRole={session?.user?.role}
                />
              ))}
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

      {/* Modal de Confirmação de Exclusão */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        tramitationInfo={tramitationToDelete?.processNumber || ''}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTramitationToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </CCRPageWrapper>
  );
}
