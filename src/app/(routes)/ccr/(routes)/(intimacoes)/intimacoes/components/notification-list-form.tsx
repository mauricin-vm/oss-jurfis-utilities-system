'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type NotificationListFormValues = {
  type: string;
};

const typeOptions = [
  { value: 'ADMISSIBILIDADE', label: 'Admissibilidade' },
  { value: 'SESSAO', label: 'Sessão' },
  { value: 'DILIGENCIA', label: 'Diligência' },
  { value: 'DECISAO', label: 'Decisão' },
  { value: 'OUTRO', label: 'Outro' },
];

export function NotificationListForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [listNumber, setListNumber] = useState<string>('');
  const [loadingNumber, setLoadingNumber] = useState(true);

  // Buscar o próximo número disponível
  useEffect(() => {
    const fetchNextNumber = async () => {
      try {
        setLoadingNumber(true);
        const response = await fetch('/api/ccr/intimacoes/next-number');
        if (response.ok) {
          const data = await response.json();
          setListNumber(data.listNumber);
        }
      } catch (error) {
        console.error('Error fetching next number:', error);
      } finally {
        setLoadingNumber(false);
      }
    };

    fetchNextNumber();
  }, []);

  const form = useForm<NotificationListFormValues>({
    defaultValues: {
      type: '',
    },
  });

  const onSubmit = async (data: NotificationListFormValues) => {
    try {
      if (!data.type) {
        toast.error('Selecione o tipo da lista');
        return;
      }

      setLoading(true);

      const response = await fetch('/api/ccr/intimacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: data.type,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const newList = await response.json();
      toast.success(`Lista ${newList.listNumber} criada com sucesso`);
      router.push(`/ccr/intimacoes/${newList.id}`);
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar lista');
    } finally {
      setLoading(false);
    }
  };

  if (loadingNumber) {
    return (
      <div className="space-y-6">
        {/* Número da Lista e Tipo da Lista */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Número da Lista e Tipo da Lista */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Número da Lista (somente leitura) */}
          <div className="space-y-0">
            <label className="block text-sm font-medium mb-1.5">
              Número da Lista
            </label>
            <Input
              value={listNumber}
              readOnly
              className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 cursor-default"
            />
          </div>

          {/* Tipo da Lista */}
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Tipo da Lista <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {typeOptions.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="cursor-pointer h-9"
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ccr/intimacoes')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Lista
          </Button>
        </div>
      </form>
    </Form>
  );
}
