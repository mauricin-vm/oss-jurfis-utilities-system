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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, HelpCircle } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

type SectorFormValues = {
  name: string;
  abbreviation?: string;
  dispatchCode?: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
};

interface SectorFormProps {
  initialData?: Partial<SectorFormValues> & { id?: string };
}

export function SectorForm({ initialData }: SectorFormProps) {
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

  const form = useForm<SectorFormValues>({
    defaultValues: {
      name: initialData?.name || '',
      abbreviation: initialData?.abbreviation || '',
      dispatchCode: initialData?.dispatchCode || '',
      description: initialData?.description || '',
      phone: initialData?.phone ? formatPhone(initialData.phone) : '',
      email: initialData?.email || '',
      address: initialData?.address || '',
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = async (data: SectorFormValues) => {
    try {
      // Validações
      if (!data.name || data.name.trim() === '') {
        toast.error('Nome é obrigatório');
        return;
      }

      setLoading(true);

      const url = initialData?.id
        ? `/api/ccr/sectors/${initialData.id}`
        : '/api/ccr/sectors';

      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          name: data.name.trim(),
          abbreviation: data.abbreviation ? data.abbreviation.trim() : null,
          dispatchCode: data.dispatchCode ? data.dispatchCode.trim() : null,
          description: data.description ? data.description.trim() : null,
          phone: data.phone ? data.phone.replace(/\D/g, '') : null,
          email: data.email ? data.email.trim() : null,
          address: data.address ? data.address.trim() : null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(initialData?.id ? 'Setor atualizado com sucesso' : 'Setor criado com sucesso');
      router.push('/ccr/setores');
      router.refresh();
    } catch (error) {
      console.error('Error saving sector:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar setor');
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
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">
                Nome <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Gerência de Exemplo (ABREV/ÓRGÃO)"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="abbreviation"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">Abreviação</FormLabel>
                <FormControl>
                  <Input
                    placeholder="ABREV/ÓRGÃO"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dispatchCode"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">Código de Despacho</FormLabel>
                <FormControl>
                  <Input
                    placeholder="0000000000"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva as funções e responsabilidades do setor..."
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px] resize-none"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">Telefone</FormLabel>
                <FormControl>
                  <Input
                    placeholder="(00) 00000-0000"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={field.value}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                  Email
                  <TooltipWrapper content="Preencha o email para solicitar processos desse setor">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="setor@exemplo.com"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">Endereço</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Ex: Rua Exemplo, 123 - Bairro - Cidade/UF"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px] resize-none"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {initialData?.id && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border border-gray-200 p-4">
                <div className="space-y-1">
                  <FormLabel className="text-sm font-medium">Setor Ativo</FormLabel>
                  <FormDescription className="text-xs text-gray-500">
                    Desmarque para desativar este setor
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ccr/setores')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? 'Atualizar' : 'Criar'} Setor
          </Button>
        </div>
      </form>
    </Form>
  );
}
