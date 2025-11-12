'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';
import { Button } from '@/components/ui/button';
import { Pencil, Newspaper, Phone, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { getResourceStatusLabel, getResourceStatusColor } from '../../../../../hooks/resource-status';
import { TramitationCard } from '../../../tramitacoes/components/tramitation-card';
import { toast } from 'sonner';

const typeLabels: Record<string, string> = {
  VOLUNTARIO: 'Voluntário',
  OFICIO: 'Ofício',
};

const formatAttachedProcesses = (processes: string[]) => {
  if (!processes || processes.length === 0) return '-';
  if (processes.length === 1) return processes[0];
  if (processes.length === 2) return `${processes[0]} e ${processes[1]}`;

  const lastProcess = processes[processes.length - 1];
  const otherProcesses = processes.slice(0, -1);
  return `${otherProcesses.join(', ')} e ${lastProcess}`;
};

export default function RecursoDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [resource, setResource] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tramitations, setTramitations] = useState<any[]>([]);
  const [loadingTramitations, setLoadingTramitations] = useState(false);

  useEffect(() => {
    if (params?.id) {
      fetch(`/api/ccr/resources/${params.id}`)
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(setResource)
        .catch(() => router.push('/ccr/recursos'))
        .finally(() => setLoading(false));
    }
  }, [params?.id, router]);

  const fetchTramitations = async () => {
    if (!resource?.processNumber) return;

    try {
      setLoadingTramitations(true);
      const response = await fetch(`/api/ccr/tramitations?processNumber=${encodeURIComponent(resource.processNumber)}`);
      if (response.ok) {
        const data = await response.json();
        setTramitations(data);
      }
    } catch (error) {
      console.error('Error fetching tramitations:', error);
      toast.error('Erro ao carregar tramitações');
    } finally {
      setLoadingTramitations(false);
    }
  };

  useEffect(() => {
    if (resource?.processNumber) {
      fetchTramitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.processNumber]);

  const handleMarkAsReceived = async (id: string) => {
    try {
      const response = await fetch(`/api/ccr/tramitations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ENTREGUE', returnDate: new Date() }),
      });

      if (response.ok) {
        toast.success('Tramitação marcada como recebida');
        fetchTramitations();
      } else {
        throw new Error('Erro ao atualizar tramitação');
      }
    } catch (error) {
      console.error('Error marking as received:', error);
      toast.error('Erro ao marcar tramitação como recebida');
    }
  };

  const handleDeleteTramitation = async (id: string) => {
    try {
      const response = await fetch(`/api/ccr/tramitations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Tramitação removida com sucesso');
        fetchTramitations();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Erro ao remover tramitação');
      }
    } catch (error) {
      console.error('Error deleting tramitation:', error);
      toast.error('Erro ao remover tramitação');
    }
  };

  if (loading) {
    const breadcrumbs = [
      { label: 'Menu', href: '/' },
      { label: 'CCR', href: '/ccr' },
      { label: 'Recursos', href: '/ccr/recursos' },
    ];
    return (
      <CCRPageWrapper title={<Skeleton className="h-8 w-96" />} breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Tabs defaultValue="geral" className="w-full flex flex-col focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
            <TabsList className="grid w-full grid-cols-5 bg-muted h-8 p-px">
              <TabsTrigger value="geral" className="cursor-pointer text-xs h-7 px-2 select-none">Geral</TabsTrigger>
              <TabsTrigger value="tramitacoes" className="cursor-pointer text-xs h-7 px-2 select-none">Tramitações</TabsTrigger>
              <TabsTrigger value="julgamento" className="cursor-pointer text-xs h-7 px-2 select-none">Julgamento</TabsTrigger>
              <TabsTrigger value="documentos" className="cursor-pointer text-xs h-7 px-2 select-none">Documentos</TabsTrigger>
              <TabsTrigger value="historico" className="cursor-pointer text-xs h-7 px-2 select-none">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="mt-6 space-y-6 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
              {/* Card Informações Gerais */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64 mt-1.5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-32 mb-1.5" />
                      <Skeleton className="h-5 w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Cards Assunto e Partes Interessadas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-48 mt-1.5" />
                    </div>
                    <Skeleton className="h-9 w-9" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>

                <div className="bg-white rounded-lg border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex-1">
                      <Skeleton className="h-6 w-40" />
                      <Skeleton className="h-4 w-56 mt-1.5" />
                    </div>
                    <Skeleton className="h-9 w-9" />
                  </div>
                  <div className="space-y-4">
                    <Skeleton className="h-20 w-full" />
                  </div>
                </div>
              </div>

              {/* Card Inscrições */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex-1">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-56 mt-1.5" />
                  </div>
                  <Skeleton className="h-9 w-9" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CCRPageWrapper>
    );
  }

  if (!resource) return null;

  const pageTitle = resource.processName
    ? `${resource.resourceNumber} (${resource.processNumber} - ${resource.processName})`
    : `${resource.resourceNumber} (${resource.processNumber})`;

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Recursos', href: '/ccr/recursos' },
    { label: pageTitle }
  ];

  return (
    <CCRPageWrapper title={pageTitle} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <Tabs defaultValue="geral" className="w-full flex flex-col focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
          <TabsList className="grid w-full grid-cols-5 bg-muted h-8 p-px">
            <TabsTrigger value="geral" className="cursor-pointer text-xs h-7 px-2 select-none">Geral</TabsTrigger>
            <TabsTrigger value="tramitacoes" className="cursor-pointer text-xs h-7 px-2 select-none">Tramitações</TabsTrigger>
            <TabsTrigger value="julgamento" className="cursor-pointer text-xs h-7 px-2 select-none">Julgamento</TabsTrigger>
            <TabsTrigger value="documentos" className="cursor-pointer text-xs h-7 px-2 select-none">Documentos</TabsTrigger>
            <TabsTrigger value="historico" className="cursor-pointer text-xs h-7 px-2 select-none">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="mt-6 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-semibold">Informações Gerais</h3>
                  <p className="text-sm text-muted-foreground mt-1.5">Informações principais do processo</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => router.push(`/ccr/recursos/${params.id}/contatos`)}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => router.push(`/ccr/recursos/${params.id}/enderecos`)}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => router.push(`/ccr/recursos/${params.id}/intimacoes`)}
                  >
                    <Newspaper className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => router.push(`/ccr/recursos/${params.id}/editar`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Linha 1 */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Número do Processo</label>
                  <p className="text-sm">{resource.processNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                  <p className="text-sm">{resource.resourceNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit', getResourceStatusColor(resource.status))}>
                    {getResourceStatusLabel(resource.status)}
                  </span>
                </div>

                {/* Linha 2 */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Tipo de Recurso</label>
                  <p className="text-sm">{typeLabels[resource.type]}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Data de Protocolo</label>
                  <p className="text-sm">{new Date(resource.protocol.createdAt || resource.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Número de Protocolo</label>
                  <p className="text-sm">{resource.protocol.number}</p>
                </div>

                {/* Linha 3 */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Recorrente</label>
                  <p className="text-sm">
                    {resource.type === 'VOLUNTARIO'
                      ? (resource.processName || '-')
                      : 'Município de Campo Grande'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Recorrido</label>
                  <p className="text-sm">
                    {resource.type === 'OFICIO'
                      ? (resource.processName || '-')
                      : 'Município de Campo Grande'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Processos Apensos</label>
                  <p className="text-sm">{formatAttachedProcesses(resource.attachedProcesses || [])}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card de Assunto */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold">Assunto</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">Assunto principal e subitens relacionados ao processo</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => router.push(`/ccr/recursos/${params.id}/assuntos`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {resource.subjects && resource.subjects.length > 0 ? (
                    <>
                      {/* Assunto Principal */}
                      {resource.subjects.filter((s: any) => s.isPrimary).map((subjectLink: any) => (
                        <div key={subjectLink.id}>
                          <label className="block text-sm font-medium mb-1.5">Assunto Principal</label>
                          <p className="text-sm">{subjectLink.subject.name}</p>
                        </div>
                      ))}

                      {/* Subitens */}
                      {resource.subjects.filter((s: any) => !s.isPrimary).length > 0 && (
                        <div>
                          <label className="block text-sm font-medium mb-1.5">Subitens</label>
                          <ul className="list-disc list-inside space-y-1">
                            {resource.subjects
                              .filter((s: any) => !s.isPrimary)
                              .map((subjectLink: any) => (
                                <li key={subjectLink.id} className="text-sm">
                                  {subjectLink.subject.name}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Nenhum assunto cadastrado</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Clique em "Editar" para adicionar
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Card de Partes Interessadas */}
              <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold">Partes Interessadas</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">Partes do processo e autoridades vinculadas</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => router.push(`/ccr/recursos/${params.id}/partes`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Partes do Processo */}
                  {resource.parts && resource.parts.length > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        const requerentes = resource.parts.filter((p: any) => p.role === 'REQUERENTE');
                        const patronos = resource.parts.filter((p: any) => p.role === 'PATRONO');
                        const representantes = resource.parts.filter((p: any) => p.role === 'REPRESENTANTE');
                        const outros = resource.parts.filter((p: any) => p.role === 'OUTRO');

                        const formatNames = (parts: any[]) => {
                          if (parts.length === 0) return '';
                          // Ordenar por nome em ordem alfabética crescente
                          const sortedParts = [...parts].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
                          if (sortedParts.length === 1) return sortedParts[0].name;
                          if (sortedParts.length === 2) return `${sortedParts[0].name} e ${sortedParts[1].name}`;
                          const lastPart = sortedParts[sortedParts.length - 1];
                          const otherParts = sortedParts.slice(0, -1);
                          return `${otherParts.map((p: any) => p.name).join(', ')} e ${lastPart.name}`;
                        };

                        return (
                          <>
                            {requerentes.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Requerente{requerentes.length > 1 ? 's' : ''}:</span> {formatNames(requerentes)}
                              </p>
                            )}
                            {patronos.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Patrono{patronos.length > 1 ? 's' : ''}:</span> {formatNames(patronos)}
                              </p>
                            )}
                            {representantes.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Representante{representantes.length > 1 ? 's' : ''}:</span> {formatNames(representantes)}
                              </p>
                            )}
                            {outros.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Outro{outros.length > 1 ? 's' : ''}:</span> {formatNames(outros)}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {/* Separador */}
                  {resource.parts && resource.parts.length > 0 && resource.authorities && resource.authorities.length > 0 && (
                    <div className="border-t my-3" />
                  )}

                  {/* Autoridades */}
                  {resource.authorities && resource.authorities.length > 0 ? (
                    <div className="space-y-2">
                      {(() => {
                        const autuantes = resource.authorities.filter((a: any) => a.type === 'AUTOR_PROCEDIMENTO_FISCAL');
                        const julgadores = resource.authorities.filter((a: any) => a.type === 'JULGADOR_SINGULAR');
                        const coordenadores = resource.authorities.filter((a: any) => a.type === 'COORDENADOR');
                        const outros = resource.authorities.filter((a: any) => a.type === 'OUTROS');

                        const formatNames = (authorities: any[]) => {
                          if (authorities.length === 0) return '';
                          // Ordenar por nome em ordem alfabética crescente
                          const sortedAuthorities = [...authorities].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
                          if (sortedAuthorities.length === 1) return sortedAuthorities[0].name;
                          if (sortedAuthorities.length === 2) return `${sortedAuthorities[0].name} e ${sortedAuthorities[1].name}`;
                          const lastAuth = sortedAuthorities[sortedAuthorities.length - 1];
                          const otherAuths = sortedAuthorities.slice(0, -1);
                          return `${otherAuths.map((a: any) => a.name).join(', ')} e ${lastAuth.name}`;
                        };

                        return (
                          <>
                            {autuantes.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Autuante{autuantes.length > 1 ? 's' : ''}:</span> {formatNames(autuantes)}
                              </p>
                            )}
                            {julgadores.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Julgador Singular:</span> {formatNames(julgadores)}
                              </p>
                            )}
                            {coordenadores.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Coordenador{coordenadores.length > 1 ? 'es' : ''}:</span> {formatNames(coordenadores)}
                              </p>
                            )}
                            {outros.length > 0 && (
                              <p className="text-sm">
                                <span className="font-medium">Outro{outros.length > 1 ? 's' : ''}:</span> {formatNames(outros)}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}

                  {(!resource.parts || resource.parts.length === 0) && (!resource.authorities || resource.authorities.length === 0) && (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Nenhuma parte ou autoridade cadastrada</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Clique em "Editar" para adicionar
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">Inscrições</h3>
                    {resource.registrations && resource.registrations.length > 0 && (
                      <span className="text-xs text-gray-700 bg-green-50 px-2 py-1 rounded font-medium">
                        Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          resource.registrations.reduce((total: number, reg: any) => {
                            const regTotal = reg.values?.reduce((acc: number, v: any) => acc + Number(v.amount), 0) || 0;
                            return total + regTotal;
                          }, 0)
                        )}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">Inscrições e débitos relacionados ao processo</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => router.push(`/ccr/recursos/${params.id}/inscricoes`)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {resource.registrations && resource.registrations.length > 0 ? (
                  <>
                    {resource.registrations.map((registration: any) => (
                      <div key={registration.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="text-sm font-medium">
                              {registration.type === 'IMOBILIARIA' && 'Inscrição Imobiliária'}
                              {registration.type === 'ECONOMICA' && 'Inscrição Econômica'}
                              {registration.type === 'CPF' && 'CPF'}
                              {registration.type === 'CNPJ' && 'CNPJ'}
                            </p>
                            <p className="text-sm text-muted-foreground">{registration.registrationNumber}</p>
                          </div>
                        </div>

                        {registration.values && registration.values.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-gray-700 mb-2">Débitos:</p>
                            {registration.values.map((value: any) => (
                              <div key={value.id} className="flex justify-between items-center gap-4 text-sm py-2 px-3 bg-gray-50 rounded">
                                <div className="flex-1">
                                  <span className="text-gray-700 font-medium">{value.description || 'Valor'}</span>
                                  {value.dueDate && (
                                    <span className="text-xs text-gray-500 ml-2">
                                      (Venc: {new Date(value.dueDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })})
                                    </span>
                                  )}
                                </div>
                                <span className="font-medium whitespace-nowrap">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value.amount))}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between items-center text-sm font-semibold pt-2 mt-2 border-t">
                              <span>Total</span>
                              <span>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                  registration.values.reduce((acc: number, v: any) => acc + Number(v.amount), 0)
                                )}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Nenhuma inscrição cadastrada</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Clique em "Editar" para adicionar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="tramitacoes" className="mt-6 overflow-y-auto max-h-[calc(100vh-140px)] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
            {loadingTramitations ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto" />
                <p className="mt-4 text-sm text-gray-600">Carregando tramitações...</p>
              </div>
            ) : tramitations.length === 0 ? (
              <div className="bg-white rounded-lg border p-8 text-center">
                <p className="text-muted-foreground">Nenhuma tramitação encontrada para este processo.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tramitations.map((tramitation) => (
                  <TramitationCard
                    key={tramitation.id}
                    tramitation={tramitation}
                    onMarkAsReceived={handleMarkAsReceived}
                    onDelete={handleDeleteTramitation}
                    userRole={session?.user?.role}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="julgamento" className="mt-6 overflow-y-auto max-h-[calc(100vh-140px)] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="documentos" className="mt-6 overflow-y-auto max-h-[calc(100vh-140px)] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </div>
          </TabsContent>

          <TabsContent value="historico" className="mt-6 overflow-y-auto max-h-[calc(100vh-140px)] focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0">
            <div className="bg-white rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">Funcionalidade em desenvolvimento</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </CCRPageWrapper>
  );
}
