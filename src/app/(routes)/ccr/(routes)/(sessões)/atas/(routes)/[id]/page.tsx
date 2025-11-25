'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MinutesForm } from '../../components/minutes-form';
import { MinutesFormSkeleton } from '../../components/minutes-form-skeleton';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';

interface Minutes {
  id: string;
  minutesNumber: string;
  sequenceNumber: number;
  year: number;
  ordinalNumber: number;
  ordinalType: string;
  endTime: string;
  administrativeMatters?: string | null;
  sessionId?: string | null;
  presidentId?: string | null;
  createdAt: string;
  presentMembers: Array<{
    id: string;
    memberId: string;
  }>;
  absentMembers: Array<{
    id: string;
    memberId: string;
    isJustified: boolean;
    justification?: string | null;
  }>;
  distributions: Array<{
    id: string;
    distributionId: string;
  }>;
}

export default function EditarAtaPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [minutes, setMinutes] = useState<Minutes | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    if (params.id) {
      fetchMinutes();
    }
  }, [params.id]);

  const fetchMinutes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/minutes/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setMinutes(data);
      }
    } catch (error) {
      console.error('Error fetching minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Atas', href: '/ccr/atas' },
    { label: 'Editar' }
  ];

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  // Se é EXTERNAL, não renderizar o conteúdo (redirecionamento já está acontecendo)
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title="Editar Ata" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Editar Ata</CardTitle>
              <CardDescription>
                Atualize as informações da ata.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <MinutesFormSkeleton />
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!minutes) {
    return (
      <CCRPageWrapper title="Editar Ata" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Ata não encontrada</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Editar Ata" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <CardTitle>Editar Ata</CardTitle>
            <CardDescription>
              Atualize as informações da ata.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <MinutesForm initialData={minutes} />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
