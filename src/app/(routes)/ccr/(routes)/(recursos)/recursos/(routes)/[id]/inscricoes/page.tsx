'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { ValuesForm } from './values-form';

interface Resource {
  id: string;
  resourceNumber: string;
  registrations: Array<{
    id: string;
    type: string;
    registrationNumber: string;
    cep: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    values: Array<{
      id: string;
      description: string | null;
      amount: number;
      dueDate: Date | null;
    }>;
  }>;
}

export default function EditarInscricoesPage() {
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
    { label: 'Inscrições' }
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Editar Inscrições" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <CardTitle>Editar Inscrições</CardTitle>
            <CardDescription>
              Gerencie as inscrições e débitos relacionados ao recurso.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="space-y-6">
              {/* Lista de Inscrições */}
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="border rounded-lg">
                    {/* Header do Card */}
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-5" />
                          <Skeleton className="h-5 w-40" />
                        </div>
                        <Skeleton className="h-4 w-32" />
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-24" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-9" />
                    </div>

                    {/* Conteúdo Expansível */}
                    <div className="px-4 pb-4 space-y-4 border-t">
                      {/* Linha 1: Tipo + Número + CEP + Rua */}
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-12" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2 md:col-span-3">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>

                      {/* Linha 2: Número + Complemento + Bairro + Cidade + Estado */}
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-20" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      </div>

                      {/* Débitos */}
                      <div className="mt-6 space-y-3 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-9 w-40" />
                        </div>

                        <div className="space-y-3">
                          {Array.from({ length: 2 }).map((_, j) => (
                            <div key={j} className="flex gap-3 items-start">
                              <div className="flex-1 min-w-0">
                                {j === 0 && <Skeleton className="h-4 w-20 mb-1.5" />}
                                <Skeleton className="h-10 w-full" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {j === 0 && <Skeleton className="h-4 w-12 mb-1.5" />}
                                <Skeleton className="h-10 w-full" />
                              </div>
                              <div className="flex-1 min-w-0">
                                {j === 0 && <Skeleton className="h-4 w-32 mb-1.5" />}
                                <Skeleton className="h-10 w-full" />
                              </div>
                              <div className={j === 0 ? "pt-[28px]" : ""}>
                                <Skeleton className="h-10 w-10" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão Adicionar Inscrição */}
              <Skeleton className="h-10 w-full" />

              {/* Botões de Ação */}
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
      <CCRPageWrapper title="Editar Inscrições" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Recurso não encontrado</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Editar Inscrições" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>Editar Inscrições</CardTitle>
          <CardDescription>
            Gerencie as inscrições e débitos relacionados ao recurso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ValuesForm initialData={resource} />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
