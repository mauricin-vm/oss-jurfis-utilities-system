'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationListForm } from '../../components/notification-list-form';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';

export default function NovaListaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  // Se é EXTERNAL, não renderizar o conteúdo (redirecionamento já está acontecendo)
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  return (
    <CCRPageWrapper
      title="Novo"
      breadcrumbs={[
        { label: 'Menu', href: '/' },
        { label: 'CCR', href: '/ccr' },
        { label: 'Intimações', href: '/ccr/intimacoes' },
        { label: 'Novo' }
      ]}
    >
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
