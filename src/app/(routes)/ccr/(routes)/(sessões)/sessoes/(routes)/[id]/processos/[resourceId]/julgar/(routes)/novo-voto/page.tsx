'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CCRPageWrapper } from '@/app/(routes)/ccr/components/ccr-page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { SessionVoteForm } from './components/session-vote-form';

interface JudgmentData {
  sessionResource: {
    id: string;
    resource: {
      processNumber: string;
      resourceNumber: string;
    };
  };
  session: {
    id: string;
    sessionNumber: string;
    status: string;
    members: Array<{
      member: {
        id: string;
        name: string;
        role: string;
      };
    }>;
  };
  distribution: {
    distributedToId: string;
    firstDistribution: {
      id: string;
      name: string;
      role: string;
    } | null;
  } | null;
  reviewers: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  preliminaryDecisions: Array<{
    id: string;
    identifier: string;
    type: string;
    rejectText?: string | null;
  }>;
  meritDecisions: Array<{
    id: string;
    identifier: string;
    type: string;
    text?: string | null;
  }>;
  officialDecisions: Array<{
    id: string;
    identifier: string;
    type: string;
    text?: string | null;
  }>;
}

export default function NovoVotoPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<JudgmentData | null>(null);

  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    if (params.id && params.resourceId) {
      fetchData();
    }
  }, [params.id, params.resourceId]);

  // Bloquear acesso se a sessão estiver concluída
  useEffect(() => {
    if (data?.session.status === 'CONCLUIDA') {
      router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`);
    }
  }, [data, params.id, params.resourceId, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/julgar`
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        console.error('Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <CCRPageWrapper
        title="Novo Voto"
        breadcrumbs={[
          { label: 'Menu', href: '/' },
          { label: 'CCR', href: '/ccr' },
          { label: 'Sessões', href: '/ccr/sessoes' },
          { label: 'Sessão' },
          { label: 'Julgar' },
          { label: 'Novo Voto' },
        ]}
      >
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Registrar Voto</CardTitle>
              <CardDescription>
                Preencha os dados para registrar o voto do membro no processo.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Membro e Tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-0">
                  <Skeleton className="h-4 w-16 mb-1.5" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-0">
                  <Skeleton className="h-4 w-12 mb-1.5" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Decisões */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-0">
                  <Skeleton className="h-4 w-24 mb-1.5" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-0">
                  <Skeleton className="h-4 w-20 mb-1.5" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Campo de texto do voto */}
              <div className="space-y-0">
                <Skeleton className="h-4 w-12 mb-1.5" />
                <Skeleton className="h-32 w-full" />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (session?.user?.role === 'EXTERNAL' || !data) {
    return null;
  }

  return (
    <CCRPageWrapper
      title="Novo Voto"
      breadcrumbs={[
        { label: 'Menu', href: '/' },
        { label: 'CCR', href: '/ccr' },
        { label: 'Sessões', href: '/ccr/sessoes' },
        { label: `Sessão n. ${data.session.sessionNumber}`, href: `/ccr/sessoes/${params.id}` },
        { label: `Julgar n. ${data.sessionResource.resource.resourceNumber}`, href: `/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar` },
        { label: 'Novo Voto' },
      ]}
    >
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <CardTitle>Registrar Voto</CardTitle>
            <CardDescription>
              Registre o voto individual dos membros.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <SessionVoteForm
            sessionId={params.id as string}
            resourceId={params.resourceId as string}
            members={data.session.members.map(m => m.member)}
            distributedToId={data.distribution?.distributedToId}
            relatorId={data.distribution?.firstDistribution?.id}
            reviewersIds={data.reviewers.map(r => r.id)}
            preliminaryDecisions={data.preliminaryDecisions}
            meritDecisions={data.meritDecisions}
            officialDecisions={data.officialDecisions}
          />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
