'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TramitationForm } from '../../components/tramitation-form';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';

export default function NovaTramitacaoPage() {
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
      title="Nova Tramitação"
      breadcrumbs={[
        { label: 'Menu', href: '/' },
        { label: 'CCR', href: '/ccr' },
        { label: 'Tramitações', href: '/ccr/tramitacoes' },
        { label: 'Nova' }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Tramitação</CardTitle>
          <CardDescription>
            Preencha as informações da nova tramitação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TramitationForm />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
