'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, CheckCircle, User, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

interface Tramitation {
  id: string;
  processNumber: string;
  purpose: string;
  status: string;
  requestDate: Date;
  deadline?: Date | null;
  returnDate?: Date | null;
  observations?: string | null;
  destination?: string | null;
  protocol?: {
    id: string;
    number: string;
    presenter: string;
  } | null;
  sector?: {
    id: string;
    name: string;
    abbreviation?: string | null;
  } | null;
  member?: {
    id: string;
    name: string;
    role?: string | null;
  } | null;
  resource?: {
    id: string;
    processNumber: string;
  } | null;
  createdByUser: {
    id: string;
    name: string;
  };
}

interface TramitationCardProps {
  tramitation: Tramitation;
  onMarkAsReceived?: (id: string) => void;
  onDelete?: (id: string, processNumber: string) => void;
  userRole?: string;
}

const purposeLabels: Record<string, string> = {
  SOLICITAR_PROCESSO: 'Solicitar Processo',
  CONTRARRAZAO: 'Contrarrazão',
  PARECER_PGM: 'Parecer PGM',
  JULGAMENTO: 'Julgamento',
  DILIGENCIA: 'Diligência',
  OUTRO: 'Outro',
};

export function TramitationCard({ tramitation, onMarkAsReceived, onDelete, userRole }: TramitationCardProps) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const canDelete = (userRole === 'ADMIN' || userRole === 'EMPLOYEE') && tramitation.status === 'PENDENTE';

  const handleMarkAsReceived = async () => {
    if (onMarkAsReceived) {
      toast.warning('Tem certeza que deseja marcar esta tramitação como entregue?', {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            setActionLoading('mark-received');
            setLoading(true);
            try {
              await onMarkAsReceived(tramitation.id);
            } finally {
              setLoading(false);
              setActionLoading(null);
            }
          },
        },
        cancel: {
          label: 'Cancelar',
          onClick: () => {},
        },
      });
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      toast.warning('Tem certeza que deseja excluir esta tramitação?', {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            setActionLoading('delete');
            await onDelete(tramitation.id, tramitation.processNumber);
            setActionLoading(null);
          },
        },
        cancel: {
          label: 'Cancelar',
          onClick: () => {},
        },
      });
    }
  };

  // Determinar destino
  const destination = tramitation.sector
    ? tramitation.sector.abbreviation || tramitation.sector.name
    : tramitation.member
    ? tramitation.member.name
    : tramitation.destination || 'Não especificado';

  // Verificar se o fluxo deve ser invertido (quando está solicitando processo)
  const isRequestingProcess = tramitation.purpose === 'SOLICITAR_PROCESSO';

  // Verificar se está vencida
  const isOverdue =
    tramitation.status === 'PENDENTE' &&
    tramitation.deadline &&
    new Date(tramitation.deadline) < new Date();

  return (
    <Card className="px-6 pt-4 pb-4">
      {/* Header com número do processo e ação/status */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            {tramitation.resource ? (
              <Link
                href={`/ccr/recursos/${tramitation.resource.id}`}
                className="text-lg font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {tramitation.processNumber}
              </Link>
            ) : (
              <h3 className="text-lg font-semibold text-gray-900">
                {tramitation.processNumber}
              </h3>
            )}

            {/* Status Badge */}
            {tramitation.status === 'PENDENTE' ? (
              <>
                {isOverdue ? (
                  <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Vencida
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Pendente
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                Entregue
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isRequestingProcess ? (
              <>
                <span className="font-medium">{destination}</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">JURFIS</span>
              </>
            ) : (
              <>
                <span className="font-medium">JURFIS</span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">{destination}</span>
              </>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2">
          {tramitation.status === 'PENDENTE' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAsReceived}
                disabled={loading || actionLoading !== null}
                className="cursor-pointer"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Marcar Entregue
              </Button>
              {canDelete && onDelete && (
                <TooltipWrapper content="Excluir tramitação">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    disabled={actionLoading !== null}
                    className="cursor-pointer h-8 w-8"
                  >
                    {actionLoading === 'delete' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
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

      {/* Observações */}
      {tramitation.observations && (
        <div className="mb-1.5">
          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border">
            {tramitation.observations}
          </p>
        </div>
      )}

      {/* Informações em Grid */}
      <div className="grid grid-cols-4 gap-3 mb-1.5 mt-2">
        {/* Finalidade */}
        <div className="flex items-center gap-2 text-sm">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Finalidade</p>
            <p className="font-medium text-xs truncate">{purposeLabels[tramitation.purpose] || tramitation.purpose}</p>
          </div>
        </div>

        {/* Enviado */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Enviado:</p>
            <p className="font-medium text-xs">
              {format(new Date(tramitation.requestDate), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* Prazo ou Data de Entrega */}
        {tramitation.status === 'ENTREGUE' && tramitation.returnDate ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Entregue em:</p>
              <p className="font-medium text-xs">
                {format(new Date(tramitation.returnDate), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        ) : tramitation.deadline ? (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Prazo:</p>
              <p className={cn("font-medium text-xs", isOverdue && "text-red-600")}>
                {format(new Date(tramitation.deadline), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
          </div>
        ) : null}

        {/* Responsável */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Responsável</p>
            <p className="font-medium text-xs truncate">{tramitation.createdByUser.name}</p>
          </div>
        </div>
      </div>

      {/* Apresentante */}
      {tramitation.protocol?.presenter && (
        <div className="border-t pt-1.5">
          <p className="text-sm text-muted-foreground mb-1">Apresentante:</p>
          <p className="text-sm font-medium">{tramitation.protocol.presenter}</p>
        </div>
      )}
    </Card>
  );
}

// Ícone de prédio
function Building2Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
