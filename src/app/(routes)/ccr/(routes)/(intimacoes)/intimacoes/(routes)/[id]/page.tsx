'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileText, Clock, CheckCircle, Plus, X, Loader2 } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NotificationItem {
  id: string;
  resource: {
    id: string;
    resourceNumber: string;
    processNumber: string;
    processName: string | null;
  };
}

interface NotificationList {
  id: string;
  listNumber: string;
  sequenceNumber: number;
  year: number;
  type: string;
  status: string;
  items: NotificationItem[];
  createdByUser: {
    id: string;
    name: string | null;
  };
  _count: {
    items: number;
  };
  createdAt: Date;
}

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  FINALIZADA: 'Finalizada',
};

const statusStyles: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  FINALIZADA: 'bg-green-100 text-green-800 hover:bg-green-100',
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDENTE: <Clock className="h-3.5 w-3.5" />,
  FINALIZADA: <CheckCircle className="h-3.5 w-3.5" />,
};

const typeLabels: Record<string, string> = {
  ADMISSIBILIDADE: 'Admissibilidade',
  SESSAO: 'Sessão',
  DILIGENCIA: 'Diligência',
  DECISAO: 'Decisão',
  OUTRO: 'Outro',
};

export default function VisualizarListaPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [list, setList] = useState<NotificationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [finalizingList, setFinalizingList] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

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

  const handleDeleteItem = async (itemId: string) => {
    toast.warning('Tem certeza que deseja remover este recurso da lista?', {
      duration: 10000,
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setDeletingItemId(itemId);
            const response = await fetch(`/api/ccr/intimacoes/${params.id}/items/${itemId}`, {
              method: 'DELETE',
            });

            if (!response.ok) {
              const error = await response.text();
              throw new Error(error);
            }

            toast.success('Recurso removido da lista com sucesso');
            fetchList();
          } catch (error) {
            console.error('Error deleting item:', error);
            toast.error(error instanceof Error ? error.message : 'Erro ao remover recurso');
          } finally {
            setDeletingItemId(null);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => setDeletingItemId(null),
      },
    });
  };

  const handleFinalizeList = async () => {
    toast.warning('Tem certeza que deseja finalizar esta lista?', {
      duration: 10000,
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setFinalizingList(true);
            const response = await fetch(`/api/ccr/intimacoes/${params.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'FINALIZADA' }),
            });

            if (!response.ok) {
              const error = await response.text();
              throw new Error(error);
            }

            toast.success('Lista finalizada com sucesso');
            fetchList();
          } catch (error) {
            console.error('Error finalizing list:', error);
            toast.error(error instanceof Error ? error.message : 'Erro ao finalizar lista');
          } finally {
            setFinalizingList(false);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {
          setFinalizingList(false);
        },
      },
    });
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Intimações', href: '/ccr/intimacoes' },
    { label: list ? `Lista n. ${list.listNumber}` : 'Detalhes' },
  ];

  if (status === 'loading') {
    return null;
  }

  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title={<Skeleton className="h-8 w-64" />} breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Card de Informações da Lista */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Informações da Lista</CardTitle>
                  <CardDescription>Detalhes da lista de intimação.</CardDescription>
                </div>
                <Skeleton className="h-9 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Número da Lista</label>
                  <Skeleton className="h-5 w-24" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tipo</label>
                  <Skeleton className="h-5 w-28" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Data de Criação</label>
                  <Skeleton className="h-5 w-40" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Recursos</label>
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Recursos */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Recursos para Intimação</CardTitle>
                  <CardDescription>Lista de recursos incluídos nesta lista de intimação.</CardDescription>
                </div>
                <Skeleton className="h-9 w-40" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-6 bg-white">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64" />
                      </div>
                      <div className="flex items-start gap-2 flex-shrink-0">
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-9" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CCRPageWrapper>
    );
  }

  if (!list) {
    return (
      <CCRPageWrapper title="Detalhes da Lista" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Lista não encontrada</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  const isEditable = list.status === 'PENDENTE';

  return (
    <CCRPageWrapper title={`Lista n. ${list.listNumber}`} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Informações da Lista */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Informações da Lista</CardTitle>
                <CardDescription>Detalhes da lista de intimação.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isEditable && list.items.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleFinalizeList}
                    disabled={finalizingList}
                    className="cursor-pointer bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {finalizingList ? 'Finalizando...' : 'Finalizar Lista'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1.5">Número da Lista</label>
                <p className="text-sm">{list.listNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Tipo</label>
                <p className="text-sm">{typeLabels[list.type] || list.type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <Badge
                  variant="secondary"
                  className={cn('inline-flex items-center gap-1.5', statusStyles[list.status])}
                >
                  {statusIcons[list.status]}
                  {statusLabels[list.status]}
                </Badge>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Data de Criação</label>
                <p className="text-sm">
                  {format(new Date(list.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Recursos</label>
                <p className="text-sm">
                  {list._count.items} {list._count.items === 1 ? 'recurso incluído' : 'recursos incluídos'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Recursos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Recursos para Intimação</CardTitle>
                <CardDescription>
                  Lista de recursos incluídos nesta lista de intimação.
                </CardDescription>
              </div>
              {isEditable && (
                <Button
                  onClick={() => router.push(`/ccr/intimacoes/${list.id}/adicionar`)}
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Recurso
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {list.items.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum recurso adicionado à lista
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {list.items.map((item, index) => (
                  <div key={item.id} className="rounded-lg border p-6 bg-white">
                    <div className="flex items-start gap-4">
                      {/* Círculo com numeração */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium text-sm flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/ccr/recursos/${item.resource.id}`}
                            target="_blank"
                            className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {item.resource.processNumber}
                          </Link>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.resource.processName
                            ? `${item.resource.processName} (${item.resource.resourceNumber})`
                            : item.resource.resourceNumber}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-start gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="cursor-pointer h-9"
                          onClick={() => router.push(`/ccr/intimacoes/${list.id}/recursos/${item.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Detalhes
                        </Button>
                        {isEditable && (
                          <TooltipWrapper content="Remover recurso da lista">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="cursor-pointer h-9 w-9 p-0"
                              onClick={() => handleDeleteItem(item.id)}
                              disabled={deletingItemId === item.id}
                            >
                              {deletingItemId === item.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipWrapper>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CCRPageWrapper>
  );
}
