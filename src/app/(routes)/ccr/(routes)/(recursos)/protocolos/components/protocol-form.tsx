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
import { Loader2, Plus, X } from 'lucide-react';
import { formatPhoneForDisplay } from '@/lib/validations';

type ProtocolFormValues = {
  number?: string;
  createdAt?: string;
  processNumber: string;
  presenter: string;
};

interface PartData {
  name: string;
  role: string;
  document?: string;
  contacts: ContactData[];
}

interface ContactData {
  type: string;
  value: string;
  isPrimary: boolean;
}

interface ProtocolFormProps {
  initialData?: any;
}

const roleOptions = [
  { value: 'REQUERENTE', label: 'Requerente' },
  { value: 'PATRONO', label: 'Patrono' },
  { value: 'REPRESENTANTE', label: 'Representante' },
  { value: 'OUTRO', label: 'Outro' },
];

const contactTypeOptions = [
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'EMAIL', label: 'E-mail' },
];

export function ProtocolForm({ initialData }: ProtocolFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Função para formatar número do processo: 1-6 dígitos + / + 4 dígitos + - + 2 dígitos
  const formatProcessNumber = (value: string) => {
    // Manter apenas números, barras e hífens
    let cleaned = value.replace(/[^\d/-]/g, '');

    // Verificar se já tem barra ou hífen digitados pelo usuário
    const hasSlash = cleaned.includes('/');
    const hasDash = cleaned.includes('-');

    if (hasSlash) {
      // Usuário digitou a barra, respeitar a posição
      const parts = cleaned.split('/');
      let processNum = parts[0].replace(/\D/g, '').slice(0, 6); // Máximo 6 dígitos
      let rest = parts[1] ? parts[1].replace(/[^0-9-]/g, '') : '';

      if (rest.includes('-')) {
        const yearAndSeq = rest.split('-');
        let year = yearAndSeq[0].slice(0, 4); // 4 dígitos do ano
        let seq = yearAndSeq[1] ? yearAndSeq[1].slice(0, 2) : ''; // 2 dígitos da sequência
        return processNum + '/' + year + (seq ? '-' + seq : (hasDash ? '-' : ''));
      } else {
        let numbers = rest.replace(/\D/g, '');
        if (numbers.length <= 4) {
          return processNum + '/' + numbers;
        } else {
          return processNum + '/' + numbers.slice(0, 4) + '-' + numbers.slice(4, 6);
        }
      }
    } else {
      // Sem barra ainda, apenas números
      const numbers = cleaned.replace(/\D/g, '');

      if (numbers.length <= 6) {
        return numbers;
      } else if (numbers.length <= 10) {
        // Adiciona barra automaticamente após 6 dígitos
        return numbers.slice(0, 6) + '/' + numbers.slice(6);
      } else {
        // Adiciona barra e hífen
        return numbers.slice(0, 6) + '/' + numbers.slice(6, 10) + '-' + numbers.slice(10, 12);
      }
    }
  };

  // Formatar telefones dos dados iniciais
  const formatInitialParts = (parts: any[]): PartData[] => {
    if (!parts || parts.length === 0) return [];

    return parts.map(part => ({
      name: part.name || '',
      role: part.role || '',
      document: part.document || '',
      contacts: (part.contacts || []).map((contact: any) => ({
        type: contact.type || 'TELEFONE',
        value: contact.type === 'TELEFONE' ? formatPhoneForDisplay(contact.value) : contact.value,
        isPrimary: contact.isPrimary || false,
      })),
    }));
  };

  const [parts, setParts] = useState<PartData[]>(
    formatInitialParts(initialData?.parts || [])
  );

  // Função para converter data do servidor para formato do input (YYYY-MM-DD no timezone local)
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const form = useForm<ProtocolFormValues>({
    defaultValues: {
      number: initialData?.number || '',
      createdAt: initialData?.createdAt ? formatDateForInput(initialData.createdAt) : '',
      processNumber: initialData?.processNumber ? formatProcessNumber(initialData.processNumber) : '',
      presenter: initialData?.presenter || '',
    },
  });

  const isConverted = initialData?.resource;

  const addPart = () => {
    setParts([
      ...parts,
      {
        name: '',
        role: '',
        document: '',
        contacts: [{ type: 'TELEFONE', value: '', isPrimary: false }],
      },
    ]);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof PartData, value: any) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };
    setParts(updated);
  };

  const updateContact = (
    partIndex: number,
    contactIndex: number,
    field: keyof ContactData,
    value: any
  ) => {
    const updated = [...parts];
    // Garantir que o array de contatos existe
    if (!updated[partIndex].contacts[contactIndex]) {
      updated[partIndex].contacts[contactIndex] = {
        type: 'TELEFONE',
        value: '',
        isPrimary: true,
      };
    }

    // Se estiver mudando o tipo de contato, limpar o valor
    if (field === 'type') {
      updated[partIndex].contacts[contactIndex] = {
        ...updated[partIndex].contacts[contactIndex],
        [field]: value,
        value: '', // Limpar o valor ao mudar o tipo
      };
    } else if (field === 'value' && updated[partIndex].contacts[contactIndex].type === 'TELEFONE') {
      // Aplicar máscara de telefone
      const formatted = formatPhoneForDisplay(value);
      updated[partIndex].contacts[contactIndex] = {
        ...updated[partIndex].contacts[contactIndex],
        [field]: formatted,
      };
    } else {
      updated[partIndex].contacts[contactIndex] = {
        ...updated[partIndex].contacts[contactIndex],
        [field]: value,
      };
    }

    setParts(updated);
  };

  const addContact = (partIndex: number) => {
    const updated = [...parts];
    updated[partIndex].contacts.push({
      type: 'TELEFONE',
      value: '',
      isPrimary: false,
    });
    setParts(updated);
  };

  const removeContact = (partIndex: number, contactIndex: number) => {
    const updated = [...parts];
    // Garantir que sempre reste pelo menos um contato
    if (updated[partIndex].contacts.length > 1) {
      updated[partIndex].contacts = updated[partIndex].contacts.filter(
        (_, i) => i !== contactIndex
      );
      setParts(updated);
    }
  };

  const onSubmit = async (data: ProtocolFormValues) => {
    try {
      // Validações
      if (!data.processNumber || data.processNumber.trim() === '') {
        toast.error('Número do processo é obrigatório');
        return;
      }

      // Validar formato do número do processo: 1-6 dígitos + / + 4 dígitos + - + 2 dígitos
      const processNumberRegex = /^\d{1,6}\/\d{4}-\d{2}$/;
      if (!processNumberRegex.test(data.processNumber)) {
        toast.error('Formato do número do processo inválido. Use: 123456/2024-01');
        return;
      }

      if (!data.presenter || data.presenter.trim() === '') {
        toast.error('Apresentante é obrigatório');
        return;
      }

      // Validar partes (se foi adicionada uma parte, todos os campos devem estar preenchidos)
      if (parts.length > 0) {
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];

          if (!part.name || part.name.trim() === '') {
            toast.error(`Nome da parte ${i + 1} é obrigatório`);
            return;
          }

          if (!part.role) {
            toast.error(`Tipo da parte ${i + 1} é obrigatório`);
            return;
          }

          // Validar que pelo menos um contato foi preenchido
          if (!part.contacts || part.contacts.length === 0) {
            toast.error(`Pelo menos um contato da parte ${i + 1} é obrigatório`);
            return;
          }

          // Validar cada contato
          for (let j = 0; j < part.contacts.length; j++) {
            const contact = part.contacts[j];
            if (!contact.value || contact.value.trim() === '') {
              toast.error(`Contato ${j + 1} da parte ${i + 1} não pode estar vazio`);
              return;
            }
          }
        }
      }

      setLoading(true);

      const url = initialData?.id
        ? `/api/ccr/protocols/${initialData.id}`
        : '/api/ccr/protocols';

      const method = initialData?.id ? 'PUT' : 'POST';

      // Preparar partes para envio (remover formatação do telefone)
      const validParts = parts.map((part) => ({
        name: part.name,
        role: part.role,
        document: part.document || null,
        contacts: part.contacts.map((contact) => ({
          ...contact,
          // Remover formatação do telefone antes de enviar
          value:
            contact.type === 'TELEFONE'
              ? contact.value.replace(/\D/g, '')
              : contact.value,
        })),
      }));

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processNumber: data.processNumber.trim(), // Envia com formatação
          presenter: data.presenter.trim(),
          ...(data.createdAt && { createdAt: new Date(data.createdAt + 'T00:00:00').toISOString() }), // Converter para ISO mantendo a data correta
          parts: validParts,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success(
        initialData?.id ? 'Protocolo atualizado com sucesso' : 'Protocolo criado com sucesso'
      );
      router.push('/ccr/protocolos');
      router.refresh();
    } catch (error) {
      console.error('Error saving protocol:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar protocolo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isConverted && (
          <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4">
            <p className="text-sm font-medium text-yellow-800">
              Este protocolo foi convertido em recurso e não pode mais ser editado.
            </p>
          </div>
        )}

        {/* Número do Protocolo e Data de Criação (apenas em edição) */}
        {initialData?.id && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="block text-sm font-medium mb-1.5">
                    Número do Protocolo
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

            <FormField
              control={form.control}
              name="createdAt"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormLabel className="block text-sm font-medium mb-1.5">
                    Data de Criação <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
                      disabled={isConverted}
                      className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Número do Processo e Apresentante */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="processNumber"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Número do Processo <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 123456/2024-01"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={field.value}
                    onChange={(e) => {
                      const formatted = formatProcessNumber(e.target.value);
                      field.onChange(formatted);
                    }}
                    disabled={isConverted}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="presenter"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="block text-sm font-medium mb-1.5">
                  Apresentante <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Nome de quem está apresentando"
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                    disabled={isConverted}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Partes */}
        <fieldset className="border border-gray-200 rounded-lg p-4">
          <legend className="text-sm font-medium px-2">
            Partes Envolvidas
          </legend>

          <p className="text-xs text-gray-500 mb-4">
            Adicione as partes envolvidas e seus respectivos contatos
          </p>

          <div className="space-y-4">
            {parts.map((part, partIndex) => (
              <div key={partIndex} className="border border-gray-200 rounded-lg p-4 space-y-3">
                {/* Cabeçalho da Parte com Nome e Tipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-gray-600">Nome da Parte</label>
                    <Input
                      placeholder="Nome da parte"
                      value={part.name}
                      onChange={(e) => updatePart(partIndex, 'name', e.target.value)}
                      disabled={isConverted}
                      className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1.5 text-gray-600">Tipo</label>
                      <Select
                        value={part.role}
                        onValueChange={(value) => updatePart(partIndex, 'role', value)}
                        disabled={isConverted}
                      >
                        <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Botão Remover Parte */}
                    {!isConverted && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePart(partIndex)}
                        className="shrink-0 cursor-pointer h-10"
                        title="Remover parte"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Contatos da Parte */}
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Contatos</label>
                  {part.contacts.map((contact, contactIndex) => (
                    <div key={contactIndex} className="flex gap-2 items-center">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        {/* Tipo de Contato - ocupa 1/2 */}
                        <div>
                          <Select
                            value={contact.type || 'TELEFONE'}
                            onValueChange={(value) =>
                              updateContact(partIndex, contactIndex, 'type', value)
                            }
                            disabled={isConverted}
                          >
                            <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                              {contactTypeOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Campo de Contato - ocupa 1/2 */}
                        <div>
                          <Input
                            placeholder={
                              contact.type === 'EMAIL'
                                ? 'email@exemplo.com'
                                : '(00) 00000-0000'
                            }
                            value={contact.value || ''}
                            onChange={(e) =>
                              updateContact(partIndex, contactIndex, 'value', e.target.value)
                            }
                            disabled={isConverted}
                            className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </div>
                      </div>

                      {/* Botão Remover Contato */}
                      {!isConverted && part.contacts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeContact(partIndex, contactIndex)}
                          className="shrink-0 cursor-pointer"
                          title="Remover contato"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}

                  {/* Botão Adicionar Contato */}
                  {!isConverted && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addContact(partIndex)}
                      className="w-full cursor-pointer mt-2"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Contato
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!isConverted && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addPart}
                className="w-full cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Parte
              </Button>
            )}
          </div>
        </fieldset>

        {/* Botões */}
        {!isConverted && (
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/ccr/protocolos')}
              disabled={loading}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="cursor-pointer">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData?.id ? 'Atualizar' : 'Criar'} Protocolo
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
