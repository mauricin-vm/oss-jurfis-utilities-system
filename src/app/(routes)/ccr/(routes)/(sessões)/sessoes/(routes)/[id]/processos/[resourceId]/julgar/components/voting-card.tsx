'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { Users, CheckCircle2, Clock, Eye, X, Calendar, Loader2, GripVertical } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface VotingCardProps {
  voting: {
    id: string;
    votingType: string;
    label: string;
    status: string;
    completedAt?: Date | null;
    resource?: {
      processNumber: string;
      processName: string | null;
      resourceNumber: string;
    };
    judgedInSession?: {
      id: string;
      sessionNumber: string;
      date: Date;
    } | null;
    winningMember?: {
      id: string;
      name: string;
      role: string;
    } | null;
    votes: Array<{
      id: string;
      member: {
        id: string;
        name: string;
        role: string;
      };
      voteType: string;
      voteKnowledgeType: string;
      participationStatus: string;
      followsVote?: {
        id: string;
      } | null;
      session?: {
        id: string;
        sessionNumber: string;
        date: Date;
      };
      preliminaryDecision?: {
        id: string;
        identifier: string;
      } | null;
      meritDecision?: {
        id: string;
        identifier: string;
      } | null;
      officialDecision?: {
        id: string;
        identifier: string;
      } | null;
    }>;
    preliminaryDecision?: {
      id: string;
      identifier: string;
    } | null;
  };
  sessionId: string;
  resourceId: string;
  index: number;
  totalMembers: number;
  totalDistributedMembers: number;
  totalAbsentMembers: number;
  isSessionCompleted?: boolean;
  onDelete?: () => void;
  onVotingChange?: () => Promise<void>;
}

