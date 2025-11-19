'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: string;
}

interface VoteDecision {
  id: string;
  identifier: string;
  type: string;
  acceptText?: string | null;
  rejectText?: string | null;
  text?: string | null;
}

interface SessionVoteFormProps {
  sessionId: string;
  resourceId: string;
  members: Member[];
  distributedToId?: string;
  relatorId?: string;
  reviewersIds?: string[];
  preliminaryDecisions: VoteDecision[];
  meritDecisions: VoteDecision[];
  officialDecisions: VoteDecision[];
}

type SessionVoteFormValues = {
  memberId: string;
  voteKnowledgeType: 'NAO_CONHECIMENTO' | 'CONHECIMENTO';
  preliminaryDecisionType: 'ACATAR' | 'AFASTAR';
  preliminaryDecisionId: string;
  meritDecisionId: string;
  officialDecisionId: string;
  voteText: string;
};

export function SessionVoteForm({
  sessionId,
  resourceId,
  members,
  distributedToId,
  relatorId,
  reviewersIds = [],
  preliminaryDecisions,
  meritDecisions,
  officialDecisions,
}: SessionVoteFormProps) {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(false);

  const form = useForm<SessionVoteFormValues>({
    defaultValues: {
      memberId: distributedToId || '',
      voteKnowledgeType: 'NAO_CONHECIMENTO',
      preliminaryDecisionType: 'ACATAR',
      preliminaryDecisionId: 'none',
      meritDecisionId: 'none',
      officialDecisionId: 'none',
      voteText: '',
    },
  });

  const voteKnowledgeType = form.watch('voteKnowledgeType');
  const preliminaryDecisionType = form.watch('preliminaryDecisionType');
  const preliminaryDecisionId = form.watch('preliminaryDecisionId');
  const meritDecisionId = form.watch('meritDecisionId');
  const officialDecisionId = form.watch('officialDecisionId');

  // Determinar tipo de voto automaticamente baseado no membro selecionado
  const getVoteType = (selectedMemberId: string): 'RELATOR' | 'REVISOR' => {
    if (selectedMemberId === relatorId) {
      return 'RELATOR';
    }
    return 'REVISOR';
  };

  // Normalizar texto: remover ponto final e ajustar primeira letra
  const normalizeText = (text: string, keepFirstUpper: boolean = false): string => {
    if (!text) return '';
    let normalized = text.trim();
    // Converter primeira letra para minúscula ou manter maiúscula
    if (normalized.length > 0 && !keepFirstUpper) {
      normalized = normalized.charAt(0).toLowerCase() + normalized.slice(1);
    }
    // Remover ponto final se houver
    if (normalized.endsWith('.')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  };

  // Limpar ofício quando mudar de ACATAR para AFASTAR
  useEffect(() => {
    if (voteKnowledgeType === 'NAO_CONHECIMENTO' && preliminaryDecisionType === 'AFASTAR') {
      form.setValue('officialDecisionId', 'none');
    }
  }, [preliminaryDecisionType, voteKnowledgeType]);

  // Atualizar texto quando decisões mudarem
  useEffect(() => {
    buildVoteText();
  }, [preliminaryDecisionType, preliminaryDecisionId, meritDecisionId, officialDecisionId, voteKnowledgeType]);

  const buildVoteText = () => {
    let text = '';

    if (voteKnowledgeType === 'NAO_CONHECIMENTO') {
      const hasPreliminar = preliminaryDecisionId && preliminaryDecisionId !== 'none';
      // Ofício só é considerado se a finalidade for ACATAR
      const hasOficio = preliminaryDecisionType === 'ACATAR' && officialDecisionId && officialDecisionId !== 'none';

      let preliminarText = '';
      let oficioText = '';

      // Obter texto da preliminar
      if (hasPreliminar) {
        const decision = preliminaryDecisions.find(d => d.id === preliminaryDecisionId);
        if (decision) {
          const textToUse = preliminaryDecisionType === 'ACATAR' ? decision.acceptText : decision.rejectText;
          if (textToUse) {
            // Manter primeira letra maiúscula porque inicia a frase
            preliminarText = normalizeText(textToUse, true);
          }
        }
      }

      // Obter texto do ofício (apenas se finalidade for ACATAR)
      if (hasOficio) {
        const decision = officialDecisions.find(d => d.id === officialDecisionId);
        if (decision?.text) {
          // Primeira letra minúscula porque vem depois de vírgula
          oficioText = normalizeText(decision.text, false);
        }
      }

      // Aplicar regras de composição
      if (hasPreliminar && !hasOficio) {
        // Regra 1: Apenas Preliminar (primeira maiúscula)
        text = `${preliminarText}.`;
      } else if (hasPreliminar && hasOficio) {
        // Regra 2: Preliminar + Ofício (preliminar maiúscula, ofício minúscula)
        text = `${preliminarText}, mas, de ofício, ${oficioText}.`;
      } else if (!hasPreliminar && hasOficio) {
        // Regra 3: Apenas Ofício (ofício minúscula)
        text = `Não conhecer do recurso, mas, de ofício, ${oficioText}.`;
      } else if (!hasPreliminar && !hasOficio && preliminaryDecisionType === 'AFASTAR') {
        // Regra 4: Afastar sem preliminar específica
        text = 'Conhecer do recurso.';
      }
    } else {
      // CONHECIMENTO
      const hasMerito = meritDecisionId && meritDecisionId !== 'none';
      const hasOficio = officialDecisionId && officialDecisionId !== 'none';

      let meritoText = '';
      let oficioText = '';

      // Obter texto do mérito
      if (hasMerito) {
        const decision = meritDecisions.find(d => d.id === meritDecisionId);
        if (decision?.text) {
          // Manter primeira letra maiúscula
          meritoText = normalizeText(decision.text, true);
        }
      }

      // Obter texto do ofício
      if (hasOficio) {
        const decision = officialDecisions.find(d => d.id === officialDecisionId);
        if (decision?.text) {
          // Primeira letra minúscula porque vem depois de vírgula
          oficioText = normalizeText(decision.text, false);
        }
      }

      // Aplicar regras de composição
      if (hasMerito && !hasOficio) {
        // Regra 1: Apenas Mérito (primeira maiúscula)
        text = `${meritoText}.`;
      } else if (hasMerito && hasOficio) {
        // Regra 2: Mérito + Ofício
        text = `${meritoText}, mas, de ofício, ${oficioText}.`;
      }
    }

    form.setValue('voteText', text.trim());
  };

  const onSubmit = async (data: SessionVoteFormValues) => {
    try {
      if (!data.memberId) {
        toast.error('Selecione o membro');
        return;
      }

      if (data.voteKnowledgeType === 'CONHECIMENTO' && (!data.meritDecisionId || data.meritDecisionId === 'none')) {
        toast.error('Decisão de mérito é obrigatória para voto de conhecimento');
        return;
      }

      if (data.voteKnowledgeType === 'NAO_CONHECIMENTO') {
        const hasPreliminar = data.preliminaryDecisionId && data.preliminaryDecisionId !== 'none';
        const hasOficio = data.officialDecisionId && data.officialDecisionId !== 'none';

        // Se finalidade for ACATAR, precisa ter pelo menos Preliminar ou Ofício
        if (data.preliminaryDecisionType === 'ACATAR' && !hasPreliminar && !hasOficio) {
          toast.error('Para votos de não conhecimento com finalidade de acatar, selecione pelo menos uma preliminar ou uma decisão de ofício');
          return;
        }

        // Se finalidade for AFASTAR, é opcional (pode não ter preliminar)
        // Neste caso, não precisa validação adicional
      }

      if (!data.voteText.trim()) {
        toast.error('O texto do voto não pode estar vazio');
        return;
      }

      const voteType = getVoteType(data.memberId);

      setLoading(true);
      const response = await fetch(
        `/api/ccr/sessions/${sessionId}/processos/${resourceId}/session-votes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId: data.memberId,
            voteType,
            voteKnowledgeType: data.voteKnowledgeType,
            preliminaryDecisionId: data.preliminaryDecisionId !== 'none' ? data.preliminaryDecisionId : null,
            preliminaryDecisionType: data.voteKnowledgeType === 'NAO_CONHECIMENTO' ? data.preliminaryDecisionType : null,
            meritDecisionId: data.meritDecisionId !== 'none' ? data.meritDecisionId : null,
            officialDecisionId: data.officialDecisionId !== 'none' ? data.officialDecisionId : null,
            voteText: data.voteText.trim(),
          }),
        }
      );

      if (response.ok) {
        toast.success('Voto registrado com sucesso');
        router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao registrar voto');
      }
    } catch (error) {
      console.error('Error creating session vote:', error);
      toast.error('Erro ao registrar voto');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Membro e Tipo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Membro <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o membro..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <span>{member.name} - {member.role}</span>
                            {member.id === relatorId && (
                              <span className="px-2 py-0.5 text-xs font-medium text-white bg-gray-900 rounded">
                                Relator
                              </span>
                            )}
                            {reviewersIds.includes(member.id) && (
                              <span className="px-2 py-0.5 text-xs font-medium text-white bg-gray-900 rounded">
                                Revisor
                              </span>
                            )}
                          </div>
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
            name="voteKnowledgeType"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Tipo <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      <SelectItem value="NAO_CONHECIMENTO">Não Conhecimento</SelectItem>
                      <SelectItem value="CONHECIMENTO">Conhecimento</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Finalidade e Preliminar (para Não Conhecimento) */}
        {voteKnowledgeType === 'NAO_CONHECIMENTO' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="preliminaryDecisionType"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="block text-sm font-medium mb-1.5">
                      Finalidade <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                          <SelectValue placeholder="Selecione a finalidade..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          <SelectItem value="ACATAR">Acatar</SelectItem>
                          <SelectItem value="AFASTAR">Afastar</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preliminaryDecisionId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className="block text-sm font-medium mb-1.5">
                      Preliminar
                    </FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                          <SelectValue placeholder="Nenhuma" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {preliminaryDecisions.map((decision) => (
                            <SelectItem key={decision.id} value={decision.id}>
                              {decision.identifier}
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

            {/* Ofício (apenas se finalidade for Acatar) */}
            {preliminaryDecisionType === 'ACATAR' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="officialDecisionId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className="block text-sm font-medium mb-1.5">
                        Ofício
                      </FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={loading}
                        >
                          <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                            <SelectValue placeholder="Nenhuma" />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg">
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {officialDecisions.map((decision) => (
                              <SelectItem key={decision.id} value={decision.id}>
                                {decision.identifier}
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
            )}
          </>
        )}

        {/* Mérito e Ofício (para Conhecimento) */}
        {voteKnowledgeType === 'CONHECIMENTO' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="meritDecisionId"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="block text-sm font-medium mb-1.5">
                    Mérito <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione uma decisão de mérito..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="none">Selecione uma decisão de mérito...</SelectItem>
                        {meritDecisions.map((decision) => (
                          <SelectItem key={decision.id} value={decision.id}>
                            {decision.identifier}
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
              name="officialDecisionId"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="block text-sm font-medium mb-1.5">
                    Ofício
                  </FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={loading}
                    >
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Nenhuma" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        <SelectItem value="none">Nenhuma</SelectItem>
                        {officialDecisions.map((decision) => (
                          <SelectItem key={decision.id} value={decision.id}>
                            {decision.identifier}
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
        )}

        {/* Voto */}
        <FormField
          control={form.control}
          name="voteText"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="block text-sm font-medium mb-1.5">
                Voto <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  disabled={loading}
                  placeholder="O texto será gerado automaticamente com base nas decisões selecionadas. Você pode editá-lo conforme necessário."
                  rows={10}
                  className="resize-none px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
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
            onClick={handleCancel}
            disabled={loading}
            className="cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="cursor-pointer"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Voto
          </Button>
        </div>
      </form>
    </Form>
  );
}
