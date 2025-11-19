'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CCRPageWrapper } from '@/app/(routes)/ccr/components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, Clock, Calendar, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  name: string;
  role: string;
  gender?: string;
}

interface Decision {
  id: string;
  identifier: string;
  type: string;
}

interface SessionInfo {
  id: string;
  sessionNumber: string;
  date: Date;
}

interface Vote {
  id: string;
  member: Member;
  voteType: string;
  participationStatus: string;
  voteKnowledgeType: string;
  voteText: string | null;
  session?: SessionInfo;
  preliminaryDecision?: Decision | null;
  meritDecision?: Decision | null;
  officialDecision?: Decision | null;
  followsVote?: {
    id: string;
    member: { id: string; name: string; gender?: string };
    preliminaryDecision?: Decision | null;
    meritDecision?: Decision | null;
  } | null;
  createdAt: Date;
}

interface VotingData {
  id: string;
  votingType: string;
  label: string;
  status: string;
  completedAt: Date | null;
  totalVotes: number;
  votesInFavor: number;
  votesAgainst: number;
  abstentions: number;
  absences: number;
  impediments: number;
  suspicions: number;
  qualityVoteUsed: boolean;
  finalText: string | null;
  resource: {
    id: string;
    processNumber: string;
    processName: string | null;
    resourceNumber: string;
  };
  judgedInSession?: SessionInfo | null;
  preliminaryDecision?: Decision | null;
  winningMember?: Member | null;
  qualityVoteMember?: Member | null;
  votes: Vote[];
}

interface SessionMember {
  id: string;
  member: Member;
}

interface SessionData {
  id: string;
  sessionNumber: string;
  date: Date;
  members: SessionMember[];
  president: Member | null;
}

interface MemberVote {
  memberId: string;
  voteChoice: string; // ID do membro que ele segue, ou 'AUSENTE', 'IMPEDIDO', 'ABSTENCAO', 'SUSPEITO'
}

