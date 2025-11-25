'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  Users,
  FileText,
  Edit,
  Plus,
  X,
  Gavel,
  CheckCircle2,
  PlayCircle,
  Newspaper,
  Blinds,
  Briefcase,
  GripVertical,
  UserCheck,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { toast } from 'sonner';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '../../../../../hooks/resource-status';
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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MemberVote {
  id: string;
  voteType: string;
  participationStatus: string;
  isQualityVote: boolean;
  justification: string | null;
  observations: string | null;
  member: {
    id: string;
    name: string;
    role: string;
  };
  preliminaryDecision: {
    id: string;
    type: string;
    code: string;
    name: string;
  } | null;
  meritDecision: {
    id: string;
    type: string;
    code: string;
    name: string;
  } | null;
  officialDecision: {
    id: string;
    type: string;
    code: string;
    name: string;
  } | null;
  followsVote: {
    id: string;
    member: {
      id: string;
      name: string;
    };
  } | null;
}

interface VotingResult {
  id: string;
  votingType: string;
  totalVotes: number;
  abstentions: number;
  absences: number;
  impediments: number;
  suspicions: number;
  qualityVoteUsed: boolean;
  finalText: string | null;
  preliminaryDecision?: {
    id: string;
    type: string;
    code: string;
    name: string;
  } | null;
  winningMember: {
    id: string;
    name: string;
  } | null;
  votes: MemberVote[];
}

interface SessionResource {
  id: string;
  status: string;
  order: number;
  observations: string | null;
  minutesText: string | null;
  createdAt: Date;
  addedAfterLastPublication: boolean;
  resource: {
    id: string;
    processNumber: string;
    processName: string | null;
    resourceNumber: string;
    protocol: {
      presenter: string;
    };
  };
  specificPresident: {
    id: string;
    name: string;
    role: string;
  } | null;
  attendances?: Array<{
    id: string;
    partId: string | null;
    customName: string | null;
    customRole: string | null;
    part?: {
      name: string;
    } | null;
  }>;
}

interface SessionMember {
  id: string;
  member: {
    id: string;
    name: string;
  };
}

interface SessionDistribution {
  id: string;
  resourceId: string;
  distributionOrder: number;
  distributedToId: string;
  reviewersIds: string[];
  firstDistribution: {
    id: string;
    name: string;
    role: string;
  } | null;
  resource: {
    id: string;
    resourceNumber: string;
    processNumber: string;
  };
}

interface Session {
  id: string;
  sessionNumber: string;
  sequenceNumber: number;
  year: number;
  ordinalNumber: number;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  type: string;
  status: string;
  observations: string | null;
  administrativeMatters: string | null;
  president: {
    id: string;
    name: string;
  } | null;
  resources: SessionResource[];
  members: SessionMember[];
  distributions: SessionDistribution[];
  minutes: {
    id: string;
    minutesNumber: string;
  } | null;
  publications: {
    id: string;
    publicationNumber: string;
    publicationDate: Date;
    type: string;
  }[];
  createdByUser: {
    id: string;
    name: string;
  };
}

const statusColors: Record<string, string> = {
  PUBLICACAO: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  PENDENTE: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  CONCLUIDA: 'bg-green-100 text-green-800 hover:bg-green-100',
  CANCELADA: 'bg-red-100 text-red-800 hover:bg-red-100',
};

