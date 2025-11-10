'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ProtocolForm } from '../../components/protocol-form';
import { ProtocolFormSkeleton } from '../../components/protocol-form-skeleton';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';

interface Protocol {
  id: string;
  number: string;
  processNumber: string;
  presenter: string;
  status: string;
  createdAt: string;
  parts: Array<{
    part: {
      id: string;
      name: string;
      role: string;
      document: string | null;
      contacts: Array<{
        id: string;
        type: string;
        value: string;
        isPrimary: boolean;
      }>;
    };
  }>;
  resource?: any;
}

export default function EditarProtocoloPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    if (params.id) {
      fetchProtocol();
    }
  }, [params.id]);

  const fetchProtocol = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/protocols/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProtocol(data);
      }
    } catch (error) {
      console.error('Error fetching protocol:', error);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Protocolos', href: '/ccr/protocolos' },
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
      <CCRPageWrapper title="Editar Protocolo" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-96 mt-1.5" />
          </CardHeader>
          <CardContent>
            <ProtocolFormSkeleton />
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!protocol) {
    return (
      <CCRPageWrapper title="Editar Protocolo" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Protocolo não encontrado</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Editar Protocolo" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>Editar Protocolo</CardTitle>
          <CardDescription>
            Atualize as informações do protocolo.
            {protocol.resource && ' (Convertido em recurso - visualização apenas)'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtocolForm initialData={{
            ...protocol,
            parts: protocol.parts.map(p => p.part),
            document: protocol.parts[0]?.part?.document ?? undefined,
          }} />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
