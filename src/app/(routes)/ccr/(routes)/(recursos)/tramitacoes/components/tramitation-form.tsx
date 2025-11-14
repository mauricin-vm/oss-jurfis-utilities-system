'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { TramitationFormSkeleton } from './tramitation-form-skeleton';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

type TramitationFormValues = {
  processNumber: string;
  purpose: string;
  destinationType: 'sector' | 'member' | 'custom';
  sectorId?: string;
  memberId?: string;
  destination?: string;
  deadline?: string;
  observations?: string;
};

interface Sector {
  id: string;
  name: string;
  abbreviation?: string | null;
}

interface Member {
  id: string;
  name: string;
  role?: string | null;
}

const purposeLabels: Record<string, string> = {
  SOLICITAR_PROCESSO: 'Solicitar Processo',
  CONTRARRAZAO: 'Contrarrazão',
  PARECER_PGM: 'Parecer PGM',
  JULGAMENTO: 'Julgamento',
  DILIGENCIA: 'Diligência',
  OUTRO: 'Outro',
};

export function TramitationForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<TramitationFormValues>({
    defaultValues: {
      processNumber: '',
      purpose: '',
      destinationType: 'sector',
      sectorId: '',
      memberId: '',
      destination: '',
      deadline: '',
      observations: '',
    },
  });

  const destinationType = form.watch('destinationType');

  // Buscar dados necessários
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [sectorsRes, membersRes] = await Promise.all([
          fetch('/api/ccr/sectors?isActive=true'),
          fetch('/api/ccr/members?isActive=true'),
        ]);

        if (sectorsRes.ok) {
          const sectorsData = await sectorsRes.json();
          setSectors(sectorsData);
        }

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          setMembers(membersData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (data: TramitationFormValues) => {
    try {
      // Validações
      if (!data.processNumber) {
        toast.error('Número do processo é obrigatório');
        return;
      }

      if (!data.purpose) {
        toast.error('Finalidade é obrigatória');
        return;
      }

      if (
        data.destinationType === 'sector' && !data.sectorId ||
        data.destinationType === 'member' && !data.memberId ||
        data.destinationType === 'custom' && !data.destination
      ) {
        toast.error('Destino é obrigatório');
        return;
      }

      setLoading(true);

      const payload: any = {
        processNumber: data.processNumber.trim(),
        purpose: data.purpose,
        observations: data.observations || null,
        deadline: data.deadline || null,
      };

      // Adicionar destino baseado no tipo
      if (data.destinationType === 'sector') {
        payload.sectorId = data.sectorId;
      } else if (data.destinationType === 'member') {
        payload.memberId = data.memberId;
      } else {
        payload.destination = data.destination;
      }

      const response = await fetch('/api/ccr/tramitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Tramitação criada com sucesso');
      router.push('/ccr/tramitacoes');
      router.refresh();
    } catch (error) {
      console.error('Error creating tramitation:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar tramitação');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <TramitationFormSkeleton />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Número do Processo e Finalidade */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="processNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Número do Processo <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 12345/2025"
                    disabled={loading}
                    {...field}
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="purpose"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  Finalidade <span className="text-red-500">*</span>
                  <TooltipWrapper content="O status do recurso será alterado conforme a finalidade escolhida">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione a finalidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(purposeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tipo de Destino, Destino e Prazo Limite */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="destinationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Tipo de Destino <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="sector">Setor</SelectItem>
                    <SelectItem value="member">Membro/Conselheiro</SelectItem>
                    <SelectItem value="custom">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Destino - Setor */}
          {destinationType === 'sector' && (
            <FormField
              control={form.control}
              name="sectorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Setor de Destino <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione o setor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sectors.map((sector) => (
                        <SelectItem key={sector.id} value={sector.id}>
                          {sector.abbreviation || sector.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Destino - Membro */}
          {destinationType === 'member' && (
            <FormField
              control={form.control}
              name="memberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Membro/Conselheiro de Destino <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione o membro" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} {member.role && `(${member.role})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Destino - Texto Livre */}
          {destinationType === 'custom' && (
            <FormField
              control={form.control}
              name="destination"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Destino <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Secretaria Municipal"
                      disabled={loading}
                      {...field}
                      className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Prazo Limite */}
          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5">
                  Prazo Limite
                  <TooltipWrapper content="Preencha o prazo limite para controlar o vencimento da tramitação">
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipWrapper>
                </FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    disabled={loading}
                    {...field}
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </FormControl>
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
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Informações adicionais sobre a tramitação..."
                  disabled={loading}
                  {...field}
                  rows={4}
                  className="px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ccr/tramitacoes')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Tramitação
          </Button>
        </div>
      </form>
    </Form>
  );
}
