'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { MinutesTable } from './components/minutes-table';
import { CCRPageWrapper } from '../../../components/ccr-page-wrapper';

interface Minutes {
  id: string;
  minutesNumber: string;
  sequenceNumber: number;
  year: number;
  ordinalNumber: number;
  ordinalType: string;
  endTime: string;
  administrativeMatters?: string | null;
  createdAt: Date;
  president: {
    id: string;
    name: string;
  } | null;
  session?: {
    id: string;
    sessionNumber: string;
  } | null;
  _count?: {
    presentMembers: number;
    absentMembers: number;
    distributions: number;
  };
}

export default function AtasPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [minutes, setMinutes] = useState<Minutes[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    fetchMinutes();
  }, []);

  const fetchMinutes = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ccr/minutes');
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

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  // Se é EXTERNAL, não renderizar o conteúdo (redirecionamento já está acontecendo)
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  return (
    <CCRPageWrapper title="Atas">
      <MinutesTable
        data={minutes}
        loading={loading}
        onRefresh={fetchMinutes}
        onNewMinutes={() => router.push('/ccr/atas/novo')}
        userRole={session?.user?.role}
      />
    </CCRPageWrapper>
  );
}
