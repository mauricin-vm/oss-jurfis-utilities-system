'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { ResourceForm } from './resource-form';

interface Resource {
  id: string;
  resourceNumber: string;
  processNumber: string;
  processName: string | null;
  type: string;
  status: string;
  attachedProcesses: string[];
}

export default function EditarRecursoPage() {
  const router = useRouter();
  const params = useParams();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchResource();
    }
  }, [params.id]);

  const fetchResource = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/resources/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setResource(data);
      }
    } catch (error) {
      console.error('Error fetching resource:', error);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Recursos', href: '/ccr/recursos' },
    { label: resource?.resourceNumber || 'Carregando...', href: `/ccr/recursos/${params.id}` },
    { label: 'Editar' }
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Editar Recurso" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <CardTitle>Editar Recurso</CardTitle>
            <CardDescription>
              Atualize o status, tipo e informações gerais do recurso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Linha 1: Número do Recurso e Número do Processo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Linha 2: Status e Tipo de Recurso */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>

              {/* Nome do Processo */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>

              {/* Processos Apensos */}
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-3 w-48" />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!resource) {
    return (
      <CCRPageWrapper title="Editar Recurso" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Recurso não encontrado</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Editar Recurso" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>Editar Recurso</CardTitle>
          <CardDescription>
            Atualize o status, tipo e informações gerais do recurso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResourceForm initialData={resource} />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
