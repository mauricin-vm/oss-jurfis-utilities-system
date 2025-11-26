'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { toast } from 'sonner';
import { Loader2, Search, Paperclip, X } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: string;
}

interface SessionMember {
  member: Member;
}

interface Distribution {
  id: string;
  resourceId: string;
  firstDistribution: Member | null;
  reviewersIds: string[];
}

interface SessionResource {
  id: string;
  minutesText: string | null;
  session: {
    id: string;
    sessionNumber: string;
    date: Date;
    distributions: Distribution[];
    members: SessionMember[];
    president: Member | null;
  };
}

interface AvailableResource {
  id: string;
  resourceNumber: string;
  processNumber: string;
  processName: string | null;
  sessions: SessionResource[];
}

// Helper para obter relator e revisores de um recurso
function getDistributionInfo(resource: AvailableResource) {
  const sessionResource = resource.sessions?.[0];
  if (!sessionResource) return { relator: null, reviewers: [] };

  const distribution = sessionResource.session.distributions.find(
    (d) => d.resourceId === resource.id
  );

  if (!distribution) return { relator: null, reviewers: [] };

  // Buscar revisores pelos IDs
  const reviewers: Member[] = [];
  if (distribution.reviewersIds && distribution.reviewersIds.length > 0) {
    for (const reviewerId of distribution.reviewersIds) {
      // Buscar nos membros da sessão
      const sessionMember = sessionResource.session.members.find(
        (m) => m.member.id === reviewerId
      );
      if (sessionMember) {
        reviewers.push(sessionMember.member);
      } else if (sessionResource.session.president?.id === reviewerId) {
        // Verificar se é o presidente
        reviewers.push(sessionResource.session.president);
      }
    }
  }

  return {
    relator: distribution.firstDistribution,
    reviewers,
  };
}

