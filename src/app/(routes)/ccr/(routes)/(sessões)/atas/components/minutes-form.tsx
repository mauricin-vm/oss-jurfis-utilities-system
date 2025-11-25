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
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type MinutesFormValues = {
  minutesNumber?: string;
  ordinalNumber: number;
  ordinalType: string;
  endTime: string;
  administrativeMatters?: string;
  sessionId?: string;
  presidentId?: string;
};

interface Member {
  id: string;
  name: string;
}

interface Session {
  id: string;
  sessionNumber: string;
}

interface MinutesFormProps {
  initialData?: any;
}

const sessionTypeOptions = [
  { value: 'ORDINARIA', label: 'Ordinária' },
  { value: 'EXTRAORDINARIA', label: 'Extraordinária' },
];

export function MinutesForm({ initialData }: MinutesFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [presentMembers, setPresentMembers] = useState<Set<string>>(
    new Set(initialData?.presentMembers?.map((m: any) => m.memberId) || [])
  );
  const [absentMembers, setAbsentMembers] = useState<Map<string, { isJustified: boolean; justification?: string }>>(
    new Map(
      initialData?.absentMembers?.map((m: any) => [
        m.memberId,
        { isJustified: m.isJustified, justification: m.justification }
      ]) || []
    )
  );

  const form = useForm<MinutesFormValues>({
    defaultValues: {
      minutesNumber: initialData?.minutesNumber || '',
      ordinalNumber: initialData?.ordinalNumber || 1,
      ordinalType: initialData?.ordinalType || 'ORDINARIA',
      endTime: initialData?.endTime || '',
      administrativeMatters: initialData?.administrativeMatters || '',
      sessionId: initialData?.sessionId || '',
      presidentId: initialData?.presidentId || '',
    },
  });

  useEffect(() => {
    fetchMembers();
    fetchSessions();
  }, []);

  const fetchMembers = async () => {
    try {
      setLoadingMembers(true);
      const response = await fetch('/api/ccr/members');
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      toast.error('Erro ao carregar membros');
    } finally {
      setLoadingMembers(false);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await fetch('/api/ccr/sessions');
      if (response.ok) {
        const data = await response.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoadingSessions(false);
    }
  };

  const toggleMemberPresence = (memberId: string, isPresent: boolean) => {
    if (isPresent) {
      setPresentMembers(prev => {
        const newSet = new Set(prev);
        newSet.add(memberId);
        return newSet;
      });
      setAbsentMembers(prev => {
        const newMap = new Map(prev);
        newMap.delete(memberId);
        return newMap;
      });
    } else {
      setPresentMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
      setAbsentMembers(prev => {
        const newMap = new Map(prev);
        newMap.set(memberId, { isJustified: false });
        return newMap;
      });
    }
  };

  const updateAbsenceJustification = (memberId: string, isJustified: boolean, justification?: string) => {
    setAbsentMembers(prev => {
      const newMap = new Map(prev);
      newMap.set(memberId, { isJustified, justification });
      return newMap;
    });
  };

  const onSubmit = async (data: MinutesFormValues) => {
    try {
      // Validações
      if (!data.ordinalNumber || data.ordinalNumber < 1) {
        toast.error('Número ordinal é obrigatório e deve ser maior que 0');
        return;
      }

      if (!data.ordinalType) {
        toast.error('Tipo de sessão é obrigatório');
        return;
      }

      if (!data.endTime || data.endTime.trim() === '') {
        toast.error('Horário de encerramento é obrigatório');
        return;
      }

      setLoading(true);

      const url = initialData?.id
        ? `/api/ccr/minutes/${initialData.id}`
        : '/api/ccr/minutes';

      const method = initialData?.id ? 'PUT' : 'POST';

      // Preparar membros presentes
      const presentMembersList = Array.from(presentMembers).map(memberId => ({
        memberId,
      }));

      // Preparar membros ausentes
      const absentMembersList = Array.from(absentMembers.entries()).map(([memberId, data]) => ({
        memberId,
        isJustified: data.isJustified,
        justification: data.isJustified ? data.justification : null,
      }));

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordinalNumber: data.ordinalNumber,
          ordinalType: data.ordinalType,
          endTime: data.endTime.trim(),
          administrativeMatters: data.administrativeMatters?.trim() || null,
          sessionId: data.sessionId || null,
          presidentId: data.presidentId || null,
          presentMembers: presentMembersList,
          absentMembers: absentMembersList,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(
        initialData?.id ? 'Ata atualizada com sucesso' : 'Ata criada com sucesso'
      );
      router.push('/ccr/atas');
      router.refresh();
    } catch (error) {
      console.error('Error saving minutes:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar ata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Número da Ata (apenas em edição) */}
        {initialData?.id && (
          <FormField
            control={form.control}
            name="minutesNumber"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Número da Ata
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    disabled
                    className="h-10 px-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Sessão e Presidente */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="sessionId"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Sessão (Opcional)
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    disabled={loadingSessions}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione uma sessão" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="none">Nenhuma</SelectItem>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.sessionNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  Presidente (Opcional)
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    disabled={loadingMembers}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione um presidente" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
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

        {/* Tipo e Número Ordinal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="ordinalType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Tipo de Sessão <span className="text-red-500">*</span>
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
                      {sessionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
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

          <FormField
            control={form.control}
            name="ordinalNumber"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Número Ordinal <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Ex: 1"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Horário de Encerramento */}
        <FormField
          control={form.control}
          name="endTime"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">
                Horário de Encerramento <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: 18:00"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Assuntos Administrativos */}
        <FormField
          control={form.control}
          name="administrativeMatters"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">
                Assuntos Administrativos (Opcional)
              </FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva os assuntos administrativos discutidos"
                  className="min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Membros Presentes e Ausentes */}
        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-medium px-2">
            Membros Presentes e Ausentes
          </legend>

          {loadingMembers ? (
            <p className="text-sm text-muted-foreground">Carregando membros...</p>
          ) : (
            <div className="space-y-3 mt-4">
              {members.map((member) => {
                const isPresent = presentMembers.has(member.id);
                const absenceData = absentMembers.get(member.id);

                return (
                  <div key={member.id} className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isPresent}
                        onCheckedChange={(checked) => toggleMemberPresence(member.id, !!checked)}
                        className="cursor-pointer"
                      />
                      <label className="text-sm font-medium cursor-pointer" onClick={() => toggleMemberPresence(member.id, !isPresent)}>
                        {member.name}
                      </label>
                    </div>

                    {/* Se ausente, mostrar opções de justificativa */}
                    {!isPresent && absenceData && (
                      <div className="ml-7 space-y-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={absenceData.isJustified}
                            onCheckedChange={(checked) =>
                              updateAbsenceJustification(member.id, !!checked, absenceData.justification)
                            }
                            className="cursor-pointer"
                          />
                          <label className="text-xs font-medium text-gray-600">
                            Ausência justificada
                          </label>
                        </div>

                        {absenceData.isJustified && (
                          <Textarea
                            placeholder="Justificativa da ausência"
                            value={absenceData.justification || ''}
                            onChange={(e) =>
                              updateAbsenceJustification(member.id, true, e.target.value)
                            }
                            className="text-xs min-h-[60px] px-2 py-1.5 border border-gray-200 rounded focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </fieldset>

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ccr/atas')}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading} className="cursor-pointer">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData?.id ? 'Atualizar' : 'Criar'} Ata
          </Button>
        </div>
      </form>
    </Form>
  );
}
