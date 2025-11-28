'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { NotificationListForm } from '../../components/notification-list-form';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';

const breadcrumbs = [
  { label: 'Menu', href: '/' },
  { label: 'CCR', href: '/ccr' },
  { label: 'Intimações', href: '/ccr/intimacoes' },
  { label: 'Novo' }
];

export default function NovaListaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  // Se ainda está carregando a sessão, mostrar skeleton
  if (status === 'loading') {
    return (
      <CCRPageWrapper title="Novo" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Criar Lista de Intimação</CardTitle>
              <CardDescription>
                Preencha as informações da nova lista de intimações.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Número da Lista e Tipo da Lista */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  // Se é EXTERNAL, não renderizar o conteúdo (redirecionamento já está acontecendo)
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  return (
    <CCRPageWrapper title="Novo" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <CardTitle>Criar Lista de Intimação</CardTitle>
            <CardDescription>
              Preencha as informações da nova lista de intimações.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <NotificationListForm />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
