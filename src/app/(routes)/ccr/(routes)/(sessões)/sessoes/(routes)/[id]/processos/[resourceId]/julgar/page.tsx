'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CCRPageWrapper } from '@/app/(routes)/ccr/components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Ban,
  Clock,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  Vote,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';
import { VotingCard } from './components/voting-card';

interface Member {
  id: string;
  name: string;
  role: string;
}

interface SessionMember {
  id: string;
  member: Member;
}

interface Distribution {
  id: string;
  firstDistribution: Member | null;
  reviewersIds: string[];
  distributedToId: string;
  session: {
    id: string;
    sessionNumber: string;
    date: Date;
  };
}

interface Decision {
  id: string;
  type: 'PRELIMINAR' | 'MERITO';
  code: string;
  name: string;
  description: string | null;
}

interface Subject {
  id: string;
  subject: {
    id: string;
    name: string;
  };
}

interface Authority {
  id: string;
  type: string;
  authorityRegistered: {
    id: string;
    name: string;
  };
}

interface Attendance {
  id: string;
  part: {
    id: string;
    name: string;
    role: string;
  } | null;
  customName: string | null;
  customRole: string | null;
}

interface SessionVote {
  id: string;
  member: Member;
  voteType: string;
  voteKnowledgeType: string;
  voteText: string;
  session?: {
    id: string;
    sessionNumber: string;
    date: Date;
  };
  preliminaryDecision?: { id: string; identifier: string; type: string } | null;
  meritDecision?: { id: string; identifier: string; type: string } | null;
  officialDecision?: { id: string; identifier: string; type: string } | null;
  createdAt: Date;
}

interface JudgmentData {
  sessionResource: {
    id: string;
    status: string;
    minutesText: string | null;
    diligenceDaysDeadline: number | null;
    viewRequestedBy: Member | null;
    attendances: Attendance[];
    resource: {
      id: string;
      processNumber: string;
      processName: string | null;
      resourceNumber: string;
      status: ResourceStatusKey;
      subjects: Subject[];
      authorities: Authority[];
    };
  };
  session: {
    id: string;
    sessionNumber: string;
    date: Date;
    members: SessionMember[];
  };
  distribution: Distribution | null;
  reviewers: Array<{ id: string; name: string; role: string; distributionDate: Date | null }>;
  preliminaryDecisions: Decision[];
  meritDecisions: Decision[];
  officialDecisions: Decision[];
}

const authorityTypeLabels: Record<string, string> = {
  AUTOR_PROCEDIMENTO_FISCAL: 'Autor do Procedimento Fiscal',
  JULGADOR_SINGULAR: 'Julgador Singular',
  COORDENADOR: 'Coordenador',
  OUTROS: 'Outros',
};

const partRoleLabels: Record<string, string> = {
  REQUERENTE: 'Requerente',
  PATRONO: 'Patrono',
  REPRESENTANTE: 'Representante',
  OUTRO: 'Outro',
};

