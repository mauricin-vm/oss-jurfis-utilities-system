'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Calendar, Clock, Users, FileText, CheckCircle2, Crown, PlayCircle, Newspaper, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  PUBLICACAO: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  PENDENTE: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  CONCLUIDA: 'bg-green-100 text-green-800 hover:bg-green-100',
  CANCELADA: 'bg-red-100 text-red-800 hover:bg-red-100',
};

const statusLabels: Record<string, string> = {
  PUBLICACAO: 'Aguardando Publicação',
  PENDENTE: 'Pauta Publicada',
  CONCLUIDA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

const statusIcons: Record<string, React.ReactNode> = {
  PUBLICACAO: <Newspaper className="h-3.5 w-3.5" />,
  PENDENTE: <Clock className="h-3.5 w-3.5" />,
  CONCLUIDA: <CheckCircle2 className="h-3.5 w-3.5" />,
  CANCELADA: <X className="h-3.5 w-3.5" />,
};

export function SessionCard({ session }: SessionCardProps) {
  const router = useRouter();

  // Garantir que a data seja interpretada corretamente (sem conversão de timezone)
  const sessionDate = new Date(session.date);
  const adjustedDate = new Date(sessionDate.getTime() + sessionDate.getTimezoneOffset() * 60000);

  const totalProcesses = session.resources?.length || 0;
  const processedResources = session.resources?.filter(
    (r) => ['JULGADO', 'SUSPENSO', 'DILIGENCIA', 'PEDIDO_VISTA'].includes(r.status)
  ).length || 0;
  const progress = totalProcesses > 0 ? (processedResources / totalProcesses) * 100 : 0;

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
            {format(adjustedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => router.push(`/ccr/sessoes/${session.id}`)}
          >
            <FileText className="h-4 w-4 mr-2" />
            Detalhes
          </Button>
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
            {processedResources} de {totalProcesses} processos analisados
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
    </Card>
  );
}
