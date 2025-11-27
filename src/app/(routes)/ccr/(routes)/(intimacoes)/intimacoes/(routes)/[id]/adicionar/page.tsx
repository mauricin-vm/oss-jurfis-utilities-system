'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';

interface SessionInfo {
  id: string;
  sessionNumber: string;
  date: Date;
  status: string;
}

interface Resource {
  id: string;
  resourceNumber: string;
  processNumber: string;
  processName: string | null;
  year: number;
  type: string;
  status: ResourceStatusKey;
  lastSession: SessionInfo | null;
}

interface NotificationList {
  id: string;
  listNumber: string;
  type: string;
  status: string;
}

export default function AdicionarRecursoPage() {
  const params = useParams();
  const router = useRouter();
  const [list, setList] = useState<NotificationList | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [observations, setObservations] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchList();
    }
  }, [params.id]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/intimacoes/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setList(data);
      } else {
        toast.error('Lista não encontrada');
        router.push('/ccr/intimacoes');
      }
    } catch (error) {
      console.error('Error fetching list:', error);
      toast.error('Erro ao carregar lista');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `/api/ccr/intimacoes/${params.id}/available-resources?search=${encodeURIComponent(searchTerm)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        if (data.length === 0) {
          toast.error('Nenhum recurso encontrado');
        }
      } else {
        toast.error('Erro ao buscar recursos');
      }
    } catch (error) {
      console.error('Error searching resources:', error);
      toast.error('Erro ao buscar recursos');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResource = (resource: Resource) => {
    setSelectedResource(resource);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleAddToList = async () => {
    if (!selectedResource) {
      toast.error('Selecione um recurso');
      return;
    }

    try {
      setAdding(true);
      const response = await fetch(`/api/ccr/intimacoes/${params.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceId: selectedResource.id,
          observations: observations.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success('Recurso adicionado à lista com sucesso');
        router.push(`/ccr/intimacoes/${params.id}`);
      } else {
        const error = await response.text();
        toast.error(error || 'Erro ao adicionar recurso à lista');
      }
    } catch (error) {
      console.error('Error adding resource to list:', error);
      toast.error('Erro ao adicionar recurso à lista');
    } finally {
      setAdding(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Intimações', href: '/ccr/intimacoes' },
    {
      label: list ? `Lista n. ${list.listNumber}` : 'Carregando...',
      href: `/ccr/intimacoes/${params.id}`,
    },
    { label: 'Adicionar Recurso' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Adicionar Recurso" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Adicionar Recurso à Lista</CardTitle>
              <CardDescription>
                Busque um recurso para adicionar à lista de intimação.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-10" />
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!list) {
    return (
      <CCRPageWrapper title="Adicionar Recurso" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[200px] items-center justify-center">
            <p className="text-muted-foreground">Lista não encontrada</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Adicionar Recurso" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Busca */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Buscar Recurso</CardTitle>
              <CardDescription>
                Busque por número do recurso, número do processo, razão social, número da sessão ou data da sessão.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 001/2025, 1234/2025-01, Empresa LTDA, 15/01/2025..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  disabled={searching}
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button onClick={handleSearch} disabled={searching} className="cursor-pointer" size="icon">
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Resultados da Busca */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm">
                    {searchResults.length}{' '}
                    {searchResults.length === 1 ? 'recurso encontrado' : 'recursos encontrados'}
                  </h3>
                  <div className="space-y-3">
                    {searchResults.map((resource, index) => (
                      <div
                        key={resource.id}
                        onClick={() => handleSelectResource(resource)}
                        className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-medium text-sm flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-blue-600">
                                  {resource.processNumber}
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit',
                                    getResourceStatusColor(resource.status)
                                  )}
                                >
                                  {getResourceStatusLabel(resource.status)}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {resource.processName
                                  ? `${resource.processName} (${resource.resourceNumber})`
                                  : resource.resourceNumber}
                              </p>
                              {resource.lastSession && (
                                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Última sessão: {format(new Date(resource.lastSession.date), 'dd/MM/yyyy', { locale: ptBR })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Detalhes do Recurso Selecionado */}
        {selectedResource && (
          <>
            <Card>
              <CardHeader>
                <div className="space-y-1.5">
                  <CardTitle>Detalhes do Recurso</CardTitle>
                  <CardDescription>
                    Informações do recurso selecionado.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Primeira linha: Número do Processo e Status */}
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
                      <span
                        className={cn(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit',
                          getResourceStatusColor(selectedResource.status)
                        )}
                      >
                        {getResourceStatusLabel(selectedResource.status)}
                      </span>
                    </div>
                  </div>

                  {/* Segunda linha: Razão Social (Número do Recurso) */}
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Recurso</label>
                    <p className="text-sm">
                      {selectedResource.processName
                        ? `${selectedResource.processName} (${selectedResource.resourceNumber})`
                        : selectedResource.resourceNumber}
                    </p>
                  </div>

                  {/* Última Sessão */}
                  {selectedResource.lastSession && (
                    <div className="space-y-0">
                      <label className="block text-sm font-medium mb-1.5">Última Sessão</label>
                      <p className="text-sm">
                        {format(new Date(selectedResource.lastSession.date), "dd 'de' MMMM 'de' yyyy", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card de Observações */}
            <Card>
              <CardHeader>
                <div className="space-y-1.5">
                  <CardTitle>Observações</CardTitle>
                  <CardDescription>
                    Adicione observações sobre este recurso na lista de intimação.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Digite suas observações aqui..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors resize-none text-sm"
                  />

                  <div className="flex justify-end gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedResource(null);
                        setObservations('');
                      }}
                      disabled={adding}
                      className="cursor-pointer"
                    >
                      Cancelar
                    </Button>
                    <Button onClick={handleAddToList} disabled={adding} className="cursor-pointer">
                      {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {adding ? 'Adicionando...' : 'Adicionar à Lista'}
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
