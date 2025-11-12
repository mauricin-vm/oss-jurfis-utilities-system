'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar,
  Clock,
  Users,
  FileText,
  Play,
  StopCircle,
  Plus,
  Trash2,
  Loader2,
  Gavel,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SessionForm } from '../components/session-form';

interface Session {
  id: string;
  sessionNumber: string;
  sequenceNumber: number;
  year: number;
  ordinalNumber: number;
  date: Date;
  type: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  agenda: string | null;
  observations: string | null;
  status: string;
  presidentId: string | null;
  sessionResources: Array<{
    id: string;
    agendaOrder: number;
    observations: string | null;
    result: string | null;
    resource: {
      id: string;
      resourceNumber: number;
      fiscalYear: number;
      totalValue: number | null;
      protocol: {
        id: string;
        number: string;
        subject: string;
        protocolParts: Array<{
          part: {
            id: string;
            name: string;
          };
        }>;
      };
    };
    rapporteur: {
      id: string;
      name: string;
      position: string;
    } | null;
    _count: {
      votes: number;
    };
  }>;
  votes: Array<{
    id: string;
    voteType: string;
    justification: string | null;
    member: {
      id: string;
      name: string;
      position: string;
    };
    sessionResource: {
      resource: {
        id: string;
        resourceNumber: number;
        fiscalYear: number;
      };
    };
    createdAt: Date;
  }>;
  _count: {
    sessionResources: number;
    votes: number;
  };
}

const resultLabels: Record<string, string> = {
  PROCEDENTE: 'Procedente',
  IMPROCEDENTE: 'Improcedente',
  PARCIALMENTE_PROCEDENTE: 'Parcialmente Procedente',
  ADIADO: 'Adiado',
};

const voteTypeLabels: Record<string, string> = {
  PROCEDENTE: 'Procedente',
  IMPROCEDENTE: 'Improcedente',
  PARCIALMENTE_PROCEDENTE: 'Parcialmente Procedente',
  ABSTEM: 'Abstenção',
};

export default function VisualizarSessaoPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchSession();
    }
  }, [params.id]);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/sessions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSession(data);
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <CCRPageWrapper title="Visualizar Sessão">
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!session) {
    return (
      <CCRPageWrapper title="Visualizar Sessão">
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Sessão não encontrada</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper
      title={`Sessão ${session.sessionNumber}`}
      description={format(new Date(session.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
    >
      <div className="flex justify-end mb-4">
        {session.status === 'PENDENTE' && (
          <Button onClick={() => router.push(`/ccr/sessoes/${session.id}/votacao`)}>
            <Gavel className="mr-2 h-4 w-4" />
            Iniciar Votação
          </Button>
        )}
      </div>

      <Tabs defaultValue="detalhes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="recursos">
            Recursos na Pauta ({session._count.sessionResources})
          </TabsTrigger>
          <TabsTrigger value="votos">
            Votações ({session._count.votes})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes">
          <Card>
            <CardHeader>
              <CardTitle>Editar Sessão</CardTitle>
              <CardDescription>
                Atualize as informações da sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SessionForm initialData={session} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recursos">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Recursos na Pauta</CardTitle>
              </div>
              <CardDescription>
                Recursos que serão julgados nesta sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.sessionResources.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">
                    Nenhum recurso vinculado à sessão
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Recorrente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Relator</TableHead>
                        <TableHead>Votos</TableHead>
                        <TableHead>Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.sessionResources.map((sr) => (
                        <TableRow key={sr.id}>
                          <TableCell className="font-medium">
                            {sr.agendaOrder}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <span className="text-sm">
                                {sr.resource.resourceNumber.toString().padStart(4, '0')}/
                                {sr.resource.fiscalYear}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {sr.resource.protocol.number}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {sr.resource.protocol.protocolParts[0]?.part.name || '-'}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(sr.resource.totalValue)}
                          </TableCell>
                          <TableCell>
                            {sr.rapporteur ? (
                              <div className="flex flex-col">
                                <span className="text-sm">{sr.rapporteur.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {sr.rapporteur.position}
                                </span>
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{sr._count.votes}</Badge>
                          </TableCell>
                          <TableCell>
                            {sr.result ? (
                              <Badge>{resultLabels[sr.result] || sr.result}</Badge>
                            ) : (
                              <Badge variant="outline">Aguardando</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="votos">
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <CardTitle>Registro de Votações</CardTitle>
              </div>
              <CardDescription>
                Votos registrados durante a sessão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {session.votes.length === 0 ? (
                <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">Nenhum voto registrado</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Membro</TableHead>
                        <TableHead>Voto</TableHead>
                        <TableHead>Justificativa</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {session.votes.map((vote) => (
                        <TableRow key={vote.id}>
                          <TableCell>
                            {format(new Date(vote.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-sm">
                            {vote.sessionResource.resource.resourceNumber.toString().padStart(4, '0')}/
                            {vote.sessionResource.resource.fiscalYear}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">{vote.member.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {vote.member.position}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge>{voteTypeLabels[vote.voteType] || vote.voteType}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            {vote.justification || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </CCRPageWrapper>
  );
}
