'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CCRPageWrapper } from '../../../../../../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Loader2, FileText, Calendar, HelpCircle } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';

interface Member {
  id: string;
  name: string;
  role: string | null;
}

interface Session {
  id: string;
  sessionNumber: string;
  date: Date;
  type: string;
  status: string;
}

interface SearchResult {
  id: string;
  resourceNumber: string;
  processNumber: string;
  processName: string | null;
  status: ResourceStatusKey;
  hasDistributionInSession: boolean;
}

interface SessionResource {
  id: string;
  resourceId: string;
  resource: {
    id: string;
    resourceNumber: string;
    processNumber: string;
    processName: string | null;
    status: ResourceStatusKey;
  };
  distributedToId?: string;
  distributedToName?: string;
}

type SearchMode = 'resource' | 'session';

export default function NovaDistribuicaoPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  // Modo de busca
  const [searchMode, setSearchMode] = useState<SearchMode>('resource');

  // Estados para busca por recurso
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResource, setSelectedResource] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Estados para busca por sessão
  const [sessionSearchTerm, setSessionSearchTerm] = useState('');
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([]);
  const [selectedSourceSession, setSelectedSourceSession] = useState<Session | null>(null);
  const [sessionResources, setSessionResources] = useState<SessionResource[]>([]);
  const [loadingSessionResources, setLoadingSessionResources] = useState(false);

  // Estados comuns
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar sessão atual
      const sessionResponse = await fetch(`/api/ccr/sessions/${params.id}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData);
      }

      // Buscar todos os membros ativos
      const membersResponse = await fetch('/api/ccr/members?isActive=true');
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setMembers(membersData);
      }

      // Buscar todas as sessões
      const sessionsResponse = await fetch('/api/ccr/sessions');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        // Sessões para busca (não incluir a atual)
        const otherSessions = sessionsData.filter((s: Session) => s.id !== params.id);
        setAllSessions(otherSessions);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Busca por recurso
  const handleSearchResource = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/distributions/available-resources?search=${encodeURIComponent(searchTerm)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        if (data.length === 0) {
          toast.info('Nenhum processo encontrado');
        }
      } else {
        toast.error('Erro ao buscar processos');
      }
    } catch (error) {
      console.error('Error searching resources:', error);
      toast.error('Erro ao buscar processos');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResource = (resource: SearchResult) => {
    if (resource.hasDistributionInSession) {
      toast.error('Este processo já possui distribuição nesta sessão');
      return;
    }
    setSelectedResource(resource);
    setSearchResults([]);
    setSearchTerm('');
  };

  // Busca por sessão
  const handleSearchSession = () => {
    if (!sessionSearchTerm.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }

    const term = sessionSearchTerm.toLowerCase();
    const filtered = allSessions.filter((s) => {
      const sessionNumber = s.sessionNumber.toLowerCase();
      const dateStr = formatDate(s.date).toLowerCase();
      return sessionNumber.includes(term) || dateStr.includes(term);
    });

    setFilteredSessions(filtered);

    if (filtered.length === 0) {
      toast.info('Nenhuma sessão encontrada');
    }
  };

  const handleSelectSession = async (selectedSession: Session) => {
    setFilteredSessions([]);
    setSessionSearchTerm('');

    // Buscar recursos da sessão selecionada
    try {
      setLoadingSessionResources(true);
      const response = await fetch(`/api/ccr/sessions/${selectedSession.id}`);
      if (response.ok) {
        const data = await response.json();
        const resources = data.resources || [];
        const distributions = data.distributions || [];

        if (resources.length === 0) {
          toast.info('Nenhum processo encontrado nesta sessão');
          setLoadingSessionResources(false);
          return;
        }

        // Criar mapa de resourceId -> distribuição (membro)
        const distributionMap = new Map(
          distributions.map((d: { resource: { id: string }; firstDistribution: { id: string; name: string } | null }) => [
            d.resource.id,
            d.firstDistribution
          ])
        );

        // Adicionar informação do membro distribuído a cada recurso
        const resourcesWithDistribution: SessionResource[] = resources.map((r: SessionResource) => {
          const member = distributionMap.get(r.resource.id) as { id: string; name: string } | null;
          return {
            ...r,
            distributedToId: member?.id,
            distributedToName: member?.name,
          };
        });

        // Verificar se todos os recursos têm membro definido
        const resourcesWithMember = resourcesWithDistribution.filter(r => r.distributedToId);

        if (resourcesWithMember.length === 0) {
          toast.error('Nenhum processo possui membro distribuído na sessão de origem');
          setLoadingSessionResources(false);
          return;
        }

        // Definir sessão e recursos diretamente
        setSelectedSourceSession(selectedSession);
        setSessionResources(resourcesWithMember);
      }
    } catch (error) {
      console.error('Error fetching session resources:', error);
      toast.error('Erro ao carregar processos da sessão');
    } finally {
      setLoadingSessionResources(false);
    }
  };

  // Adicionar distribuição (modo recurso)
  const handleAddDistribution = async () => {
    if (!selectedResource) {
      toast.error('Selecione um processo');
      return;
    }

    if (!selectedMemberId) {
      toast.error('Selecione um conselheiro');
      return;
    }

    try {
      setAdding(true);
      const response = await fetch(`/api/ccr/sessions/${params.id}/distributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId: selectedResource.id,
          distributedToId: selectedMemberId,
          targetSessionId: null,
        }),
      });

      if (response.ok) {
        toast.success('Distribuição registrada com sucesso');
        router.push(`/ccr/sessoes/${params.id}/distribuicoes`);
      } else {
        const error = await response.text();
        toast.error(error || 'Erro ao registrar distribuição');
      }
    } catch (error) {
      console.error('Error adding distribution:', error);
      toast.error('Erro ao registrar distribuição');
    } finally {
      setAdding(false);
    }
  };

  // Adicionar múltiplas distribuições (modo sessão)
  const handleAddMultipleDistributions = async () => {
    if (sessionResources.length === 0) {
      toast.error('Nenhum processo selecionado');
      return;
    }

    try {
      setAdding(true);

      // Buscar distribuições existentes para verificar duplicados
      const existingResponse = await fetch(`/api/ccr/sessions/${params.id}/distributions`);
      const existingDistributions = existingResponse.ok ? await existingResponse.json() : [];
      const existingResourceIds = new Set(existingDistributions.map((d: { resourceId: string }) => d.resourceId));

      // Filtrar recursos que ainda não têm distribuição e têm membro definido
      const resourcesToAdd = sessionResources.filter(sr =>
        !existingResourceIds.has(sr.resource.id) && sr.distributedToId
      );
      const skippedCount = sessionResources.length - resourcesToAdd.length;

      if (resourcesToAdd.length === 0) {
        toast.error('Todos os processos já possuem distribuição nesta sessão');
        setAdding(false);
        return;
      }

      let successCount = 0;

      for (const sr of resourcesToAdd) {
        const response = await fetch(`/api/ccr/sessions/${params.id}/distributions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            resourceId: sr.resource.id,
            distributedToId: sr.distributedToId,
            targetSessionId: params.id,
          }),
        });

        if (response.ok) {
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} ${successCount === 1 ? 'distribuição registrada' : 'distribuições registradas'} com sucesso`);
      }
      if (skippedCount > 0) {
        toast.info(`${skippedCount} ${skippedCount === 1 ? 'processo ignorado' : 'processos ignorados'} (já distribuídos)`);
      }

      router.push(`/ccr/sessoes/${params.id}/distribuicoes`);
    } catch (error) {
      console.error('Error adding distributions:', error);
      toast.error('Erro ao registrar distribuições');
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date);
    const adjustedDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
    return format(adjustedDate, 'dd/MM/yyyy', { locale: ptBR });
  };

  const clearSelection = () => {
    setSelectedResource(null);
    setSelectedSourceSession(null);
    setSessionResources([]);
    setSelectedMemberId('');
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    {
      label: session ? `Sessão n. ${session.sessionNumber}` : 'Carregando...',
      href: `/ccr/sessoes/${params.id}`,
    },
    { label: 'Distribuições', href: `/ccr/sessoes/${params.id}/distribuicoes` },
    { label: 'Nova' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Nova Distribuição" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Buscar Processo</CardTitle>
              <CardDescription>
                Busque por recurso ou por sessão.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Nova Distribuição" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Busca */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Buscar Processo</CardTitle>
              <CardDescription>
                Busque por recurso ou por sessão para adicionar a distribuição.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Toggle de Modo de Busca */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={searchMode === 'resource' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSearchMode('resource');
                    // Limpar estados do modo sessão
                    setFilteredSessions([]);
                    setSessionSearchTerm('');
                    setSelectedSourceSession(null);
                    setSessionResources([]);
                    setSelectedMemberId('');
                  }}
                  className="cursor-pointer"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Recurso
                </Button>
                <Button
                  type="button"
                  variant={searchMode === 'session' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSearchMode('session');
                    // Limpar estados do modo recurso
                    setSearchResults([]);
                    setSearchTerm('');
                    setSelectedResource(null);
                    setSelectedMemberId('');
                  }}
                  className="cursor-pointer"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Sessão
                </Button>
                <TooltipWrapper
                  content={
                    searchMode === 'resource'
                      ? 'Digite o número do recurso, número do processo ou razão social'
                      : 'Digite a data ou número da sessão para buscar os processos incluídos nela'
                  }
                >
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipWrapper>
              </div>

              {/* Busca por Recurso */}
              {searchMode === 'resource' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: XXXX/YYYY, razão social..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchResource();
                        }
                      }}
                      disabled={searching}
                      className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button onClick={handleSearchResource} disabled={searching} className="cursor-pointer" size="icon">
                      {searching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Resultados da Busca por Recurso */}
                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">
                        {searchResults.length}{' '}
                        {searchResults.length === 1 ? 'processo encontrado' : 'processos encontrados'}
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {searchResults.map((resource) => (
                          <div
                            key={resource.id}
                            className={cn(
                              "p-3 border rounded-lg transition-colors",
                              resource.hasDistributionInSession
                                ? "bg-gray-100 cursor-not-allowed opacity-60"
                                : "hover:bg-gray-50 cursor-pointer"
                            )}
                            onClick={() => handleSelectResource(resource)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{resource.processNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {resource.resourceNumber}
                                  {resource.processName && ` - ${resource.processName}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {resource.hasDistributionInSession && (
                                  <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800">
                                    Já distribuído
                                  </Badge>
                                )}
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-xs',
                                    getResourceStatusColor(resource.status).replace(/border-\S+/, '')
                                  )}
                                >
                                  {getResourceStatusLabel(resource.status)}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Busca por Sessão */}
              {searchMode === 'session' && !selectedSourceSession && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: 01/2024, 01/10/2024..."
                      value={sessionSearchTerm}
                      onChange={(e) => setSessionSearchTerm(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchSession();
                        }
                      }}
                      className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button onClick={handleSearchSession} className="cursor-pointer" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Resultados da Busca por Sessão */}
                  {filteredSessions.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">
                        {filteredSessions.length}{' '}
                        {filteredSessions.length === 1 ? 'sessão encontrada' : 'sessões encontradas'}
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {filteredSessions.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => handleSelectSession(s)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">Sessão n. {s.sessionNumber}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(s.date)}
                                </p>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {s.type === 'ORDINARIA' ? 'Ordinária' : s.type === 'EXTRAORDINARIA' ? 'Extraordinária' : s.type}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          </CardContent>
        </Card>

        {/* Card de Detalhes do Processo Selecionado */}
        {selectedResource && (
          <>
            <Card>
              <CardHeader>
                <div className="space-y-1.5">
                  <CardTitle>Processo Selecionado</CardTitle>
                  <CardDescription>
                    Informações do processo que será distribuído.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-0">
                      <label className="block text-sm font-medium mb-1.5">Número do Processo</label>
                      <p className="text-sm">
                        <Link
                          href={`/ccr/recursos/${selectedResource.id}`}
                          target="_blank"
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {selectedResource.processNumber}
                        </Link>
                      </p>
                    </div>
                    <div className="space-y-0">
                      <label className="block text-sm font-medium mb-1.5">Status</label>
                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit', getResourceStatusColor(selectedResource.status))}>
                        {getResourceStatusLabel(selectedResource.status)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-0">
                      <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                      <p className="text-sm">{selectedResource.resourceNumber}</p>
                    </div>
                    {selectedResource.processName && (
                      <div className="space-y-0">
                        <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                        <p className="text-sm">{selectedResource.processName}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card de Configuração */}
            <Card>
              <CardHeader>
                <div className="space-y-1.5">
                  <CardTitle>Configurar Distribuição</CardTitle>
                  <CardDescription>
                    Selecione o conselheiro para distribuir o processo.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-0">
                    {members.length === 0 ? (
                      <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                        Nenhum membro ativo cadastrado. Configure os membros nas configurações.
                      </div>
                    ) : (
                      <Select
                        value={selectedMemberId}
                        onValueChange={setSelectedMemberId}
                      >
                        <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                          <SelectValue placeholder="Selecione um conselheiro" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearSelection}
                      disabled={adding}
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddDistribution}
                      disabled={adding || !selectedMemberId}
                      className="cursor-pointer"
                    >
                      {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {adding ? 'Registrando...' : 'Registrar Distribuição'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Card para modo Sessão */}
        {selectedSourceSession && sessionResources.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <div className="space-y-1.5">
                  <CardTitle>Sessão Selecionada</CardTitle>
                  <CardDescription>
                    Os processos serão distribuídos para os membros definidos na sessão de origem.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-0">
                      <label className="block text-sm font-medium mb-1.5">Sessão de Origem</label>
                      <p className="text-sm">{selectedSourceSession.sessionNumber}</p>
                    </div>
                    <div className="space-y-0">
                      <label className="block text-sm font-medium mb-1.5">Data</label>
                      <p className="text-sm">{formatDate(selectedSourceSession.date)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Processos a distribuir ({sessionResources.length})
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {sessionResources.map((sr) => (
                        <div
                          key={sr.id}
                          className="p-3 border rounded-lg bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{sr.resource.processNumber}</p>
                              <p className="text-xs text-muted-foreground">
                                {sr.resource.resourceNumber}
                              </p>
                            </div>
                            <Badge variant="outline">
                              {sr.distributedToName}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedSourceSession(null);
                        setSessionResources([]);
                      }}
                      disabled={adding}
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleAddMultipleDistributions}
                      disabled={adding}
                      className="cursor-pointer"
                    >
                      {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {adding ? 'Registrando...' : `Registrar ${sessionResources.length} ${sessionResources.length === 1 ? 'Distribuição' : 'Distribuições'}`}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </CCRPageWrapper>
  );
}
