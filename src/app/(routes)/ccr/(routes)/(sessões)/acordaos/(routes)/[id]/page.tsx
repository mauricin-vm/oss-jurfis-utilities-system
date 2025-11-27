'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Decision {
  id: string;
  decisionNumber: string;
  sequenceNumber: number;
  year: number;
  ementaTitle: string;
  ementaBody: string;
  votePath: string | null;
  status: string;
  decisionFilePath: string | null;
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

const formSchema = z.object({
  decisionNumber: z.string().min(1, 'Número do acórdão é obrigatório'),
  ementaTitle: z.string().min(1, 'Título da ementa é obrigatório'),
  ementaBody: z.string().min(1, 'Corpo da ementa é obrigatório'),
  votePath: z.string().optional(),
  decisionFilePath: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditarAcordaoPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      decisionNumber: '',
      ementaTitle: '',
      ementaBody: '',
      votePath: '',
      decisionFilePath: '',
    },
  });

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    if (params.id) {
      fetchDecision();
    }
  }, [params.id]);

  const fetchDecision = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/decisions/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setDecision(data);
        form.reset({
          decisionNumber: data.decisionNumber,
          ementaTitle: data.ementaTitle,
          ementaBody: data.ementaBody,
          votePath: data.votePath || '',
          decisionFilePath: data.decisionFilePath || '',
        });
      } else {
        toast.error('Acórdão não encontrado');
        router.push('/ccr/acordaos');
      }
    } catch (error) {
      console.error('Error fetching decision:', error);
      toast.error('Erro ao carregar acórdão');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setSaving(true);

      const response = await fetch(`/api/ccr/decisions/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionNumber: data.decisionNumber,
          ementaTitle: data.ementaTitle,
          ementaBody: data.ementaBody,
          votePath: data.votePath?.trim() || null,
          decisionFilePath: data.decisionFilePath?.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Acórdão atualizado com sucesso');
      router.push('/ccr/acordaos');
      router.refresh();
    } catch (error) {
      console.error('Error updating decision:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar acórdão');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Acórdãos', href: '/ccr/acordaos' },
    { label: 'Editar' }
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
      <CCRPageWrapper title="Editar Acórdão" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Editar Acórdão</CardTitle>
              <CardDescription>
                Atualize as informações do acórdão.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
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
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="flex justify-end gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!decision) {
    return (
      <CCRPageWrapper title="Editar Acórdão" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Acórdão não encontrado</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Editar Acórdão" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <CardTitle>Editar Acórdão</CardTitle>
            <CardDescription>
              Atualize as informações do acórdão.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Linha 1: Número do Processo e Número do Recurso */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número do Processo</label>
                  <Input
                    value={decision.resource.processNumber}
                    readOnly
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número do Recurso</label>
                  <Input
                    value={decision.resource.resourceNumber}
                    readOnly
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"
                  />
                </div>
              </div>

              {/* Linha 2: Número do Acórdão e Razão Social */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="decisionNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Número do Acórdão <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 0001/2025"
                          className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">Razão Social</label>
                  <Input
                    value={decision.resource.processName || '-'}
                    readOnly
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"
                  />
                </div>
              </div>

              {/* Título da Ementa */}
              <FormField
                control={form.control}
                name="ementaTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Título da Ementa <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite o título da ementa"
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Corpo da Ementa */}
              <FormField
                control={form.control}
                name="ementaBody"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Corpo da Ementa <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Digite o corpo da ementa"
                        className="min-h-[200px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Caminhos dos Arquivos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="decisionFilePath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Caminho do Acórdão
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: /acordaos/2025/acordao_0001_2025.pdf"
                          className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="votePath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Caminho do Voto Anexado
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: /votos/2025/voto_0001_2025.pdf"
                          className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Histórico de Publicações */}
              {decision.publications.length > 0 && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="text-sm font-medium mb-3">Histórico de Publicações</h3>
                  <div className="space-y-2">
                    {decision.publications.map((pub) => (
                      <div key={pub.id} className="flex justify-between items-center text-sm p-2 bg-background rounded">
                        <span>
                          {pub.publicationOrder === 1 ? 'Publicação' : `Republicação ${pub.publicationOrder - 1}`}
                        </span>
                        <span className="text-muted-foreground">
                          Nº {pub.publicationNumber} - {new Date(pub.publicationDate).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/ccr/acordaos')}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving} className="cursor-pointer">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
