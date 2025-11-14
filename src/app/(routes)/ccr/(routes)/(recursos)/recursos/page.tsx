'use client';

import { useEffect, useState } from 'react';
import { ResourceTable } from './components/resource-table';
import { CCRPageWrapper } from '../../../components/ccr-page-wrapper';

interface Resource {
  id: string;
  resourceNumber: string;
  sequenceNumber: number;
  year: number;
  processNumber: string;
  processName: string | null;
  status: string;
  type: string;
  createdAt: Date;
  protocol: {
    id: string;
    number: string;
    processNumber: string;
    presenter: string;
    employee: {
      id: string;
      name: string;
      email: string;
    };
  };
  parts: Array<{
    id: string;
    name: string;
    role: string;
    document: string | null;
  }>;
  subjects: Array<{
    subject: {
      id: string;
      name: string;
      parentId: string | null;
    };
  }>;
  _count?: {
    documents: number;
    sessions: number;
    registrations: number;
  };
}

export default function RecursosPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ccr/resources');
      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CCRPageWrapper title="Recursos">
      <ResourceTable
        data={resources}
        loading={loading}
        onRefresh={fetchResources}
      />
    </CCRPageWrapper>
  );
}
