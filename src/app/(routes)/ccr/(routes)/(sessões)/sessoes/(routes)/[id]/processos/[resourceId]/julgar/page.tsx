'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CCRPageWrapper } from '@/app/(routes)/ccr/components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Sparkles,
  Bot,
  UserX,
  HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';
import { VotingCard } from './components/voting-card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

interface Member {
  id: string;
  name: string;
  role: string | null;
  gender?: string | null;
}

interface SessionMember {
  id: string;
  member: {
    id: string;
    name: string;
    role: string | null;
    gender?: string | null;
  };
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
  preliminaryDecisionType?: string | null;
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

interface Absence {
  id: string;
  member: {
    id: string;
    name: string;
    role: string;
    gender: string | null;
  };
}

interface CompletedVoting {
  id: string;
  votingType: string;
  status: string;
  order: number;
  judgedInSession?: {
    id: string;
    sessionNumber: string;
    date: Date;
  } | null;
  votes: Array<{
    id: string;
    voteType: string;
    voteKnowledgeType: string;
    voteText: string;
    followsVoteId?: string | null;
    member: {
      id: string;
      name: string;
      role: string | null;
      gender: string | null;
    };
    preliminaryDecision?: {
      id: string;
      identifier: string;
    } | null;
    meritDecision?: {
      id: string;
      identifier: string;
    } | null;
  }>;
  winningMember?: {
    id: string;
    name: string;
  } | null;
}

interface JudgmentData {
  sessionResource: {
    id: string;
    status: string;
    minutesText: string | null;
    diligenceDaysDeadline: number | null;
    viewRequestedBy: Member | null;
    specificPresident: Member | null;
    attendances: Attendance[];
    absences: Absence[];
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
    status: string;
    president: Member | null;
    members: SessionMember[];
  };
  distribution: Distribution | null;
  relatorDistributionDate: Date | null;
  reviewers: Array<{ id: string; name: string; role: string | null; distributionDate: Date | null }>;
  distributedMemberIds: string[];
  completedVotings: CompletedVoting[];
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
  const [specificPresidentId, setSpecificPresidentId] = useState<string>('');

  // Configurar sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      setSpecificPresidentId(data.sessionResource.specificPresident?.id || '');