export default function VotingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [voting, setVoting] = useState<VotingData | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [memberVotes, setMemberVotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.id && params.resourceId && params.votingId) {
      fetchData();
    }
  }, [params.id, params.resourceId, params.votingId]);

  // Preencher memberVotes com votos já salvos no banco
  useEffect(() => {
    if (voting?.votes) {
      const savedVotes: Record<string, string> = {};

      voting.votes.forEach(vote => {
        const memberId = vote.member.id;

        // Determinar o choice baseado no voto salvo
        if (vote.participationStatus === 'AUSENTE') {
          savedVotes[memberId] = 'AUSENTE';
        } else if (vote.participationStatus === 'IMPEDIDO') {
          savedVotes[memberId] = 'IMPEDIDO';
        } else if (vote.participationStatus === 'SUSPEITO') {
          savedVotes[memberId] = 'SUSPEITO';
        } else if (vote.participationStatus === 'ABSTENCAO') {
          savedVotes[memberId] = 'ABSTENCAO';
        } else if (vote.followsVote) {
          // Salvar o ID do voto que está sendo seguido
          savedVotes[memberId] = vote.followsVote.id;
        }
      });

      setMemberVotes(savedVotes);
    }
  }, [voting]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar dados da votação
      const votingResponse = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votings/${params.votingId}`
      );

      if (!votingResponse.ok) {
        toast.error('Erro ao carregar dados da votação');
        return;
      }

      const votingData = await votingResponse.json();
      setVoting(votingData);

      // Buscar dados da sessão
      const sessionResponse = await fetch(`/api/ccr/sessions/${params.id}`);

      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        setSession(sessionData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVotes = async (voteType: string = 'VOTANTE', options = { showToast: true, refetch: true }) => {
    try {
      setSaving(true);

      // Processar cada membro disponível (incluindo presidente se houver voto de minerva)
      const membersToProcess = [...availableMembers];
      if (shouldShowPresidentVote && session?.president) {
        membersToProcess.push({
          id: 'president',
          member: session.president
        } as any);
      }

      for (const sessionMember of membersToProcess) {
        const memberId = sessionMember.member.id;
        const choice = memberVotes[memberId];

        // Verificar se já existe voto no banco
        const existingVote = voting?.votes.find(v => v.member.id === memberId);

        // Determinar o choice atual do voto existente no banco
        let existingChoice = '';
        if (existingVote) {
          if (existingVote.participationStatus === 'AUSENTE') {
            existingChoice = 'AUSENTE';
          } else if (existingVote.participationStatus === 'IMPEDIDO') {
            existingChoice = 'IMPEDIDO';
          } else if (existingVote.participationStatus === 'SUSPEITO') {
            existingChoice = 'SUSPEITO';
          } else if (existingVote.participationStatus === 'ABSTENCAO') {
            existingChoice = 'ABSTENCAO';
          } else if (existingVote.followsVote) {
            existingChoice = existingVote.followsVote.id;
          }
        }

        // Caso 1: Voto foi desmarcado - deletar do banco
        if (!choice && existingVote) {
          const deleteResponse = await fetch(
            `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votes/${existingVote.id}`,
            { method: 'DELETE' }
          );

          if (!deleteResponse.ok) {
            toast.error(`Erro ao remover voto de ${sessionMember.member.name}`);
            return false;
          }
          continue;
        }

        // Caso 2: Sem voto marcado e sem voto no banco - pular
        if (!choice) continue;

        // Caso 3: Voto igual ao do banco - pular (manter)
        if (existingVote && choice === existingChoice) continue;

        // Caso 4: Voto diferente do banco - deletar e criar novo
        if (existingVote) {
          const deleteResponse = await fetch(
            `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votes/${existingVote.id}`,
            { method: 'DELETE' }
          );

          if (!deleteResponse.ok) {
            toast.error(`Erro ao atualizar voto de ${sessionMember.member.name}`);
            return false;
          }
        }

        // Criar novo voto
        let participationStatus = 'PRESENTE';
        let followsVoteId = null;
        let preliminaryDecisionId = null;
        let meritDecisionId = null;
        let officialDecisionId = null;
        let voteText = null;

        if (choice === 'AUSENTE') {
          participationStatus = 'AUSENTE';
        } else if (choice === 'IMPEDIDO') {
          participationStatus = 'IMPEDIDO';
        } else if (choice === 'SUSPEITO') {
          participationStatus = 'SUSPEITO';
        } else if (choice === 'ABSTENCAO') {
          participationStatus = 'ABSTENCAO';
        } else {
          // Choice é o ID do voto que está sendo seguido
          followsVoteId = choice;
        }

        // Identificar o tipo de votação para TODOS os votos
        // (votantes, ausentes, impedidos, abstenção, suspeição)
        if (voting?.votingType === 'NAO_CONHECIMENTO' ||
            (registeredVotes.length > 0 && registeredVotes[0].voteKnowledgeType === 'NAO_CONHECIMENTO')) {
          // Buscar a preliminar da votação (se existir)
          const votingPreliminary = voting?.preliminaryDecision?.id ||
                                   registeredVotes[0]?.preliminaryDecision?.id;
          if (votingPreliminary) {
            preliminaryDecisionId = votingPreliminary;
          }
        }
        // Para mérito (CONHECIMENTO), apenas o voteKnowledgeType já identifica
        // Todos os outros campos (meritDecisionId, officialDecisionId, voteText) permanecem null

        // Determinar voteType: presidente usa PRESIDENTE, outros usam o parâmetro
        const finalVoteType = (memberId === session?.president?.id) ? 'PRESIDENTE' : voteType;

        const response = await fetch(
          `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votes`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resultId: params.votingId,
              memberId,
              voteType: finalVoteType,
              participationStatus,
              voteKnowledgeType:
                voting?.votingType === 'MERITO' ? 'CONHECIMENTO' : 'NAO_CONHECIMENTO',
              followsVoteId,
              preliminaryDecisionId,
              meritDecisionId,
              officialDecisionId,
              voteText,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          toast.error(error.error || `Erro ao adicionar voto de ${sessionMember.member.name}`);
          return false;
        }
      }

      if (options.showToast) {
        toast.success('Votos salvos com sucesso');
      }
      if (options.refetch) {
        await fetchData();
      }
      return true;
    } catch (error) {
      console.error('Error saving votes:', error);
      toast.error('Erro ao salvar votos');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteVoting = () => {
    router.push(
      `/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`
    );
  };

  // Separar votos
  const relatorVotes = voting?.votes.filter((v) => v.voteType === 'RELATOR') || [];
  const revisorVotes = voting?.votes.filter((v) => v.voteType === 'REVISOR') || [];
  const registeredVotes = [...relatorVotes, ...revisorVotes];

  // IDs dos membros que votaram como RELATOR ou REVISOR (esses não aparecem na tabela)
  const relatorRevisorMemberIds = [...relatorVotes, ...revisorVotes].map((v) => v.member.id);

  // IDs de TODOS que votaram (para verificar presidente)
  const votedMemberIds = voting?.votes.map((v) => v.member.id) || [];

  // Membros disponíveis: TODOS exceto RELATOR e REVISOR
  const allMembers = session?.members.filter((m) => !relatorRevisorMemberIds.includes(m.member.id)) || [];

  // Ordenar membros conforme regra personalizada
  const availableMembers = (() => {
    // Separar membros em grupos
    const group1 = allMembers.filter(m => {
      const role = m.member.role || '';
      return role && (role.includes('Município') || role.includes('Vice-Presidente'));
    }).sort((a, b) => a.member.name.localeCompare(b.member.name, 'pt-BR'));

    const group2 = allMembers.filter(m => {
      const role = m.member.role || '';
      return role && !role.includes('Município') && !role.includes('Vice-Presidente');
    }).sort((a, b) => a.member.name.localeCompare(b.member.name, 'pt-BR'));

    const group3 = allMembers.filter(m => !m.member.role)
      .sort((a, b) => a.member.name.localeCompare(b.member.name, 'pt-BR'));

    // Intercalar grupo1 e grupo2
    const intercalated = [];
    const maxLength = Math.max(group1.length, group2.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < group1.length) intercalated.push(group1[i]);
      if (i < group2.length) intercalated.push(group2[i]);
    }

    // Adicionar grupo3 no final
    return [...intercalated, ...group3];
  })();

  // Detectar empate e necessidade de voto de qualidade
  const needsQualityVote = (() => {
    if (!voting || !session) return false;

    const presidentId = session.president?.id;

    // Todos os membros da sessão
    const totalSessionMembers = session.members.length;

    // Votos já registrados no banco (todos os votos da votação)
    const allVotes = voting.votes || [];

    // Criar mapa de membros que já votaram no banco
    const savedVotes = new Map(allVotes.map(v => [v.member.id, v]));

    // Verificar se todos os membros da sessão (exceto presidente se não estiver na lista) têm voto
    const allMembersHaveVote = session.members.every(sm => {
      const memberId = sm.member.id;
      // Se é o presidente e ele não está na lista regular, não precisa ter votado ainda
      if (memberId === presidentId && !availableMembers.some(m => m.member.id === presidentId)) {
        return true;
      }
      return savedVotes.has(memberId) || memberVotes[memberId];
    });

    // Se ainda há membros que não votaram, não mostra voto de qualidade
    if (!allMembersHaveVote) return false;

    // Contar votos válidos por decisão (seguindo relator/revisor)
    // IMPORTANTE: Não contar o voto do presidente
    const votesByDecision: Record<string, number> = {};

    // Processar votos salvos no banco
    allVotes.forEach(vote => {
      // Pular voto do presidente
      if (vote.member.id === presidentId) return;

      // Pular votos que não são válidos para contagem
      if (vote.participationStatus !== 'PRESENTE') return; // Pula ausentes, impedidos, suspeitos, abstenções

      // Contar voto baseado em qual voto o membro seguiu
      const followsVoteId = vote.followsVote?.id;
      if (followsVoteId) {
        votesByDecision[followsVoteId] = (votesByDecision[followsVoteId] || 0) + 1;
      }
    });

    // Processar votos pendentes (no estado, ainda não salvos)
    Object.entries(memberVotes).forEach(([memberId, choice]) => {
      // Pular voto do presidente
      if (memberId === presidentId) return;

      // Pular se já tem voto salvo no banco
      if (savedVotes.has(memberId)) return;

      // Apenas contar se é um voto válido (seguindo alguém)
      if (choice && choice !== 'AUSENTE' && choice !== 'IMPEDIDO' && choice !== 'ABSTENCAO' && choice !== 'SUSPEITO') {
        votesByDecision[choice] = (votesByDecision[choice] || 0) + 1;
      }
    });

    // Verificar se há empate
    const voteCounts = Object.values(votesByDecision);
    if (voteCounts.length < 2) return false;

    const maxVotes = Math.max(...voteCounts);
    const tiedVotes = voteCounts.filter(count => count === maxVotes);

    return tiedVotes.length > 1;
  })();

  // Verificar se o presidente já está na lista de disponíveis
  const presidentAlreadyVoting = session?.president &&
    availableMembers.some(m => m.member.id === session.president?.id);

  const showPresidentQualityVote = needsQualityVote &&
    session?.president &&
    !presidentAlreadyVoting &&
    !votedMemberIds.includes(session.president.id);

  // Recalcular empate em tempo real baseado em memberVotes
  const currentTieStatus = useMemo(() => {
    if (!session?.president) return false;

    // Agrupar votos atuais por decisão
    const votesByDecision: Record<string, number> = {};

    Object.entries(memberVotes).forEach(([memberId, choice]) => {
      // Não contar o voto do presidente
      if (memberId === session.president?.id) return;

      // Apenas contar votos válidos (seguindo relator/revisor)
      if (choice && choice !== 'AUSENTE' && choice !== 'IMPEDIDO' && choice !== 'ABSTENCAO' && choice !== 'SUSPEITO') {
        votesByDecision[choice] = (votesByDecision[choice] || 0) + 1;
      }
    });

    // Verificar se há empate
    const voteCounts = Object.values(votesByDecision);
    if (voteCounts.length < 2) return false;

    const maxVotes = Math.max(...voteCounts);
    const tiedVotes = voteCounts.filter(count => count === maxVotes);

    return tiedVotes.length > 1;
  }, [memberVotes, session?.president]);

  // Mostrar linha do presidente baseado no estado atual
  const shouldShowPresidentVote = currentTieStatus &&
    session?.president &&
    !presidentAlreadyVoting &&
    !votedMemberIds.includes(session.president.id);

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    {
      label: `Sessão n. ${session?.sessionNumber || 'Carregando...'}`,
      href: `/ccr/sessoes/${params.id}`,
    },
    {
      label: `Julgar n. ${voting?.resource.resourceNumber || 'Carregando...'}`,
      href: `/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`,
    },
    { label: `${voting?.label || 'Carregando...'}` },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Detalhes da Votação" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          {/* Card de Informações da Votação */}
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <CardTitle>Detalhes da Votação</CardTitle>
                <CardDescription>
                  Informações da votação em andamento.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Primeira linha: Número do Processo e Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <Skeleton className="h-4 w-40 mb-1.5" />
                    <Skeleton className="h-5 w-48" />
                  </div>
                  <div className="space-y-0">
                    <Skeleton className="h-4 w-20 mb-1.5" />
                    <Skeleton className="h-6 w-32" />
                  </div>
                </div>

                {/* Segunda linha: Número do Recurso e Tipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <Skeleton className="h-4 w-36 mb-1.5" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <div className="space-y-0">
                    <Skeleton className="h-4 w-16 mb-1.5" />
                    <Skeleton className="h-5 w-44" />
                  </div>
                </div>

                {/* Terceira linha: Preliminar e Conselheiros */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <Skeleton className="h-4 w-28 mb-1.5" />
                    <Skeleton className="h-5 w-52" />
                  </div>
                  <div className="space-y-0">
                    <Skeleton className="h-4 w-48 mb-1.5" />
                    <Skeleton className="h-5 w-28" />
                  </div>
                </div>

                {/* Votos do Relator/Revisores */}
                <div className="mt-6 pt-6 border-t">
                  <div className="space-y-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skeleton da Tabela de Votação */}
          <div className="border rounded-lg overflow-hidden bg-white">
            {/* Cabeçalho da Tabela */}
            <div className="grid grid-cols-[250px_1fr] bg-gray-100 border-b">
              <div className="p-4 border-r bg-gray-200"></div>
              <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(2, 1fr) repeat(4, 70px)' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 text-center border-r last:border-r-0">
                    <Skeleton className="h-4 w-24 mx-auto mb-1.5" />
                    <Skeleton className="h-3 w-16 mx-auto mb-1.5" />
                    <Skeleton className="h-6 w-20 mx-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas de Membros */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[250px_1fr] border-b last:border-b-0">
                <div className="p-4 border-r bg-gray-50">
                  <Skeleton className="h-4 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(2, 1fr) repeat(4, 70px)' }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <div key={j} className="p-4 flex items-center justify-center border-r last:border-r-0">
                      <Skeleton className="h-4 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Linha de Total */}
            <div className="grid grid-cols-[250px_1fr] border-t bg-gray-100">
              <div className="p-4 border-r bg-gray-200">
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="grid gap-px" style={{ gridTemplateColumns: 'repeat(2, 1fr) repeat(4, 70px)' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 flex items-center justify-center border-r last:border-r-0">
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Botão Concluir */}
          <div className="flex justify-end">
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </CCRPageWrapper>
    );
  }

  if (!voting || !session) {
    return (
      <CCRPageWrapper title="Detalhes da Votação" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Dados não encontrados</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  // Função para formatar decisão
  const formatVoteDecision = (vote: Vote) => {
    if (vote.voteKnowledgeType === 'NAO_CONHECIMENTO') {
      const hasPreliminar = vote.preliminaryDecision;
      const hasOficio = vote.officialDecision;

      if (hasPreliminar && hasOficio) {
        // Acatar com preliminar e ofício
        return `Acatar - ${vote.preliminaryDecision.identifier} - ${vote.officialDecision.identifier}`;
      } else if (hasPreliminar && !hasOficio) {
        // Afastar
        return `Afastar - ${vote.preliminaryDecision.identifier}`;
      } else if (!hasPreliminar && hasOficio) {
        // Apenas ofício
        return `Acatar - ${vote.officialDecision.identifier}`;
      } else {
        // Afastar sem preliminar específica
        return 'Afastar';
      }
    } else {
      // Mérito
      return vote.meritDecision ? vote.meritDecision.identifier : 'Voto de mérito';
    }
  };

  // Função para determinar a cor da badge baseada no voto
  const getVoteBadgeColor = (vote: Vote) => {
    if (vote.voteKnowledgeType === 'NAO_CONHECIMENTO') {
      const hasPreliminar = vote.preliminaryDecision;
      const hasOficio = vote.officialDecision;

      // Acatar → vermelho
      if ((hasPreliminar && hasOficio) || (!hasPreliminar && hasOficio)) {
        return 'bg-red-100 text-red-800';
      }
      // Afastar → verde
      return 'bg-green-100 text-green-800';
    } else {
      // Mérito
      if (vote.meritDecision) {
        const identifier = vote.meritDecision.identifier.toLowerCase();
        const type = vote.meritDecision.type.toLowerCase();

        // Provimento Parcial → amarelo
        if (identifier.includes('parcial') || type.includes('parcial')) {
          return 'bg-yellow-100 text-yellow-800';
        }
        // Não Provimento / Improvimento → vermelho
        if (identifier.includes('não') || identifier.includes('improv') || type.includes('não') || type.includes('improv')) {
          return 'bg-red-100 text-red-800';
        }
        // Provimento → verde
        return 'bg-green-100 text-green-800';
      }
      return 'bg-gray-100 text-gray-800';
    }
  };

  // Função para determinar a cor de fundo da célula quando marcada
  const getCellBackgroundColor = (vote: Vote) => {
    if (vote.voteKnowledgeType === 'NAO_CONHECIMENTO') {
      const hasPreliminar = vote.preliminaryDecision;
      const hasOficio = vote.officialDecision;

      // Acatar → vermelho
      if ((hasPreliminar && hasOficio) || (!hasPreliminar && hasOficio)) {
        return 'bg-red-100 hover:bg-red-200';
      }
      // Afastar → verde
      return 'bg-green-100 hover:bg-green-200';
    } else {
      // Mérito
      if (vote.meritDecision) {
        const identifier = vote.meritDecision.identifier.toLowerCase();
        const type = vote.meritDecision.type.toLowerCase();

        // Provimento Parcial → amarelo
        if (identifier.includes('parcial') || type.includes('parcial')) {
          return 'bg-yellow-100 hover:bg-yellow-200';
        }
        // Não Provimento / Improvimento → vermelho
        if (identifier.includes('não') || identifier.includes('improv') || type.includes('não') || type.includes('improv')) {
          return 'bg-red-100 hover:bg-red-200';
        }
        // Provimento → verde
        return 'bg-green-100 hover:bg-green-200';
      }
      return 'bg-gray-100 hover:bg-gray-200';
    }
  };

  return (
    <CCRPageWrapper title="Detalhes da Votação" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Informações da Votação */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Detalhes da Votação</CardTitle>
              <CardDescription>
                Informações da votação em andamento.
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
                      href={`/ccr/recursos/${voting.resource.id}`}
                      target="_blank"
                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {voting.resource.processNumber}
                    </Link>
                  </p>
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  {voting.status === 'PENDENTE' && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex items-center gap-1.5 w-fit"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Pendente
                    </Badge>
                  )}
                  {voting.status === 'CONCLUIDA' && voting.completedAt && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1.5 w-fit"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Concluído em{' '}
                      {format(new Date(voting.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Segunda linha: Número do Recurso e Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                  <p className="text-sm">{voting.resource.resourceNumber}</p>
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Tipo</label>
                  <p className="text-sm">{voting.votingType === 'MERITO' ? 'Conhecimento' : 'Não Conhecimento'}</p>
                </div>
              </div>

              {/* Terceira linha: Preliminar e Conselheiros Participantes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {voting.preliminaryDecision && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Preliminar</label>
                    <p className="text-sm">{voting.preliminaryDecision.identifier}</p>
                  </div>
                )}
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Conselheiros Participantes</label>
                  <p className="text-sm">{session.members.length} membros</p>
                </div>
              </div>
            </div>

            {/* Votos do Relator/Revisores */}
            {registeredVotes.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <div className="space-y-2">
                  {registeredVotes.map((vote) => (
                    <div key={vote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{vote.member.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-muted-foreground">
                              {vote.voteType === 'RELATOR' ? 'Relator' : 'Revisor'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              • {formatVoteDecision(vote)}
                            </p>
                          </div>
                        </div>
                      </div>
                      {vote.session && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          Sessão n. {vote.session.sessionNumber} - {format(new Date(vote.session.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sistema de Votação */}
        {voting.status === 'PENDENTE' && (availableMembers.length > 0 || shouldShowPresidentVote) && (
          <div className="space-y-6">
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Cabeçalho da Tabela */}
              <div className="grid grid-cols-[250px_1fr] bg-gray-100 border-b">
                <div className="p-4 border-r bg-gray-200"></div>
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(4, 70px)` }}>
                  {registeredVotes.map((vote) => (
                    <div key={vote.id} className="p-4 text-center border-r last:border-r-0">
                      <p className="font-medium text-sm">{vote.member.name}</p>
                      <p className="text-xs text-muted-foreground mb-1.5">{vote.member.role}</p>
                      <Badge
                        variant="secondary"
                        className={cn(getVoteBadgeColor(vote), "text-xs font-normal")}
                      >
                        {formatVoteDecision(vote)}
                      </Badge>
                    </div>
                  ))}
                  <div className="p-1 flex items-center justify-center border-r">
                    <p className="font-medium text-xs">Ausente</p>
                  </div>
                  <div className="p-1 flex items-center justify-center border-r">
                    <p className="font-medium text-xs">Impedido</p>
                  </div>
                  <div className="p-1 flex items-center justify-center border-r">
                    <p className="font-medium text-xs">Abstenção</p>
                  </div>
                  <div className="p-1 flex items-center justify-center">
                    <p className="font-medium text-xs">Suspeição</p>
                  </div>
                </div>
              </div>

              {/* Linhas dos Conselheiros */}
              {availableMembers.map((sessionMember) => (
                <div
                  key={sessionMember.member.id}
                  className="grid grid-cols-[250px_1fr] border-b last:border-b-0"
                >
                  <div className="p-4 border-r bg-gray-50">
                    <p className="text-sm font-medium">{sessionMember.member.name}</p>
                    <p className="text-xs text-muted-foreground">{sessionMember.member.role}</p>
                  </div>
                  <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(4, 70px)` }}>
                    {/* Célula clicável para cada voto registrado */}
                    {registeredVotes.map((vote) => (
                      <div
                        key={vote.id}
                        onClick={() => {
                          setMemberVotes((prev) => ({
                            ...prev,
                            [sessionMember.member.id]:
                              prev[sessionMember.member.id] === vote.id ? '' : vote.id,
                          }));
                        }}
                        className={cn(
                          "p-4 flex items-center justify-center border-r cursor-pointer transition-colors hover:bg-gray-100",
                          memberVotes[sessionMember.member.id] === vote.id && getCellBackgroundColor(vote)
                        )}
                      >
                        <div className="w-full h-full" />
                      </div>
                    ))}

                    {/* Células clicáveis para Ausente/Impedido/Abstenção/Suspeição */}
                    <div
                      onClick={() => {
                        setMemberVotes((prev) => ({
                          ...prev,
                          [sessionMember.member.id]:
                            prev[sessionMember.member.id] === 'AUSENTE' ? '' : 'AUSENTE',
                        }));
                      }}
                      className={cn(
                        "p-1 flex items-center justify-center border-r cursor-pointer transition-colors hover:bg-gray-100",
                        memberVotes[sessionMember.member.id] === 'AUSENTE' && "bg-gray-900 hover:bg-gray-800"
                      )}
                    >
                      <div className="w-full h-full" />
                    </div>
                    <div
                      onClick={() => {
                        setMemberVotes((prev) => ({
                          ...prev,
                          [sessionMember.member.id]:
                            prev[sessionMember.member.id] === 'IMPEDIDO' ? '' : 'IMPEDIDO',
                        }));
                      }}
                      className={cn(
                        "p-1 flex items-center justify-center border-r cursor-pointer transition-colors hover:bg-gray-100",
                        memberVotes[sessionMember.member.id] === 'IMPEDIDO' && "bg-gray-900 hover:bg-gray-800"
                      )}
                    >
                      <div className="w-full h-full" />
                    </div>
                    <div
                      onClick={() => {
                        setMemberVotes((prev) => ({
                          ...prev,
                          [sessionMember.member.id]:
                            prev[sessionMember.member.id] === 'ABSTENCAO' ? '' : 'ABSTENCAO',
                        }));
                      }}
                      className={cn(
                        "p-1 flex items-center justify-center border-r cursor-pointer transition-colors hover:bg-gray-100",
                        memberVotes[sessionMember.member.id] === 'ABSTENCAO' && "bg-gray-900 hover:bg-gray-800"
                      )}
                    >
                      <div className="w-full h-full" />
                    </div>
                    <div
                      onClick={() => {
                        setMemberVotes((prev) => ({
                          ...prev,
                          [sessionMember.member.id]:
                            prev[sessionMember.member.id] === 'SUSPEITO' ? '' : 'SUSPEITO',
                        }));
                      }}
                      className={cn(
                        "p-1 flex items-center justify-center cursor-pointer transition-colors hover:bg-gray-100",
                        memberVotes[sessionMember.member.id] === 'SUSPEITO' && "bg-gray-900 hover:bg-gray-800"
                      )}
                    >
                      <div className="w-full h-full" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Linha do Presidente - Voto de Qualidade */}
              {shouldShowPresidentVote && session?.president && (
                <div className="grid grid-cols-[250px_1fr] border-b last:border-b-0">
                  <div className="p-4 border-r bg-gray-50">
                    <p className="text-sm font-medium">{session.president.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.president.role} • Voto de Minerva
                    </p>
                  </div>
                  <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(4, 70px)` }}>
                    {/* Célula clicável para cada voto registrado */}
                    {registeredVotes.map((vote) => (
                      <div
                        key={vote.id}
                        onClick={() => {
                          setMemberVotes((prev) => ({
                            ...prev,
                            [session.president!.id]:
                              prev[session.president!.id] === vote.id ? '' : vote.id,
                          }));
                        }}
                        className={cn(
                          "p-4 flex items-center justify-center border-r cursor-pointer transition-colors hover:bg-gray-100",
                          memberVotes[session.president.id] === vote.id && getCellBackgroundColor(vote)
                        )}
                      >
                        <div className="w-full h-full" />
                      </div>
                    ))}

                    {/* Células desabilitadas para Ausente/Impedido/Abstenção/Suspeição */}
                    <div className="p-1 flex items-center justify-center border-r bg-gray-50 cursor-not-allowed opacity-50">
                      <div className="w-full h-full" />
                    </div>
                    <div className="p-1 flex items-center justify-center border-r bg-gray-50 cursor-not-allowed opacity-50">
                      <div className="w-full h-full" />
                    </div>
                    <div className="p-1 flex items-center justify-center border-r bg-gray-50 cursor-not-allowed opacity-50">
                      <div className="w-full h-full" />
                    </div>
                    <div className="p-1 flex items-center justify-center bg-gray-50 cursor-not-allowed opacity-50">
                      <div className="w-full h-full" />
                    </div>
                  </div>
                </div>
              )}

              {/* Linha de Total */}
              <div className="grid grid-cols-[250px_1fr] border-t bg-gray-100">
                <div className="p-4 border-r bg-gray-200">
                  <p className="text-sm font-semibold text-gray-700">Total</p>
                </div>
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(4, 70px)` }}>
                  {(() => {
                    // Calcular totais
                    const voteTotals = registeredVotes.map(vote => ({
                      id: vote.id,
                      total: Object.values(memberVotes).filter(choice => choice === vote.id).length
                    }));

                    // Encontrar maior total
                    const maxTotal = Math.max(...voteTotals.map(v => v.total), 0);
                    const winnersCount = voteTotals.filter(v => v.total === maxTotal && v.total > 0).length;
                    const hasWinner = winnersCount === 1 && maxTotal > 0;

                    return voteTotals.map((voteData) => {
                      const isWinner = hasWinner && voteData.total === maxTotal;
                      return (
                        <div key={voteData.id} className="p-4 flex items-center justify-center gap-2 border-r">
                          <p className="text-lg font-bold text-gray-900">{voteData.total}</p>
                          {isWinner && (
                            <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-1.5 py-0">
                              Vencedor
                            </Badge>
                          )}
                        </div>
                      );
                    });
                  })()}
                  {['AUSENTE', 'IMPEDIDO', 'ABSTENCAO', 'SUSPEITO'].map((status, index) => {
                    const total = Object.values(memberVotes).filter(choice => choice === status).length;
                    return (
                      <div key={status} className={cn("p-1 flex items-center justify-center", index < 3 && "border-r")}>
                        <p className="text-lg font-bold text-gray-900">{total}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={async () => {
                  // Salvar votos pendentes SEM mostrar toast e SEM recarregar
                  const saved = await handleSaveVotes('VOTANTE', { showToast: false, refetch: false });
                  if (!saved) return;

                  // Aguardar um pouco para garantir que os dados foram salvos
                  await new Promise(resolve => setTimeout(resolve, 500));

                  // Buscar dados atualizados para verificar resultado
                  const votingResponse = await fetch(
                    `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votings/${params.votingId}`
                  );

                  let resultMessage = '';
                  if (votingResponse.ok) {
                    const updatedVoting = await votingResponse.json();

                    // Agrupar votos por decisão (followsVote)
                    const votesByDecision: Record<string, { count: number, member: any }> = {};

                    updatedVoting.votes.forEach((vote: any) => {
                      if (vote.participationStatus !== 'PRESENTE') return;

                      // Agrupar pelo voto seguido ou pelo próprio voto (relator/revisor)
                      const key = vote.followsVote?.id || vote.id;

                      if (!votesByDecision[key]) {
                        votesByDecision[key] = {
                          count: 0,
                          member: vote.followsVote?.member || vote.member
                        };
                      }
                      votesByDecision[key].count++;
                    });

                    // Verificar empate
                    const results = Object.values(votesByDecision);
                    const maxVotes = results.length > 0 ? Math.max(...results.map(r => r.count)) : 0;
                    const winnersCount = results.filter(r => r.count === maxVotes).length;
                    const hasEmpate = winnersCount > 1;

                    // Verificar se presidente votou
                    const presidenteVotou = updatedVoting.votes.some((v: any) =>
                      v.member.id === session?.president?.id
                    );

                    // Calcular resultado apenas se:
                    // 1. Não há empate, OU
                    // 2. Há empate e presidente já votou
                    const shouldShowResult = !hasEmpate || presidenteVotou;

                    if (shouldShowResult && results.length > 0) {
                      const winner = results.find(r => r.count === maxVotes);

                      if (winner) {
                        const article = winner.member.gender === 'FEMININO' ? 'da' : 'do';
                        const voteWord = winner.count === 1 ? 'voto' : 'votos';
                        resultMessage = ` Resultado: ${winner.count} ${voteWord} a favor da posição ${article} ${winner.member.name}.`;
                      }
                    }
                  }

                  // Mostrar único toast com resultado (se houver)
                  if (resultMessage) {
                    toast.success(`Votação concluída!${resultMessage}`, { duration: 5000 });
                  } else {
                    toast.success('Votação concluída com sucesso!');
                  }

                  // Redirecionar para página de julgar processo
                  await handleCompleteVoting();
                }}
                disabled={saving}
                className="cursor-pointer"
              >
                Concluir Votação
              </Button>
            </div>
          </div>
        )}

        {/* Card de Resultado (se já concluída) */}
        {voting.status === 'CONCLUIDA' && (
          <Card>
            <CardHeader>
              <CardTitle>Resultado da Votação</CardTitle>
              <CardDescription>
                Votação concluída em{' '}
                {voting.completedAt &&
                  format(new Date(voting.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                .
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {voting.winningMember && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Voto Vencedor</label>
                    <p className="text-sm">{voting.winningMember.name}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Total</label>
                    <p className="text-sm">{voting.totalVotes}</p>
                  </div>
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">A Favor</label>
                    <p className="text-sm">{voting.votesInFavor}</p>
                  </div>
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Contra</label>
                    <p className="text-sm">{voting.votesAgainst}</p>
                  </div>
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Abstenções</label>
                    <p className="text-sm">{voting.abstentions}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CCRPageWrapper>
  );
}
