'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../components/ccr-page-wrapper';
import { StatCard } from '../components/stat-card';
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
import * as SelectPrimitive from '@radix-ui/react-select';
import { SessionCard } from './components/session-card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  PlayCircle,
  Plus,
  Search,
  ChevronLeft,
  ChevronsLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Session {
  id: string;
  sessionNumber: string;
  sequenceNumber: number;
  year: number;
  ordinalNumber: number;
  date: Date;
  startTime: string | null;
  endTime?: string | null;
  type: string;
  status: string;
  president?: {
    id: string;
    name: string;
  } | null;
  resources: {
    id: string;
    status: string;
    resource: {
      id: string;
      processNumber: string;
      protocol: {
        presenter: string;
      };
    };
  }[];
  members: {
    id: string;
    member: {
      id: string;
      name: string;
    };
  }[];
  createdByUser: {
    id: string;
    name: string;
  };
}

export default function SessoesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ccr/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoading(false);
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
  const pendingCount = sessions.filter((s) => s.status === 'PENDENTE').length;
  const inProgressCount = sessions.filter((s) => s.status === 'EM_PROGRESSO').length;
  const completedCount = sessions.filter((s) => s.status === 'CONCLUIDA').length;

  // Filtrar sessões
  const filteredSessions = sessions.filter((s) => {
    let statusMatch = false;

    if (statusFilter === 'all') {
      statusMatch = true;
    } else {
      statusMatch = s.status === statusFilter;
    }

    const searchMatch =
      !searchQuery ||
      s.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.president?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      new Date(s.date).toLocaleDateString('pt-BR').includes(searchQuery);

    return statusMatch && searchMatch;
  });

  // Paginação
  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  // Reset page when filtered data changes
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Status counts para o filtro
  const statusCounts = {
    all: sessions.length,
    PENDENTE: pendingCount,
    EM_PROGRESSO: inProgressCount,
    CONCLUIDA: completedCount,
  };

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title="Sessões">
        <div className="space-y-4">
          {/* Skeleton dos Botões de Ação */}
          <div className="flex justify-end gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-20 sm:w-24" />
            <Skeleton className="h-8 w-20 sm:w-32" />
          </div>

          {/* Skeleton dos Cards de Estatísticas */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>

          {/* Skeleton da Lista de Sessões */}
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Sessões">
      <div className="space-y-4">
        {/* Botões de Busca, Filtros e Nova Sessão */}
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
                  placeholder="Buscar sessões..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onBlur={handleSearchBlur}
                  className={cn(
                    'absolute right-0 top-0 h-8 w-full pr-8 text-sm border-gray-200 focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity duration-300',
                    isSearchExpanded ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
                  )}
                />
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
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="cursor-pointer h-9">
                        Todas ({statusCounts.all})
                      </SelectItem>
                      <SelectItem value="PENDENTE" className="cursor-pointer h-9">
                        Pendentes ({statusCounts.PENDENTE})
                      </SelectItem>
                      <SelectItem value="EM_PROGRESSO" className="cursor-pointer h-9">
                        Em Progresso ({statusCounts.EM_PROGRESSO})
                      </SelectItem>
                      <SelectItem value="CONCLUIDA" className="cursor-pointer h-9">
                        Concluídas ({statusCounts.CONCLUIDA})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t p-3">
                <div className="text-xs text-muted-foreground text-center">
                  {filteredSessions.length}{' '}
                  {filteredSessions.length === 1 ? 'sessão' : 'sessões'} encontrada
                  {filteredSessions.length !== 1 ? 's' : ''}
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="h-8 gap-2 cursor-pointer"
            onClick={() => router.push('/ccr/sessoes/novo')}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova Sessão</span>
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total"
            value={sessions.length}
            description="Sessões registradas"
            icon={Calendar}
          />
          <StatCard
            title="Pendentes"
            value={pendingCount}
            description="Aguardando início"
            icon={Clock}
          />
          <StatCard
            title="Em Progresso"
            value={inProgressCount}
            description="Em andamento"
            icon={PlayCircle}
          />
          <StatCard
            title="Concluídas"
            value={completedCount}
            description="Finalizadas"
            icon={CheckCircle2}
          />
        </div>

        {/* Lista de Sessões */}
        {filteredSessions.length === 0 ? (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Nenhuma sessão encontrada.</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchQuery || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Clique em "Nova Sessão" para adicionar.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
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
                        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9'
                      )}
                    >
                      <SelectPrimitive.ItemText>10</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                    <SelectPrimitive.Item
                      value="20"
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9'
                      )}
                    >
                      <SelectPrimitive.ItemText>20</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                    <SelectPrimitive.Item
                      value="50"
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9'
                      )}
                    >
                      <SelectPrimitive.ItemText>50</SelectPrimitive.ItemText>
                    </SelectPrimitive.Item>
                    <SelectPrimitive.Item
                      value="100"
                      className={cn(
                        'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9'
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
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </CCRPageWrapper>
  );
}
