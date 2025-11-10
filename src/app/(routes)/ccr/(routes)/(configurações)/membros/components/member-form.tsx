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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type MemberFormValues = {
  name: string;
  role?: string;
  cpf?: string;
  registration?: string;
  agency?: string;
  phone?: string;
  email?: string;
  gender?: string;
  isActive: boolean;
};

interface MemberFormProps {
  initialData?: Partial<MemberFormValues> & { id?: string };
}

export function MemberForm({ initialData }: MemberFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Função para formatar CPF: 000.000.000-00
  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return value;
  };

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

  const form = useForm<MemberFormValues>({
    defaultValues: {
      name: initialData?.name || '',
      role: initialData?.role || '',
      cpf: initialData?.cpf ? formatCPF(initialData.cpf) : '',
      registration: initialData?.registration || '',
      agency: initialData?.agency || '',
      phone: initialData?.phone ? formatPhone(initialData.phone) : '',
      email: initialData?.email || '',
      gender: initialData?.gender || '',
      isActive: initialData?.isActive ?? true,
    },
  });

  const onSubmit = async (data: MemberFormValues) => {
    try {
      // Validações
      if (!data.name || data.name.trim() === '') {
        toast.error('Nome é obrigatório');
        return;
      }

      if (!data.gender || data.gender.trim() === '') {
        toast.error('Gênero é obrigatório');
        return;
      }

      setLoading(true);

      const url = initialData?.id
        ? `/api/ccr/members/${initialData.id}`
        : '/api/ccr/members';

      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          role: data.role || null,
          cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
          registration: data.registration || null,
          agency: data.agency || null,
          phone: data.phone ? data.phone.replace(/\D/g, '') : null,
          email: data.email || null,
          gender: data.gender || null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(initialData?.id ? 'Membro atualizado com sucesso' : 'Membro criado com sucesso');
      router.push('/ccr/membros');
      router.refresh();
    } catch (error) {
      console.error('Error saving member:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar membro');
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
                  placeholder="Ex: João Silva"
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
            name="role"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">Cargo</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Conselheiro Titular"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Gênero <span className="text-red-500">*</span>
                </FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                  defaultValue={field.value || 'none'}
                >
                  <FormControl>
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="none" className="cursor-pointer">Não informado</SelectItem>
                    <SelectItem value="MASCULINO" className="cursor-pointer">Masculino</SelectItem>
                    <SelectItem value="FEMININO" className="cursor-pointer">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="cpf"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">CPF</FormLabel>
                <FormControl>
                  <Input
                    placeholder="000.000.000-00"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={field.value}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      field.onChange(formatted);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="registration"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">Matrícula</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 123456"
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
          name="agency"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">Órgão</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Município, OAB/MS"
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
                <FormLabel className="block text-sm font-medium mb-1.5">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="exemplo@email.com"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {initialData?.id && (
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between space-y-0 rounded-md border border-gray-200 p-4">
                <div className="space-y-1">
                  <FormLabel className="text-sm font-medium">Membro Ativo</FormLabel>
                  <FormDescription className="text-xs text-gray-500">
                    Desmarque para desativar este membro
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
            onClick={() => router.push('/ccr/membros')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? 'Atualizar' : 'Criar'} Membro
          </Button>
        </div>
      </form>
    </Form>
  );
}
