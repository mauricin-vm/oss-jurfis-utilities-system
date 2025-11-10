'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ProtocolTable } from './components/protocol-table';
import { CCRPageWrapper } from '../../../components/ccr-page-wrapper';

interface Protocol {
  id: string;
  number: string;
  processNumber: string;
  presenter: string;
  status: string;
  createdAt: Date;
  isLatest: boolean; // Flag que indica se é o último protocolo criado
  employee: {
    id: string;
    name: string;
  };
  _count?: {
    tramitations: number;
  };
  resource?: any;
}

export default function ProtocolosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    fetchProtocols();
  }, []);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ccr/protocols');
      if (response.ok) {
        const data = await response.json();
        setProtocols(data);
      }
    } catch (error) {
      console.error('Error fetching protocols:', error);
    } finally {
      setLoading(false);
    }
  };

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  // Se é EXTERNAL, não renderizar o conteúdo (redirecionamento já está acontecendo)
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  return (
    <CCRPageWrapper title="Protocolos">
      <ProtocolTable
        data={protocols}
        loading={loading}
        onRefresh={fetchProtocols}
        onNewProtocol={() => router.push('/ccr/protocolos/novo')}
        userRole={session?.user?.role}
      />
    </CCRPageWrapper>
  );
}
