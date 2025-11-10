'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProtocolForm } from '../../components/protocol-form';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';

export default function NovoProtocoloPage() {
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
      title="Novo Protocolo"
      breadcrumbs={[
        { label: 'Menu', href: '/' },
        { label: 'CCR', href: '/ccr' },
        { label: 'Protocolos', href: '/ccr/protocolos' },
        { label: 'Novo' }
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle>Cadastrar Protocolo</CardTitle>
          <CardDescription>
            Preencha as informações do novo protocolo. O número será gerado automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProtocolForm />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
