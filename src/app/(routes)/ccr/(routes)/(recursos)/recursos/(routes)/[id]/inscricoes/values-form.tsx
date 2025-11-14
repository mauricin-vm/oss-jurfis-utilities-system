'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, X, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

interface Registration {
  id?: string;
  type: string;
  registrationNumber: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  values: Value[];
}

interface Value {
  id?: string;
  description: string;
  amount: string;
  dueDate: string;
}

interface ValuesFormProps {
  initialData: {
    id: string;
    resourceNumber: string;
    registrations: Array<{
      id: string;
      type: string;
      registrationNumber: string;
      cep: string | null;
      street: string | null;
      number: string | null;
      complement: string | null;
      neighborhood: string | null;
      city: string | null;
      state: string | null;
      values: Array<{
        id: string;
        description: string | null;
        amount: number;
        dueDate: Date | null;
      }>;
    }>;
  };
}

const registrationTypeLabels: Record<string, string> = {
  IMOBILIARIA: 'Inscrição Imobiliária',
  ECONOMICA: 'Inscrição Econômica',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
};

const brazilianStates = [
  { value: 'AC', label: 'AC' },
  { value: 'AL', label: 'AL' },
  { value: 'AP', label: 'AP' },
  { value: 'AM', label: 'AM' },
  { value: 'BA', label: 'BA' },
  { value: 'CE', label: 'CE' },
  { value: 'DF', label: 'DF' },
  { value: 'ES', label: 'ES' },
  { value: 'GO', label: 'GO' },
  { value: 'MA', label: 'MA' },
  { value: 'MT', label: 'MT' },
  { value: 'MS', label: 'MS' },
  { value: 'MG', label: 'MG' },
  { value: 'PA', label: 'PA' },
  { value: 'PB', label: 'PB' },
  { value: 'PR', label: 'PR' },
  { value: 'PE', label: 'PE' },
  { value: 'PI', label: 'PI' },
  { value: 'RJ', label: 'RJ' },
  { value: 'RN', label: 'RN' },
  { value: 'RS', label: 'RS' },
  { value: 'RO', label: 'RO' },
  { value: 'RR', label: 'RR' },
  { value: 'SC', label: 'SC' },
  { value: 'SP', label: 'SP' },
  { value: 'SE', label: 'SE' },
  { value: 'TO', label: 'TO' },
];

