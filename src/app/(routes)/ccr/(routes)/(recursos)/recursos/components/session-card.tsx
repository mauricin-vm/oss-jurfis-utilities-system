'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '../../../../hooks/resource-status';

interface SessionCardProps {
  sessionResource: {
    id: string;
    order: number;
    status: string;
    minutesText?: string | null;
    session: {
      id: string;
      sessionNumber: number;
      date: Date;
      status: string;
    };
    distribution?: {
      firstDistribution: {
        id: string;
        name: string;
        role: string;
      } | null;
      distributedTo: {
        id: string;
        name: string;
        role: string;
      } | null;
      reviewers: Array<{
        id: string;
        name: string;
        role: string;
      }>;
    } | null;
    results: Array<{
      id: string;
      votingType: string;
      status: string;
      preliminaryDecision?: {
        id: string;
        identifier: string;
        type: string;
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
      }>;
    }>;
  };
}

const resourceStatusColors: Record<string, string> = {
  EM_PAUTA: 'bg-blue-50 border-blue-400',
  SUSPENSO: 'bg-amber-50 border-amber-400',
  DILIGENCIA: 'bg-cyan-50 border-cyan-400',
  PEDIDO_VISTA: 'bg-rose-50 border-rose-400',
  JULGADO: 'bg-emerald-50 border-emerald-400',
};

export function SessionCard({ sessionResource }: SessionCardProps) {
  const router = useRouter();

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatReviewers = (reviewers: Array<{ name: string }>) => {
    if (reviewers.length === 0) return '-';
    if (reviewers.length === 1) return reviewers[0].name;
    if (reviewers.length === 2) return `${reviewers[0].name} e ${reviewers[1].name}`;
    const lastReviewer = reviewers[reviewers.length - 1];
    const otherReviewers = reviewers.slice(0, -1);
    return `${otherReviewers.map((r) => r.name).join(', ')} e ${lastReviewer.name}`;
  };

  const isSessionCompleted = sessionResource.session.status === 'CONCLUIDA';
  const hasResults = sessionResource.results && sessionResource.results.length > 0;

  return (
    <div
      className={cn(
        'rounded-lg border p-6',
        sessionResource.status === 'EM_PAUTA'
          ? 'bg-white'
          : resourceStatusColors[sessionResource.status] || 'bg-white'
      )}
    >
      {/* Cabeçalho do Card */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm flex-shrink-0 transition-colors',
              'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {sessionResource.order}
          </div>

          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/ccr/sessoes/${sessionResource.session.id}`}
                  target="_blank"
                  className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Sessão {sessionResource.session.sessionNumber}
                </Link>
                {sessionResource.status !== 'EM_PAUTA' && (
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit',
                      getResourceStatusColor(sessionResource.status as ResourceStatusKey)
                    )}
                  >
                    {getResourceStatusLabel(sessionResource.status as ResourceStatusKey)}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatDate(sessionResource.session.date)}
              </div>
            </div>

            <div className="space-y-0.5 text-sm">
              {sessionResource.distribution?.firstDistribution && (
                <div>
                  <span className="font-medium">Relator: </span>
                  <span className="text-muted-foreground">
                    {sessionResource.distribution.firstDistribution.name}
                  </span>
                </div>
              )}
              {sessionResource.distribution &&
                sessionResource.distribution.reviewers &&
                sessionResource.distribution.reviewers.length > 0 && (
                  <div>
                    <span className="font-medium">
                      {sessionResource.distribution.reviewers.length === 1
                        ? 'Revisor: '
                        : 'Revisores: '}
                    </span>
                    <span className="text-muted-foreground">
                      {formatReviewers(sessionResource.distribution.reviewers)}
                    </span>
                  </div>
                )}
              {sessionResource.distribution?.distributedTo && (
                <div>
                  <span className="font-medium">Distribuição: </span>
                  <span className="text-muted-foreground">
                    {sessionResource.distribution.distributedTo.name}
                  </span>
                </div>
              )}
            </div>

            {/* Texto da Ata - aparece quando há resultado */}
            {sessionResource.status !== 'EM_PAUTA' && sessionResource.minutesText && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm">
                  <span className="font-medium">Texto da Ata: </span>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-justify">
                    {sessionResource.minutesText}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer h-9"
            onClick={() =>
              router.push(
                `/ccr/sessoes/${sessionResource.session.id}/processos/${sessionResource.id}/julgar`
              )
            }
          >
            <FileText className="h-4 w-4 mr-2" />
            {isSessionCompleted ? 'Detalhes' : 'Julgar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
