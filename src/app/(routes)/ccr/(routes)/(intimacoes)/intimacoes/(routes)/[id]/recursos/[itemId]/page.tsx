'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CCRPageWrapper } from '../../../../../../../components/ccr-page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Loader2,
  Mail,
  MessageSquare,
  Package,
  User,
  FileText,
  Plus,
  Trash2,
  Check,
  Phone,
  MapPin,
} from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';

interface NotificationAttempt {
  id: string;
  attemptNumber: number;
  channel: string;
  sentAt: Date | null;
  sentTo: string | null;
  deadline: Date | null;
  status: string;
  confirmedAt: Date | null;
  confirmedByUser: {
    id: string;
    name: string | null;
  } | null;
  observations: string | null;
}

interface NotificationItemDetails {
  id: string;
  observations: string | null;
  resource: {
    id: string;
    resourceNumber: string;
    processNumber: string;
    processName: string | null;
    status: string;
  };
  list: {
    id: string;
    listNumber: string;
    type: string;
    status: string;
  };
  attempts: NotificationAttempt[];
}

const channelLabels: Record<string, string> = {
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  CORREIOS: 'Correios',
  PESSOALMENTE: 'Pessoalmente',
  EDITAL: 'Edital',
};

const channelIcons: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="h-4 w-4" />,
  WHATSAPP: <MessageSquare className="h-4 w-4" />,
  CORREIOS: <Package className="h-4 w-4" />,
  PESSOALMENTE: <User className="h-4 w-4" />,
  EDITAL: <FileText className="h-4 w-4" />,
};

const attemptStatusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  ENVIADO: 'Enviado',
  CONFIRMADO: 'Confirmado',
  EXPIRADO: 'Expirado',
};

const attemptStatusStyles: Record<string, string> = {
  PENDENTE: 'bg-gray-100 text-gray-800',
  ENVIADO: 'bg-yellow-100 text-yellow-800',
  CONFIRMADO: 'bg-green-100 text-green-800',
  EXPIRADO: 'bg-red-100 text-red-800',
};

export default function DetalhesRecursoIntimacaoPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [item, setItem] = useState<NotificationItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    if (params.id && params.itemId) {
      fetchItem();
    }
  }, [params.id, params.itemId]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/intimacoes/${params.id}/items/${params.itemId}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);
      } else {
        toast.error('Item não encontrado');
        router.push(`/ccr/intimacoes/${params.id}`);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      toast.error('Erro ao carregar item');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (attemptId: string) => {
    try {
      setConfirmingId(attemptId);
      const response = await fetch(
        `/api/ccr/intimacoes/${params.id}/items/${params.itemId}/attempts/${attemptId}/confirm`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Ciência registrada com sucesso');
      fetchItem();
    } catch (error) {
      console.error('Error confirming attempt:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao registrar ciência');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    toast.warning('Tem certeza que deseja remover esta tentativa?', {
      duration: 10000,
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setDeletingId(attemptId);
            const response = await fetch(
              `/api/ccr/intimacoes/${params.id}/items/${params.itemId}/attempts/${attemptId}`,
              { method: 'DELETE' }
            );

            if (!response.ok) {
              const error = await response.text();
              throw new Error(error);
            }

            toast.success('Tentativa removida com sucesso');
            fetchItem();
          } catch (error) {
            console.error('Error deleting attempt:', error);
            toast.error(error instanceof Error ? error.message : 'Erro ao remover tentativa');
          } finally {
            setDeletingId(null);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => setDeletingId(null),
      },
    });
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Intimações', href: '/ccr/intimacoes' },
    { label: item ? `Lista n. ${item.list.listNumber}` : 'Lista', href: `/ccr/intimacoes/${params.id}` },
    { label: item ? item.resource.resourceNumber : 'Recurso' },
  ];

  if (status === 'loading') {
    return null;
  }

  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title="Detalhes do Recurso" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Card de Informações do Recurso */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Informações do Recurso</CardTitle>
                  <CardDescription>Dados do recurso incluído na lista de intimação.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Número do Processo</label>
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                  <Skeleton className="h-5 w-28" />
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Lista de Intimação</label>
                  <Skeleton className="h-5 w-24" />
                </div>
                <div className="space-y-0 md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                  <Skeleton className="h-5 w-48" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Tentativas */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Tentativas de Intimação</CardTitle>
                  <CardDescription>Histórico de tentativas de intimação para este recurso.</CardDescription>
                </div>
                <Skeleton className="h-9 w-36" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 rounded-lg border bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </div>
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-20" />
                      <Skeleton className="h-9 w-9" />
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

  if (!item) {
    return (
      <CCRPageWrapper title="Detalhes do Recurso" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Item não encontrado</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  const isEditable = item.list.status === 'PENDENTE';

  return (
    <CCRPageWrapper title="Detalhes do Recurso" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Informações do Recurso */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Informações do Recurso</CardTitle>
                <CardDescription>Dados do recurso incluído na lista de intimação.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <TooltipWrapper content="Contatos do recurso">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/ccr/recursos/${item.resource.id}/contatos`)}
                    className="cursor-pointer h-9 w-9 p-0"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
                <TooltipWrapper content="Endereços do recurso">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/ccr/recursos/${item.resource.id}/enderecos`)}
                    className="cursor-pointer h-9 w-9 p-0"
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Primeira linha */}
              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Número do Processo</label>
                <p className="text-sm">
                  <Link
                    href={`/ccr/recursos/${item.resource.id}`}
                    target="_blank"
                    className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.resource.processNumber}
                  </Link>
                </p>
              </div>
              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                <p className="text-sm">{item.resource.resourceNumber}</p>
              </div>
              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit',
                    getResourceStatusColor(item.resource.status as ResourceStatusKey)
                  )}
                >
                  {getResourceStatusLabel(item.resource.status as ResourceStatusKey)}
                </span>
              </div>

              {/* Segunda linha */}
              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Lista de Intimação</label>
                <p className="text-sm">{item.list.listNumber}</p>
              </div>
              {item.resource.processName && (
                <div className="space-y-0 md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                  <p className="text-sm">{item.resource.processName}</p>
                </div>
              )}

              {/* Observações - linha completa se existir */}
              {item.observations && (
                <div className="space-y-0 md:col-span-3">
                  <label className="block text-sm font-medium mb-1.5">Observações</label>
                  <p className="text-sm text-muted-foreground">{item.observations}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Tentativas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Tentativas de Intimação</CardTitle>
                <CardDescription>
                  Histórico de tentativas de intimação para este recurso.
                </CardDescription>
              </div>
              {isEditable && (
                <Button
                  onClick={() => router.push(`/ccr/intimacoes/${params.id}/recursos/${params.itemId}/nova-tentativa`)}
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Tentativa
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {item.attempts.length === 0 ? (
              <div className="flex h-[150px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma tentativa de intimação registrada
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {item.attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border',
                      attempt.status === 'CONFIRMADO' && 'bg-green-50 border-green-200',
                      attempt.status === 'EXPIRADO' && 'bg-red-50 border-red-200',
                      (attempt.status === 'PENDENTE' || attempt.status === 'ENVIADO') &&
                        'bg-gray-50 border-gray-200'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border text-gray-700 font-medium text-sm">
                        {attempt.attemptNumber}ª
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {channelIcons[attempt.channel]}
                          <span className="font-medium text-sm">
                            {channelLabels[attempt.channel]}
                          </span>
                          {attempt.sentTo && (
                            <span className="text-sm text-muted-foreground">
                              ({attempt.sentTo})
                            </span>
                          )}
                          <Badge
                            variant="secondary"
                            className={cn('text-xs', attemptStatusStyles[attempt.status])}
                          >
                            {attemptStatusLabels[attempt.status]}
                          </Badge>
                        </div>
                        {attempt.deadline && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">Prazo:</span>{' '}
                            {format(new Date(attempt.deadline), "dd 'de' MMMM 'de' yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                        )}
                        {attempt.confirmedAt && (
                          <p className="text-sm text-green-700">
                            <span className="font-medium">Ciência em:</span>{' '}
                            {format(new Date(attempt.confirmedAt), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                            {attempt.confirmedByUser?.name && ` por ${attempt.confirmedByUser.name}`}
                          </p>
                        )}
                        {attempt.observations && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Obs:</span> {attempt.observations}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {attempt.status !== 'CONFIRMADO' && attempt.status !== 'EXPIRADO' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConfirm(attempt.id)}
                          disabled={confirmingId === attempt.id}
                          className="cursor-pointer h-9"
                        >
                          {confirmingId === attempt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Ciência
                            </>
                          )}
                        </Button>
                      )}
                      {isEditable && attempt.status === 'PENDENTE' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteAttempt(attempt.id)}
                          disabled={deletingId === attempt.id}
                          className="cursor-pointer h-9 w-9 p-0 text-muted-foreground hover:text-red-600"
                        >
                          {deletingId === attempt.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
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
