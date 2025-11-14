'use client';

import { useState } from 'react';
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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, HelpCircle } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

type AuthorityFormValues = {
  name: string;
  phone?: string;
  email?: string;
  isActive: boolean;
};

interface AuthorityFormProps {
  initialData?: Partial<AuthorityFormValues> & { id?: string };
}

export function AuthorityForm({ initialData }: AuthorityFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Função para formatar telefone: (00) 00000-0000 ou (00) 0000-0000
  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      if (numbers.length <= 10) {
        // Telefone fixo: (00) 0000-0000
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{4})(\d)/, '$1-$2');
      } else {
        // Celular: (00) 00000-0000
        return numbers
          .replace(/(\d{2})(\d)/, '($1) $2')
          .replace(/(\d{5})(\d)/, '$1-$2');
      }
    }
    return value;
  };

  const form = useForm<AuthorityFormValues>({
    defaultValues: {
      name: initialData?.name || '',
      phone: initialData?.phone ? formatPhone(initialData.phone) : '',
      email: initialData?.email || '',
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = async (data: AuthorityFormValues) => {
    try {
      // Validações
      if (!data.name || data.name.trim() === '') {
        toast.error('Nome é obrigatório');
        return;
      }

      setLoading(true);

      const url = initialData?.id
        ? `/api/ccr/authorities-registered/${initialData.id}`
        : '/api/ccr/authorities-registered';

      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          name: data.name.trim(),
          phone: data.phone ? data.phone.replace(/\D/g, '') : null,
          email: data.email ? data.email.trim() : null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(initialData?.id ? 'Autoridade atualizada com sucesso' : 'Autoridade criada com sucesso');
      router.push('/ccr/autoridades');
      router.refresh();
    } catch (error) {
      console.error('Error saving authority:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar autoridade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Nome <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Nome completo da autoridade"
                  disabled={loading}
                  {...field}
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  Telefone
                  <TooltipWrapper content="Preencha o telefone para que a autoridade receba informações processuais">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="(67) 98765-4321"
                    disabled={loading}
                    {...field}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      field.onChange(formatted);
                    }}
                    maxLength={15}
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  Email
                  <TooltipWrapper content="Preencha o email para que a autoridade receba informações processuais">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    disabled={loading}
                    {...field}
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Status</FormLabel>
                <FormDescription>
                  Autoridades inativas não estarão disponíveis para seleção em novos recursos
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={loading}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ccr/autoridades')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? 'Atualizar' : 'Criar'} Autoridade
          </Button>
        </div>
      </form>
    </Form>
  );
}
