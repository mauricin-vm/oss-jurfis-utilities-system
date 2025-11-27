'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2, Send, FileText, CheckCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Decision {
  id: string;
  decisionNumber: string;
  sequenceNumber: number;
  year: number;
  ementaTitle: string;
  ementaBody: string;
  status: string;
  resource: {
    id: string;
    resourceNumber: string;
    processNumber: string;
    processName: string | null;
  };
  publications: {
    id: string;
    publicationOrder: number;
    publicationNumber: string;
    publicationDate: Date;
  }[];
}

export default function PublicarAcordaosPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [publicationNumber, setPublicationNumber] = useState('');
  const [publicationDate, setPublicationDate] = useState('');

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    fetchPendingDecisions();
  }, []);

  const fetchPendingDecisions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ccr/decisions?status=PENDENTE');
      if (response.ok) {
        const data = await response.json();
        setDecisions(data);
      } else {
        toast.error('Erro ao carregar acórdãos');
      }
    } catch (error) {
      console.error('Error fetching decisions:', error);
      toast.error('Erro ao carregar acórdãos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(decisions.map((d) => d.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handlePublish = async () => {
    if (selectedIds.length === 0) {
      toast.error('Selecione pelo menos um acórdão');
      return;
    }

    if (!publicationNumber.trim()) {
      toast.error('Informe o número da publicação');
      return;
    }

    if (!publicationDate) {
      toast.error('Informe a data da publicação');
      return;
    }

    try {
      setPublishing(true);

      const response = await fetch('/api/ccr/decisions/publish-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionIds: selectedIds,
          publicationNumber: publicationNumber.trim(),
          publicationDate,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();
      toast.success(`${result.published} acórdão(s) publicado(s) com sucesso`);

      // Limpar seleção e recarregar
      setSelectedIds([]);
      setPublicationNumber('');
      setPublicationDate('');
      fetchPendingDecisions();
    } catch (error) {
      console.error('Error publishing decisions:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao publicar acórdãos');
    } finally {
      setPublishing(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Acórdãos', href: '/ccr/acordaos' },
    { label: 'Publicar' }
  ];

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  // Se é EXTERNAL, não renderizar o conteúdo
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title="Publicar Acórdãos" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <CardTitle>Publicar Acórdãos</CardTitle>
            <CardDescription>
              Selecione os acórdãos pendentes para publicar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Publicar Acórdãos" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Formulário de Publicação */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Dados da Publicação
            </CardTitle>
            <CardDescription>
              Informe o número e a data da publicação para os acórdãos selecionados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">
                  Número da Publicação <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="Ex: 6.258"
                  value={publicationNumber}
                  onChange={(e) => setPublicationNumber(e.target.value)}
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium">
                  Data da Publicação <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={publicationDate}
                  onChange={(e) => setPublicationDate(e.target.value)}
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                onClick={handlePublish}
                disabled={publishing}
                className="cursor-pointer h-10"
              >
                {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Send className="mr-2 h-4 w-4" />
                Registrar Publicação ({selectedIds.length})
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista de Acórdãos Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Acórdãos Pendentes
            </CardTitle>
            <CardDescription>
              {decisions.length === 0
                ? 'Não há acórdãos pendentes de publicação.'
                : decisions.length === 1
                  ? '1 acórdão pendente de publicação.'
                  : `${decisions.length} acórdãos pendentes de publicação.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {decisions.length === 0 ? (
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
                <div className="p-8 text-center">
                  <p className="text-muted-foreground">Todos os acórdãos foram publicados.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                <div className="relative w-full overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow className="bg-muted hover:bg-muted border-b">
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={selectedIds.length === decisions.length && decisions.length > 0}
                            onCheckedChange={handleSelectAll}
                            className="cursor-pointer"
                          />
                        </TableHead>
                        <TableHead className="font-semibold">Acórdão</TableHead>
                        <TableHead className="font-semibold">Tipo</TableHead>
                        <TableHead className="font-semibold">Recurso</TableHead>
                        <TableHead className="font-semibold">Processo</TableHead>
                        <TableHead className="font-semibold">Razão Social</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {decisions.map((decision) => (
                        <TableRow
                          key={decision.id}
                          className={`bg-white hover:bg-muted/40 min-h-[49px] cursor-pointer ${
                            selectedIds.includes(decision.id) ? 'bg-blue-50 hover:bg-blue-100' : ''
                          }`}
                          onClick={() => handleSelectOne(decision.id, !selectedIds.includes(decision.id))}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.includes(decision.id)}
                              onCheckedChange={(checked) => handleSelectOne(decision.id, checked as boolean)}
                              className="cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {decision.decisionNumber}
                          </TableCell>
                          <TableCell>
                            {decision.publications.length > 0 ? (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'inline-flex items-center gap-1.5',
                                  'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                )}
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                Republicação
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'inline-flex items-center gap-1.5',
                                  'bg-green-100 text-green-800 hover:bg-green-100'
                                )}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Publicação
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{decision.resource.resourceNumber}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{decision.resource.processNumber}</span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-[200px] truncate text-sm">
                              {decision.resource.processName || '-'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CCRPageWrapper>
  );
}
