'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User,
  FileText,
  X,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

interface Member {
  id: string;
  name: string;
  role: string | null;
}

interface Resource {
  id: string;
  resourceNumber: string;
  processNumber: string;
  processName: string | null;
  status: ResourceStatusKey;
}

interface TargetSession {
  id: string;
  sessionNumber: string;
  date: Date;
}

interface Distribution {
  id: string;
  resourceId: string;
  distributedToId: string;
  distributedTo: Member | null;
  resource: Resource;
  targetSession: TargetSession | null;
}

interface MemberDistributions {
  member: Member;
  distributions: Distribution[];
}

interface Session {
  id: string;
  sessionNumber: string;
  date: Date;
  type: string;
  status: string;
}

export default function DistribuicoesPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [memberDistributions, setMemberDistributions] = useState<MemberDistributions[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  const toggleCard = (memberId: string) => {
    setExpandedCards(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar sessão
      const sessionResponse = await fetch(`/api/ccr/sessions/${params.id}`);
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData);
      }

      // Buscar distribuições
      const distributionsResponse = await fetch(`/api/ccr/sessions/${params.id}/distributions`);
      if (distributionsResponse.ok) {
        const distributionsData: Distribution[] = await distributionsResponse.json();

        // Agrupar distribuições por membro
        const groupedByMember = new Map<string, MemberDistributions>();

        distributionsData.forEach((dist) => {
          if (dist.distributedTo) {
            const memberId = dist.distributedTo.id;
            if (!groupedByMember.has(memberId)) {
              groupedByMember.set(memberId, {
                member: dist.distributedTo,
                distributions: [],
              });
            }
            groupedByMember.get(memberId)!.distributions.push(dist);
          }
        });

        // Converter para array e ordenar por nome do membro
        const grouped = Array.from(groupedByMember.values())
          .sort((a, b) => a.member.name.localeCompare(b.member.name));

        setMemberDistributions(grouped);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDistribution = async (distributionId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    toast.warning('Tem certeza que deseja remover esta distribuição?', {
      duration: 10000,
      className: 'min-w-[450px]',
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            const response = await fetch(
              `/api/ccr/sessions/${params.id}/distributions?distributionId=${distributionId}`,
              {
                method: 'DELETE',
              }
            );

            if (response.ok) {
              toast.success('Distribuição removida com sucesso');
              fetchData();
            } else {
              const error = await response.text();
              toast.error(error || 'Erro ao remover distribuição');
            }
          } catch (error) {
            console.error('Error removing distribution:', error);
            toast.error('Erro ao remover distribuição');
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { },
      },
    });
  };

  const formatDate = (date: Date | string) => {
    const dateObj = new Date(date);
    const adjustedDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
    return format(adjustedDate, 'dd/MM/yyyy', { locale: ptBR });
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    { label: `Sessão n. ${session?.sessionNumber || 'Carregando...'}`, href: `/ccr/sessoes/${params.id}` },
    { label: 'Distribuições' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Distribuições da Sessão" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Distribuições por Conselheiro</CardTitle>
                <CardDescription>
                  Processos distribuídos nesta sessão para análise em sessões futuras.
                </CardDescription>
              </div>
              <Skeleton className="h-9 w-9" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-24" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                    <Skeleton className="h-5 w-5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Distribuições da Sessão" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle>Distribuições por Conselheiro</CardTitle>
              <CardDescription>
                Processos distribuídos nesta sessão para análise em sessões futuras.
              </CardDescription>
            </div>
            <TooltipWrapper content="Nova distribuição">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/ccr/sessoes/${params.id}/distribuicoes/novo`)}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipWrapper>
          </div>
        </CardHeader>
        <CardContent>
          {/* Lista de Distribuições por Membro */}
          {memberDistributions.length === 0 ? (
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma distribuição registrada nesta sessão
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique no botão + para registrar
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {memberDistributions.map((memberDist) => {
                const isExpanded = expandedCards.includes(memberDist.member.id);
                const processCount = memberDist.distributions.length;

                return (
                  <div
                    key={memberDist.member.id}
                    className="border border-gray-200 rounded-lg"
                  >
                    {/* Header do Card - Clicável */}
                    <div
                      className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleCard(memberDist.member.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold">
                            {memberDist.member.name}
                          </h3>
                          <Badge variant="outline">
                            {processCount} {processCount === 1 ? 'processo' : 'processos'}
                          </Badge>
                        </div>
                        {memberDist.member.role && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <User className="h-4 w-4" />
                              <span>{memberDist.member.role}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Conteúdo Expansível */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t">
                        <div className="mt-4 space-y-3">
                          <h4 className="text-sm font-medium">Processos Distribuídos</h4>
                          <div className="space-y-3">
                            {memberDist.distributions.map((distribution) => (
                              <div
                                key={distribution.id}
                                className="bg-white rounded-lg border p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                      <Link
                                        href={`/ccr/recursos/${distribution.resource.id}`}
                                        target="_blank"
                                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                      >
                                        {distribution.resource.processNumber}
                                      </Link>
                                      <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', getResourceStatusColor(distribution.resource.status))}>
                                        {getResourceStatusLabel(distribution.resource.status)}
                                      </span>
                                    </div>

                                    {distribution.resource.processName && (
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {distribution.resource.processName} ({distribution.resource.resourceNumber})
                                      </p>
                                    )}

                                    {distribution.targetSession && (
                                      <div className="flex items-center gap-1.5 text-sm">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span className="font-medium">Sessão para análise: </span>
                                        <span className="text-muted-foreground">
                                          {distribution.targetSession.sessionNumber} ({formatDate(distribution.targetSession.date)})
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <TooltipWrapper content="Remover distribuição">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => handleRemoveDistribution(distribution.id, e)}
                                      className="cursor-pointer h-9 w-9 p-0 flex-shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipWrapper>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
