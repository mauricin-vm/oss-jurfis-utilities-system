'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../../../components/ccr-page-wrapper';
import { NotificationListTable } from './components/notification-list-table';
import { toast } from 'sonner'; // Used by fetchLists

interface NotificationList {
  id: string;
  listNumber: string;
  sequenceNumber: number;
  year: number;
  type: string;
  status: string;
  items: {
    id: string;
    resource: {
      id: string;
      resourceNumber: string;
      processNumber: string;
      processName: string | null;
    };
    attempts: {
      id: string;
      channel: string;
      status: string;
      deadline: Date;
    }[];
  }[];
  createdByUser: {
    id: string;
    name: string | null;
  };
  _count: {
    items: number;
  };
  createdAt: Date;
}

export default function IntimacoesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [lists, setLists] = useState<NotificationList[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ccr/intimacoes');
      if (response.ok) {
        const data = await response.json();
        setLists(data);
      } else {
        toast.error('Erro ao carregar listas de intimações');
      }
    } catch (error) {
      console.error('Error fetching summons lists:', error);
      toast.error('Erro ao carregar listas de intimações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const handleNewList = () => {
    router.push('/ccr/intimacoes/nova');
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Intimações' }
  ];

  return (
    <CCRPageWrapper title="Listas de Intimações" breadcrumbs={breadcrumbs}>
      <NotificationListTable
        data={lists}
        loading={loading}
        onRefresh={fetchLists}
        onNewList={handleNewList}
        userRole={session?.user?.role}
      />
    </CCRPageWrapper>
  );
}