const formatPartRole = (role: string): string => {
  return partRoleLabels[role] || role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

const statusLabels: Record<string, { label: string; color: string }> = {
  EM_PAUTA: { label: 'Em Pauta', color: 'bg-blue-100 text-blue-800' },
  SUSPENSO: { label: 'Suspenso', color: 'bg-gray-100 text-gray-800' },
  PEDIDO_VISTA: { label: 'Pedido de Vista', color: 'bg-yellow-100 text-yellow-800' },
  DILIGENCIA: { label: 'Diligência', color: 'bg-orange-100 text-orange-800' },
  JULGADO: { label: 'Julgado', color: 'bg-green-100 text-green-800' },
};

export default function JulgarProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<JudgmentData | null>(null);
  const [sessionVotes, setSessionVotes] = useState<SessionVote[]>([]);
  const [sessionResults, setSessionResults] = useState<any[]>([]);
  const [groupedVotings, setGroupedVotings] = useState<any[]>([]);

  // Campos para atualizar status
  const [viewRequestedMemberId, setViewRequestedMemberId] = useState('');
  const [diligenceDays, setDiligenceDays] = useState('');
  const [minutesText, setMinutesText] = useState('');
  const [selectedResult, setSelectedResult] = useState<string | null>(null);

  useEffect(() => {
    if (params.id && params.resourceId) {
      fetchData();
    }
  }, [params.id, params.resourceId]);

  useEffect(() => {
    if (data) {
      setMinutesText(data.sessionResource.minutesText || '');
      setViewRequestedMemberId(data.sessionResource.viewRequestedBy?.id || '');
      setDiligenceDays(data.sessionResource.diligenceDaysDeadline?.toString() || '');
    }
  }, [data]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Primeira chamada - dados principais
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/julgar`
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);

        // Fazer as 3 chamadas restantes em paralelo
        await Promise.all([
          fetchSessionVotes(),
          fetchSessionResults(),
          fetchGroupedVotings()
        ]);
      } else {
        toast.error('Erro ao carregar dados do processo');
      }
    } catch (error) {
      console.error('Error fetching judgment data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionVotes = async () => {
    try {
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/session-votes`
      );

      if (response.ok) {
        const votes = await response.json();
        setSessionVotes(votes);
      }
    } catch (error) {
      console.error('Error fetching session votes:', error);
    }
  };

  const fetchSessionResults = async () => {
    try {
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votings`
      );

      if (response.ok) {
        const votings = await response.json();
        setSessionResults(votings);
      }
    } catch (error) {
      console.error('Error fetching session votings:', error);
    }
  };

  const fetchGroupedVotings = async () => {
    try {
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/group-votes`
      );

      if (response.ok) {
        const result = await response.json();
        setGroupedVotings(result.groupedVotings || []);
      }
    } catch (error) {
      console.error('Error fetching grouped votings:', error);
    }
  };

  const handleGroupVotes = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/group-votes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Votações criadas com sucesso');

        // Atualizar dados em paralelo
        await Promise.all([
          fetchSessionVotes(),
          fetchSessionResults(),
          fetchGroupedVotings()
        ]);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao criar votações');
      }
    } catch (error) {
      console.error('Error grouping votes:', error);
      toast.error('Erro ao agrupar votos');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: newStatus,
            viewRequestedMemberId: newStatus === 'PEDIDO_VISTA' ? viewRequestedMemberId : null,
            diligenceDaysDeadline: newStatus === 'DILIGENCIA' ? parseInt(diligenceDays) : null,
            minutesText: minutesText || null,
          }),
        }
      );

      if (response.ok) {
        toast.success('Status atualizado com sucesso');
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    { label: `Sessão n. ${data?.session.sessionNumber || 'Carregando...'}`, href: `/ccr/sessoes/${params.id}` },
    { label: `Julgar n. ${data?.sessionResource.resource.resourceNumber || 'Carregando...'}` },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Julgar" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Card de Informações do Processo */}
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <CardTitle>Detalhes do Processo</CardTitle>
                <CardDescription>
                  Informações do processo em julgamento.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Campos principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-0">
                      <Skeleton className="h-4 w-32 mb-1.5" />
                      <Skeleton className="h-5 w-40" />
                    </div>
                  ))}
                </div>

                {/* Assuntos */}
                <div className="space-y-0">
                  <Skeleton className="h-4 w-20 mb-1.5" />
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-6 w-32" />
                    ))}
                  </div>
                </div>

                {/* Presenças */}
                <div className="space-y-0">
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <Skeleton className="h-5 w-full" />
                </div>

                {/* Autoridades */}
                <div className="space-y-0">
                  <Skeleton className="h-4 w-28 mb-1.5" />
                  <Skeleton className="h-5 w-full" />
                </div>

                {/* Distribuição */}
                <div className="space-y-0">
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <div className="space-y-0.5">
                    <Skeleton className="h-5 w-64" />
                    <Skeleton className="h-5 w-64" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Votações */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Votações</CardTitle>
                  <CardDescription>
                    Registre votos individuais e organize votações para este processo.
                  </CardDescription>
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>

          {/* Card de Resultado do Processo */}
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <CardTitle>Resultado do Processo</CardTitle>
                <CardDescription>
                  Selecione o resultado final do processo nesta sessão.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card de Status e Ações */}
          <Card>
            <CardHeader>
              <CardTitle>Texto da Ata</CardTitle>
              <CardDescription>
                Texto obrigatório que aparecerá na ata para este processo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        </div>
      </CCRPageWrapper>
    );
  }

  if (!data) {
    return (
      <CCRPageWrapper title="Julgar" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Dados não encontrados
            </p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  const currentStatus = statusLabels[data.sessionResource.status] || { label: data.sessionResource.status, color: 'bg-gray-100 text-gray-800' };

  return (
    <CCRPageWrapper title="Julgar Processo" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Informações do Processo */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Detalhes do Processo</CardTitle>
              <CardDescription>
                Informações do processo em julgamento.
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
                      href={`/ccr/recursos/${data.sessionResource.resource.id}`}
                      target="_blank"
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >{data.sessionResource.resource.processNumber}</Link>
                  </p>
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <Badge
                    variant="secondary"
                    className={cn(
                      getResourceStatusColor(data.sessionResource.resource.status).replace(/border-\S+/, ''),
                      'w-fit'
                    )}
                  >
                    {getResourceStatusLabel(data.sessionResource.resource.status)}
                  </Badge>
                </div>
              </div>

              {/* Segunda linha: Número do Recurso e Razão Social */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                  <p className="text-sm">{data.sessionResource.resource.resourceNumber}</p>
                </div>
                {data.sessionResource.resource.processName && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                    <p className="text-sm">{data.sessionResource.resource.processName}</p>
                  </div>
                )}
              </div>

              {/* Assuntos */}
              {data.sessionResource.resource.subjects && data.sessionResource.resource.subjects.length > 0 && (
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Assuntos</label>
                  <div className="flex flex-wrap gap-2">
                    {data.sessionResource.resource.subjects.map((subject) => (
                      <Badge
                        key={subject.id}
                        variant="outline"
                        className="bg-gray-50"
                      >
                        {subject.subject.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Presenças */}
              {data.sessionResource.attendances && data.sessionResource.attendances.length > 0 && (
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Presenças</label>
                  <p className="text-sm">
                    {(() => {
                      const attendances = [...data.sessionResource.attendances];

                      return attendances.map((attendance, idx) => {
                        const name = attendance.part?.name || attendance.customName || 'Não informado';
                        const role = attendance.part?.role || attendance.customRole;
                        const formattedRole = role ? formatPartRole(role) : null;
                        return (
                          <span key={attendance.id}>
                            {name}{formattedRole && ` (${formattedRole})`}
                            {idx === attendances.length - 2 ? ' e ' : idx < attendances.length - 1 ? ', ' : ''}
                          </span>
                        );
                      });
                    })()}
                  </p>
                </div>
              )}

              {/* Autoridades */}
              {data.sessionResource.resource.authorities && data.sessionResource.resource.authorities.length > 0 && (
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Autoridades</label>
                  <p className="text-sm">
                    {(() => {
                      const authorities = [...data.sessionResource.resource.authorities]
                        .sort((a, b) => a.authorityRegistered.name.localeCompare(b.authorityRegistered.name, 'pt-BR'));

                      return authorities.map((authority, idx) => (
                        <span key={authority.id}>
                          {authority.authorityRegistered.name} ({authorityTypeLabels[authority.type] || authority.type})
                          {idx === authorities.length - 2 ? ' e ' : idx < authorities.length - 1 ? ', ' : ''}
                        </span>
                      ));
                    })()}
                  </p>
                </div>
              )}

              {/* Distribuição */}
              {data.distribution && (
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Distribuição</label>
                  <div className="space-y-2">
                    {data.distribution.firstDistribution && (
                      <div className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium">
                            {data.distribution.firstDistribution.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Relator • {data.distribution.firstDistribution.role || 'Conselheiro'}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(data.distribution.session.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    )}
                    {data.reviewers && data.reviewers.length > 0 && data.reviewers.map((revisor, idx) => (
                      <div
                        key={revisor.id}
                        className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {revisor.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Revisor {data.reviewers.length > 1 ? `${idx + 1}` : ''} • {revisor.role}
                          </p>
                        </div>
                        {revisor.distributionDate && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(revisor.distributionDate), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Votações */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Votações</CardTitle>
                <CardDescription>
                  Registre votos individuais e organize votações para este processo.
                </CardDescription>
              </div>
              <Button asChild className="cursor-pointer">
                <Link href={`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar/novo-voto`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Voto
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Votações */}
            {sessionResults.length > 0 && (
              <div className="space-y-4">
                {sessionResults.map((voting, index) => (
                  <VotingCard
                    key={voting.id}
                    voting={voting}
                    sessionId={params.id as string}
                    resourceId={params.resourceId as string}
                    index={index + 1}
                    totalMembers={data.session.members.length}
                    onDelete={fetchSessionResults}
                  />
                ))}
              </div>
            )}

            {/* Mensagem quando não há votações */}
            {sessionResults.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">Nenhuma votação criada ainda.</p>
                <p className="text-xs mt-1">Clique em "Novo Voto" para registrar votos que serão agrupados automaticamente em votações.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Resultado do Processo */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Resultado do Processo</CardTitle>
              <CardDescription>
                Selecione o resultado final do processo nesta sessão.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Suspenso */}
              <div
                onClick={() => setSelectedResult('SUSPENSO')}
                className={cn(
                  "bg-white rounded-lg border cursor-pointer transition-all flex flex-col",
                  selectedResult === 'SUSPENSO'
                    ? "border-2 border-gray-900"
                    : "hover:border-gray-900"
                )}
              >
                <div className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-0">
                  <div className="text-sm font-medium leading-none">Suspenso</div>
                  <Ban className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5 px-6 pt-6 pb-6">
                  <p className="text-xs text-muted-foreground">Processo suspenso temporariamente</p>
                </div>
              </div>

              {/* Pedido de Diligência */}
              <div
                onClick={() => setSelectedResult('DILIGENCIA')}
                className={cn(
                  "bg-white rounded-lg border cursor-pointer transition-all flex flex-col",
                  selectedResult === 'DILIGENCIA'
                    ? "border-2 border-gray-900"
                    : "hover:border-gray-900"
                )}
              >
                <div className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-0">
                  <div className="text-sm font-medium leading-none">Pedido de Diligência</div>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5 px-6 pt-6 pb-6">
                  <p className="text-xs text-muted-foreground">Solicitar informações adicionais</p>
                </div>
              </div>

              {/* Pedido de Vista */}
              <div
                onClick={() => setSelectedResult('PEDIDO_VISTA')}
                className={cn(
                  "bg-white rounded-lg border cursor-pointer transition-all flex flex-col",
                  selectedResult === 'PEDIDO_VISTA'
                    ? "border-2 border-gray-900"
                    : "hover:border-gray-900"
                )}
              >
                <div className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-0">
                  <div className="text-sm font-medium leading-none">Pedido de Vista</div>
                  <FileSearch className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5 px-6 pt-6 pb-6">
                  <p className="text-xs text-muted-foreground">Processo em análise detalhada</p>
                </div>
              </div>

              {/* Julgado */}
              <div
                onClick={() => setSelectedResult('JULGADO')}
                className={cn(
                  "bg-white rounded-lg border cursor-pointer transition-all flex flex-col",
                  selectedResult === 'JULGADO'
                    ? "border-2 border-gray-900"
                    : "hover:border-gray-900"
                )}
              >
                <div className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-0">
                  <div className="text-sm font-medium leading-none">Julgado</div>
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="space-y-0.5 px-6 pt-6 pb-6">
                  <p className="text-xs text-muted-foreground">Processo com decisão final</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card de Status e Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Texto da Ata</CardTitle>
            <CardDescription>
              Texto obrigatório que aparecerá na ata para este processo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                value={minutesText}
                onChange={(e) => setMinutesText(e.target.value)}
                placeholder="Digite o texto da ata para este processo..."
                rows={4}
                className="resize-none px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            {selectedResult === 'PEDIDO_VISTA' && (
              <div>
                <label className="block text-sm font-medium mb-2">Membro que Solicitou Vista</label>
                <select
                  value={viewRequestedMemberId}
                  onChange={(e) => setViewRequestedMemberId(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                >
                  <option value="">Selecione...</option>
                  {data.session.members.map((m) => (
                    <option key={m.member.id} value={m.member.id}>
                      {m.member.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedResult === 'DILIGENCIA' && (
              <div>
                <label className="block text-sm font-medium mb-2">Prazo (em dias)</label>
                <Input
                  type="number"
                  value={diligenceDays}
                  onChange={(e) => setDiligenceDays(e.target.value)}
                  placeholder="Ex: 30"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botões de Navegação */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedResult(null)}
            disabled={saving}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (selectedResult) {
                handleUpdateStatus(selectedResult);
              }
            }}
            disabled={saving || !selectedResult}
            className="cursor-pointer"
          >
            Salvar Resultado
          </Button>
        </div>
      </div>
    </CCRPageWrapper>
  );
}
