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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CCRPageWrapper } from '../../../../../components/ccr-page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Minutes {
  id: string;
  sessionNumber: string;
  sequenceNumber: number;
  year: number;
  ordinalNumber: number;
  type: string;
  date: Date;
  startTime: string | null;
  endTime: string | null;
  minutesStatus: string;
  minutesFilePath: string | null;
  president: {
    id: string;
    name: string;
  } | null;
}

const formSchema = z.object({
  ordinalNumber: z.string().min(1, 'Ordenação é obrigatória'),
  minutesStatus: z.string().min(1, 'Status da ata é obrigatório'),
  minutesFilePath: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditarAtaPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [minutes, setMinutes] = useState<Minutes | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      minutesStatus: '',
      minutesFilePath: '',
      ordinalNumber: '',
    },
  });

  // Formata número com separador de milhar (ex: 1.280)
  const formatOrdinalNumber = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, '');
    if (!onlyNumbers) return '';
    const number = parseInt(onlyNumbers);
    return number.toLocaleString('pt-BR');
  };

  const handleOrdinalNumberChange = (value: string) => {
    const formatted = formatOrdinalNumber(value);
    form.setValue('ordinalNumber', formatted);
  };

  // Verificar acesso
  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    if (params.id) {
      fetchMinutes();
    }
  }, [params.id]);

  const fetchMinutes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/minutes/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setMinutes(data);
        form.reset({
          minutesStatus: data.minutesStatus || 'PENDENTE',
          minutesFilePath: data.minutesFilePath || '',
          ordinalNumber: data.ordinalNumber ? data.ordinalNumber.toLocaleString('pt-BR') : '',
        });
      }
    } catch (error) {
      console.error('Error fetching minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    try {
      setSaving(true);
      // Converte o ordinalNumber formatado para número
      const ordinalNumberValue = data.ordinalNumber
        ? parseInt(data.ordinalNumber.replace(/\D/g, ''))
        : null;

      const response = await fetch(`/api/ccr/minutes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minutesStatus: data.minutesStatus,
          minutesFilePath: data.minutesFilePath?.trim() || null,
          ordinalNumber: ordinalNumberValue,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Ata atualizada com sucesso');
      router.push('/ccr/atas');
      router.refresh();
    } catch (error) {
      console.error('Error saving minutes:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar ata');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Atas', href: '/ccr/atas' },
    { label: 'Editar' }
  ];

  // Se ainda está carregando a sessão, não renderizar nada
  if (status === 'loading') {
    return null;
  }

  // Se é EXTERNAL, não renderizar o conteúdo (redirecionamento já está acontecendo)
  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title="Editar Ata" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Editar Ata</CardTitle>
              <CardDescription>
                Atualize as informações da ata.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Linha 1 skeleton */}
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
              {/* Linha 2 skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
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

  if (!minutes) {
    return (
      <CCRPageWrapper title="Editar Ata" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Ata não encontrada</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Editar Ata" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <CardTitle>Editar Ata</CardTitle>
            <CardDescription>
              Atualize as informações da ata.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Formulário de Edição */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Linha 1: Número da Ata (readonly) e Data (readonly) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Número da Ata <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={minutes.sessionNumber}
                    readOnly
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Data <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={format(new Date(minutes.date), 'dd/MM/yyyy', { locale: ptBR })}
                    readOnly
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Linha 2: Ordenação (1/4), Status (1/4), Caminho do Arquivo (1/2) */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="ordinalNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="block text-sm font-medium mb-1.5">
                        Ordenação <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: 1.280"
                          className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                          value={field.value}
                          onChange={(e) => handleOrdinalNumberChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minutesStatus"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="block text-sm font-medium mb-1.5">
                        Status da Ata <span className="text-red-500">*</span>
                      </FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg">
                          <SelectItem value="PENDENTE">Pendente</SelectItem>
                          <SelectItem value="GERADA">Gerada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minutesFilePath"
                  render={({ field }) => (
                    <FormItem className="space-y-0 md:col-span-2">
                      <FormLabel className="block text-sm font-medium mb-1.5">
                        Caminho do Arquivo
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ex: S:/JURFIS/Compartilhamento/Atas/Atas 2025/0001 2025 21-01.docx"
                          className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Botões */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/ccr/atas')}
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