export default function NovoAcordaoPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<AvailableResource[]>([]);
  const [selectedResource, setSelectedResource] = useState<AvailableResource | null>(null);
  const [searching, setSearching] = useState(false);
  const [ementaTitle, setEmentaTitle] = useState('');
  const [ementaBody, setEmentaBody] = useState('');
  const [voteFile, setVoteFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Digite um termo de busca');
      return;
    }

    try {
      setSearching(true);
      const response = await fetch(
        `/api/ccr/decisions/available-resources?search=${encodeURIComponent(searchTerm)}`
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

  const handleSelectResource = (resource: AvailableResource) => {
    setSelectedResource(resource);
    setSearchResults([]);
    setSearchTerm('');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são aceitos');
        return;
      }
      setVoteFile(file);
    }
  };

  const createDecision = async () => {
    try {
      setSaving(true);

      const formData = new FormData();
      formData.append('resourceId', selectedResource!.id);
      formData.append('ementaTitle', ementaTitle.trim());
      formData.append('ementaBody', ementaBody.trim());
      if (voteFile) {
        formData.append('voteFile', voteFile);
      }

      const response = await fetch('/api/ccr/decisions', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const decision = await response.json();
      toast.success(`Acórdão ${decision.decisionNumber} criado com sucesso`);
      router.push('/ccr/acordaos');
      router.refresh();
    } catch (error) {
      console.error('Error creating decision:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar acórdão');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedResource) {
      toast.error('Selecione um processo');
      return;
    }

    if (!ementaTitle.trim()) {
      toast.error('Título da ementa é obrigatório');
      return;
    }

    if (!ementaBody.trim()) {
      toast.error('Corpo da ementa é obrigatório');
      return;
    }

    if (!voteFile) {
      toast.warning('O arquivo do voto não foi anexado. Deseja continuar mesmo assim?', {
        duration: 10000,
        className: 'min-w-[450px]',
        action: {
          label: 'Continuar',
          onClick: () => {
            createDecision();
          },
        },
        cancel: {
          label: 'Cancelar',
          onClick: () => {},
        },
      });
      return;
    }

    createDecision();
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Acórdãos', href: '/ccr/acordaos' },
    { label: 'Novo' }
  ];

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  // Se é EXTERNAL, não renderizar o conteúdo
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  return (
    <CCRPageWrapper title="Novo Acórdão" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Busca */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Novo Acórdão</CardTitle>
              <CardDescription>
                Digite o número do recurso, número do processo ou razão social para buscar.
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
                  <div className="space-y-3">
                    {searchResults.map((resource, index) => {
                      const { relator, reviewers } = getDistributionInfo(resource);
                      const sessionResource = resource.sessions?.[0];
                      const minutesText = sessionResource?.minutesText;

                      return (
                        <div
                          key={resource.id}
                          className="p-4 border border-gray-200 rounded-lg hover:border-gray-400 cursor-pointer transition-colors"
                          onClick={() => handleSelectResource(resource)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full font-medium text-sm flex-shrink-0 bg-gray-100 text-gray-700">
                                {index + 1}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Link
                                      href={`/ccr/recursos/${resource.id}`}
                                      target="_blank"
                                      className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {resource.processNumber}
                                    </Link>
                                    <Badge
                                      variant="secondary"
                                      className="bg-emerald-100 text-emerald-800 border-emerald-300"
                                    >
                                      Julgado
                                    </Badge>
                                  </div>
                                  {resource.processName && (
                                    <div className="text-sm text-muted-foreground">
                                      {resource.processName} ({resource.resourceNumber})
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-0.5 text-sm">
                                  {relator && (
                                    <div>
                                      <span className="font-medium">Relator: </span>
                                      <span className="text-muted-foreground">{relator.name}</span>
                                    </div>
                                  )}
                                  {reviewers.length > 0 && (
                                    <div>
                                      <span className="font-medium">
                                        {reviewers.length === 1 ? 'Revisor: ' : 'Revisores: '}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {reviewers.map((r, idx) => (
                                          <span key={r.id}>
                                            {r.name}
                                            {idx < reviewers.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {/* Texto da Ata */}
                                {minutesText && (
                                  <div className="mt-4 pt-4 border-t">
                                    <div className="text-sm">
                                      <span className="font-medium">Texto da Ata: </span>
                                      <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-justify">
                                        {minutesText}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="cursor-pointer flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectResource(resource);
                              }}
                            >
                              Selecionar
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Detalhes do Processo e Formulário */}
        {selectedResource && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <CardTitle>Detalhes do Processo</CardTitle>
                  <CardDescription>
                    Informações do processo selecionado e campos do acórdão.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {voteFile ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{voteFile.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoteFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="p-0.5 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <TooltipWrapper content="Anexar arquivo do voto (PDF)">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer h-9 w-9 p-0"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipWrapper>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Informações do Processo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Número do Processo</label>
                    <p className="text-sm">
                      <Link
                        href={`/ccr/recursos/${selectedResource.id}`}
                        target="_blank"
                        className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {selectedResource.processNumber}
                      </Link>
                    </p>
                  </div>
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                    <p className="text-sm">{selectedResource.resourceNumber}</p>
                  </div>
                </div>

                {selectedResource.processName && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                    <p className="text-sm">{selectedResource.processName}</p>
                  </div>
                )}

                {/* Relator e Revisores */}
                {(() => {
                  const { relator, reviewers } = getDistributionInfo(selectedResource);
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {relator && (
                        <div className="space-y-0">
                          <label className="block text-sm font-medium mb-1.5">Relator</label>
                          <p className="text-sm">{relator.name}</p>
                        </div>
                      )}
                      {reviewers.length > 0 && (
                        <div className="space-y-0">
                          <label className="block text-sm font-medium mb-1.5">
                            {reviewers.length === 1 ? 'Revisor' : 'Revisores'}
                          </label>
                          <p className="text-sm">
                            {reviewers.map((r, idx) => (
                              <span key={r.id}>
                                {r.name}
                                {idx < reviewers.length - 1 && (idx === reviewers.length - 2 ? ' e ' : ', ')}
                              </span>
                            ))}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Texto da Ata */}
                {selectedResource.sessions?.[0]?.minutesText && (
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Texto da Ata</label>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap text-justify">
                        {selectedResource.sessions[0].minutesText}
                      </p>
                    </div>
                  </div>
                )}

                {/* Título da Ementa */}
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Título da Ementa <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Digite o título da ementa"
                    value={ementaTitle}
                    onChange={(e) => setEmentaTitle(e.target.value)}
                    className="min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
                  />
                </div>

                {/* Corpo da Ementa */}
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Corpo da Ementa <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Digite o corpo da ementa"
                    value={ementaBody}
                    onChange={(e) => setEmentaBody(e.target.value)}
                    className="min-h-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
                  />
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedResource(null);
                      setEmentaTitle('');
                      setEmentaBody('');
                      setVoteFile(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    disabled={saving}
                    className="cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={saving} className="cursor-pointer">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Acórdão
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </CCRPageWrapper>
  );
}
