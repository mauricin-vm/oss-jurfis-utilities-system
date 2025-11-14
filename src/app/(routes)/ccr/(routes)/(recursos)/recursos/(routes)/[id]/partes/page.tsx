'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { AuthoritiesForm } from './authorities-form';

interface Resource {
  id: string;
  resourceNumber: string;
  authorities: Array<{
    id: string;
    type: string;
    authorityRegisteredId: string;
    authorityRegistered: {
      id: string;
      name: string;
      isActive: boolean;
    };
  }>;
  parts: Array<{
    id: string;
    name: string;
    role: string;
    registrationType: string | null;
    registrationNumber: string | null;
  }>;
}

export default function EditarPartesPage() {
  const router = useRouter();
  const params = useParams();
  const [resource, setResource] = useState<Resource | null>(null);
  const [registeredAuthorities, setRegisteredAuthorities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar recurso e autoridades em paralelo
      const [resourceResponse, authoritiesResponse] = await Promise.all([
        fetch(`/api/ccr/resources/${params.id}`),
        fetch('/api/ccr/authorities-registered')
      ]);

      if (resourceResponse.ok) {
        const data = await resourceResponse.json();
        setResource(data);
      }

      if (authoritiesResponse.ok) {
        const authoritiesData = await authoritiesResponse.json();
        setRegisteredAuthorities(authoritiesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Recursos', href: '/ccr/recursos' },
    { label: resource?.resourceNumber || 'Carregando...', href: `/ccr/recursos/${params.id}` },
    { label: 'Partes Interessadas' }
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Editar Partes Interessadas" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <CardTitle>Editar Partes Interessadas</CardTitle>
            <CardDescription>
              Gerencie as partes interessadas vinculadas ao recurso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Partes */}
              <div className="space-y-4">
                <Skeleton className="h-7 w-20" />

                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex flex-wrap gap-3 items-start">
                      <div className="flex-1 min-w-[200px]">
                        {i === 0 && <Skeleton className="h-4 w-16 mb-1.5" />}
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="w-full sm:w-[200px]">
                        {i === 0 && <Skeleton className="h-4 w-12 mb-1.5" />}
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="w-full sm:w-[230px]">
                        {i === 0 && <Skeleton className="h-4 w-28 mb-1.5" />}
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="w-full sm:w-[230px]">
                        {i === 0 && <Skeleton className="h-4 w-24 mb-1.5" />}
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className={i === 0 ? "pt-[28px]" : ""}>
                        <Skeleton className="h-10 w-10" />
                      </div>
                    </div>
                  ))}
                </div>

                <Skeleton className="h-10 w-full" />
              </div>

              {/* Autoridades */}
              <div className="space-y-4">
                <Skeleton className="h-7 w-28" />

                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex flex-wrap gap-3 items-start">
                      <div className="w-full sm:w-[calc((100%-40px-1.5rem)/3)]">
                        {i === 0 && <Skeleton className="h-4 w-32 mb-1.5" />}
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="w-full sm:w-[calc((100%-40px-1.5rem)*2/3)]">
                        {i === 0 && <Skeleton className="h-4 w-24 mb-1.5" />}
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className={i === 0 ? "pt-[28px]" : ""}>
                        <Skeleton className="h-10 w-10" />
                      </div>
                    </div>
                  ))}
                </div>

                <Skeleton className="h-10 w-full" />
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-4 pt-4 border-t">
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
      <CCRPageWrapper title="Editar Partes Interessadas" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Recurso não encontrado</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Editar Partes Interessadas" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>Editar Partes Interessadas</CardTitle>
          <CardDescription>
            Gerencie as partes interessadas vinculadas ao recurso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthoritiesForm initialData={resource} registeredAuthorities={registeredAuthorities} />
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
