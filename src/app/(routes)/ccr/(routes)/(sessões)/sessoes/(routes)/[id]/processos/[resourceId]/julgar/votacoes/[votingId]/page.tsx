'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
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
import { CheckCircle2, Clock, Calendar, User, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const authorityTypeLabels: Record<string, string> = {
  AUTOR_PROCEDIMENTO_FISCAL: 'Autor do Procedimento Fiscal',
  JULGADOR_SINGULAR: 'Julgador Singular',
  COORDENADOR: 'Coordenador',
  OUTROS: 'Outros',
};

interface Member {
  id: string;
  name: string;
  role: string;
  gender?: 'MASCULINO' | 'FEMININO';
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

interface ImpedidMember {
  memberId: string;
  authorityType: string;
  authorityName: string;
}

interface VotingData {
  id: string;
  votingType: string;
  label: string;
  status: string;
  completedAt: Date | null;
  totalVotes: number;
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
  impedidMembers?: ImpedidMember[];
}

interface SessionMember {
  id: string;
  member: Member;
}

interface SessionData {
  id: string;
  sessionNumber: string;
  date: Date;
  status: string;
  members: SessionMember[];
  president: Member | null;
  specificPresident?: Member | null;
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
  const [absentMemberIds, setAbsentMemberIds] = useState<string[]>([]);
  const [memberVotes, setMemberVotes] = useState<Record<string, string>>({});
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const prevShowPresidentVote = useRef<boolean>(false);
  const [isEditingCompletedVoting, setIsEditingCompletedVoting] = useState(false);

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

  // Marcar automaticamente membros impedidos (autoridades)
  useEffect(() => {
    if (voting?.impedidMembers && voting.impedidMembers.length > 0) {
      const impedidVotes: Record<string, string> = {};

      voting.impedidMembers.forEach(impedid => {
        impedidVotes[impedid.memberId] = 'IMPEDIDO';
      });

      setMemberVotes(prev => ({ ...prev, ...impedidVotes }));
    }
  }, [voting?.impedidMembers]);

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

        // Buscar presidente substituto do SessionResource
        const resourceResponse = await fetch(`/api/ccr/session-resources/${params.resourceId}`);
        if (resourceResponse.ok) {
          const resourceData = await resourceResponse.json();
          sessionData.specificPresident = resourceData.specificPresident || null;
        }

        setSession(sessionData);
      }

      // Buscar ausências cadastradas
      const absencesResponse = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/ausencias`
      );

      if (absencesResponse.ok) {
        const absencesData = await absencesResponse.json();
        const absentIds = absencesData.sessionResource?.absences?.map((a: any) => a.memberId) || [];
        setAbsentMemberIds(absentIds);
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
      if (shouldShowPresidentVote && effectivePresident) {
        membersToProcess.push({
          id: 'president',
          member: effectivePresident
        } as any);
      }

      // Se o presidente NÃO deve votar mais, mas tem voto no banco, deletar
      if (!shouldShowPresidentVote && effectivePresident) {
        const presidentVote = voting?.votes.find(v => v.member.id === effectivePresident.id);
        if (presidentVote) {
          const deleteResponse = await fetch(
            `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votes/${presidentVote.id}`,
            { method: 'DELETE' }
          );

          if (!deleteResponse.ok) {
            toast.error(`Erro ao remover voto do presidente`);
            return false;
          }
        }
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
        const finalVoteType = (memberId === effectivePresidentId) ? 'PRESIDENTE' : voteType;

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

      // Resetar resultado se existir
      await fetch(
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

  // Separar votos
  const relatorVotes = voting?.votes.filter((v) => v.voteType === 'RELATOR') || [];
  const revisorVotes = voting?.votes.filter((v) => v.voteType === 'REVISOR') || [];
  const registeredVotes = [...relatorVotes, ...revisorVotes];

  // IDs dos membros que votaram como RELATOR ou REVISOR (esses não aparecem na tabela)
  const relatorRevisorMemberIds = [...relatorVotes, ...revisorVotes].map((v) => v.member.id);

  // IDs de TODOS que votaram (para verificar presidente)
  const votedMemberIds = voting?.votes.map((v) => v.member.id) || [];

  // Verificar se é uma votação concluída que foi julgada em outra sessão ou se a sessão está concluída
  const isCompletedFromOtherSession =
    voting?.status === 'CONCLUIDA' &&
    voting?.judgedInSession?.id &&
    voting.judgedInSession.id !== params.id;

  const isSessionCompleted = session?.status === 'CONCLUIDA';
  const isReadOnly = isCompletedFromOtherSession || isSessionCompleted;

  // Determinar qual presidente usar (substituto se houver, senão o normal)
  const effectivePresident = session?.specificPresident || session?.president;
  const effectivePresidentId = effectivePresident?.id;

  // Membros disponíveis
  const allMembers = (() => {
    // Se é votação concluída de outra sessão, mostrar apenas membros que TEM voto registrado
    if (isCompletedFromOtherSession) {
      const membersWithVotes = voting?.votes
        .filter(v => {
          // Excluir votos de relator e revisor
          if (v.voteType === 'RELATOR' || v.voteType === 'REVISOR') return false;

          // Excluir presidente efetivo (ele será mostrado separadamente no voto de minerva)
          if (effectivePresidentId && v.member.id === effectivePresidentId) return false;

          return true;
        })
        .map(v => ({
          id: v.member.id,
          member: v.member
        })) || [];
      return membersWithVotes;
    }

    // Caso contrário, TODOS exceto RELATOR, REVISOR, AUSENTES e PRESIDENTE EFETIVO
    return session?.members.filter(
      (m) => !relatorRevisorMemberIds.includes(m.member.id) &&
             !absentMemberIds.includes(m.member.id) &&
             m.member.id !== effectivePresidentId
    ) || [];
  })();

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
  const presidentAlreadyVoting = effectivePresident &&
    availableMembers.some(m => m.member.id === effectivePresidentId);

  const showPresidentQualityVote = needsQualityVote &&
    effectivePresident &&
    !presidentAlreadyVoting &&
    !votedMemberIds.includes(effectivePresidentId!);

  // Detectar empate inicial (apenas votos do banco, sem considerar interações)
  const initialTieStatus = useMemo(() => {
    if (!effectivePresident || !voting) return false;

    const presidentId = effectivePresidentId!;
    const allVotes = voting.votes || [];

    // Verificar se todos os conselheiros (exceto presidente) votaram
    const councilMembers = availableMembers.filter(m => m.member.id !== presidentId);
    const councilMembersWithVotes = councilMembers.filter(cm =>
      allVotes.some(v => v.member.id === cm.member.id)
    );

    // Se nem todos os conselheiros votaram, não há empate inicial
    if (councilMembersWithVotes.length !== councilMembers.length) return false;

    // Agrupar votos por decisão
    const votesByDecision: Record<string, number> = {};

    allVotes.forEach(vote => {
      // Pular voto do presidente
      if (vote.member.id === presidentId) return;

      // Pular votos que não são válidos para contagem
      if (vote.participationStatus !== 'PRESENTE') return;

      // Contar voto baseado em qual voto o membro seguiu
      const followsVoteId = vote.followsVote?.id;
      if (followsVoteId) {
        votesByDecision[followsVoteId] = (votesByDecision[followsVoteId] || 0) + 1;
      }
    });

    // Verificar se há empate
    const voteCounts = Object.values(votesByDecision);
    if (voteCounts.length < 2) return false;

    const maxVotes = Math.max(...voteCounts);
    const tiedVotes = voteCounts.filter(count => count === maxVotes);

    return tiedVotes.length > 1;
  }, [effectivePresident, voting, availableMembers]);

  // Detectar empate dinâmico (considera apenas memberVotes após carregamento)
  const currentTieStatus = useMemo(() => {
    if (!effectivePresident) return false;

    const presidentId = effectivePresidentId!;

    // Verificar se TODOS os conselheiros têm voto em memberVotes
    const allCouncilorsHaveVote = availableMembers.every(sessionMember => {
      const memberId = sessionMember.member.id;
      if (memberId === presidentId) return true; // Pular presidente

      // Tem voto se está no estado local E não é string vazia
      return memberVotes[memberId] !== undefined && memberVotes[memberId] !== '';
    });

    // Se nem todos votaram, não há empate para considerar
    if (!allCouncilorsHaveVote) return false;

    // Agrupar votos atuais por decisão (apenas de memberVotes)
    const votesByDecision: Record<string, number> = {};

    // Processar cada membro disponível (conselheiros, não presidente)
    availableMembers.forEach(sessionMember => {
      const memberId = sessionMember.member.id;

      // Pular presidente
      if (memberId === presidentId) return;

      const voteChoice = memberVotes[memberId];

      // Contar apenas votos válidos (seguindo relator/revisor)
      if (voteChoice && voteChoice !== 'AUSENTE' && voteChoice !== 'IMPEDIDO' && voteChoice !== 'ABSTENCAO' && voteChoice !== 'SUSPEITO') {
        votesByDecision[voteChoice] = (votesByDecision[voteChoice] || 0) + 1;
      }
    });

    // Verificar se há empate
    const voteCounts = Object.values(votesByDecision);
    if (voteCounts.length < 2) return false;

    const maxVotes = Math.max(...voteCounts);
    const tiedVotes = voteCounts.filter(count => count === maxVotes);

    return tiedVotes.length > 1;
  }, [memberVotes, effectivePresident, availableMembers]);

  // Verificar se todos os conselheiros votaram (considera apenas memberVotes)
  const allCouncilorsVoted = useMemo(() => {
    if (!effectivePresident) return false;

    const presidentId = effectivePresidentId!;

    return availableMembers.every(sessionMember => {
      const memberId = sessionMember.member.id;
      if (memberId === presidentId) return true; // Pular presidente

      // Tem voto se está no estado local E não é string vazia
      // (considera AUSENTE, IMPEDIDO, ABSTENCAO, SUSPEITO e votos válidos)
      return memberVotes[memberId] !== undefined && memberVotes[memberId] !== '';
    });
  }, [effectivePresident, availableMembers, memberVotes]);

  // Mostrar linha do presidente baseado no estado atual
  // CARREGAMENTO INICIAL (sem interação):
  //   - Mostrar se presidente tem voto no banco OU (todos votaram E há empate)
  // APÓS INTERAÇÃO:
  //   - Mostrar apenas se há empate atual entre conselheiros
  // IMPORTANTE: Só mostra se TODOS os conselheiros votaram
  const shouldShowPresidentVote = useMemo(() => {
    if (!effectivePresident || presidentAlreadyVoting) return false;

    // SEMPRE requer que todos os conselheiros tenham votado
    if (!allCouncilorsVoted) return false;

    if (!hasUserInteracted) {
      // Carregamento inicial: mostrar se presidente votou OU há empate inicial
      const presidentHasVoteInDB = votedMemberIds.includes(effectivePresidentId!);
      return presidentHasVoteInDB || initialTieStatus;
    } else {
      // Após interação: baseado apenas no empate atual
      return currentTieStatus;
    }
  }, [effectivePresident, presidentAlreadyVoting, allCouncilorsVoted, hasUserInteracted, votedMemberIds, initialTieStatus, currentTieStatus]);

  // Limpar voto do presidente quando linha DESAPARECE (desempate)
  useEffect(() => {
    if (hasUserInteracted && effectivePresident) {
      const presidentId = effectivePresidentId!;

      // Detectar mudança de true para false (linha desapareceu por desempate)
      if (!shouldShowPresidentVote && prevShowPresidentVote.current) {
        // SEMPRE limpar o voto do presidente do estado local ao desempatar
        // (independente de ter voto no banco ou não)
        if (memberVotes[presidentId]) {
          setMemberVotes(prev => {
            const newVotes = { ...prev };
            delete newVotes[presidentId];
            return newVotes;
          });
        }
      }

      // Atualizar valor anterior
      prevShowPresidentVote.current = shouldShowPresidentVote;
    }
  }, [shouldShowPresidentVote, hasUserInteracted, effectivePresident, memberVotes]);

  // Calcular se há vencedor e quem é
  const winnerInfo = useMemo(() => {
    if (!allCouncilorsVoted || !voting) return null;

    const presidentId = effectivePresidentId;
    const validMemberIds = new Set(availableMembers.map(m => m.member.id));
    if (shouldShowPresidentVote && presidentId) {
      validMemberIds.add(presidentId);
    }

    // Calcular totais
    const voteTotals = registeredVotes.map(vote => ({
      voteId: vote.id,
      voteMember: vote.member,
      total: Object.entries(memberVotes)
        .filter(([memberId, choice]) => validMemberIds.has(memberId) && choice === vote.id)
        .length
    }));

    const maxTotal = Math.max(...voteTotals.map(v => v.total), 0);
    const winners = voteTotals.filter(v => v.total === maxTotal && v.total > 0);

    // Há vencedor se houver exatamente um com o máximo de votos
    if (winners.length === 1 && maxTotal > 0) {
      return {
        member: winners[0].voteMember,
        votes: winners[0].total
      };
    }

    return null;
  }, [allCouncilorsVoted, voting, effectivePresident, availableMembers, shouldShowPresidentVote, memberVotes, registeredVotes]);

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
                <label className="block text-sm font-medium mb-2">Votos</label>
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

            {/* Impedimentos (apenas autoridades) */}
            {(() => {
              // Filtrar apenas impedimentos que têm authorityType (são autoridades)
              const authorityImpediments = voting?.impedidMembers?.filter(imp =>
                imp.authorityType && availableMembers.some(m => m.member.id === imp.memberId)
              ) || [];

              if (authorityImpediments.length === 0) return null;

              return (
                <div className="mt-6 pt-6 border-t">
                  <label className="block text-sm font-medium mb-2">Impedimentos</label>
                  <div className="space-y-2">
                    {authorityImpediments.map((impediment) => {
                      const member = availableMembers.find(m => m.member.id === impediment.memberId);
                      if (!member) return null;
                      return (
                        <div key={impediment.memberId} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-center gap-3">
                            <AlertCircle className="h-4 w-4 text-red-600" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{member.member.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {member.member.role}
                              </p>
                            </div>
                          </div>
                          <p className="text-xs text-red-600 font-medium">
                            {authorityTypeLabels[impediment.authorityType] || impediment.authorityType}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Sistema de Votação */}
        {(availableMembers.length > 0 || shouldShowPresidentVote) && (
          <div className="space-y-6">
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              {/* Cabeçalho da Tabela */}
              <div className="grid grid-cols-[250px_1fr] bg-gray-100 border-b">
                <div className="p-4 border-r bg-gray-200"></div>
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(3, 70px)` }}>
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
              {availableMembers.map((sessionMember) => {
                const impediment = voting?.impedidMembers?.find(imp => imp.memberId === sessionMember.member.id);
                const isImpedido = !!impediment;

                return (
                  <div
                    key={sessionMember.member.id}
                    className="grid grid-cols-[250px_1fr] border-b last:border-b-0"
                  >
                    <div className="p-4 border-r bg-gray-50">
                      <p className="text-sm font-medium">{sessionMember.member.name}</p>
                      <p className="text-xs text-muted-foreground">{sessionMember.member.role}</p>
                    </div>
                  <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(3, 70px)` }}>
                    {/* Célula clicável para cada voto registrado */}
                    {registeredVotes.map((vote) => (
                      <div
                        key={vote.id}
                        onClick={() => {
                          if (isReadOnly || isImpedido) return;
                          setHasUserInteracted(true);
                          setMemberVotes((prev) => ({
                            ...prev,
                            [sessionMember.member.id]:
                              prev[sessionMember.member.id] === vote.id ? '' : vote.id,
                          }));
                        }}
                        className={cn(
                          "p-4 flex items-center justify-center border-r transition-colors",
                          isReadOnly || isImpedido
                            ? ""
                            : "cursor-pointer hover:bg-gray-100",
                          memberVotes[sessionMember.member.id] === vote.id && getCellBackgroundColor(vote)
                        )}
                      >
                        <div className="w-full h-full" />
                      </div>
                    ))}

                    {/* Células clicáveis para Impedido/Abstenção/Suspeição */}
                    <div
                      onClick={() => {
                        if (isReadOnly || isImpedido) return;
                        setHasUserInteracted(true);
                        setMemberVotes((prev) => ({
                          ...prev,
                          [sessionMember.member.id]:
                            prev[sessionMember.member.id] === 'IMPEDIDO' ? '' : 'IMPEDIDO',
                        }));
                      }}
                      className={cn(
                        "p-1 flex items-center justify-center border-r transition-colors",
                        isReadOnly || isImpedido
                          ? ""
                          : "cursor-pointer hover:bg-gray-100",
                        memberVotes[sessionMember.member.id] === 'IMPEDIDO' && "bg-gray-900 hover:bg-gray-800"
                      )}
                    >
                      <div className="w-full h-full" />
                    </div>
                    <div
                      onClick={() => {
                        if (isReadOnly || isImpedido) return;
                        setHasUserInteracted(true);
                        setMemberVotes((prev) => ({
                          ...prev,
                          [sessionMember.member.id]:
                            prev[sessionMember.member.id] === 'ABSTENCAO' ? '' : 'ABSTENCAO',
                        }));
                      }}
                      className={cn(
                        "p-1 flex items-center justify-center border-r transition-colors",
                        isReadOnly || isImpedido
                          ? ""
                          : "cursor-pointer hover:bg-gray-100",
                        memberVotes[sessionMember.member.id] === 'ABSTENCAO' && "bg-gray-900 hover:bg-gray-800"
                      )}
                    >
                      <div className="w-full h-full" />
                    </div>
                    <div
                      onClick={() => {
                        if (isReadOnly || isImpedido) return;
                        setHasUserInteracted(true);
                        setMemberVotes((prev) => ({
                          ...prev,
                          [sessionMember.member.id]:
                            prev[sessionMember.member.id] === 'SUSPEITO' ? '' : 'SUSPEITO',
                        }));
                      }}
                      className={cn(
                        "p-1 flex items-center justify-center transition-colors",
                        isReadOnly || isImpedido
                          ? ""
                          : "cursor-pointer hover:bg-gray-100",
                        memberVotes[sessionMember.member.id] === 'SUSPEITO' && "bg-gray-900 hover:bg-gray-800"
                      )}
                    >
                      <div className="w-full h-full" />
                    </div>
                  </div>
                </div>
                );
              })}

              {/* Linha do Presidente - Voto de Qualidade */}
              {shouldShowPresidentVote && effectivePresident && (
                <>
                  {/* Linha de separação antes do presidente */}
                  <div className="grid grid-cols-[250px_1fr] bg-gray-100 border-y">
                    <div className="p-2 border-r bg-gray-200">
                      <p className="text-xs font-semibold text-gray-700">Voto de Minerva</p>
                    </div>
                    <div className="p-2"></div>
                  </div>

                  {/* Linha do presidente */}
                  <div className="grid grid-cols-[250px_1fr] border-b last:border-b-0">
                    <div className="p-4 border-r bg-gray-50">
                      <p className="text-sm font-medium">{effectivePresident.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {effectivePresident.role}
                        {session?.specificPresident && (
                          <span className="ml-1 text-xs text-blue-600 font-medium">(Substituto)</span>
                        )}
                      </p>
                    </div>
                    <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(3, 70px)` }}>
                      {/* Célula clicável para cada voto registrado */}
                      {registeredVotes.map((vote) => (
                        <div
                          key={vote.id}
                          onClick={() => {
                            if (isReadOnly) return;
                            setHasUserInteracted(true);
                            setMemberVotes((prev) => ({
                              ...prev,
                              [effectivePresident!.id]:
                                prev[effectivePresident!.id] === vote.id ? '' : vote.id,
                            }));
                          }}
                          className={cn(
                            "p-4 flex items-center justify-center border-r transition-colors",
                            isReadOnly
                              ? ""
                              : "cursor-pointer hover:bg-gray-100",
                            memberVotes[effectivePresident.id] === vote.id && getCellBackgroundColor(vote)
                          )}
                        >
                          <div className="w-full h-full" />
                        </div>
                      ))}

                      {/* Células desabilitadas para Impedido/Abstenção/Suspeição */}
                      <div className="p-1 flex items-center justify-center border-r bg-gray-50">
                        <div className="w-full h-full" />
                      </div>
                      <div className="p-1 flex items-center justify-center border-r bg-gray-50">
                        <div className="w-full h-full" />
                      </div>
                      <div className="p-1 flex items-center justify-center bg-gray-50">
                        <div className="w-full h-full" />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Linha de Total */}
              <div className="grid grid-cols-[250px_1fr] border-t bg-gray-100">
                <div className="p-4 border-r bg-gray-200">
                  <p className="text-sm font-semibold text-gray-700">Total</p>
                </div>
                <div className="grid gap-px" style={{ gridTemplateColumns: `repeat(${registeredVotes.length}, 1fr) repeat(3, 70px)` }}>
                  {(() => {
                    // IDs dos membros que devem ser contados:
                    // 1. Todos em availableMembers
                    // 2. Presidente, se shouldShowPresidentVote for verdadeiro
                    const validMemberIds = new Set(availableMembers.map(m => m.member.id));
                    if (shouldShowPresidentVote && effectivePresident) {
                      validMemberIds.add(effectivePresident.id);
                    }

                    // Calcular totais apenas para membros válidos
                    const voteTotals = registeredVotes.map(vote => ({
                      id: vote.id,
                      total: Object.entries(memberVotes)
                        .filter(([memberId, choice]) => validMemberIds.has(memberId) && choice === vote.id)
                        .length
                    }));

                    // Verificar se todos os conselheiros votaram
                    const allCouncilorsVoted = availableMembers.every(member =>
                      memberVotes[member.member.id] !== undefined && memberVotes[member.member.id] !== ''
                    );

                    // Encontrar maior total
                    const maxTotal = Math.max(...voteTotals.map(v => v.total), 0);
                    const winnersCount = voteTotals.filter(v => v.total === maxTotal && v.total > 0).length;
                    const hasWinner = winnersCount === 1 && maxTotal > 0 && allCouncilorsVoted;

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
                  {['IMPEDIDO', 'ABSTENCAO', 'SUSPEITO'].map((status, index) => {
                    // Contar apenas para membros válidos
                    const validMemberIds = new Set(availableMembers.map(m => m.member.id));
                    if (shouldShowPresidentVote && effectivePresident) {
                      validMemberIds.add(effectivePresident.id);
                    }
                    const total = Object.entries(memberVotes)
                      .filter(([memberId, choice]) => validMemberIds.has(memberId) && choice === status)
                      .length;
                    return (
                      <div key={status} className={cn("p-1 flex items-center justify-center", index < 2 && "border-r")}>
                        <p className="text-lg font-bold text-gray-900">{total}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Botões de ação - Ocultar se for votação de outra sessão ou se a sessão estiver concluída */}
            {!isCompletedFromOtherSession && session?.status !== 'CONCLUIDA' && (
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`);
                  }}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                onClick={() => {
                  // Se está editando votação concluída
                  if (voting.status === 'CONCLUIDA') {
                    // Verificar se há vencedor
                    if (!winnerInfo) {
                      toast.error('Não é possível salvar a votação sem um vencedor definido. Todos os conselheiros devem votar e deve haver uma decisão vencedora.', {
                        duration: 5000
                      });
                      return;
                    }

                    // Mostrar sonner de confirmação para atualizar votação
                    const article = winnerInfo.member.gender === 'FEMININO' ? 'da' : 'do';
                    const voteWord = winnerInfo.votes === 1 ? 'voto' : 'votos';

                    toast.warning(`Atualizar votação concluída? Novo vencedor: ${winnerInfo.votes} ${voteWord} a favor ${article} ${winnerInfo.member.name}`, {
                      duration: 10000,
                      className: 'min-w-[450px]',
                      action: {
                        label: 'Confirmar Atualização',
                        onClick: async () => {
                          try {
                            setSaving(true);

                            // Salvar votos
                            const saved = await handleSaveVotes('VOTANTE', { showToast: false, refetch: false });
                            if (!saved) {
                              toast.error('Erro ao salvar votos');
                              setSaving(false);
                              return;
                            }

                            // Atualizar votação concluída
                            const response = await fetch(
                              `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votings/${params.votingId}/complete`,
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  winningMemberId: winnerInfo.member.id,
                                }),
                              }
                            );

                            if (!response.ok) {
                              const error = await response.json();
                              toast.error(error.error || 'Erro ao atualizar votação');
                              setSaving(false);
                              return;
                            }

                            toast.success('Votação atualizada com sucesso!');

                            // Redirecionar para página de julgar processo
                            router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`);
                          } catch (error) {
                            console.error('Error updating voting:', error);
                            toast.error('Erro ao atualizar votação');
                            setSaving(false);
                          }
                        },
                      },
                      cancel: {
                        label: 'Cancelar',
                        onClick: () => {},
                      },
                    });
                  } else {
                    // Votação pendente - concluir pela primeira vez
                    // Verificar se há vencedor
                    if (!winnerInfo) {
                      toast.error('Não é possível concluir a votação sem um vencedor definido. Todos os conselheiros devem votar e deve haver uma decisão vencedora.', {
                        duration: 5000
                      });
                      return;
                    }

                    // Mostrar sonner de confirmação com o vencedor
                    const article = winnerInfo.member.gender === 'FEMININO' ? 'da' : 'do';
                    const voteWord = winnerInfo.votes === 1 ? 'voto' : 'votos';

                    toast.success(`Vencedor: ${winnerInfo.votes} ${voteWord} a favor da posição ${article} ${winnerInfo.member.name}`, {
                      duration: 10000,
                      className: 'min-w-[450px]',
                      action: {
                        label: 'Confirmar e Concluir',
                        onClick: async () => {
                          try {
                            setSaving(true);

                            // Salvar votos pendentes primeiro
                            const saved = await handleSaveVotes('VOTANTE', { showToast: false, refetch: false });
                            if (!saved) {
                              toast.error('Erro ao salvar votos');
                              setSaving(false);
                              return;
                            }

                            // Marcar votação como concluída
                            const response = await fetch(
                              `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/votings/${params.votingId}/complete`,
                              {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  winningMemberId: winnerInfo.member.id,
                                }),
                              }
                            );

                            if (!response.ok) {
                              const error = await response.json();
                              toast.error(error.error || 'Erro ao concluir votação');
                              setSaving(false);
                              return;
                            }

                            toast.success('Votação concluída com sucesso!');

                            // Redirecionar para página de julgar processo
                            router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`);
                          } catch (error) {
                            console.error('Error completing voting:', error);
                            toast.error('Erro ao concluir votação');
                            setSaving(false);
                          }
                        },
                      },
                      cancel: {
                        label: 'Cancelar',
                        onClick: () => {},
                      },
                    });
                  }
                }}
                disabled={saving}
                className="cursor-pointer"
              >
                {voting.status === 'CONCLUIDA' ? 'Salvar Alterações' : 'Concluir Votação'}
              </Button>
              </div>
            )}
          </div>
        )}

      </div>
    </CCRPageWrapper>
  );
}
