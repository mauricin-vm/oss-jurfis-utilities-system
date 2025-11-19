'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Scale, AlertCircle, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';

interface Part {
  id: string;
  name: string;
  role: string;
  registrationType: string;
  registrationNumber: string;
}

interface DistributionInfo {
  relator: {
    id: string;
    name: string;
    role: string;
  } | null;
  revisores: {
    id: string;
    name: string;
    role: string;
  }[];
}

interface SessionHistory {
  id: string;
  status: string;
  order: number;
  session: {
    id: string;
    sessionNumber: string;
    date: Date;
    type: string;
    status: string;
  };
}

interface Subject {
  id: string;
  subject: {
    id: string;
    name: string;
    parentId: string | null;
  };
}

interface Authority {
  id: string;
  type: string;
  authorityRegistered: {
    id: string;
    name: string;
  };
}

interface Resource {
  id: string;
  resourceNumber: string;
  processNumber: string;
  processName: string | null;
  year: number;
  sequenceNumber: number;
  type: string;
  status: ResourceStatusKey;
  protocol: {
    id: string;
    number: string;
    processNumber: string;
    presenter: string;
    createdAt: Date;
  };
  parts: Part[];
  subjects: Subject[];
  distributionInfo: DistributionInfo | null;
  sessions: SessionHistory[];
  authorities?: Authority[];
}

interface Member {
  id: string;
  name: string;
  role: string;
}

interface SessionMember {
  id: string;
  member: Member;
}

interface Session {
  id: string;
  sessionNumber: string;
  date: Date;
  type: string;
  status: string;
  members: SessionMember[];
}

const authorityTypeLabels: Record<string, string> = {
  AUTOR_PROCEDIMENTO_FISCAL: 'Autor do Procedimento Fiscal',
  JULGADOR_SINGULAR: 'Julgador Singular',
  COORDENADOR: 'Coordenador',
  OUTROS: 'Outros',
};

