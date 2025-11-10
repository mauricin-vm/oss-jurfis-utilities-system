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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type SubjectFormValues = {
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
};

interface Subject {
  id: string;
  name: string;
  parentId: string | null;
}

interface SubjectFormProps {
  initialData?: Partial<SubjectFormValues> & { id?: string };
}

export function SubjectForm({ initialData }: SubjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const form = useForm<SubjectFormValues>({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      parentId: initialData?.parentId || '',
      isActive: initialData?.isActive ?? true,
    },
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const response = await fetch('/api/ccr/subjects?isActive=true');
      if (response.ok) {
        const data = await response.json();
        // Filtrar o próprio assunto da lista (para não poder ser pai de si mesmo)
        const filtered = initialData?.id
          ? data.filter((s: Subject) => s.id !== initialData.id)
          : data;
        setSubjects(filtered);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const onSubmit = async (data: SubjectFormValues) => {
    try {
      // Validações
      if (!data.name || data.name.trim() === '') {
        toast.error('Nome é obrigatório');
        return;
      }

      setLoading(true);

      const url = initialData?.id
        ? `/api/ccr/subjects/${initialData.id}`
        : '/api/ccr/subjects';

      const method = initialData?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          parentId: data.parentId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(initialData?.id ? 'Assunto atualizado com sucesso' : 'Assunto criado com sucesso');
      router.push('/ccr/assuntos');
      router.refresh();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar assunto');
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
                  placeholder="Ex: Isenção de IPTU"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descrição detalhada do assunto"
                  rows={3}
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                  {...field}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">Assunto Pai (Hierarquia)</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                defaultValue={field.value || 'none'}
                disabled={loadingSubjects}
              >
                <FormControl>
                  <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Nenhum (assunto principal)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-lg">
                  <SelectItem value="none" className="cursor-pointer">Nenhum (assunto principal)</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id} className="cursor-pointer">
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription className="text-xs text-gray-500 mt-2">
                Deixe em branco para criar um assunto principal, ou selecione um pai para criar um sub-item
              </FormDescription>
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
                  <FormLabel className="text-sm font-medium">Assunto Ativo</FormLabel>
                  <FormDescription className="text-xs text-gray-500">
                    Desmarque para desativar este assunto
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
            onClick={() => router.push('/ccr/assuntos')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? 'Atualizar' : 'Criar'} Assunto
          </Button>
        </div>
      </form>
    </Form>
  );
}
