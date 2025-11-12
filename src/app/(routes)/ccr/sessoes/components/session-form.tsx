'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type SessionFormValues = {
  sessionNumber: string;
  date: string;
  startTime?: string;
  endTime?: string;
  type: string;
  presidentId?: string;
  observations?: string;
};

interface SessionFormProps {
  initialData?: any;
}

const typeOptions = [
  { value: 'EXTRAORDINARIA', label: 'Extraordinária' },
  { value: 'ORDINARIA', label: 'Ordinária' },
  { value: 'OUTRO', label: 'Outro' },
];

export function SessionForm({ initialData }: SessionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingNextNumber, setLoadingNextNumber] = useState(false);

  const form = useForm<SessionFormValues>({
    defaultValues: {
      sessionNumber: initialData?.sessionNumber || '',
      date: initialData?.date
        ? new Date(initialData.date).toISOString().split('T')[0]
        : '',
      startTime: initialData?.startTime || '08:00',
      endTime: initialData?.endTime || '11:00',
      type: initialData?.type || '',
      presidentId: initialData?.presidentId || '',
      observations: initialData?.observations || '',
    },
  });

  // Buscar próximo número de sessão
  useEffect(() => {
    const fetchNextSessionNumber = async () => {
      // Só buscar se não houver initialData (criação de nova sessão)
      if (initialData) return;

      try {
        setLoadingNextNumber(true);
        const currentYear = new Date().getFullYear();
        const response = await fetch(`/api/ccr/sessions?year=${currentYear}`);

        if (response.ok) {
          const sessions = await response.json();

          if (sessions.length > 0) {
            // Usar o campo sequenceNumber diretamente
            const maxSequenceNumber = Math.max(...sessions.map((s: any) => s.sequenceNumber));
            const nextSequence = maxSequenceNumber + 1;
            const nextNumber = nextSequence.toString().padStart(4, '0');
            form.setValue('sessionNumber', `${nextNumber}/${currentYear}`);
          } else {
            // Primeira sessão do ano
            form.setValue('sessionNumber', `0001/${currentYear}`);
          }
        }
      } catch (error) {
        console.error('Error fetching next session number:', error);
        // Não mostrar erro ao usuário, apenas deixar o campo vazio
      } finally {
        setLoadingNextNumber(false);
      }
    };

    fetchNextSessionNumber();
  }, [initialData, form]);

  // Buscar membros conselheiros ativos
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoadingMembers(true);
        const response = await fetch('/api/ccr/members');
        if (response.ok) {
          const data = await response.json();
          // Filtrar apenas membros ativos
          const activeMembers = data.filter((m: any) => m.isActive === true);
          setMembers(activeMembers);
        } else {
          toast.error('Erro ao carregar membros');
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        toast.error('Erro ao carregar membros');
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, []);

  const onSubmit = async (data: SessionFormValues) => {
    try {
      // Validações
      if (!data.sessionNumber || data.sessionNumber.trim() === '') {
        toast.error('Número da sessão é obrigatório');
        return;
      }

      if (!data.date || data.date.trim() === '') {
        toast.error('Data da sessão é obrigatória');
        return;
      }

      if (!data.type) {
        toast.error('Tipo de sessão é obrigatório');
        return;
      }

      setLoading(true);

      const url = initialData?.id
        ? `/api/ccr/sessions/${initialData.id}`
        : '/api/ccr/sessions';

      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionNumber: data.sessionNumber.trim(),
          sessionDate: data.date,
          startTime: data.startTime?.trim() || null,
          endTime: data.endTime?.trim() || null,
          type: data.type,
          presidentId: data.presidentId || null,
          observations: data.observations?.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(
        initialData?.id ? 'Sessão atualizada com sucesso' : 'Sessão criada com sucesso'
      );
      router.push('/ccr/sessoes');
      router.refresh();
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar sessão');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar skeleton enquanto carrega os dados
  if (loadingMembers) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
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
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Linha 1: Número, Data e Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="sessionNumber"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Número da Sessão <span className="text-red-500">*</span>
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

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Data da Sessão <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
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
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Tipo de Sessão <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg">
                    {typeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Linha 2: Horário Início, Horário Término e Presidente */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Horário de Início
                </FormLabel>
                <FormControl>
                  <Input
                    type="time"
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
            name="endTime"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Horário de Término
                </FormLabel>
                <FormControl>
                  <Input
                    type="time"
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
            name="presidentId"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Presidente da Sessão
                </FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={loadingMembers}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder={loadingMembers ? "Carregando..." : "Selecione o presidente"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg">
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Observações */}
        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">
                Observações
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Observações gerais sobre a sessão"
                  rows={4}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-end gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ccr/sessoes')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading || loadingMembers} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? 'Atualizar' : 'Criar'} Sessão
          </Button>
        </div>
      </form>
    </Form>
  );
}