export default function AdicionarProcessoPage() {
  const params = useParams();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

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
        // Extrair membros da sessão e ordenar por nome
        if (data.members && Array.isArray(data.members)) {
          const sessionMembers = data.members
            .map((sm: SessionMember) => sm.member)
            .sort((a, b) => a.name.localeCompare(b.name));
          setMembers(sessionMembers);
        } else {
          setMembers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/available-resources?search=${encodeURIComponent(searchTerm)}`
      );

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
        if (data.length === 0) {
          toast.error('Nenhum processo encontrado');
        }
      } else {
        toast.error('Erro ao buscar processos');
      }
    } catch (error) {
      console.error('Error searching resources:', error);
      toast.error('Erro ao buscar processos');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResource = (resource: Resource) => {
    setSelectedResource(resource);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleAddToSession = async () => {
    if (!selectedResource) {
      toast.error('Selecione um processo');
      return;
    }

    if (!selectedMemberId) {
      toast.error('Selecione um membro');
      return;
    }

    // Validar se o membro selecionado não é uma das autoridades do processo
    const selectedMember = members.find((m) => m.id === selectedMemberId);
    if (selectedMember && selectedResource.authorities && selectedResource.authorities.length > 0) {
      const isAuthority = selectedResource.authorities.some(
        (authority) =>
          authority.authorityRegistered.name.toLowerCase() ===
          selectedMember.name.toLowerCase()
      );

      if (isAuthority) {
        toast.error(
          'O membro selecionado não pode ser distribuído pois está cadastrado como autoridade neste processo'
        );
        return;
      }
    }

    try {
      setAdding(true);
      const response = await fetch('/api/ccr/session-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: params.id,
          resourceId: selectedResource.id,
          memberId: selectedMemberId,
        }),
      });

      if (response.ok) {
        toast.success('Processo adicionado à pauta com sucesso');
        router.push(`/ccr/sessoes/${params.id}`);
      } else {
        const error = await response.text();
        toast.error(error || 'Erro ao adicionar processo à pauta');
      }
    } catch (error) {
      console.error('Error adding resource to session:', error);
      toast.error('Erro ao adicionar processo à pauta');
    } finally {
      setAdding(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    {
      label: session ? `Sessão n. ${session.sessionNumber}` : 'Carregando...',
      href: `/ccr/sessoes/${params.id}`,
    },
    { label: 'Adicionar Processo' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Adicionar Processo à Pauta" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Adicionar Processo em Pauta</CardTitle>
              <CardDescription>
                Digite o número do recurso, número do processo, número do protocolo ou razão social.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-28" />
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Adicionar Processo à Pauta" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Busca */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Adicionar Processo em Pauta</CardTitle>
              <CardDescription>
                Digite o número do recurso, número do processo, número do protocolo ou razão social.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: XXXX/YYYY, NNNN/YYYY-DD..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                disabled={searching}
                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <Button onClick={handleSearch} disabled={searching} className="cursor-pointer" size="icon">
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Resultados da Busca */}
            {searchResults.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">
                  {searchResults.length}{' '}
                  {searchResults.length === 1
                    ? 'processo encontrado'
                    : 'processos encontrados'}
                </h3>
                <div className="space-y-2">
                  {searchResults.map((resource) => (
                    <div
                      key={resource.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleSelectResource(resource)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">
                              {resource.resourceNumber}
                            </h4>
                            <Badge
                              variant="secondary"
                              className={cn(
                                getResourceStatusColor(resource.status),
                                'hover:bg-opacity-100'
                              )}
                            >
                              {getResourceStatusLabel(resource.status)}
                            </Badge>
                          </div>
                          {resource.processName && (
                            <p className="text-sm text-muted-foreground mb-1">
                              {resource.processName}
                            </p>
                          )}
                          {resource.distributionInfo && (resource.distributionInfo.relator || resource.distributionInfo.revisores.length > 0) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Scale className="h-3 w-3" />
                              {resource.distributionInfo.relator && (
                                <span>
                                  Relator: {resource.distributionInfo.relator.name}
                                </span>
                              )}
                              {resource.distributionInfo.revisores.length > 0 && (
                                <>
                                  {resource.distributionInfo.relator && ' • '}
                                  <span>
                                    {resource.distributionInfo.revisores.length === 1 ? 'Revisor' : 'Revisores'}: {resource.distributionInfo.revisores.map(r => r.name).join(', ')}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="cursor-pointer">
                          Selecionar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Detalhes do Processo Selecionado */}
        {selectedResource && (
          <>
            <Card>
              <CardHeader>
                <div className="space-y-1.5">
                  <CardTitle>Detalhes do Processo</CardTitle>
                  <CardDescription>
                    Informações completas do processo selecionado.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                {/* Primeira linha: Número do Processo e Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Número do Processo</label>
                    <p className="text-sm">
                      <Link
                        href={`/ccr/recursos/${selectedResource.id}`}
                        target="_blank"
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >{selectedResource.processNumber}</Link>
                    </p>
                  </div>
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Status</label>
                    <Badge
                      variant="secondary"
                      className={cn(
                        getResourceStatusColor(selectedResource.status).replace(/border-\S+/, ''),
                        'w-fit'
                      )}
                    >
                      {getResourceStatusLabel(selectedResource.status)}
                    </Badge>
                  </div>
                </div>

                {/* Segunda linha: Número do Recurso e Razão Social */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                    <p className="text-sm">{selectedResource.resourceNumber}</p>
                  </div>
                  {selectedResource.processName && (
                    <div className="space-y-0">
                      <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                      <p className="text-sm">{selectedResource.processName}</p>
                    </div>
                  )}
                </div>

                {/* Assuntos */}
                {selectedResource.subjects && selectedResource.subjects.length > 0 && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Assuntos</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedResource.subjects.map((subject) => (
                        <Badge
                          key={subject.id}
                          variant="outline"
                          className="bg-gray-50"
                        >
                          {subject.subject.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Partes */}
                {selectedResource.parts && selectedResource.parts.length > 0 && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Partes</label>
                    <p className="text-sm">
                      {(() => {
                        const parts = [...selectedResource.parts]
                          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

                        return parts.map((part, idx) => (
                          <span key={part.id}>
                            {part.name}
                            {idx === parts.length - 2 ? ' e ' : idx < parts.length - 1 ? ', ' : ''}
                          </span>
                        ));
                      })()}
                    </p>
                  </div>
                )}

                {/* Autoridades */}
                {selectedResource.authorities && selectedResource.authorities.length > 0 && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Autoridades</label>
                    <p className="text-sm">
                      {(() => {
                        const authorities = [...selectedResource.authorities]
                          .sort((a, b) => a.authorityRegistered.name.localeCompare(b.authorityRegistered.name, 'pt-BR'));

                        return authorities.map((authority, idx) => (
                          <span key={authority.id}>
                            {authority.authorityRegistered.name} ({authorityTypeLabels[authority.type] || authority.type})
                            {idx === authorities.length - 2 ? ' e ' : idx < authorities.length - 1 ? ', ' : ''}
                          </span>
                        ));
                      })()}
                    </p>
                  </div>
                )}

                {/* Distribuições Anteriores */}
                {selectedResource.distributionInfo && (selectedResource.distributionInfo.relator || selectedResource.distributionInfo.revisores.length > 0) && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Distribuições Anteriores</label>
                    <div className="space-y-2">
                      {selectedResource.distributionInfo.relator && (
                        <div className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <Scale className="h-4 w-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="font-medium">
                              {selectedResource.distributionInfo.relator.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Relator • {selectedResource.distributionInfo.relator.role}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedResource.distributionInfo.revisores.map((revisor, idx) => (
                        <div
                          key={revisor.id}
                          className="flex items-center gap-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-200"
                        >
                          <Scale className="h-4 w-4 text-gray-500" />
                          <div className="flex-1">
                            <p className="font-medium">
                              {revisor.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Revisor {selectedResource.distributionInfo.revisores.length > 1 ? `${idx + 1}` : ''} • {revisor.role}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Histórico de Sessões */}
                {selectedResource.sessions && selectedResource.sessions.length > 0 && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Histórico de Sessões</label>
                    <div className="space-y-2">
                      {selectedResource.sessions.map((sessionHistory) => (
                        <div
                          key={sessionHistory.id}
                          className="flex items-center gap-3 text-sm bg-yellow-50 p-3 rounded-lg border border-yellow-200"
                        >
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <div className="flex-1">
                            <p className="font-medium">
                              Sessão {sessionHistory.session.sessionNumber}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(sessionHistory.session.date),
                                'dd/MM/yyyy',
                                { locale: ptBR }
                              )}{' '}
                              • Ordem: {sessionHistory.order} • Status:{' '}
                              {sessionHistory.status}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                </div>
              </CardContent>
            </Card>

            {/* Card de Configuração */}
            <Card>
              <CardHeader>
                <div className="space-y-1.5">
                  <CardTitle>Configurar Distribuição</CardTitle>
                  <CardDescription>
                    Selecione o membro a ser distribuído o processo.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Membro <span className="text-red-500">*</span></label>
                  {members.length === 0 ? (
                    <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      Nenhum membro cadastrado nesta sessão. Configure os membros na página de detalhes da sessão.
                    </div>
                  ) : (
                    <Select
                      value={selectedMemberId}
                      onValueChange={setSelectedMemberId}
                    >
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione um membro" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedResource(null);
                      setSelectedMemberId('');
                    }}
                    disabled={adding}
                    className="cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleAddToSession} disabled={adding} className="cursor-pointer">
                    {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {adding ? 'Adicionando...' : 'Adicionar à Pauta'}
                  </Button>
                </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </CCRPageWrapper>
  );
}
