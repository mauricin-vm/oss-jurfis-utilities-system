'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, Users, FileText, CheckCircle2, Crown, PlayCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SessionCardProps {
  session: {
    id: string;
    sessionNumber: string;
    sequenceNumber: number;
    year: number;
    ordinalNumber: number;
    date: Date;
    startTime: string | null;
    endTime?: string | null;
    type: string;
    status: string;
    president?: {
      name: string;
    } | null;
    resources: {
      id: string;
      status: string;
      resource: {
        id: string;
        processNumber: string;
        protocol: {
          presenter: string;
        };
      };
    }[];
    members: {
      id: string;
      member: {
        name: string;
      };
    }[];
  };
}

const statusColors: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  EM_PROGRESSO: 'bg-blue-100 text-blue-800',
  CONCLUIDA: 'bg-green-100 text-green-800',
  CANCELADA: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_PROGRESSO: 'Em Progresso',
  CONCLUIDA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

const statusIcons: Record<string, React.ReactNode> = {
  PENDENTE: <Clock className="h-3.5 w-3.5" />,
  EM_PROGRESSO: <PlayCircle className="h-3.5 w-3.5" />,
  CONCLUIDA: <CheckCircle2 className="h-3.5 w-3.5" />,
  CANCELADA: <CheckCircle2 className="h-3.5 w-3.5" />,
};

const resourceStatusLabels: Record<string, string> = {
  EM_PAUTA: 'Em Pauta',
  SUSPENSO: 'Suspenso',
  DILIGENCIA: 'Diligência',
  PEDIDO_VISTA: 'Pedido Vista',
  JULGADO: 'Julgado',
};

const resourceStatusColors: Record<string, string> = {
  EM_PAUTA: 'bg-blue-100 text-blue-800',
  SUSPENSO: 'bg-yellow-100 text-yellow-800',
  DILIGENCIA: 'bg-purple-100 text-purple-800',
  PEDIDO_VISTA: 'bg-orange-100 text-orange-800',
  JULGADO: 'bg-green-100 text-green-800',
};

export function SessionCard({ session }: SessionCardProps) {
  const router = useRouter();

  const totalProcesses = session.resources?.length || 0;
  const judgedProcesses = session.resources?.filter(
    (r) => r.status === 'JULGADO'
  ).length || 0;
  const progress = totalProcesses > 0 ? (judgedProcesses / totalProcesses) * 100 : 0;

  // Pegar últimos resultados (últimos 2 processos)
  const lastResults = session.resources
    ?.filter((r) => r.status !== 'EM_PAUTA')
    .slice(-2) || [];

  return (
    <Card className="px-6 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold">Pauta n. {session.sessionNumber}</h3>
            <Badge
              variant="secondary"
              className={`${statusColors[session.status]} flex items-center gap-1.5`}
            >
              {statusIcons[session.status]}
              {statusLabels[session.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {new Date(session.date).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => router.push(`/ccr/sessoes/${session.id}`)}
          >
            Ver Detalhes
          </Button>
          {session.status === 'CONCLUIDA' && (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => router.push(`/ccr/sessoes/${session.id}/pauta`)}
            >
              Ver Pauta
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {totalProcesses > 0 && (
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progresso do Julgamento</span>
            <span className="text-sm font-medium text-gray-700">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {judgedProcesses} de {totalProcesses} processos analisados
          </p>
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid-cols-4 gap-3 mb-1.5 mt-2">
        {session.startTime && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Iniciada:</p>
              <p className="font-medium text-xs">{session.startTime}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{totalProcesses} processos</p>
            <p className="font-medium text-xs">Em pauta</p>
          </div>
        </div>

        {session.president && (
          <div className="flex items-center gap-2 text-sm">
            <Crown className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Presidente</p>
              <p className="font-medium text-xs truncate">{session.president.name}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">{session.members?.length || 0} conselheiros</p>
            <p className="font-medium text-xs">Presentes</p>
          </div>
        </div>
      </div>

      {/* Last Results */}
      {lastResults.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Últimos Resultados:</p>
          <div className="space-y-1.5">
            {lastResults.map((result) => (
              <div key={result.id} className="flex items-center justify-between text-sm">
                <Link
                  href={`/ccr/recursos/${result.resource.id}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {result.resource.processNumber}
                </Link>
                <Badge
                  variant="secondary"
                  className={`${resourceStatusColors[result.status]} text-xs`}
                >
                  {resourceStatusLabels[result.status]}
                </Badge>
              </div>
            ))}
            {(session.resources?.length || 0) > 2 && (
              <p className="text-xs text-muted-foreground">
                ... e mais {(session.resources?.length || 0) - 2} resultados
              </p>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