const statusLabels: Record<string, string> = {
  PUBLICACAO: 'Aguardando Publicação',
  PENDENTE: 'Pendente',
  CONCLUIDA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

const typeLabels: Record<string, string> = {
  ORDINARIA: 'Ordinária',
  EXTRAORDINARIA: 'Extraordinária',
  OUTRO: 'Outro',
};

const statusIcons: Record<string, React.ReactNode> = {
  PUBLICACAO: <Newspaper className="h-3.5 w-3.5" />,
  PENDENTE: <Clock className="h-3.5 w-3.5" />,
  CONCLUIDA: <CheckCircle2 className="h-3.5 w-3.5" />,
  CANCELADA: <X className="h-3.5 w-3.5" />,
};

const resourceStatusColors: Record<string, string> = {
  EM_PAUTA: 'bg-blue-50 border-blue-400',
  SUSPENSO: 'bg-amber-50 border-amber-400',
  DILIGENCIA: 'bg-cyan-50 border-cyan-400',
  PEDIDO_VISTA: 'bg-rose-50 border-rose-400',
  JULGADO: 'bg-emerald-50 border-emerald-400',
};

const distributionTypeLabels: Record<string, string> = {
  RELATOR: 'Relator',
  REVISOR: 'Revisor',
};

const voteTypeLabels: Record<string, string> = {
  RELATOR: 'Relator',
  REVISOR: 'Revisor',
  PRESIDENTE: 'Presidente',
  VOTANTE: 'Votante',
};

// Cores para decisões (usadas nos badges de resultado)
const getDecisionColor = (decisionName: string): string => {
  const name = decisionName.toUpperCase();
  if (name.includes('DEFERIDO') || name.includes('PROCEDENTE')) {
    return 'bg-green-100 text-green-800 hover:bg-green-100';
  }
  if (name.includes('INDEFERIDO') || name.includes('IMPROCEDENTE')) {
    return 'bg-red-100 text-red-800 hover:bg-red-100';
  }
  if (name.includes('PARCIAL')) {
    return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
  }
  return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
};

// Componente de Card Sortable
interface SortableResourceCardProps {
  resource: SessionResource;
  distribution: SessionDistribution | undefined;
  session: Session;
  canJudgeProcesses: boolean;
  canAddRemoveProcesses: boolean;
  isSessionCompleted: boolean;
  onRemove: () => void;
  onJudge: () => void;
  onPresence: () => void;
}

function SortableResourceCard({
  resource,
  distribution,
  session,
  canJudgeProcesses,
  canAddRemoveProcesses,
  isSessionCompleted,
  onRemove,
  onJudge,
  onPresence,
}: SortableResourceCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: resource.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border p-6",
        resource.status === 'EM_PAUTA'
          ? "bg-white"
          : resourceStatusColors[resource.status] || "bg-white",
        resource.addedAfterLastPublication && "border-l-4 border-l-purple-500"
      )}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            {...(!isSessionCompleted ? attributes : {})}
            {...(!isSessionCompleted ? listeners : {})}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm flex-shrink-0 transition-colors",
              !isSessionCompleted && "cursor-grab active:cursor-grabbing",
              resource.attendances && resource.attendances.length > 0
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {resource.order}
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/ccr/recursos/${resource.resource.id}`}
                  target="_blank"
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {resource.resource.processNumber}
                </Link>
                {resource.status !== 'EM_PAUTA' && (
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit', getResourceStatusColor(resource.status as ResourceStatusKey))}>
                    {getResourceStatusLabel(resource.status as ResourceStatusKey)}
                  </span>
                )}
              </div>
              {resource.resource.processName && (
                <div className="text-sm text-muted-foreground">
                  {resource.resource.processName} ({resource.resource.resourceNumber})
                </div>
              )}
            </div>

            <div className="space-y-0.5 text-sm">
              {distribution?.firstDistribution && (
                <div>
                  <span className="font-medium">Relator: </span>
                  <span className="text-muted-foreground">
                    {distribution.firstDistribution.name}
                  </span>
                </div>
              )}
              {distribution && distribution.reviewersIds.length > 0 && (
                <div>
                  <span className="font-medium">
                    {distribution.reviewersIds.length === 1 ? 'Revisor: ' : 'Revisores: '}
                  </span>
                  <span className="text-muted-foreground">
                    {distribution.reviewersIds.map((reviewerId, idx) => {
                      // Buscar revisor em session.members ou verificar se é o presidente
                      const reviewer = session.members.find(m => m.member.id === reviewerId)?.member
                        || (session.president?.id === reviewerId ? session.president : null);
                      return reviewer ? (
                        <span key={reviewerId}>
                          {reviewer.name}
                          {idx < distribution.reviewersIds.length - 1 && ', '}
                        </span>
                      ) : null;
                    })}
                  </span>
                </div>
              )}
              {distribution && (
                <div>
                  <span className="font-medium">Distribuição: </span>
                  <span className="text-muted-foreground">
                    {(() => {
                      // Buscar membro distribuído em session.members ou verificar se é o presidente
                      const distributedMember = session.members.find(m => m.member.id === distribution.distributedToId)?.member
                        || (session.president?.id === distribution.distributedToId ? session.president : null);
                      return distributedMember?.name || '-';
                    })()}
                  </span>
                </div>
              )}
              {resource.attendances && resource.attendances.length > 0 && (
                <div>
                  <span className="font-medium">Partes: </span>
                  <span className="text-muted-foreground">
                    {(() => {
                      const names = resource.attendances
                        .map(att => att.part?.name || att.customName || '')
                        .filter(name => name);

                      if (names.length === 0) return '';
                      if (names.length === 1) return names[0];
                      if (names.length === 2) return `${names[0]} e ${names[1]}`;

                      const allButLast = names.slice(0, -1).join(', ');
                      const last = names[names.length - 1];
                      return `${allButLast} e ${last}`;
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* Texto da Ata - aparece quando há resultado */}
            {resource.status !== 'EM_PAUTA' && resource.minutesText && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm">
                  <span className="font-medium">Texto da Ata: </span>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-justify">
                    {resource.minutesText}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 flex-shrink-0">
          {/* Se sessão concluída, mostrar apenas botão de Detalhes */}
          {isSessionCompleted ? (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer h-9"
              onClick={onJudge}
            >
              <FileText className="h-4 w-4 mr-2" />
              Detalhes
            </Button>
          ) : (
            <>
              {/* Botão Presença - aparece quando sessão está PENDENTE */}
              {canJudgeProcesses && (
                <TooltipWrapper content="Registrar presença de partes">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onPresence}
                    className="cursor-pointer h-9 w-9 p-0"
                  >
                    <UserCheck className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
              )}

              {/* Botão Julgar/Editar - aparece quando sessão está PENDENTE */}
              {canJudgeProcesses && (
                <>
                  {resource.status === 'EM_PAUTA' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="cursor-pointer h-9"
                      onClick={onJudge}
                    >
                      <Gavel className="h-4 w-4 mr-2" />
                      Julgar
                    </Button>
                  ) : (
                    <TooltipWrapper content="Editar resultado">
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer h-9 w-9 p-0"
                        onClick={onJudge}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipWrapper>
                  )}
                </>
              )}

              {/* Botão Remover - aparece quando pode adicionar/remover processos */}
              {canAddRemoveProcesses && (
                <TooltipWrapper content={resource.status !== 'EM_PAUTA' ? 'Remover resultado' : 'Remover processo da pauta'}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    className="cursor-pointer h-9 w-9 p-0"
                  >
                    {resource.status !== 'EM_PAUTA' ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipWrapper>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VisualizarSessaoPage() {
  const params = useParams();
  const router = useRouter();
  const { data: authSession } = useSession();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [revertLoading, setRevertLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [shouldModalAnimate, setShouldModalAnimate] = useState(false);
  const [publishData, setPublishData] = useState({
    publicationNumber: '',
    publicationDate: ''
  });

  // Configurar sensors para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (params.id) {
      fetchSession();
    }
  }, [params.id]);

  useEffect(() => {
    if (showPublishModal) {
      setIsModalClosing(false);
      setShouldModalAnimate(false);
      // Resetar formulário
      setPublishData({
        publicationNumber: '',
        publicationDate: ''
      });

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldModalAnimate(true);
        });
      });
    }
  }, [showPublishModal]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      console.log('Fetching session with ID:', params.id);
      const response = await fetch(`/api/ccr/sessions/${params.id}`);
      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Session data:', data);
        setSession(data);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime: string | null, endTime: string | null) => {
    if (!startTime || !endTime) return '-';

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    const durationInMinutes = endInMinutes - startInMinutes;

    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;

    if (hours === 0) {
      return `${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
    }

    if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }

    return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
  };

  const formatPublicationNumber = (value: string) => {
    // Remove tudo que não é dígito
    const onlyNumbers = value.replace(/\D/g, '');

    // Formata com separador de milhar
    if (!onlyNumbers) return '';

    const number = parseInt(onlyNumbers);
    return number.toLocaleString('pt-BR');
  };

  const handlePublicationNumberChange = (value: string) => {
    const formatted = formatPublicationNumber(value);
    setPublishData({ ...publishData, publicationNumber: formatted });
  };

  const handleClosePublishModal = () => {
    if (publishLoading) return; // Não permite fechar enquanto está carregando
    setIsModalClosing(true);
    setShouldModalAnimate(false);
    setTimeout(() => {
      setShowPublishModal(false);
      setIsModalClosing(false);
    }, 200);
  };

  const handlePublishAgenda = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!publishData.publicationNumber || !publishData.publicationDate) {
      toast.error('Número e data da publicação são obrigatórios');
      return;
    }

    try {
      setPublishLoading(true);
      const response = await fetch(`/api/ccr/sessions/${params.id}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(publishData)
      });

      if (response.ok) {
        toast.success('Pauta publicada com sucesso');
        handleClosePublishModal();
        fetchSession(); // Recarregar dados da sessão
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao publicar pauta');
      }
    } catch (error) {
      console.error('Error publishing agenda:', error);
      toast.error('Erro ao publicar pauta');
    } finally {
      setPublishLoading(false);
    }
  };

  const handleCompleteSession = async () => {
    const resourcesCount = session?.resources.length ?? 0;
    const message = resourcesCount > 0
      ? 'Tem certeza que deseja concluir esta sessão? Todos os processos em pauta devem ter resultado.'
      : 'Tem certeza que deseja concluir esta sessão?';

    toast.warning(message, {
      duration: 10000,
      className: 'min-w-[450px]',
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setCompleteLoading(true);
            const response = await fetch(`/api/ccr/sessions/${params.id}/complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });

            if (response.ok) {
              toast.success('Sessão concluída com sucesso');
              fetchSession(); // Recarregar dados da sessão
            } else {
              const error = await response.json();
              toast.error(error.error || 'Erro ao concluir sessão');
            }
          } catch (error) {
            console.error('Error completing session:', error);
            toast.error('Erro ao concluir sessão');
          } finally {
            setCompleteLoading(false);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {
          setCompleteLoading(false);
        },
      },
    });
  };

  const handleRevertSession = async () => {
    toast.warning('Tem certeza que deseja reverter esta sessão para PENDENTE? Ela ficará editável novamente.', {
      duration: 10000,
      className: 'min-w-[450px]',
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            setRevertLoading(true);
            const response = await fetch(`/api/ccr/sessions/${params.id}/revert`, {
              method: 'PATCH',
            });

            if (response.ok) {
              toast.success('Sessão revertida para PENDENTE com sucesso');
              fetchSession(); // Recarregar dados da sessão
            } else {
              const error = await response.json();
              toast.error(error.error || 'Erro ao reverter sessão');
            }
          } catch (error) {
            console.error('Error reverting session:', error);
            toast.error('Erro ao reverter sessão');
          } finally {
            setRevertLoading(false);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {
          setRevertLoading(false);
        },
      },
    });
  };

  const handleDeleteSession = async () => {
    toast.warning('Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.', {
      duration: 10000,
      className: 'min-w-[450px]',
      action: {
        label: 'Confirmar Exclusão',
        onClick: async () => {
          try {
            setDeleteLoading(true);
            const response = await fetch(`/api/ccr/sessions/${params.id}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              toast.success('Sessão excluída com sucesso');
              router.push('/ccr/sessoes');
            } else {
              const errorText = await response.text();
              toast.error(errorText || 'Erro ao excluir sessão');
            }
          } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('Erro ao excluir sessão');
          } finally {
            setDeleteLoading(false);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {
          setDeleteLoading(false);
        },
      },
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !session || session.status === 'CONCLUIDA') {
      return;
    }

    const oldIndex = session.resources.findIndex((r) => r.id === active.id);
    const newIndex = session.resources.findIndex((r) => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Atualizar ordem localmente (otimistic update)
    const newResources = arrayMove(session.resources, oldIndex, newIndex);
    const reorderedResources = newResources.map((resource, index) => ({
      ...resource,
      order: index + 1,
    }));

    setSession({
      ...session,
      resources: reorderedResources,
    });

    // Atualizar no backend
    try {
      const response = await fetch(`/api/ccr/sessions/${params.id}/reorder-resources`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resourceOrders: reorderedResources.map((r) => ({
            id: r.id,
            order: r.order,
          })),
        }),
      });

      if (!response.ok) {
        // Se falhar, recarregar dados originais
        fetchSession();
        toast.error('Erro ao reordenar processos');
      }
    } catch (error) {
      console.error('Error reordering resources:', error);
      // Se falhar, recarregar dados originais
      fetchSession();
      toast.error('Erro ao reordenar processos');
    }
  };

  const canPublishAgenda = session?.status === 'PUBLICACAO';
  const canAddRemoveProcesses = session?.status === 'PUBLICACAO' || session?.status === 'PENDENTE';
  const canJudgeProcesses = session?.status === 'PENDENTE';
  const totalResources = session?.resources.length ?? 0;

  // Lógica de conclusão:
  // - Se há processos: todos devem ter resultado
  // - Se não há processos: deve ter assuntos administrativos
  const allProcessesHaveResult = totalResources > 0
    ? session?.resources.every(r => ['JULGADO', 'SUSPENSO', 'DILIGENCIA', 'PEDIDO_VISTA'].includes(r.status))
    : (session?.administrativeMatters && session.administrativeMatters.trim().length > 0) || false;

  const canCompleteSession = session?.status === 'PENDENTE' && allProcessesHaveResult;
  const hasPublications = (session?.publications?.filter(p => p.type === 'SESSAO').length ?? 0) > 0;

  const formatDateTime = (date: Date | string, time: string | null) => {
    if (!time) return '-';
    const dateObj = new Date(date);
    return `${format(dateObj, 'dd/MM/yyyy', { locale: ptBR })}, ${time}`;
  };

  const formatFullDateTime = (
    date: Date | string,
    startTime: string | null,
    endTime: string | null
  ) => {
    // Ajustar data para evitar problema de timezone
    const dateObj = new Date(date);
    const adjustedDate = new Date(
      dateObj.getTime() + dateObj.getTimezoneOffset() * 60000
    );

    // Dia da semana e data completa
    const weekdayAndDate = format(
      adjustedDate,
      "EEEE, d 'de' MMMM 'de' yyyy",
      { locale: ptBR }
    );

    // Horário
    if (!startTime && !endTime) {
      return weekdayAndDate;
    }

    if (startTime && endTime) {
      return `${weekdayAndDate}, ${startTime}-${endTime}`;
    }

    if (startTime) {
      return `${weekdayAndDate}, ${startTime}`;
    }

    return weekdayAndDate;
  };

  // Calcular estatísticas de progresso
  const progressStats = {
    pendentes: session?.resources.filter((r) => r.status === 'EM_PAUTA').length || 0,
    suspensos: session?.resources.filter((r) => r.status === 'SUSPENSO').length || 0,
    diligencias: session?.resources.filter((r) => r.status === 'DILIGENCIA').length || 0,
    vistas: session?.resources.filter((r) => r.status === 'PEDIDO_VISTA').length || 0,
    julgados: session?.resources.filter((r) => r.status === 'JULGADO').length || 0,
  };

  const totalProcesses = session?.resources.length || 0;

  const loadingBreadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    { label: 'Carregando...' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Visualizar Sessão" breadcrumbs={loadingBreadcrumbs}>
        <div className="space-y-6">
          {/* Grid com Card de Informações e Card de Conselheiros */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card de Informações da Sessão */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <CardTitle>Informações da Sessão</CardTitle>
                      <CardDescription>Detalhes e horários da sessão.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                      <Skeleton className="h-9 w-9" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="space-y-0">
                        <Skeleton className="h-4 w-24 mb-1.5" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Card de Conselheiros Participantes */}
            <div>
              <Card className="h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1.5">
                      <CardTitle>Conselheiros Participantes</CardTitle>
                      <CardDescription>
                        <Skeleton className="h-4 w-24" />
                      </CardDescription>
                    </div>
                    <Skeleton className="h-9 w-9" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Card de Assuntos Administrativos */}
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Card de Progresso do Julgamento */}
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-6 text-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-9 w-16 mx-auto mb-1.5" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Card de Processos para Julgamento */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-10 w-40" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CCRPageWrapper>
    );
  }

  if (!session) {
    return (
      <CCRPageWrapper title="Visualizar Sessão" breadcrumbs={loadingBreadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Sessão não encontrada</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    { label: `Sessão n. ${session.sessionNumber}` },
  ];

  return (
    <CCRPageWrapper title={`Sessão ${session.sessionNumber}`} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Informações da Sessão e Conselheiros */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card de Informações da Sessão */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <CardTitle>Informações da Sessão</CardTitle>
                    <CardDescription>Detalhes e horários da sessão.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipWrapper content="Gerenciar publicações">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/ccr/sessoes/${session.id}/publicacoes`)}
                        className="cursor-pointer"
                      >
                        <Newspaper className="h-4 w-4" />
                      </Button>
                    </TooltipWrapper>
                    <TooltipWrapper content="Gerenciar distribuições">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/ccr/sessoes/${session.id}/distribuicoes`)}
                        className="cursor-pointer"
                      >
                        <Blinds className="h-4 w-4" />
                      </Button>
                    </TooltipWrapper>
                    {session.status !== 'CONCLUIDA' && (
                      <>
                        <TooltipWrapper content="Gerenciar assuntos administrativos">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/ccr/sessoes/${session.id}/assuntos-administrativos`)}
                            className="cursor-pointer"
                          >
                            <Briefcase className="h-4 w-4" />
                          </Button>
                        </TooltipWrapper>
                        <TooltipWrapper content="Editar sessão">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/ccr/sessoes/${session.id}/editar`)}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TooltipWrapper>
                        {/* Botão Excluir - aparece apenas quando status é PENDENTE e não há processos */}
                        {session.status === 'PENDENTE' && session.resources.length === 0 && (
                          <TooltipWrapper content="Excluir sessão">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleDeleteSession}
                              disabled={deleteLoading}
                              className="cursor-pointer h-9 w-9 p-0"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TooltipWrapper>
                        )}
                      </>
                    )}

                    {/* Botão Publicar Pauta - aparece quando status = PUBLICACAO */}
                    {canPublishAgenda && (
                      <Button
                        size="sm"
                        onClick={() => setShowPublishModal(true)}
                        className="cursor-pointer bg-purple-600 hover:bg-purple-700"
                      >
                        <Newspaper className="h-4 w-4 mr-2" />
                        Publicar Pauta
                      </Button>
                    )}

                    {/* Botão Concluir Sessão - aparece quando todos processos julgados */}
                    {canCompleteSession && (
                      <Button
                        size="sm"
                        onClick={handleCompleteSession}
                        disabled={completeLoading}
                        className="cursor-pointer bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {completeLoading ? 'Concluindo...' : 'Concluir Sessão'}
                      </Button>
                    )}

                    {/* Botão Reverter Sessão - aparece apenas para ADMIN quando sessão está CONCLUIDA */}
                    {session.status === 'CONCLUIDA' && authSession?.user?.role === 'ADMIN' && (
                      <Button
                        size="sm"
                        onClick={handleRevertSession}
                        disabled={revertLoading}
                        className="cursor-pointer bg-amber-600 hover:bg-amber-700"
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {revertLoading ? 'Revertendo...' : 'Reverter para Pendente'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Número da Pauta</label>
                    <p className="text-sm">{session.sessionNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Tipo de Sessão</label>
                    <p className="text-sm">{typeLabels[session.type] || session.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Status</label>
                    <Badge
                      variant="secondary"
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        statusColors[session.status] || 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                      )}
                    >
                      {statusIcons[session.status]}
                      {statusLabels[session.status]}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Número da Ata</label>
                    <p className="text-sm">{session.minutes?.minutesNumber || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Publicação</label>
                    <p className="text-sm">
                      {session.publications && session.publications.length > 0 ? (
                        (() => {
                          const pub = session.publications[0];
                          const pubDate = new Date(pub.publicationDate);
                          const adjustedDate = new Date(pubDate.getTime() + pubDate.getTimezoneOffset() * 60000);
                          return `${format(adjustedDate, 'dd/MM/yyyy', { locale: ptBR })}, ${pub.publicationNumber}`;
                        })()
                      ) : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Presidente</label>
                    <p className="text-sm">{session.president?.name || '-'}</p>
                  </div>
                  <div className="lg:col-span-3">
                    <label className="block text-sm font-medium mb-1.5">Data/Horário</label>
                    <p className="text-sm">
                      {formatFullDateTime(session.date, session.startTime, session.endTime)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card de Conselheiros Participantes */}
          <div>
            <Card className="h-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1.5">
                    <CardTitle>Conselheiros Participantes</CardTitle>
                    <CardDescription>
                      {session.members.length} {session.members.length === 1 ? 'participante' : 'participantes'}
                    </CardDescription>
                  </div>
                  {session.status !== 'CONCLUIDA' && (
                    <TooltipWrapper content="Editar membros participantes">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/ccr/sessoes/${session.id}/membros`)}
                        className="cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipWrapper>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {(() => {
                    const sortedMembers = session.members
                      .sort((a, b) => a.member.name.localeCompare(b.member.name))
                      .map(m => m.member.name);

                    if (sortedMembers.length === 0) return '';
                    if (sortedMembers.length === 1) return sortedMembers[0];
                    if (sortedMembers.length === 2) return `${sortedMembers[0]} e ${sortedMembers[1]}`;

                    const allButLast = sortedMembers.slice(0, -1).join(', ');
                    const last = sortedMembers[sortedMembers.length - 1];
                    return `${allButLast} e ${last}`;
                  })()}
                </p>

                {session.observations && (
                  <div className="mt-6 pt-6 border-t">
                    <label className="block text-sm font-medium mb-1.5">Observações</label>
                    <p className="text-sm text-muted-foreground">{session.observations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Card de Assuntos Administrativos */}
        {session.administrativeMatters && (
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <CardTitle>Assuntos Administrativos</CardTitle>
                <CardDescription>
                  Assuntos administrativos discutidos durante a sessão
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{session.administrativeMatters}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de Progresso do Julgamento */}
        {session.resources.length > 0 && (
          <Card>
            <CardHeader>
              <div className="space-y-1.5">
                <CardTitle>Progresso do Julgamento</CardTitle>
                <CardDescription>
                  {progressStats.julgados} de {totalProcesses} processos julgados (
                  {totalProcesses > 0 ? Math.round((progressStats.julgados / totalProcesses) * 100) : 0}%)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>

              <div className="grid grid-cols-5 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-blue-700">{progressStats.pendentes}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">Pendentes</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-700">{progressStats.suspensos}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">Suspensos</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-cyan-700">{progressStats.diligencias}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">Diligências</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-rose-700">{progressStats.vistas}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">Vistas</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-emerald-700">{progressStats.julgados}</div>
                  <p className="text-sm text-muted-foreground mt-1.5">Julgados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card de Processos para Julgamento */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>Processos para Julgamento</CardTitle>
                <CardDescription>
                  Lista de processos incluídos nesta sessão ordenados por ordem de julgamento
                </CardDescription>
              </div>
              {canAddRemoveProcesses && (
                <Button
                  onClick={() => router.push(`/ccr/sessoes/${session.id}/adicionar-processo`)}
                  className="cursor-pointer"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Processo
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {session.resources.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum processo adicionado à pauta
                  </p>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={session.resources.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {session.resources
                      .sort((a, b) => a.order - b.order)
                      .map((resource) => {
                        // Buscar a última distribuição deste recurso nesta sessão
                        const distribution = session.distributions?.find(
                          d => d.resourceId === resource.resource.id
                        );

                        return (
                          <SortableResourceCard
                            key={resource.id}
                            resource={resource}
                            distribution={distribution}
                            session={session}
                            canJudgeProcesses={canJudgeProcesses}
                            canAddRemoveProcesses={canAddRemoveProcesses}
                            isSessionCompleted={session.status === 'CONCLUIDA'}
                            onRemove={() => {
                              // Verificar se o processo tem resultado
                              const hasResult = resource.status !== 'EM_PAUTA';

                              if (hasResult) {
                                // Remover resultado
                                toast.warning('Tem certeza que deseja remover o resultado deste processo? Todas as votações e votos serão excluídos.', {
                                  duration: 10000,
                                  action: {
                                    label: 'Confirmar',
                                    onClick: async () => {
                                      try {
                                        const response = await fetch(`/api/ccr/session-resources/${resource.id}/remove-result`, {
                                          method: 'DELETE',
                                        });

                                        if (response.ok) {
                                          toast.success('Resultado removido com sucesso');
                                          fetchSession();
                                        } else {
                                          const error = await response.json();
                                          toast.error(error.error || 'Erro ao remover resultado');
                                        }
                                      } catch (error) {
                                        console.error('Error removing result:', error);
                                        toast.error('Erro ao remover resultado');
                                      }
                                    },
                                  },
                                  cancel: {
                                    label: 'Cancelar',
                                    onClick: () => { },
                                  },
                                });
                              } else {
                                // Remover da pauta
                                toast.warning('Tem certeza que deseja remover este processo da pauta?', {
                                  duration: 10000,
                                  action: {
                                    label: 'Confirmar',
                                    onClick: async () => {
                                      try {
                                        const response = await fetch(`/api/ccr/session-resources/${resource.id}`, {
                                          method: 'DELETE',
                                        });

                                        if (response.ok) {
                                          toast.success('Processo removido da pauta');
                                          fetchSession();
                                        } else {
                                          const errorText = await response.text();
                                          toast.error(errorText || 'Erro ao remover processo da pauta');
                                        }
                                      } catch (error) {
                                        console.error('Error removing resource:', error);
                                        toast.error('Erro ao remover processo da pauta');
                                      }
                                    },
                                  },
                                  cancel: {
                                    label: 'Cancelar',
                                    onClick: () => { },
                                  },
                                });
                              }
                            }}
                            onJudge={() => router.push(`/ccr/sessoes/${session.id}/processos/${resource.id}/julgar`)}
                            onPresence={() => router.push(`/ccr/sessoes/${session.id}/processos/${resource.id}/presenca`)}
                          />
                        );
                      })}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        {/* Modal de Publicação da Pauta */}
        {(showPublishModal || isModalClosing) && (
          <div
            className={`fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16 transition-opacity duration-200 ${isModalClosing ? 'opacity-0' : shouldModalAnimate ? 'opacity-100' : 'opacity-0'}`}
          >
            <div
              className={`bg-white rounded-lg shadow-xl max-w-md w-full transition-all duration-200 ${isModalClosing ? 'scale-95 opacity-0' : shouldModalAnimate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Publicar Pauta</h2>
                    <p className="text-sm text-gray-600 mt-1">Informe os dados da publicação da pauta</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClosePublishModal}
                    disabled={publishLoading}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handlePublishAgenda} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Número da Publicação <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={publishData.publicationNumber}
                      onChange={(e) => handlePublicationNumberChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                      placeholder="Ex: 1.000"
                      disabled={publishLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Data da Publicação <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={publishData.publicationDate}
                      onChange={(e) => setPublishData({ ...publishData, publicationDate: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                      disabled={publishLoading}
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleClosePublishModal}
                      disabled={publishLoading}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={publishLoading}
                      className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {publishLoading ? 'Publicando...' : 'Publicar Pauta'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </CCRPageWrapper>
  );
}