export function VotingCard({ voting, sessionId, resourceId, index, totalMembers, totalDistributedMembers, totalAbsentMembers, isSessionCompleted = false, onDelete, onVotingChange }: VotingCardProps) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const [hoveredVoteId, setHoveredVoteId] = useState<string | null>(null);
  const [deletingVoteId, setDeletingVoteId] = useState<string | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: voting.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    toast.warning('Tem certeza que deseja excluir esta votação?', {
      duration: 10000,
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setActionLoading(true);
            const response = await fetch(
              `/api/ccr/sessions/${sessionId}/processos/${resourceId}/votings/${voting.id}`,
              {
                method: 'DELETE',
              }
            );

            if (response.ok) {
              toast.success('Votação excluída com sucesso');
              onDelete();
              if (onVotingChange) await onVotingChange(); // Resetar resultado se existir
            } else {
              const error = await response.json();
              toast.error(error.error || 'Erro ao excluir votação');
            }
          } catch (error) {
            console.error('Error deleting voting:', error);
            toast.error('Erro ao excluir votação');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    });
  };

  const handleDeclareUnanimous = async () => {
    toast.warning('Declarar esta votação como unânime? Todos os membros seguirão este voto.', {
      duration: 10000,
      className: 'min-w-[400px]',
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setActionLoading(true);
            const response = await fetch(
              `/api/ccr/sessions/${sessionId}/processos/${resourceId}/votings/${voting.id}/unanimous`,
              {
                method: 'POST',
              }
            );

            if (response.ok) {
              toast.success('Votação declarada como unânime com sucesso');
              if (onDelete) onDelete(); // Recarregar os dados
              if (onVotingChange) await onVotingChange(); // Resetar resultado se existir
            } else {
              const error = await response.json();
              toast.error(error.error || 'Erro ao declarar votação como unânime');
            }
          } catch (error) {
            console.error('Error declaring unanimous:', error);
            toast.error('Erro ao declarar votação como unânime');
          } finally {
            setActionLoading(false);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    });
  };

  const handleDeleteVote = async (voteId: string, voteType: string, memberName: string) => {
    const isRevisor = voteType === 'REVISOR';
    const warningMessage = isRevisor
      ? `Tem certeza que deseja excluir o voto do revisor ${memberName}? O revisor pode ser removido da lista de revisores se foi adicionado apenas nesta sessão.`
      : `Tem certeza que deseja excluir o voto do relator ${memberName}?`;

    toast.warning(warningMessage, {
      duration: 10000,
      className: 'min-w-[450px]',
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setDeletingVoteId(voteId);
            const response = await fetch(
              `/api/ccr/sessions/${sessionId}/processos/${resourceId}/votes/${voteId}`,
              {
                method: 'DELETE',
              }
            );

            if (response.ok) {
              toast.success('Voto excluído com sucesso');
              if (onDelete) onDelete(); // Recarregar os dados
              if (onVotingChange) await onVotingChange(); // Resetar resultado se existir
            } else {
              const error = await response.json();
              toast.error(error.error || 'Erro ao excluir voto');
            }
          } catch (error) {
            console.error('Error deleting vote:', error);
            toast.error('Erro ao excluir voto');
          } finally {
            setDeletingVoteId(null);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {},
      },
    });
  };

  // Separar votos por tipo
  const relatorVotes = voting.votes.filter(v => v.voteType === 'RELATOR');
  const revisorVotes = voting.votes.filter(v => v.voteType === 'REVISOR');
  const presidenteVote = voting.votes.find(v => v.voteType === 'PRESIDENTE');

  // Calcular estatísticas
  const votosPresentes = voting.votes.filter(v => v.participationStatus === 'PRESENTE').length;
  const abstencoes = voting.votes.filter(v => v.participationStatus === 'ABSTENCAO').length;
  const impedimentos = voting.votes.filter(v => v.participationStatus === 'IMPEDIDO').length;
  const ausencias = voting.votes.filter(v => v.participationStatus === 'AUSENTE').length;
  const suspeicoes = voting.votes.filter(v => v.participationStatus === 'SUSPEITO').length;

  // Verificar empate - agrupar votos por quem seguem (apenas votos presentes que não são presidente)
  const votosValidos = voting.votes.filter(
    v => v.participationStatus === 'PRESENTE' && v.voteType !== 'PRESIDENTE'
  );

  const votosPorDecisao = votosValidos.reduce((acc, vote) => {
    // Se o voto segue outro voto (votante), agrupa pelo ID do voto seguido
    // Se não segue (relator/revisor), agrupa pelo próprio ID do voto
    const key = vote.followsVote?.id || vote.id;

    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const contagemVotos = Object.values(votosPorDecisao);
  const maiorContagem = Math.max(...contagemVotos, 0);
  const votosComMaiorContagem = contagemVotos.filter(count => count === maiorContagem);
  const hasEmpate = votosComMaiorContagem.length > 1 && maiorContagem > 0;

  // Calcular votos pendentes
  // Total de membros menos membros distribuídos e ausentes na sessão
  const membrosDisponiveis = totalMembers - totalDistributedMembers - totalAbsentMembers;

  // Contar votos PRESENTES de conselheiros
  const votosConselheirosPresentes = voting.votes.filter(
    v => v.voteType !== 'RELATOR' &&
         v.voteType !== 'REVISOR' &&
         v.participationStatus === 'PRESENTE'
  ).length;

  // Contar impedidos, suspeitos e abstenções (não são pendentes, já se manifestaram)
  const votosNaoPresentes = voting.votes.filter(
    v => v.voteType !== 'RELATOR' &&
         v.voteType !== 'REVISOR' &&
         (v.participationStatus === 'IMPEDIDO' ||
          v.participationStatus === 'SUSPEITO' ||
          v.participationStatus === 'ABSTENCAO')
  ).length;

  // Pendentes = membros disponíveis - votos presentes - impedidos/suspeitos/abstenções
  let votosPendentes = membrosDisponiveis - votosConselheirosPresentes - votosNaoPresentes;

  // Garantir que não seja negativo
  votosPendentes = Math.max(0, votosPendentes);

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-lg border p-6">
      {/* Header com número em círculo e tipo de votação */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-3 flex-1">
          {/* Drag handle */}
          <div
            {...(!isSessionCompleted ? attributes : {})}
            {...(!isSessionCompleted ? listeners : {})}
            className={cn(
              "flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-medium text-sm",
              !isSessionCompleted && "cursor-grab active:cursor-grabbing"
            )}
          >
            {index}
          </div>
          {/* Tipo de votação */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">
                {voting.label}
              </h3>
              {voting.status === 'PENDENTE' && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex items-center gap-1.5"
                >
                  <Clock className="h-3.5 w-3.5" />
                  Pendente
                </Badge>
              )}
              {voting.status === 'CONCLUIDA' && voting.completedAt && (
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Concluído em {format(new Date(voting.completedAt), 'dd/MM/yyyy', { locale: ptBR })}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer h-9"
            onClick={() => router.push(`/ccr/sessoes/${sessionId}/processos/${resourceId}/julgar/votacoes/${voting.id}`)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Detalhes
          </Button>
          {!isSessionCompleted && voting.votes.length === 1 && voting.status === 'PENDENTE' && (
            <TooltipWrapper content="Declarar votação como unânime">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeclareUnanimous}
                disabled={actionLoading}
                className="cursor-pointer h-9"
              >
                <Users className="h-4 w-4 mr-2" />
                Unânime
              </Button>
            </TooltipWrapper>
          )}
          {!isSessionCompleted && (
            <TooltipWrapper content="Excluir votação">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={actionLoading}
                className="cursor-pointer h-9 w-9 p-0"
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </TooltipWrapper>
          )}
        </div>
      </div>

      {/* Votos (apenas Relator e Revisor) */}
      {voting.votes.filter(v => v.voteType === 'RELATOR' || v.voteType === 'REVISOR').length > 0 && (
        <div className="flex items-start gap-3">
          {/* Espaçamento para alinhar com o círculo */}
          <div className="w-8 flex-shrink-0"></div>

          <div className="flex-1 space-y-0.5">
            {voting.votes
              .filter(v => v.voteType === 'RELATOR' || v.voteType === 'REVISOR')
              .map((vote) => {
                // Determinar finalidade e decisão
                let voteInfo = '';

                if (vote.voteKnowledgeType === 'NAO_CONHECIMENTO') {
                  const hasPreliminar = vote.preliminaryDecision;
                  const hasOficio = vote.officialDecision;

                  if (hasPreliminar && hasOficio) {
                    // Acatar com preliminar e ofício
                    voteInfo = `Acatar - ${vote.preliminaryDecision.identifier} - ${vote.officialDecision.identifier}`;
                  } else if (hasPreliminar && !hasOficio) {
                    // Afastar
                    voteInfo = `Afastar - ${vote.preliminaryDecision.identifier}`;
                  } else if (!hasPreliminar && hasOficio) {
                    // Apenas ofício
                    voteInfo = `Acatar - ${vote.officialDecision.identifier}`;
                  } else {
                    // Afastar sem preliminar específica
                    voteInfo = 'Afastar';
                  }
                } else {
                  // Mérito
                  voteInfo = vote.meritDecision?.identifier || 'voto de mérito';
                }

                const voteTypeLabel =
                  vote.voteType === 'RELATOR' ? 'Relator' :
                  vote.voteType === 'REVISOR' ? 'Revisor' :
                  'Votante';

                // Verificar se este membro é o vencedor
                const isWinner = voting.status === 'CONCLUIDA' &&
                                voting.winningMember &&
                                voting.winningMember.id === vote.member.id;

                return (
                  <div
                    key={vote.id}
                    className="text-sm flex items-center gap-2 flex-wrap group"
                    onMouseEnter={() => setHoveredVoteId(vote.id)}
                    onMouseLeave={() => setHoveredVoteId(null)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{voteTypeLabel}: </span>
                      <span className="text-muted-foreground">{vote.member.name} ({voteInfo})</span>
                      {isWinner && (
                        <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-1.5 py-0 ml-1">
                          Vencedor
                        </Badge>
                      )}
                    </div>
                    {vote.session && (
                      <Badge
                        variant="outline"
                        className="text-xs bg-gray-50 font-normal flex items-center gap-1.5"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Sessão n. {vote.session.sessionNumber} - {format(new Date(vote.session.date), 'dd/MM/yyyy', { locale: ptBR })}
                      </Badge>
                    )}
                    {voting.status !== 'CONCLUIDA' && (
                      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                        {hoveredVoteId === vote.id && (
                          <TooltipWrapper content="Excluir voto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVote(vote.id, vote.voteType, vote.member.name)}
                              disabled={deletingVoteId === vote.id}
                              className="cursor-pointer h-4 w-4 p-0 hover:bg-red-100 hover:text-red-600 transition-colors"
                            >
                              {deletingVoteId === vote.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <X className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipWrapper>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs">
            <span className="font-medium">{votosPresentes}</span>{' '}
            <span className="text-muted-foreground">Registrados</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs">
            <span className="font-medium">{votosPendentes}</span>{' '}
            <span className="text-muted-foreground">Pendentes</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <p className="text-xs">
            <span className="font-medium">{abstencoes + impedimentos + ausencias + suspeicoes}</span>{' '}
            <span className="text-muted-foreground">Abs./Aus./Imp./Susp.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