export function ValuesForm({ initialData }: ValuesFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expandedCards, setExpandedCards] = useState<number[]>([]);

  // Função auxiliar para formatar moeda
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue || numericValue === '') {
      return '';
    }
    const number = parseFloat(numericValue) / 100;
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const [registrations, setRegistrations] = useState<Registration[]>(
    initialData.registrations.map((reg) => ({
      id: reg.id,
      type: reg.type,
      registrationNumber: reg.registrationNumber,
      cep: reg.cep || '',
      street: reg.street || '',
      number: reg.number || '',
      complement: reg.complement || '',
      neighborhood: reg.neighborhood || '',
      city: reg.city || '',
      state: reg.state || '',
      values: reg.values.map((val) => ({
        id: val.id,
        description: val.description || '',
        // Converter valor do banco (reais) para centavos (string numérica) e aplicar máscara
        amount: formatCurrency(Math.round(val.amount * 100).toString()),
        dueDate: val.dueDate ? val.dueDate.toString().split('T')[0] : '',
      })),
    }))
  );

  const toggleCard = (index: number) => {
    setExpandedCards(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const addRegistration = () => {
    const newIndex = registrations.length;
    setRegistrations([
      ...registrations,
      {
        type: 'IMOBILIARIA',
        registrationNumber: '',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: 'MS',
        values: [],
      },
    ]);
    // Expandir automaticamente o novo card
    setExpandedCards([...expandedCards, newIndex]);
  };

  const removeRegistration = (index: number) => {
    setRegistrations(registrations.filter((_, i) => i !== index));
    setExpandedCards(expandedCards.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  };

  const updateRegistration = (index: number, field: keyof Registration, value: any) => {
    const updated = [...registrations];
    updated[index] = { ...updated[index], [field]: value };
    setRegistrations(updated);
  };

  const addValue = (regIndex: number) => {
    const updated = [...registrations];
    updated[regIndex].values.push({
      description: '',
      amount: '',
      dueDate: '',
    });
    setRegistrations(updated);
  };

  const removeValue = (regIndex: number, valueIndex: number) => {
    const updated = [...registrations];
    updated[regIndex].values = updated[regIndex].values.filter((_, i) => i !== valueIndex);
    setRegistrations(updated);
  };

  const updateValue = (regIndex: number, valueIndex: number, field: keyof Value, value: any) => {
    const updated = [...registrations];
    updated[regIndex].values[valueIndex] = {
      ...updated[regIndex].values[valueIndex],
      [field]: value,
    };
    setRegistrations(updated);
  };

  const parseCurrency = (value: string): number => {
    const numericValue = value.replace(/\D/g, '');
    return parseFloat(numericValue) / 100;
  };

  const calculateTotal = (values: Value[]): string => {
    const total = values.reduce((sum, val) => {
      const amount = val.amount ? parseCurrency(val.amount) : 0;
      return sum + amount;
    }, 0);
    return total.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatCEP = (value: string): string => {
    const onlyNumbers = value.replace(/\D/g, '');
    if (onlyNumbers.length <= 5) {
      return onlyNumbers;
    }
    return `${onlyNumbers.slice(0, 5)}-${onlyNumbers.slice(5, 8)}`;
  };

  const searchCEP = async (regIndex: number, cep: string) => {
    const onlyNumbers = cep.replace(/\D/g, '');

    // Verificar se tem 8 dígitos
    if (onlyNumbers.length !== 8) {
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${onlyNumbers}/json/`);

      if (!response.ok) {
        toast.error('Erro ao buscar CEP');
        return;
      }

      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      // Atualizar campos de endereço
      const updated = [...registrations];
      updated[regIndex] = {
        ...updated[regIndex],
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
        complement: data.complemento || updated[regIndex].complement,
      };
      setRegistrations(updated);

      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error('Erro ao buscar CEP');
    }
  };

  const onSubmit = async () => {
    try {
      // Validação
      for (const reg of registrations) {
        if (!reg.registrationNumber.trim()) {
          toast.error('Todos os campos de número de inscrição devem ser preenchidos');
          return;
        }

        for (const val of reg.values) {
          if (!val.description.trim()) {
            toast.error('Todas as descrições de débito devem ser preenchidas');
            return;
          }
          if (!val.amount || parseCurrency(val.amount) <= 0) {
            toast.error('Todos os valores de débito devem ser maiores que zero');
            return;
          }
          if (!val.dueDate || val.dueDate.trim() === '') {
            toast.error('Todas as datas de vencimento devem ser preenchidas');
            return;
          }
        }
      }

      setLoading(true);

      const response = await fetch(`/api/ccr/resources/${initialData.id}/values`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrations: registrations.map((reg) => ({
            id: reg.id,
            type: reg.type,
            registrationNumber: reg.registrationNumber,
            cep: reg.cep || null,
            street: reg.street || null,
            number: reg.number || null,
            complement: reg.complement || null,
            neighborhood: reg.neighborhood || null,
            city: reg.city || null,
            state: reg.state || null,
            values: reg.values.map((val) => ({
              id: val.id,
              description: val.description,
              amount: parseCurrency(val.amount),
              dueDate: val.dueDate ? new Date(val.dueDate + 'T12:00:00').toISOString() : null,
            })),
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Inscrições atualizadas com sucesso');
      router.push(`/ccr/recursos/${initialData.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error saving values:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar inscrições');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lista de Inscrições */}
      <div className="space-y-4">
        {registrations.map((registration, regIndex) => {
          const isExpanded = expandedCards.includes(regIndex);

          return (
            <div key={regIndex} className="border rounded-lg">
              {/* Header do Card - Sempre visível */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCard(regIndex)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                    <span className="font-medium">
                      {registrationTypeLabels[registration.type]}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {registration.registrationNumber || 'Sem número'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {registration.values.length} débito{registration.values.length !== 1 ? 's' : ''}
                    </span>
                    {registration.values.length > 0 && (
                      <span className="text-xs text-gray-700 bg-green-50 px-2 py-1 rounded font-medium">
                        Total: {calculateTotal(registration.values)}
                      </span>
                    )}
                  </div>
                </div>
                <TooltipWrapper content="Remover inscrição">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeRegistration(regIndex);
                    }}
                    disabled={loading}
                    className="cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipWrapper>
              </div>

              {/* Conteúdo Expansível */}
              {isExpanded && (
                <div className="px-4 pb-4 space-y-4 border-t">
                  {/* Linha 1: Tipo + Número + CEP + Rua */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-4">
                    <div className="space-y-0">
                      <Label className="block text-sm font-medium mb-1.5">Tipo de Inscrição <span className="text-red-500">*</span></Label>
                      <Select
                        value={registration.type}
                        onValueChange={(value) => updateRegistration(regIndex, 'type', value)}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {Object.entries(registrationTypeLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-0">
                      <Label className="block text-sm font-medium mb-1.5">Número da Inscrição <span className="text-red-500">*</span></Label>
                      <Input
                        value={registration.registrationNumber}
                        onChange={(e) => updateRegistration(regIndex, 'registrationNumber', e.target.value)}
                        disabled={loading}
                        placeholder="Número"
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-0">
                      <Label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
                        CEP
                        <TooltipWrapper content="Preencha o CEP e aperte a tecla TAB">
                          <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                        </TooltipWrapper>
                      </Label>
                      <Input
                        value={registration.cep}
                        onChange={(e) => {
                          const formatted = formatCEP(e.target.value);
                          updateRegistration(regIndex, 'cep', formatted);
                        }}
                        onBlur={(e) => {
                          const cep = e.target.value;
                          if (cep && cep.replace(/\D/g, '').length === 8) {
                            searchCEP(regIndex, cep);
                          }
                        }}
                        disabled={loading}
                        placeholder="00000-000"
                        maxLength={9}
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-0 md:col-span-3">
                      <Label className="block text-sm font-medium mb-1.5">Rua/Logradouro</Label>
                      <Input
                        value={registration.street}
                        onChange={(e) => updateRegistration(regIndex, 'street', e.target.value)}
                        disabled={loading}
                        placeholder="Nome da rua, avenida, etc."
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>
                  </div>

                  {/* Linha 2: Número + Complemento + Bairro + Cidade + Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="space-y-0">
                      <Label className="block text-sm font-medium mb-1.5">Número</Label>
                      <Input
                        value={registration.number}
                        onChange={(e) => updateRegistration(regIndex, 'number', e.target.value)}
                        disabled={loading}
                        placeholder="Número"
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-0">
                      <Label className="block text-sm font-medium mb-1.5">Complemento</Label>
                      <Input
                        value={registration.complement}
                        onChange={(e) => updateRegistration(regIndex, 'complement', e.target.value)}
                        disabled={loading}
                        placeholder="Apto, sala, etc."
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-0">
                      <Label className="block text-sm font-medium mb-1.5">Bairro</Label>
                      <Input
                        value={registration.neighborhood}
                        onChange={(e) => updateRegistration(regIndex, 'neighborhood', e.target.value)}
                        disabled={loading}
                        placeholder="Bairro"
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-0 md:col-span-2">
                      <Label className="block text-sm font-medium mb-1.5">Cidade</Label>
                      <Input
                        value={registration.city}
                        onChange={(e) => updateRegistration(regIndex, 'city', e.target.value)}
                        disabled={loading}
                        placeholder="Cidade"
                        className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                    </div>

                    <div className="space-y-0">
                      <Label className="block text-sm font-medium mb-1.5">Estado (UF)</Label>
                      <Select
                        value={registration.state}
                        onValueChange={(value) => updateRegistration(regIndex, 'state', value)}
                        disabled={loading}
                      >
                        <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg">
                          {brazilianStates.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Débitos da Inscrição */}
                  <div className="mt-6 space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Débitos</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addValue(regIndex)}
                        disabled={loading}
                        className="cursor-pointer"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Débito
                      </Button>
                    </div>

                    {registration.values.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 border-2 border-dashed rounded">
                        Nenhum débito adicionado
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {registration.values.map((value, valueIndex) => (
                          <div key={valueIndex} className="flex gap-3 items-start">
                            {/* Descrição */}
                            <div className="flex-1 min-w-0">
                              {valueIndex === 0 && (
                                <Label className="block text-sm font-medium mb-1.5">
                                  Descrição <span className="text-red-500">*</span>
                                </Label>
                              )}
                              <Input
                                placeholder="Ex: Principal, Multa, Juros"
                                value={value.description}
                                onChange={(e) => updateValue(regIndex, valueIndex, 'description', e.target.value)}
                                disabled={loading}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Valor */}
                            <div className="flex-1 min-w-0">
                              {valueIndex === 0 && (
                                <Label className="block text-sm font-medium mb-1.5">
                                  Valor Lançado <span className="text-red-500">*</span>
                                </Label>
                              )}
                              <Input
                                placeholder="R$ 0,00"
                                value={value.amount}
                                onChange={(e) => {
                                  const formatted = formatCurrency(e.target.value);
                                  updateValue(regIndex, valueIndex, 'amount', formatted);
                                }}
                                disabled={loading}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Data de Vencimento */}
                            <div className="flex-1 min-w-0">
                              {valueIndex === 0 && (
                                <Label className="block text-sm font-medium mb-1.5">
                                  Data de Vencimento <span className="text-red-500">*</span>
                                </Label>
                              )}
                              <Input
                                type="date"
                                value={value.dueDate}
                                onChange={(e) => updateValue(regIndex, valueIndex, 'dueDate', e.target.value)}
                                disabled={loading}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Botão Remover */}
                            <div className={valueIndex === 0 ? "pt-[28px]" : ""}>
                              <TooltipWrapper content="Remover débito">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeValue(regIndex, valueIndex)}
                                  disabled={loading}
                                  className="shrink-0 cursor-pointer h-10 w-10"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipWrapper>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Botão Adicionar Inscrição */}
      <Button
        type="button"
        variant="outline"
        onClick={addRegistration}
        disabled={loading}
        className="w-full cursor-pointer"
      >
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Inscrição
      </Button>

      {/* Botões de Ação */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push(`/ccr/recursos/${initialData.id}`)}
          disabled={loading}
          className="cursor-pointer"
        >
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={loading} className="cursor-pointer">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar Alterações
        </Button>
      </div>
    </div>
  );
}
