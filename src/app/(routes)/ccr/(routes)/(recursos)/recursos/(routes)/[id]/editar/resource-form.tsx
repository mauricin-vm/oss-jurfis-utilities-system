'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, HelpCircle } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { RESOURCE_STATUS } from '../../../../../../hooks/resource-status';

type ResourceFormValues = {
  processName: string;
  attachedProcesses: string;
  status: string;
  type: string;
};

interface ResourceFormProps {
  initialData: {
    id: string;
    resourceNumber: string;
    processNumber: string;
    processName: string | null;
    type: string;
    status: string;
    attachedProcesses: string[];
  };
}

export function ResourceForm({ initialData }: ResourceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<ResourceFormValues>({
    defaultValues: {
      processName: initialData.processName || '',
      attachedProcesses: initialData.attachedProcesses?.join(', ') || '',
      status: initialData.status,
      type: initialData.type,
    },
  });

  const onSubmit = async (data: ResourceFormValues) => {
    try {
      // Validação
      if (!data.processName || data.processName.trim() === '') {
        toast.error('Razão social é obrigatória');
        return;
      }

      setLoading(true);

      // Processar processos apensos
      const attachedProcessesList = data.attachedProcesses
        ? data.attachedProcesses
            .split(',')
            .map(p => p.trim())
            .filter(p => p.length > 0)
        : [];

      // Validar formato dos processos apensos
      if (attachedProcessesList.length > 0) {
        const processNumberRegex = /^\d{1,6}\/\d{4}-\d{2}$/;

        for (let i = 0; i < attachedProcessesList.length; i++) {
          const process = attachedProcessesList[i];

          if (!processNumberRegex.test(process)) {
            toast.error(
              `Processo apenso "${process}" está em formato inválido. Use o formato: 123456/2024-01`
            );
            setLoading(false);
            return;
          }
        }
      }

      const response = await fetch(`/api/ccr/resources/${initialData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processName: data.processName.trim(),
          attachedProcesses: attachedProcessesList,
          status: data.status,
          type: data.type,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Recurso atualizado com sucesso');
      router.push(`/ccr/recursos/${initialData.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar recurso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Número do Recurso e Número do Processo (read-only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Número do Recurso
            </label>
            <Input
              value={initialData.resourceNumber}
              disabled
              className="h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Número do Processo
            </label>
            <Input
              value={initialData.processNumber}
              disabled
              className="h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Status e Tipo de Recurso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Status <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg">
                    {Object.entries(RESOURCE_STATUS).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  Tipo de Recurso <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="VOLUNTARIO">Voluntário</SelectItem>
                    <SelectItem value="OFICIO">Ofício</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Razão Social */}
        <FormField
          control={form.control}
          name="processName"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">
                Razão Social <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite a razão social"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Processos Apensos */}
        <FormField
          control={form.control}
          name="attachedProcesses"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                Processos Apensos
                <TooltipWrapper content="Separe múltiplos processos por vírgula">
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipWrapper>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: 123456/2024-01, 789012/2024-02"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/ccr/recursos/${initialData.id}`)}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}