      // Marcar o tipo de resultado se já existir
      if (data.sessionResource.status !== 'EM_PAUTA') {
        setSelectedResult(data.sessionResource.status);
      }
    }
  }, [data]);

  // Filtrar membros para Pedido de Vista (excluir apenas quem tem distribuição)
  const availableMembersForVista = React.useMemo(() => {
    if (!data?.session?.members || !data?.distributedMemberIds) return [];

    // Retornar apenas membros que não estão na lista de distribuídos
    return data.session.members.filter(
      sm => !data.distributedMemberIds.includes(sm.member.id)
    );
  }, [data?.session?.members, data?.distributedMemberIds]);

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

        // Ordenar votações por 'order'
        const sortedVotings = votings.sort((a: any, b: any) => a.order - b.order);

        setSessionResults(sortedVotings);
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

  const resetResultIfExists = async () => {
    // Se já existe um resultado definido (diferente de EM_PAUTA), resetar
    if (selectedResult && selectedResult !== 'EM_PAUTA') {
      try {
        // Atualizar status no backend para EM_PAUTA
        const response = await fetch(
          `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/status`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'EM_PAUTA',
              minutesText: null,
              viewRequestedMemberId: null,
              diligenceDaysDeadline: null,
            }),
          }
        );

        if (response.ok) {
          // Limpar os estados locais
          setSelectedResult(null);
          setMinutesText('');
          setViewRequestedMemberId('');
          setDiligenceDays('');

          toast.success('Resultado removido devido a alterações nas votações');
        }
      } catch (error) {
        console.error('Error resetting result:', error);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || data?.session.status === 'CONCLUIDA') {
      return;
    }

    const oldIndex = sessionResults.findIndex((v) => v.id === active.id);
    const newIndex = sessionResults.findIndex((v) => v.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Atualizar ordem localmente (optimistic update)
    const newResults = arrayMove(sessionResults, oldIndex, newIndex);
    const reorderedResults = newResults.map((voting, index) => ({
      ...voting,
      order: index + 1,
    }));

    setSessionResults(reorderedResults);

    // Atualizar no backend
    try {
      const response = await fetch(`/api/ccr/sessions/${params.id}/processos/${params.resourceId}/reorder-votings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          votingOrders: reorderedResults.map((v) => ({
            id: v.id,
            order: v.order,
          })),
        }),
      });

      if (!response.ok) {
        // Se falhar, recarregar dados originais
        fetchSessionResults();
        toast.error('Erro ao reordenar votações');
      }
    } catch (error) {
      console.error('Error reordering votings:', error);
      // Se falhar, recarregar dados originais
      fetchSessionResults();
      toast.error('Erro ao reordenar votações');
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

  const validateAndConfirmStatus = async (newStatus: string) => {
    // Validações específicas por tipo de resultado
    if (newStatus === 'SUSPENSO') {
      // 1. Validar se texto contém [DETALHAR]
      if (minutesText.includes('[DETALHAR]')) {
        toast.error('O texto da ata contém [DETALHAR]. Por favor, complete o texto antes de salvar.');
        return;
      }
    } else if (newStatus === 'DILIGENCIA') {
      // 1. Validar prazo preenchido
      if (!diligenceDays || diligenceDays.trim() === '') {
        toast.error('O prazo em dias é obrigatório para Pedido de Diligência');
        return;
      }

      // 2. Validar se texto contém [DETALHAR]
      if (minutesText.includes('[DETALHAR]')) {
        toast.error('O texto da ata contém [DETALHAR]. Por favor, complete o texto antes de salvar.');
        return;
      }
    } else if (newStatus === 'PEDIDO_VISTA') {
      // 1. Validar se membro foi selecionado
      if (!viewRequestedMemberId) {
        toast.error('Selecione o membro que solicitou vista');
        return;
      }

      // 2. Verificar se quem pediu vista é autoridade cadastrada no processo
      const isAuthority = data?.sessionResource.resource.authorities?.some(
        auth => auth.authorityRegistered.id === viewRequestedMemberId
      );

      if (isAuthority) {
        toast.error('O membro selecionado é uma autoridade cadastrada no processo e não pode solicitar vista');
        return;
      }
    } else if (newStatus === 'JULGADO') {
      // 1. Verificar se todas as votações estão concluídas
      const hasIncompletedVoting = sessionResults.some(v => v.status !== 'CONCLUIDA');
      if (hasIncompletedVoting) {
        toast.error('Todas as votações devem estar concluídas antes de finalizar o julgamento');
        return;
      }

      // 2. Verificar se há pelo menos uma votação
      if (!sessionResults || sessionResults.length === 0) {
        toast.error('É necessário ao menos uma votação concluída para finalizar o julgamento');
        return;
      }

      // 3. Verificar votação de mérito e preliminares
      const meritVoting = sessionResults.find(v => v.votingType === 'MERITO' && v.status === 'CONCLUIDA');
      const preliminaryVotings = sessionResults.filter(v => v.votingType === 'NAO_CONHECIMENTO' && v.status === 'CONCLUIDA');

      // Se existe votação de mérito, verificar se alguma preliminar foi acatada
      if (meritVoting && preliminaryVotings.length > 0) {
        // Verificar se alguma preliminar teve voto vencedor no sentido de acatar
        const hasPreliminaryAccepted = preliminaryVotings.some(prelim => {
          if (!prelim.winningVote) return false;

          // Buscar o voto vencedor nos votos da votação
          const winningVote = prelim.votes?.find((v: any) => v.id === prelim.winningVote?.id);
          if (!winningVote) return false;

          // Verificar se a decisão preliminar indica acatamento
          // Precisamos verificar se o tipo da decisão preliminar vencedora é de acatamento
          return winningVote.preliminaryDecision?.type === 'ACATAR';
        });

        if (hasPreliminaryAccepted) {
          toast.error('Não é possível finalizar: existe votação de mérito mas uma preliminar foi acatada');
          return;
        }
      }

      // 4. Para prosseguir: necessário ao menos uma votação preliminar concluída no sentido de não acatar OU votação de mérito concluída
      const hasPreliminaryRejected = preliminaryVotings.some(prelim => {
        if (!prelim.winningVote) return false;
        const winningVote = prelim.votes?.find((v: any) => v.id === prelim.winningVote?.id);
        if (!winningVote) return false;
        return winningVote.preliminaryDecision?.type !== 'ACATAR';
      });

      if (!meritVoting && !hasPreliminaryRejected) {
        toast.error('É necessário ao menos uma votação preliminar concluída no sentido de não acatar ou uma votação de mérito concluída');
        return;
      }
    }

    // Mostrar toast de confirmação
    const statusLabelsConfirm: Record<string, string> = {
      SUSPENSO: 'suspender este processo',
      DILIGENCIA: 'enviar este processo para diligência',
      PEDIDO_VISTA: 'registrar pedido de vista neste processo',
      JULGADO: 'finalizar o julgamento deste processo',
    };

    const confirmMessage = statusLabelsConfirm[newStatus] || 'atualizar este processo';

    toast.warning(`Tem certeza que deseja ${confirmMessage}?`, {
      duration: 10000,
      action: {
        label: 'Confirmar',
        onClick: async () => {
          handleUpdateStatus(newStatus);
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { },
      },
    });
  };

  const handleSpecificPresidentChange = async (presidentId: string) => {
    setSpecificPresidentId(presidentId);

    try {
      // Salvar automaticamente no banco de dados
      const response = await fetch(
        `/api/ccr/session-resources/${params.resourceId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            specificPresidentId: presidentId || null,
          }),
        }
      );

      if (response.ok) {
        toast.success('Presidente substituto definido com sucesso');
        fetchData(); // Recarregar dados
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao salvar presidente substituto');
      }
    } catch (error) {
      console.error('Error saving specific president:', error);
      toast.error('Erro ao salvar presidente substituto');
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
            specificPresidentId: specificPresidentId || null,
          }),
        }
      );

      if (response.ok) {
        toast.success('Status atualizado com sucesso');
        router.push(`/ccr/sessoes/${params.id}`);
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

  const getGenderByName = async (name: string): Promise<'male' | 'female' | 'unknown'> => {
    try {
      // Extrair o primeiro nome (antes de qualquer espaço)
      const firstName = name.trim().split(' ')[0];

      // Chamar a API Genderize.io
      const response = await fetch(`https://api.genderize.io?name=${encodeURIComponent(firstName)}`);

      if (response.ok) {
        const data = await response.json();

        // A API retorna gender: 'male' ou 'female' e probability (0-1)
        if (data.gender && data.probability > 0.6) {
          return data.gender;
        }
      }
    } catch (error) {
      console.error('Error fetching gender:', error);
    }

    return 'unknown';
  };

  const numberToWords = (num: number): string => {
    const numbers: Record<number, string> = {
      1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco',
      6: 'seis', 7: 'sete', 8: 'oito', 9: 'nove', 10: 'dez',
      11: 'onze', 12: 'doze', 13: 'treze', 14: 'quatorze', 15: 'quinze',
      16: 'dezesseis', 17: 'dezessete', 18: 'dezoito', 19: 'dezenove', 20: 'vinte',
      21: 'vinte e um', 22: 'vinte e dois', 23: 'vinte e três', 24: 'vinte e quatro', 25: 'vinte e cinco',
      26: 'vinte e seis', 27: 'vinte e sete', 28: 'vinte e oito', 29: 'vinte e nove', 30: 'trinta',
      40: 'quarenta', 45: 'quarenta e cinco', 50: 'cinquenta', 60: 'sessenta',
      90: 'noventa', 100: 'cem', 120: 'cento e vinte', 180: 'cento e oitenta', 365: 'trezentos e sessenta e cinco'
    };

    if (numbers[num]) return numbers[num];

    // Para números entre 31-39, 41-49, etc
    if (num > 30 && num < 40) return `trinta e ${numbers[num - 30]}`;
    if (num > 40 && num < 50) return `quarenta e ${numbers[num - 40]}`;
    if (num > 50 && num < 60) return `cinquenta e ${numbers[num - 50]}`;
    if (num > 60 && num < 70) return `sessenta e ${numbers[num - 60]}`;
    if (num > 70 && num < 80) return `setenta e ${numbers[num - 70]}`;
    if (num > 80 && num < 90) return `oitenta e ${numbers[num - 80]}`;
    if (num > 90 && num < 100) return `noventa e ${numbers[num - 90]}`;

    return num.toString(); // Fallback para números não mapeados
  };

  // Função helper para remover pontos finais
  const removeFinalDot = (text: string) => text.trim().replace(/\.$/, '');

  // Função helper para verificar se presidente da sessão é relator/revisor
  const hasPresidentConflict = (): boolean => {
    if (!data?.session.president) return false;

    const presidentId = data.session.president.id;
    const distributedToId = data.distribution?.distributedToId;
    const reviewersIds = data.reviewers?.map(r => r.id) || [];

    return presidentId === distributedToId || reviewersIds.includes(presidentId);
  };

  // Função helper para gerar texto de votos declarados pendentes
  const generatePendingVotesText = (includeMemberName: boolean = true, onlyCurrentSession: boolean = false) => {
    if (!sessionVotes || sessionVotes.length === 0) {
      return '';
    }

    // Buscar o membro distribuído
    const distributedMemberId = data?.distribution?.distributedToId;
    if (!distributedMemberId) {
      return '';
    }

    // Filtrar votações e votos pela sessão atual se necessário
    const currentSessionId = data?.session.id;
    let completedVotingsToCheck = data?.completedVotings || [];
    let votesToConsider = sessionVotes;

    if (onlyCurrentSession) {
      completedVotingsToCheck = completedVotingsToCheck.filter(v =>
        v.judgedInSession && v.judgedInSession.id === currentSessionId
      );
      votesToConsider = sessionVotes.filter(v => v.sessionId === currentSessionId);
    }

    // Verificar quais tipos de votação já foram concluídos
    const hasPreliminaryVoting = completedVotingsToCheck.some(v =>
      v.votingType === 'NAO_CONHECIMENTO' && v.status === 'CONCLUIDA'
    );
    const hasMeritVoting = completedVotingsToCheck.some(v =>
      v.votingType === 'MERITO' && v.status === 'CONCLUIDA'
    );

    // Buscar votos do membro distribuído excluindo os que já foram incluídos em votações concluídas
    const distributedMemberVotes = votesToConsider.filter(v => {
      if (v.member.id !== distributedMemberId) return false;

      // Se há votação preliminar concluída, excluir votos preliminares
      if (hasPreliminaryVoting && v.voteKnowledgeType === 'NAO_CONHECIMENTO') {
        return false;
      }

      // Se há votação de mérito concluída, excluir votos de mérito
      if (hasMeritVoting && v.voteKnowledgeType === 'CONHECIMENTO') {
        return false;
      }

      return true;
    });

    if (distributedMemberVotes.length === 0) {
      return '';
    }

    // Pegar o primeiro voto para informações do membro
    const firstVote = distributedMemberVotes[0];

    // Determinar artigo, substantivo e função do membro distribuído
    let membroArticle = 'o';
    let membroNoun = 'membro';
    let funcao = '';
    const gender = firstVote.member.gender;

    if (gender === 'FEMININO') {
      membroArticle = 'a';
      membroNoun = 'membra';
    }

    const isRelator = firstVote.voteType === 'RELATOR';
    if (isRelator) {
      funcao = gender === 'FEMININO' ? 'relatora' : 'relator';
    } else {
      funcao = gender === 'FEMININO' ? 'revisora' : 'revisor';
    }

    // Determinar prefixo Dr./Dra. e nome do membro
    const prefix = gender === 'FEMININO' ? 'Dra.' : 'Dr.';
    const memberName = firstVote.member.name;

    // Criar identificação do membro
    // Para relatores: omitir nome se includeMemberName for false
    // Para revisores: sempre incluir nome (pode haver mais de um)
    const memberIdentification = (includeMemberName || !isRelator)
      ? `${membroArticle} ${membroNoun} ${funcao}, ${prefix} ${memberName},`
      : `${membroArticle} ${membroNoun} ${funcao}`;

    // Separar votos por tipo
    const preliminarVotes = distributedMemberVotes.filter(v => v.voteKnowledgeType === 'NAO_CONHECIMENTO');
    const meritoVotes = distributedMemberVotes.filter(v => v.voteKnowledgeType === 'CONHECIMENTO');

    const concatenateTexts = (votes: typeof distributedMemberVotes) => {
      const texts = votes.map(v => removeFinalDot(v.voteText.toLowerCase()));
      if (texts.length === 1) {
        return texts[0];
      } else if (texts.length === 2) {
        return texts.join(' e ');
      } else {
        return texts.slice(0, -1).join(', ') + ' e ' + texts[texts.length - 1];
      }
    };

    let voteText = '';

    if (preliminarVotes.length > 0 && meritoVotes.length > 0) {
      const preliminarText = concatenateTexts(preliminarVotes);
      const meritoText = concatenateTexts(meritoVotes);
      voteText = `${memberIdentification} declarou voto, em análise preliminar, no sentido de ${preliminarText}. Ainda, em análise de mérito, caso superada${preliminarVotes.length > 1 ? 's as referidas preliminares' : ' a referida preliminar'}, declarou voto no sentido de ${meritoText}.`;
    } else if (preliminarVotes.length > 0) {
      const preliminarText = concatenateTexts(preliminarVotes);
      voteText = `${memberIdentification} declarou voto, em análise preliminar, no sentido de ${preliminarText}.`;
    } else if (meritoVotes.length > 0) {
      const meritoText = concatenateTexts(meritoVotes);
      voteText = `${memberIdentification} declarou voto, em análise de mérito, no sentido de ${meritoText}.`;
    }

    return voteText;
  };

  // Função helper para gerar detalhes das votações
  const generateVotingDetails = (onlyCurrentSession: boolean = false) => {
    const hasCompletedVotings = data?.completedVotings && data.completedVotings.length > 0;

    if (!hasCompletedVotings) {
      return '';
    }

    // Filtrar votações pela sessão atual se necessário
    let completedVotings = data.completedVotings;
    if (onlyCurrentSession) {
      const currentSessionId = data?.session.id;
      completedVotings = data.completedVotings.filter(v =>
        v.judgedInSession && v.judgedInSession.id === currentSessionId
      );

      if (completedVotings.length === 0) {
        return '';
      }
    }

    // Verificar caso especial: apenas 1 votação com apenas 1 voto (relator/revisor) de forma unânime
    if (completedVotings.length === 1) {
      const voting = completedVotings[0];
      const relatorRevisorVotes = voting.votes.filter(v => v.voteType === 'RELATOR' || v.voteType === 'REVISOR');

      if (relatorRevisorVotes.length === 1) {
        // Verificar se é unânime (todos os votos substantivos seguem o mesmo voto)
        const substantiveVotes = voting.votes.filter(v =>
          v.participationStatus !== 'IMPEDIDO' &&
          v.participationStatus !== 'ABSTENCAO' &&
          v.participationStatus !== 'SUSPEITO'
        );

        const uniqueVotes = new Set<string>();
        substantiveVotes.forEach(v => {
          if (v.followsVoteId) {
            uniqueVotes.add(v.followsVoteId);
          } else {
            uniqueVotes.add(v.id);
          }
        });

        const isUnanimous = uniqueVotes.size === 1 && substantiveVotes.length > 1;

        if (isUnanimous) {
          // Retornar texto simplificado
          const mainVote = relatorRevisorVotes[0];
          return `Por unanimidade de votos, ${removeFinalDot(mainVote.voteText.toLowerCase())}`;
        }
      }
    }

    const votingTexts: string[] = [];
    const votedVoteIds = new Set<string>();

    // Verificar se há votações de sessões diferentes
    const currentSessionId = data?.session.id;
    const hasMultipleSessions = completedVotings.some(v => v.judgedInSession && v.judgedInSession.id !== currentSessionId);

    completedVotings.forEach((voting, index) => {
      const isFirstVoting = index === 0;
      const votingTypeText = voting.votingType === 'NAO_CONHECIMENTO' ? 'em análise preliminar' : 'em análise de mérito';
      const conectivosVotacoes = ['Na sequência', 'Posteriormente', 'Após'];
      const conectivoVotacao = conectivosVotacoes[(index - 1) % 3];

      // Determinar texto de início/conexão baseado na sessão
      let sessionIntroText = '';
      if (hasMultipleSessions) {
        const isCurrentSession = voting.judgedInSession && voting.judgedInSession.id === currentSessionId;

        if (isFirstVoting) {
          if (isCurrentSession) {
            sessionIntroText = 'Na presente sessão';
          } else if (voting.judgedInSession) {
            const sessionDate = format(new Date(voting.judgedInSession.date), 'dd/MM/yyyy', { locale: ptBR });
            sessionIntroText = `Na sessão de ${sessionDate}`;
          } else {
            sessionIntroText = 'Em sessão';
          }
        } else {
          if (isCurrentSession) {
            sessionIntroText = ` ${conectivoVotacao}, na presente sessão`;
          } else if (voting.judgedInSession) {
            const sessionDate = format(new Date(voting.judgedInSession.date), 'dd/MM/yyyy', { locale: ptBR });
            sessionIntroText = ` ${conectivoVotacao}, na sessão de ${sessionDate}`;
          } else {
            sessionIntroText = `. ${conectivoVotacao}`;
          }
        }
      } else {
        // Se todas são da mesma sessão, manter comportamento original
        sessionIntroText = isFirstVoting ? 'Em sessão' : `. ${conectivoVotacao}`;
      }

      const relatorVote = voting.votes.find(v => v.voteType === 'RELATOR');
      const revisorVotes = voting.votes.filter(v => v.voteType === 'REVISOR');
      const presidenteVote = voting.votes.find(v => v.voteType === 'PRESIDENTE');
      const otherVotes = voting.votes.filter(v => v.voteType !== 'RELATOR' && v.voteType !== 'REVISOR' && v.voteType !== 'PRESIDENTE');

      const revisorIdsFromDistribution = data?.reviewers?.map(r => r.id) || [];
      const processRevisorsVotingAsNormal = otherVotes.filter(v =>
        revisorIdsFromDistribution.includes(v.member.id)
      );

      const mainRevisorVotes = revisorVotes.filter(rv => {
        if (!rv.followsVoteId) return true;
        if (relatorVote && rv.followsVoteId === relatorVote.id) return false;
        if (revisorVotes.some(other => other.id !== rv.id && rv.followsVoteId === other.id)) return false;
        return true;
      });

      const followingRevisors = [
        ...revisorVotes.filter(rv => {
          if (!rv.followsVoteId) return false;
          if (relatorVote && rv.followsVoteId === relatorVote.id) return true;
          if (revisorVotes.some(other => other.id !== rv.id && rv.followsVoteId === other.id)) return true;
          return false;
        }),
        ...processRevisorsVotingAsNormal
      ];

      const followingRelator = relatorVote && relatorVote.followsVoteId ? relatorVote : null;
      const followingMemberIds = new Set([
        ...followingRevisors.map(rv => rv.member.id),
        ...(followingRelator ? [followingRelator.member.id] : [])
      ]);

      let narrativa = '';
      let relatorFollowers: typeof otherVotes = [];

      if (relatorVote && !relatorVote.followsVoteId) {
        votedVoteIds.add(relatorVote.id);
        const relatorGender = relatorVote.member.gender;
        const relatorPrefix = relatorGender === 'FEMININO' ? 'Dra.' : 'Dr.';
        const relatorArticle = relatorGender === 'FEMININO' ? 'a membra relatora' : 'o membro relator';
        const relatorArticleShort = relatorGender === 'FEMININO' ? 'a membra relatora' : 'o membro relator';

        if (isFirstVoting) {
          narrativa += `${sessionIntroText}, ${relatorArticle}, ${relatorPrefix} ${relatorVote.member.name}, votou, ${votingTypeText}, no sentido de ${removeFinalDot(relatorVote.voteText.toLowerCase())}`;
        } else {
          const prefixText = hasMultipleSessions ? sessionIntroText : ` ${conectivoVotacao}`;
          narrativa += `${prefixText}, ${relatorArticleShort} votou, ${votingTypeText}, no sentido de ${removeFinalDot(relatorVote.voteText.toLowerCase())}`;
        }

        relatorFollowers = otherVotes.filter(v =>
          v.followsVoteId === relatorVote.id &&
          v.participationStatus !== 'IMPEDIDO' &&
          v.participationStatus !== 'ABSTENCAO' &&
          v.participationStatus !== 'SUSPEITO' &&
          !followingMemberIds.has(v.member.id)
        );

        if (relatorFollowers.length > 0) {
          relatorFollowers.forEach(v => votedVoteIds.add(v.id));
          const followersNames = relatorFollowers.map(v => v.member.name).sort();
          const followersText = followersNames.length === 1
            ? followersNames[0]
            : followersNames.slice(0, -1).join(', ') + ' e ' + followersNames[followersNames.length - 1];

          narrativa += `, voto esse seguido ${followersNames.length === 1 ? 'pelo membro' : 'pelos membros'} ${followersText}`;
        }
      }

      mainRevisorVotes.forEach((revisorVote, revisorIndex) => {
        votedVoteIds.add(revisorVote.id);
        const revisorGender = revisorVote.member.gender;
        const revisorPrefix = revisorGender === 'FEMININO' ? 'Dra.' : 'Dr.';
        const revisorArticle = revisorGender === 'FEMININO' ? 'a membra revisora' : 'o membro revisor';
        const conectivos = ['De forma contrária', 'Em posição diversa', 'Por outro lado'];
        const conectivo = conectivos[revisorIndex % 3];
        const introText = `. ${conectivo}, ${revisorArticle}, ${revisorPrefix} ${revisorVote.member.name}, votou no sentido de ${removeFinalDot(revisorVote.voteText.toLowerCase())}`;
        narrativa += introText;

        const revisorFollowers = otherVotes.filter(v =>
          v.followsVoteId === revisorVote.id &&
          v.participationStatus !== 'IMPEDIDO' &&
          v.participationStatus !== 'ABSTENCAO' &&
          v.participationStatus !== 'SUSPEITO' &&
          !followingMemberIds.has(v.member.id)
        );

        if (revisorFollowers.length > 0) {
          revisorFollowers.forEach(v => votedVoteIds.add(v.id));
          const followersNames = revisorFollowers.map(v => v.member.name).sort();
          const followersText = followersNames.length === 1
            ? followersNames[0]
            : followersNames.slice(0, -1).join(', ') + ' e ' + followersNames[followersNames.length - 1];

          narrativa += `, voto esse seguido ${followersNames.length === 1 ? 'pelo membro' : 'pelos membros'} ${followersText}`;
        }
      });

      const followingMembers = [
        ...(followingRelator ? [followingRelator] : []),
        ...followingRevisors
      ];

      const groupedByFollowed = new Map<string, typeof followingMembers>();
      followingMembers.forEach(vote => {
        const key = vote.followsVoteId!;
        if (!groupedByFollowed.has(key)) {
          groupedByFollowed.set(key, []);
        }
        groupedByFollowed.get(key)!.push(vote);
      });

      groupedByFollowed.forEach((votes, followedVoteId) => {
        votes.forEach(v => votedVoteIds.add(v.id));

        let followedRole = '';
        let followedName = '';
        let followedGender: string | null = null;

        if (relatorVote && followedVoteId === relatorVote.id) {
          followedGender = relatorVote.member.gender;
          followedName = relatorVote.member.name;
          const followedPrefix = followedGender === 'FEMININO' ? 'Dra.' : 'Dr.';
          followedRole = followedGender === 'FEMININO' ? `da membra relatora ${followedPrefix} ${followedName}` : `do membro relator ${followedPrefix} ${followedName}`;
        } else {
          const followedRevisor = mainRevisorVotes.find(rv => rv.id === followedVoteId);
          if (followedRevisor) {
            followedGender = followedRevisor.member.gender;
            followedName = followedRevisor.member.name;
            const followedPrefix = followedGender === 'FEMININO' ? 'Dra.' : 'Dr.';
            followedRole = followedGender === 'FEMININO' ? `da membra revisora ${followedPrefix} ${followedName}` : `do membro revisor ${followedPrefix} ${followedName}`;
          }
        }

        if (followedRole) {
          if (votes.length === 1) {
            const vote = votes[0];
            const memberGender = vote.member.gender;
            const memberPrefix = memberGender === 'FEMININO' ? 'Dra.' : 'Dr.';
            const memberRole = vote.voteType === 'RELATOR'
              ? (memberGender === 'FEMININO' ? 'membra relatora' : 'membro relator')
              : (memberGender === 'FEMININO' ? 'membra revisora' : 'membro revisor');
            const article = memberGender === 'FEMININO' ? 'a' : 'o';

            narrativa += `. ${article.charAt(0).toUpperCase() + article.slice(1)} ${memberRole}, ${memberPrefix} ${vote.member.name}, acompanhou o voto ${followedRole}`;
          } else {
            const memberNames = votes.map(v => {
              const prefix = v.member.gender === 'FEMININO' ? 'Dra.' : 'Dr.';
              return `${prefix} ${v.member.name}`;
            }).sort();

            const hasRelator = votes.some(v => v.voteType === 'RELATOR');
            const hasRevisor = votes.some(v => v.voteType === 'REVISOR');

            let memberRolePlural = '';
            let article = '';
            if (hasRelator && !hasRevisor) {
              const feminineCount = votes.filter(v => v.member.gender === 'FEMININO').length;
              if (feminineCount > votes.length / 2) {
                memberRolePlural = 'membras relatoras';
                article = 'as';
              } else {
                memberRolePlural = 'membros relatores';
                article = 'os';
              }
            } else if (hasRevisor && !hasRelator) {
              const feminineCount = votes.filter(v => v.member.gender === 'FEMININO').length;
              if (feminineCount > votes.length / 2) {
                memberRolePlural = 'membras revisoras';
                article = 'as';
              } else {
                memberRolePlural = 'membros revisores';
                article = 'os';
              }
            } else {
              memberRolePlural = 'membros';
              article = 'os';
            }

            const namesText = memberNames.length === 2
              ? memberNames.join(' e ')
              : memberNames.slice(0, -1).join(', ') + ' e ' + memberNames[memberNames.length - 1];

            narrativa += `. ${article.charAt(0).toUpperCase() + article.slice(1)} ${memberRolePlural}, ${namesText}, acompanharam o voto ${followedRole}`;
          }
        }
      });

      const impedidos = otherVotes.filter(v => v.participationStatus === 'IMPEDIDO');
      if (impedidos.length > 0) {
        impedidos.forEach(v => votedVoteIds.add(v.id));
        const impedidosNames = impedidos.map(v => v.member.name).sort();
        const feminineCount = impedidos.filter(v => v.member.gender === 'FEMININO').length;
        const useFeminineArticle = feminineCount > impedidos.length / 2;
        const impedidosText = impedidosNames.length === 1
          ? `${useFeminineArticle ? 'A membra' : 'O membro'} ${impedidosNames[0]} esteve ${useFeminineArticle ? 'impedida' : 'impedido'} de votar`
          : `${useFeminineArticle ? 'As membras' : 'Os membros'} ${impedidosNames.slice(0, -1).join(', ')} e ${impedidosNames[impedidosNames.length - 1]} estiveram ${useFeminineArticle ? 'impedidas' : 'impedidos'} de votar`;

        narrativa += `. ${impedidosText}`;
      }

      const abstencoes = otherVotes.filter(v => v.participationStatus === 'ABSTENCAO');
      if (abstencoes.length > 0) {
        abstencoes.forEach(v => votedVoteIds.add(v.id));
        const abstencoesNames = abstencoes.map(v => v.member.name).sort();
        const feminineCount = abstencoes.filter(v => v.member.gender === 'FEMININO').length;
        const useFeminineArticle = feminineCount > abstencoes.length / 2;
        const abstencoesText = abstencoesNames.length === 1
          ? `${useFeminineArticle ? 'A membra' : 'O membro'} ${abstencoesNames[0]} absteve-se de votar`
          : `${useFeminineArticle ? 'As membras' : 'Os membros'} ${abstencoesNames.slice(0, -1).join(', ')} e ${abstencoesNames[abstencoesNames.length - 1]} abstiveram-se de votar`;

        narrativa += `. ${abstencoesText}`;
      }

      const suspeitos = otherVotes.filter(v => v.participationStatus === 'SUSPEITO');
      if (suspeitos.length > 0) {
        suspeitos.forEach(v => votedVoteIds.add(v.id));
        const suspeitosNames = suspeitos.map(v => v.member.name).sort();
        const feminineCount = suspeitos.filter(v => v.member.gender === 'FEMININO').length;
        const useFeminineArticle = feminineCount > suspeitos.length / 2;
        const suspeitosText = suspeitosNames.length === 1
          ? `${useFeminineArticle ? 'A membra' : 'O membro'} ${suspeitosNames[0]} ${useFeminineArticle ? 'declarou-se suspeita' : 'declarou-se suspeito'} durante a votação`
          : `${useFeminineArticle ? 'As membras' : 'Os membros'} ${suspeitosNames.slice(0, -1).join(', ')} e ${suspeitosNames[suspeitosNames.length - 1]} ${useFeminineArticle ? 'declararam-se suspeitas' : 'declararam-se suspeitos'} durante a votação`;

        narrativa += `. ${suspeitosText}`;
      }

      if (presidenteVote) {
        votedVoteIds.add(presidenteVote.id);
        let followedMember = null;
        let followedVoteType = '';

        if (presidenteVote.followsVoteId) {
          if (relatorVote && presidenteVote.followsVoteId === relatorVote.id) {
            followedMember = relatorVote.member;
            followedVoteType = 'relator';
          } else {
            const followedRevisor = revisorVotes.find(rv => rv.id === presidenteVote.followsVoteId);
            if (followedRevisor) {
              followedMember = followedRevisor.member;
              followedVoteType = 'revisor';
            }
          }
        }

        if (followedMember) {
          const presidenteGender = presidenteVote.member.gender;
          const presidenteArticle = presidenteGender === 'FEMININO' ? 'a' : 'o';
          const presidentePrefix = presidenteGender === 'FEMININO' ? 'Dra.' : 'Dr.';
          const followedGender = followedMember.gender;
          const followedArticle = followedGender === 'FEMININO' ? 'da membra' : 'do membro';

          // Usar presidente substituto se houver (quando presidente da sessão é relator/revisor)
          const presidentText = data.sessionResource.specificPresident
            ? `${presidenteArticle} Presidente substituto da sessão, ${presidentePrefix} ${presidenteVote.member.name},`
            : `${presidenteArticle} Presidente da sessão, ${presidentePrefix} ${presidenteVote.member.name},`;

          narrativa += `. Com empate de votos, ${presidentText} declarou voto de minerva, acompanhando o voto ${followedArticle} ${followedMember.name}`;
        }
      }

      const substantiveVotes = voting.votes.filter(v =>
        v.participationStatus !== 'IMPEDIDO' &&
        v.participationStatus !== 'ABSTENCAO' &&
        v.participationStatus !== 'SUSPEITO'
      );

      const uniqueVotes = new Set<string>();
      substantiveVotes.forEach(v => {
        if (v.followsVoteId) {
          uniqueVotes.add(v.followsVoteId);
        } else {
          uniqueVotes.add(v.id);
        }
      });

      const isUnanimous = uniqueVotes.size === 1 && substantiveVotes.length > 1;
      const resultText = isUnanimous ? 'por unanimidade' : 'por maioria de votos';
      const conectivosConclusao = ['Assim', 'Logo', 'Por fim'];
      const conectivoConclusao = conectivosConclusao[index % 3];

      if (voting.winningMember) {
        if (relatorVote && voting.winningMember.id === relatorVote.member.id) {
          const relatorGender = relatorVote.member.gender;
          const relatorArticle = relatorGender === 'FEMININO' ? 'da membra relatora' : 'do membro relator';
          narrativa += `. ${conectivoConclusao}, ${resultText}, vence o voto ${relatorArticle}${isFirstVoting ? ' ' + relatorVote.member.name : ''}`;
        } else {
          const winningRevisor = revisorVotes.find(rv => rv.member.id === voting.winningMember.id);
          if (winningRevisor) {
            const revisorGender = winningRevisor.member.gender;
            const revisorPrefix = revisorGender === 'FEMININO' ? 'Dra.' : 'Dr.';
            const revisorArticle = revisorGender === 'FEMININO' ? 'da membra revisora' : 'do membro revisor';
            narrativa += `. ${conectivoConclusao}, ${resultText}, vence o voto ${revisorArticle} ${revisorPrefix} ${winningRevisor.member.name}`;
          }
        }
      }

      // Garantir que a narrativa termine com ponto
      if (narrativa && !narrativa.endsWith('.')) {
        narrativa += '.';
      }

      votingTexts.push(narrativa);
    });

    return votingTexts.join('');
  };

  const handleGenerateText = async () => {
    if (!selectedResult) {
      toast.error('Selecione o tipo de resultado primeiro');
      return;
    }

    if (selectedResult === 'DILIGENCIA') {
      // Validar prazo
      if (!diligenceDays || diligenceDays.trim() === '') {
        toast.error('Informe o prazo em dias para gerar o texto');
        return;
      }

      const dias = parseInt(diligenceDays);
      const diasExtenso = numberToWords(dias);

      // Gerar detalhes das votações concluídas (apenas da sessão atual)
      const completedVotingsText = generateVotingDetails(true);

      // Gerar texto de votos declarados pendentes (sem nome se há votações concluídas, apenas da sessão atual)
      const pendingVotesText = generatePendingVotesText(completedVotingsText.length === 0, true);

      // Combinar ambos os textos
      let voteDetails = '';
      if (completedVotingsText.length > 0 && pendingVotesText.length > 0) {
        voteDetails = `${completedVotingsText} Além disso, ${pendingVotesText}`;
      } else if (completedVotingsText.length > 0) {
        voteDetails = completedVotingsText;
      } else if (pendingVotesText.length > 0) {
        voteDetails = `Em sessão, ${pendingVotesText}`;
      }

      // Identificar relator/revisor para conclusão
      let relatorRevisor = '';
      let membroArticle = 'o';
      let membroNoun = 'membro';
      let memberName = '';
      let memberPrefix = '';

      if (sessionVotes.length > 0) {
        const relatorVote = sessionVotes.find(v => v.voteType === 'RELATOR');
        const revisorVote = sessionVotes.find(v => v.voteType === 'REVISOR');

        const vote = relatorVote || revisorVote;

        if (vote) {
          const isRelator = vote.voteType === 'RELATOR';
          const gender = vote.member.gender;
          memberName = vote.member.name;

          if (gender === 'FEMININO') {
            membroArticle = 'a';
            membroNoun = 'membra';
            memberPrefix = 'Dra.';
          } else {
            memberPrefix = 'Dr.';
          }

          if (isRelator) {
            relatorRevisor = gender === 'FEMININO' ? 'relatora' : 'relator';
          } else {
            relatorRevisor = gender === 'FEMININO' ? 'revisora' : 'revisor';
          }
        } else {
          relatorRevisor = 'relator'; // Fallback
        }
      } else {
        relatorRevisor = 'relator'; // Fallback
      }

      // Gerar texto para DILIGENCIA
      let generatedText = '';

      if (voteDetails.length > 0) {
        generatedText = `${voteDetails} Dessa forma, ${membroArticle} ${membroNoun} ${relatorRevisor}, ${memberPrefix} ${memberName}, determinou a baixa dos autos em diligência para solicitar, no prazo de ${dias} (${diasExtenso}) dias úteis, [DETALHAR].`;
      } else {
        generatedText = `Em sessão, ${membroArticle} ${membroNoun} ${relatorRevisor}, ${memberPrefix} ${memberName}, determinou a baixa dos autos em diligência para solicitar, no prazo de ${dias} (${diasExtenso}) dias úteis, [DETALHAR].`;
      }

      // Adicionar presenças
      if (data?.sessionResource.attendances && data.sessionResource.attendances.length > 0) {
        const attendances = [...data.sessionResource.attendances];

        const presencasTexto = await Promise.all(attendances.map(async (attendance) => {
          const name = attendance.part?.name || attendance.customName || 'Não informado';
          const role = attendance.part?.role || attendance.customRole;
          const formattedRole = role ? formatPartRole(role) : null;

          if (formattedRole) {
            const gender = await getGenderByName(name);

            let article = 'o';
            if (gender === 'female') {
              article = 'a';
            } else if (gender === 'male') {
              article = 'o';
            } else {
              article = formattedRole.toLowerCase() === 'requerente' || formattedRole.toLowerCase() === 'representante' ? 'a' : 'o';
            }

            let prefix = '';
            const roleLower = formattedRole.toLowerCase();

            const hasPrefix = /^(Dr\.|Dra\.|Sr\.|Sra\.)\s/i.test(name);

            if (!hasPrefix) {
              if (roleLower === 'patrono') {
                prefix = gender === 'female' ? 'Dra. ' : 'Dr. ';
              } else {
                prefix = gender === 'female' ? 'Sra. ' : 'Sr. ';
              }
            }

            return `${article} ${formattedRole.toLowerCase()}, ${prefix}${name},`;
          }
          return `${name},`;
        }));

        if (presencasTexto.length > 0) {
          const presencasFormatted = presencasTexto.length === 1
            ? presencasTexto[0]
            : presencasTexto.slice(0, -1).join(' ') + ' e ' + presencasTexto[presencasTexto.length - 1];

          const presencaVerbo = presencasTexto.length === 1 ? 'esteve presente' : 'estiveram presentes';
          generatedText += ` ${presencasFormatted.charAt(0).toUpperCase() + presencasFormatted.slice(1)} ${presencaVerbo} durante o julgamento.`;
        }
      }

      // Adicionar ausências
      if (data?.sessionResource.absences && data.sessionResource.absences.length > 0) {
        const absences = [...data.sessionResource.absences];
        const absencesFormatted = absences.map(absence => absence.member.name);

        if (absencesFormatted.length > 0) {
          const absencesText = absencesFormatted.length === 1
            ? absencesFormatted[0]
            : absencesFormatted.slice(0, -1).join(', ') + ' e ' + absencesFormatted[absencesFormatted.length - 1];

          generatedText += ` Ademais, registra-se a ausência ${absencesFormatted.length === 1 ? 'do membro' : 'dos membros'} ${absencesText}.`;
        }
      }

      setMinutesText(generatedText);
      toast.success('Texto gerado com sucesso');
    } else if (selectedResult === 'SUSPENSO') {
      // Gerar detalhes das votações concluídas (apenas da sessão atual)
      const completedVotingsText = generateVotingDetails(true);

      // Gerar texto de votos declarados pendentes (sem nome se há votações concluídas, apenas da sessão atual)
      const pendingVotesText = generatePendingVotesText(completedVotingsText.length === 0, true);

      // Combinar ambos os textos
      let voteDetails = '';
      if (completedVotingsText.length > 0 && pendingVotesText.length > 0) {
        voteDetails = `${completedVotingsText} Além disso, ${pendingVotesText}`;
      } else if (completedVotingsText.length > 0) {
        voteDetails = completedVotingsText;
      } else if (pendingVotesText.length > 0) {
        voteDetails = `Em sessão, ${pendingVotesText}`;
      }

      // Gerar texto para SUSPENSO
      let generatedText = '';

      if (voteDetails.length > 0) {
        generatedText = `${voteDetails} Dessa forma, após discussão entre os conselheiros, os autos foram retirados de pauta, em razão de [DETALHAR].`;
      } else {
        generatedText = 'Em sessão, após discussão entre os conselheiros, os autos foram retirados de pauta, em razão de [DETALHAR].';
      }

      // Adicionar presenças
      if (data?.sessionResource.attendances && data.sessionResource.attendances.length > 0) {
        const attendances = [...data.sessionResource.attendances];

        // Processar presenças de forma assíncrona para detectar gênero
        const presencasTexto = await Promise.all(attendances.map(async (attendance) => {
          const name = attendance.part?.name || attendance.customName || 'Não informado';
          const role = attendance.part?.role || attendance.customRole;
          const formattedRole = role ? formatPartRole(role) : null;

          if (formattedRole) {
            // Detectar gênero pelo nome
            const gender = await getGenderByName(name);

            // Determinar artigo baseado no gênero e role
            let article = 'o';
            if (gender === 'female') {
              article = 'a';
            } else if (gender === 'male') {
              article = 'o';
            } else {
              // Se não conseguiu detectar, usar lógica baseada no role
              article = formattedRole.toLowerCase() === 'requerente' || formattedRole.toLowerCase() === 'representante' ? 'a' : 'o';
            }

            // Adicionar prefixo baseado no role e gênero
            let prefix = '';
            const roleLower = formattedRole.toLowerCase();

            // Verificar se o nome já tem prefixo (Dr., Dra., Sr., Sra.)
            const hasPrefix = /^(Dr\.|Dra\.|Sr\.|Sra\.)\s/i.test(name);

            if (!hasPrefix) {
              if (roleLower === 'patrono') {
                // Patrono: Dr. ou Dra.
                prefix = gender === 'female' ? 'Dra. ' : 'Dr. ';
              } else {
                // Demais roles: Sr. ou Sra.
                prefix = gender === 'female' ? 'Sra. ' : 'Sr. ';
              }
            }

            return `${article} ${formattedRole.toLowerCase()}, ${prefix}${name},`;
          }
          return `${name},`;
        }));

        if (presencasTexto.length > 0) {
          const presencasFormatted = presencasTexto.length === 1
            ? presencasTexto[0] // Mantém a vírgula
            : presencasTexto.slice(0, -1).join(' ') + ' e ' + presencasTexto[presencasTexto.length - 1]; // Mantém a vírgula do último item

          generatedText += ` ${presencasFormatted} estiveram presentes durante o julgamento.`;
        }
      }

      // Adicionar ausências
      if (data?.sessionResource.absences && data.sessionResource.absences.length > 0) {
        const absences = [...data.sessionResource.absences];
        const absencesFormatted = absences.map(absence => absence.member.name);

        if (absencesFormatted.length > 0) {
          const absencesText = absencesFormatted.length === 1
            ? absencesFormatted[0]
            : absencesFormatted.slice(0, -1).join(', ') + ' e ' + absencesFormatted[absencesFormatted.length - 1];

          generatedText += ` Ademais, registra-se a ausência ${absencesFormatted.length === 1 ? 'do membro' : 'dos membros'} ${absencesText}.`;
        }
      }

      setMinutesText(generatedText);
      toast.success('Texto gerado com sucesso');
    } else if (selectedResult === 'PEDIDO_VISTA') {
      // Validar se membro que pediu vista foi selecionado
      if (!viewRequestedMemberId) {
        toast.error('Selecione o membro que solicitou vista para gerar o texto');
        return;
      }

      // Buscar informações do membro que pediu vista
      const viewRequester = data?.session.members.find(sm => sm.member.id === viewRequestedMemberId);

      if (!viewRequester) {
        toast.error('Membro que pediu vista não encontrado');
        return;
      }

      // Buscar o membro distribuído nesta sessão (da distribution)
      const distributedMemberId = data?.distribution?.distributedToId;

      if (!distributedMemberId) {
        toast.error('Não foi possível identificar o membro distribuído');
        return;
      }

      // Buscar TODOS os votos do membro distribuído
      const distributedMemberVotes = sessionVotes.filter(v => v.member.id === distributedMemberId);

      if (distributedMemberVotes.length === 0) {
        toast.error('Não foi encontrado voto do membro distribuído');
        return;
      }

      // Pegar o primeiro voto para informações do membro
      const firstVote = distributedMemberVotes[0];

      // Determinar artigo, substantivo e função do membro distribuído
      let membroArticle = 'o';
      let membroNoun = 'membro';
      let funcao = '';
      const gender = firstVote.member.gender;

      if (gender === 'FEMININO') {
        membroArticle = 'a';
        membroNoun = 'membra';
      }

      const isRelator = firstVote.voteType === 'RELATOR';
      if (isRelator) {
        funcao = gender === 'FEMININO' ? 'relatora' : 'relator';
      } else {
        funcao = gender === 'FEMININO' ? 'revisora' : 'revisor';
      }

      // Determinar prefixo Dr./Dra.
      const prefix = gender === 'FEMININO' ? 'Dra.' : 'Dr.';

      // Gerar detalhes das votações concluídas (apenas da sessão atual)
      const completedVotingsText = generateVotingDetails(true);

      // Gerar texto de votos declarados pendentes (sem nome se há votações concluídas, apenas da sessão atual)
      const pendingVotesText = generatePendingVotesText(completedVotingsText.length === 0, true);

      // Combinar ambos os textos
      let voteDetails = '';
      if (completedVotingsText.length > 0 && pendingVotesText.length > 0) {
        voteDetails = `${completedVotingsText} Além disso, ${pendingVotesText}`;
      } else if (completedVotingsText.length > 0) {
        voteDetails = completedVotingsText;
      } else if (pendingVotesText.length > 0) {
        voteDetails = `Em sessão, ${pendingVotesText}`;
      }

      // Determinar artigo e substantivo para quem pediu vista
      let vistaMemberArticle = 'o';
      let vistaMemberNoun = 'membro';
      const vistaGender = viewRequester.member.gender;

      if (vistaGender === 'FEMININO') {
        vistaMemberArticle = 'a';
        vistaMemberNoun = 'membra';
      }

      // Gerar texto para PEDIDO_VISTA
      let generatedText = voteDetails.length > 0
        ? voteDetails // Já retorna texto completo "Em sessão..."
        : '';

      // Adicionar informação de pedido de vista
      if (generatedText) {
        generatedText += `. ${vistaMemberArticle.charAt(0).toUpperCase() + vistaMemberArticle.slice(1)} ${vistaMemberNoun} ${viewRequester.member.name} pediu vista dos autos.`;
      } else {
        generatedText = `${vistaMemberArticle.charAt(0).toUpperCase() + vistaMemberArticle.slice(1)} ${vistaMemberNoun} ${viewRequester.member.name} pediu vista dos autos.`;
      }
      // Adicionar presenças
      if (data?.sessionResource.attendances && data.sessionResource.attendances.length > 0) {
        const attendances = [...data.sessionResource.attendances];

        const presencasTexto = await Promise.all(attendances.map(async (attendance) => {
          const name = attendance.part?.name || attendance.customName || 'Não informado';
          const role = attendance.part?.role || attendance.customRole;
          const formattedRole = role ? formatPartRole(role) : null;

          if (formattedRole) {
            const gender = await getGenderByName(name);

            let article = 'o';
            if (gender === 'female') {
              article = 'a';
            } else if (gender === 'male') {
              article = 'o';
            } else {
              article = formattedRole.toLowerCase() === 'requerente' || formattedRole.toLowerCase() === 'representante' ? 'a' : 'o';
            }

            let prefix = '';
            const roleLower = formattedRole.toLowerCase();

            const hasPrefix = /^(Dr\.|Dra\.|Sr\.|Sra\.)\s/i.test(name);

            if (!hasPrefix) {
              if (roleLower === 'patrono') {
                prefix = gender === 'female' ? 'Dra. ' : 'Dr. ';
              } else {
                prefix = gender === 'female' ? 'Sra. ' : 'Sr. ';
              }
            }

            return `${article} ${formattedRole.toLowerCase()}, ${prefix}${name},`;
          }
          return `${name},`;
        }));

        if (presencasTexto.length > 0) {
          const presencasFormatted = presencasTexto.length === 1
            ? presencasTexto[0]
            : presencasTexto.slice(0, -1).join(' ') + ' e ' + presencasTexto[presencasTexto.length - 1];

          const presencaVerbo = presencasTexto.length === 1 ? 'esteve presente' : 'estiveram presentes';
          generatedText += ` ${presencasFormatted.charAt(0).toUpperCase() + presencasFormatted.slice(1)} ${presencaVerbo} durante o julgamento.`;
        }
      }

      // Adicionar ausências
      if (data?.sessionResource.absences && data.sessionResource.absences.length > 0) {
        const absences = [...data.sessionResource.absences];
        const absencesFormatted = absences.map(absence => absence.member.name);

        if (absencesFormatted.length > 0) {
          const absencesText = absencesFormatted.length === 1
            ? absencesFormatted[0]
            : absencesFormatted.slice(0, -1).join(', ') + ' e ' + absencesFormatted[absencesFormatted.length - 1];

          generatedText += ` Ademais, registra-se a ausência ${absencesFormatted.length === 1 ? 'do membro' : 'dos membros'} ${absencesText}.`;
        }
      }

      setMinutesText(generatedText);
      toast.success('Texto gerado com sucesso');
    } else if (selectedResult === 'JULGADO') {
      // Gerar detalhes das votações concluídas
      const completedVotingsText = generateVotingDetails();

      if (!completedVotingsText) {
        toast.error('Não há votações concluídas para gerar o texto');
        return;
      }

      // Gerar texto de votos declarados pendentes (sem nome pois sempre há votações concluídas)
      const pendingVotesText = generatePendingVotesText(false);

      // Combinar ambos os textos
      let voteDetails = '';
      if (completedVotingsText.length > 0 && pendingVotesText.length > 0) {
        voteDetails = `${completedVotingsText} Além disso, ${pendingVotesText}`;
      } else if (completedVotingsText.length > 0) {
        voteDetails = completedVotingsText;
      }

      // Gerar texto para JULGADO
      let generatedText = voteDetails;

      // Adicionar presenças
      if (data?.sessionResource.attendances && data.sessionResource.attendances.length > 0) {
        const attendances = [...data.sessionResource.attendances];

        const presencasTexto = await Promise.all(attendances.map(async (attendance) => {
          const name = attendance.part?.name || attendance.customName || 'Não informado';
          const role = attendance.part?.role || attendance.customRole;
          const formattedRole = role ? formatPartRole(role) : null;

          if (formattedRole) {
            const gender = await getGenderByName(name);

            let article = 'o';
            if (gender === 'female') {
              article = 'a';
            } else if (gender === 'male') {
              article = 'o';
            } else {
              article = formattedRole.toLowerCase() === 'requerente' || formattedRole.toLowerCase() === 'representante' ? 'a' : 'o';
            }

            let prefix = '';
            const roleLower = formattedRole.toLowerCase();

            const hasPrefix = /^(Dr\.|Dra\.|Sr\.|Sra\.)\s/i.test(name);

            if (!hasPrefix) {
              if (roleLower === 'patrono' || roleLower === 'procurador') {
                prefix = gender === 'female' ? 'Dra. ' : 'Dr. ';
              } else {
                prefix = gender === 'female' ? 'Sra. ' : 'Sr. ';
              }
            }

            return `${article} ${formattedRole.toLowerCase()}, ${prefix}${name},`;
          } else {
            return `${name},`;
          }
        }));

        if (presencasTexto.length > 0) {
          const presencasFormatted = presencasTexto.length === 1
            ? presencasTexto[0]
            : presencasTexto.slice(0, -1).join(' ') + ' e ' + presencasTexto[presencasTexto.length - 1];

          const presencaVerbo = presencasTexto.length === 1 ? 'esteve presente' : 'estiveram presentes';
          generatedText += ` ${presencasFormatted.charAt(0).toUpperCase() + presencasFormatted.slice(1)} ${presencaVerbo} durante o julgamento.`;
        }
      }

      // Adicionar ausências
      if (data?.sessionResource.absences && data.sessionResource.absences.length > 0) {
        const absences = [...data.sessionResource.absences];
        const absencesFormatted = absences.map(absence => absence.member.name);

        if (absencesFormatted.length > 0) {
          const absencesText = absencesFormatted.length === 1
            ? absencesFormatted[0]
            : absencesFormatted.slice(0, -1).join(', ') + ' e ' + absencesFormatted[absencesFormatted.length - 1];

          generatedText += ` Ademais, registra-se a ausência ${absencesFormatted.length === 1 ? 'do membro' : 'dos membros'} ${absencesText}.`;
        }
      }

      setMinutesText(generatedText);
      toast.success('Texto gerado com sucesso');
    } else {
      toast.info('Funcionalidade disponível apenas para SUSPENSO, DILIGÊNCIA, PEDIDO DE VISTA e JULGADO no momento');
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
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Detalhes do Processo</CardTitle>
                  <CardDescription>
                    Informações do processo em julgamento.
                  </CardDescription>
                </div>
                <Skeleton className="h-9 w-9" />
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
                  <CardTitle className="flex items-center gap-1.5">
                    Votações
                    <TooltipWrapper content="Arraste e solte os cards de votação para reordená-los cronologicamente">
                      <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipWrapper>
                  </CardTitle>
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

          {/* Card de Tipo de Resultado */}
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <CardTitle>
                  Tipo de Resultado <span className="text-red-500">*</span>
                </CardTitle>
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
              <div className="flex items-start justify-between">
                <div className="space-y-1.5">
                  <CardTitle>
                    Texto da Ata <span className="text-red-500">*</span>
                  </CardTitle>
                  <CardDescription>
                    Texto obrigatório que aparecerá na ata para este processo.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-9 w-9" />
                  <Skeleton className="h-9 w-9" />
                </div>
              </div>
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
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <CardTitle>Detalhes do Processo</CardTitle>
                <CardDescription>
                  Informações do processo em julgamento.
                </CardDescription>
              </div>
              <TooltipWrapper content="Gerenciar ausências">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/ausencias`)}
                  className="cursor-pointer h-9 w-9 p-0"
                >
                  <UserX className="h-4 w-4" />
                </Button>
              </TooltipWrapper>
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
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit', getResourceStatusColor(data.sessionResource.resource.status))}>
                    {getResourceStatusLabel(data.sessionResource.resource.status)}
                  </span>
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
                        {data.relatorDistributionDate && (
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(data.relatorDistributionDate), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        )}
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
                <CardTitle className="flex items-center gap-1.5">
                  Votações
                  <TooltipWrapper content="Arraste e solte os cards de votação para reordená-los cronologicamente">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </CardTitle>
                <CardDescription>
                  {data.session.status === 'CONCLUIDA'
                    ? 'Votações registradas durante o julgamento deste processo.'
                    : 'Registre votos individuais e organize votações para este processo.'}
                </CardDescription>
              </div>
              {data.session.status !== 'CONCLUIDA' && (
                <Button
                  className="cursor-pointer"
                  onClick={() => {
                    // Validar presidente substituto antes de navegar
                    if (hasPresidentConflict() && !specificPresidentId) {
                      toast.error('Selecione um presidente substituto antes de registrar votos. O presidente da sessão é relator/revisor neste processo.');
                      return;
                    }
                    router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar/novo-voto`);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Voto
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Votações */}
            {sessionResults.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sessionResults.map((v) => v.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {sessionResults.map((voting, index) => (
                      <VotingCard
                        key={voting.id}
                        voting={voting}
                        sessionId={params.id as string}
                        resourceId={params.resourceId as string}
                        index={index + 1}
                        totalMembers={data.session.members.length}
                        totalDistributedMembers={data.distributedMemberIds.length}
                        totalAbsentMembers={data.sessionResource.absences.length}
                        isSessionCompleted={data.session.status === 'CONCLUIDA'}
                        presidentId={data.session.president?.id}
                        distributedToId={data.distribution?.distributedToId}
                        reviewersIds={data.reviewers.map(r => r.id)}
                        specificPresidentId={specificPresidentId}
                        onDelete={fetchData}
                        onVotingChange={resetResultIfExists}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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

        {/* Card de Tipo de Resultado */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>
                Tipo de Resultado {data.session.status !== 'CONCLUIDA' && <span className="text-red-500">*</span>}
              </CardTitle>
              <CardDescription>
                {data.session.status === 'CONCLUIDA'
                  ? 'Resultado final do processo nesta sessão.'
                  : 'Selecione o resultado final do processo nesta sessão.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Suspenso */}
              <div
                onClick={() => data.session.status !== 'CONCLUIDA' && setSelectedResult('SUSPENSO')}
                className={cn(
                  "bg-white rounded-lg border transition-all flex flex-col",
                  data.session.status === 'CONCLUIDA'
                    ? "pointer-events-none"
                    : "cursor-pointer hover:border-gray-900",
                  selectedResult === 'SUSPENSO'
                    ? "border-gray-900"
                    : ""
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
                onClick={() => data.session.status !== 'CONCLUIDA' && setSelectedResult('DILIGENCIA')}
                className={cn(
                  "bg-white rounded-lg border transition-all flex flex-col",
                  data.session.status === 'CONCLUIDA'
                    ? "pointer-events-none"
                    : "cursor-pointer hover:border-gray-900",
                  selectedResult === 'DILIGENCIA'
                    ? "border-gray-900"
                    : ""
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
                onClick={() => data.session.status !== 'CONCLUIDA' && setSelectedResult('PEDIDO_VISTA')}
                className={cn(
                  "bg-white rounded-lg border transition-all flex flex-col",
                  data.session.status === 'CONCLUIDA'
                    ? "pointer-events-none"
                    : "cursor-pointer hover:border-gray-900",
                  selectedResult === 'PEDIDO_VISTA'
                    ? "border-gray-900"
                    : ""
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
                onClick={() => data.session.status !== 'CONCLUIDA' && setSelectedResult('JULGADO')}
                className={cn(
                  "bg-white rounded-lg border transition-all flex flex-col",
                  data.session.status === 'CONCLUIDA'
                    ? "pointer-events-none"
                    : "cursor-pointer hover:border-gray-900",
                  selectedResult === 'JULGADO'
                    ? "border-gray-900"
                    : ""
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

            {/* Input de Prazo para Diligência */}
            {selectedResult === 'DILIGENCIA' && (
              <div className="w-full md:w-1/2 mt-4">
                <label className="block text-sm font-medium mb-2">
                  Prazo (em dias) {data.session.status !== 'CONCLUIDA' && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="text"
                  value={diligenceDays}
                  onChange={(e) => {
                    if (data.session.status === 'CONCLUIDA') return;
                    const value = e.target.value;
                    // Permitir apenas números e no máximo 3 caracteres
                    if (/^\d{0,3}$/.test(value)) {
                      setDiligenceDays(value);
                    }
                  }}
                  placeholder="Ex: 30"
                  maxLength={3}
                  readOnly={data.session.status === 'CONCLUIDA'}
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            )}

            {/* Select de Membro para Pedido de Vista */}
            {selectedResult === 'PEDIDO_VISTA' && (
              <div className="w-full mt-4">
                <label className="block text-sm font-medium mb-2">
                  Membro que Solicitou Vista {data.session.status !== 'CONCLUIDA' && <span className="text-red-500">*</span>}
                </label>
                <Select
                  value={viewRequestedMemberId}
                  onValueChange={data.session.status !== 'CONCLUIDA' ? setViewRequestedMemberId : undefined}
                >
                  <SelectTrigger className={cn(
                    "h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors",
                    data.session.status === 'CONCLUIDA' && "pointer-events-none"
                  )}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {availableMembersForVista.map((m) => (
                      <SelectItem key={m.member.id} value={m.member.id}>
                        {m.member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de Presidente Substituto (quando há conflito de interesse) */}
        {hasPresidentConflict() && (
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <CardTitle>
                  Presidente Substituto {data.session.status !== 'CONCLUIDA' && <span className="text-red-500">*</span>}
                </CardTitle>
                <CardDescription>
                  {(() => {
                    if (!data.session.president) return null;

                    const presidentId = data.session.president.id;
                    const presidentName = data.session.president.name;
                    const presidentGender = data.session.president.gender;
                    const distributedToId = data.distribution?.distributedToId;
                    const reviewersIds = data.reviewers?.map(r => r.id) || [];

                    // Determinar artigo e função
                    const article = presidentGender === 'FEMININO' ? 'A' : 'O';
                    const presidentTitle = presidentGender === 'FEMININO' ? 'presidente' : 'presidente';

                    let role = '';
                    if (presidentId === distributedToId) {
                      role = presidentGender === 'FEMININO' ? 'relatora' : 'relator';
                    } else if (reviewersIds.includes(presidentId)) {
                      role = presidentGender === 'FEMININO' ? 'revisora' : 'revisor';
                    }

                    return `${article} ${presidentTitle} da sessão (${presidentName}) é ${role} neste processo. Selecione um presidente substituto para este julgamento específico.`;
                  })()}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="w-full">

                <Select
                  value={specificPresidentId}
                  onValueChange={data.session.status !== 'CONCLUIDA' ? handleSpecificPresidentChange : undefined}
                >
                  <SelectTrigger className={cn(
                    "h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors",
                    data.session.status === 'CONCLUIDA' && "pointer-events-none"
                  )}>
                    <SelectValue placeholder="Selecione um presidente substituto..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {data.session.members
                      .filter(sm => sm.member.id !== data.session.president?.id)
                      .map((sm) => (
                        <SelectItem key={sm.member.id} value={sm.member.id}>
                          {sm.member.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de Status e Ações */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <CardTitle>
                  Texto da Ata {data.session.status !== 'CONCLUIDA' && <span className="text-red-500">*</span>}
                </CardTitle>
                <CardDescription>
                  {data.session.status === 'CONCLUIDA'
                    ? 'Texto registrado na ata para este processo.'
                    : 'Texto obrigatório que aparecerá na ata para este processo.'}
                </CardDescription>
              </div>
              {data.session.status !== 'CONCLUIDA' && (
                <div className="flex items-center gap-2">
                  <TooltipWrapper content="Gerar texto automaticamente">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateText}
                      className="cursor-pointer h-9 w-9 p-0"
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Quer uma ajuda da Dora?">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // TODO: Implementar lógica de ajuda da IA
                        toast.info('Funcionalidade em desenvolvimento');
                      }}
                      className="cursor-pointer h-9 w-9 p-0"
                    >
                      <Bot className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                value={minutesText}
                onChange={(e) => {
                  if (data.session.status === 'CONCLUIDA') return;
                  setMinutesText(e.target.value);
                }}
                placeholder={data.session.status === 'CONCLUIDA' ? '' : 'Digite o texto da ata para este processo...'}
                rows={4}
                readOnly={data.session.status === 'CONCLUIDA'}
                className="resize-none px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

          </CardContent>
        </Card>

        {/* Botões de Navegação - apenas quando sessão não está concluída */}
        {data.session.status !== 'CONCLUIDA' && (
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
                if (!selectedResult) {
                  toast.error('Selecione o tipo de resultado');
                  return;
                }
                if (!minutesText || minutesText.trim() === '') {
                  toast.error('O texto da ata é obrigatório');
                  return;
                }
                validateAndConfirmStatus(selectedResult);
              }}
              disabled={saving}
              className="cursor-pointer"
            >
              Salvar Resultado
            </Button>
          </div>
        )}
      </div>
    </CCRPageWrapper>
  );
}
