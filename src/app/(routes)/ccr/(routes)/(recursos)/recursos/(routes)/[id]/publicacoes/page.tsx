'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';

interface Publication {
  id: string;
  type: string;
  publicationNumber: string;
  publicationDate: Date;
  session?: {
    id: string;
    sessionNumber: string;
  } | null;
}

interface Resource {
  id: string;
  resourceNumber: string;
}

const publicationTypeLabels: Record<string, string> = {
  SESSAO: 'Sessão',
  ACORDAO: 'Acórdão',
  CIENCIA: 'Ciência',
};

const publicationTypeColors: Record<string, string> = {
  SESSAO: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  ACORDAO: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
  CIENCIA: 'bg-violet-100 text-violet-700 hover:bg-violet-100',
};

export default function ResourcePublicationsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [resource, setResource] = useState<Resource | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar recurso
      const resourceResponse = await fetch(`/api/ccr/resources/${params.id}`);
      if (resourceResponse.ok) {
        const data = await resourceResponse.json();
        setResource(data);
      }

      // Buscar publicações do recurso
      const publicationsResponse = await fetch(`/api/ccr/resources/${params.id}/publications`);
      if (publicationsResponse.ok) {
        const data = await publicationsResponse.json();
        setPublications(data);
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
    { label: 'Publicações' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Publicações do Recurso" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Publicações</CardTitle>
            <CardDescription>
              Visualize todas as publicações relacionadas ao recurso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Skeleton className="h-4 w-4" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Informações da Sessão */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <Skeleton className="h-3 w-12 mb-1" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Publicações do Recurso" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Publicações</CardTitle>
          <CardDescription>
            Visualize todas as publicações relacionadas ao recurso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publications.length === 0 ? (
            <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Nenhuma publicação encontrada
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  As publicações do recurso aparecerão aqui
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {publications.map((publication) => {
                const publicationDate = new Date(publication.publicationDate);
                const adjustedDate = new Date(publicationDate.getTime() + publicationDate.getTimezoneOffset() * 60000);

                return (
                  <div
                    key={publication.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-semibold">
                            Publicação n. {publication.publicationNumber}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={publicationTypeColors[publication.type]}
                          >
                            {publicationTypeLabels[publication.type]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4" />
                            <span>
                              {format(adjustedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Informações da Sessão (se for publicação de sessão) */}
                    {publication.session && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm">
                          <p className="text-xs text-muted-foreground mb-0.5">Sessão</p>
                          <Link
                            href={`/ccr/sessoes/${publication.session.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Pauta n. {publication.session.sessionNumber}
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
