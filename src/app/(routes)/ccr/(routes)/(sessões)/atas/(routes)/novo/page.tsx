'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MinutesForm } from '../../components/minutes-form';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';

export default function NovaAtaPage() {
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
      title="Nova Ata"
      breadcrumbs={[
        { label: 'Menu', href: '/' },
        { label: 'CCR', href: '/ccr' },
        { label: 'Atas', href: '/ccr/atas' },
        { label: 'Nova' }
      ]}
    >
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <CardTitle>Cadastrar Ata</CardTitle>
            <CardDescription>
              Preencha as informações da nova ata. O número será gerado automaticamente.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <MinutesForm />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
