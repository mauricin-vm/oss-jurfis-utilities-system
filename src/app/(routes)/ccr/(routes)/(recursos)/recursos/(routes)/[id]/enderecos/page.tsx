'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CCRPageWrapper } from '../../../../../../components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { Plus, X, Loader2, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Address {
  id?: string;
  type: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  isPrimary: boolean;
  isActive: boolean;
  isNew?: boolean;
}

const addressTypeOptions = [
  { value: 'CORRESPONDENCIA', label: 'Endereço de Correspondência' },
  { value: 'RECURSO', label: 'Recurso' },
  { value: 'OUTRO', label: 'Outro' },
];

const brazilianStates = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function EnderecosPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [resource, setResource] = useState<any>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCards, setExpandedCards] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const userRole = session?.user?.role;
  const isAdmin = userRole === 'ADMIN';
  const canToggle = isAdmin || userRole === 'EMPLOYEE';

  useEffect(() => {
    if (params?.id) {
      fetchResource();
    }
  }, [params?.id]);

  const fetchResource = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/resources/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setResource(data);

        // Buscar endereços do recurso
        const addressesResponse = await fetch(`/api/ccr/resources/${params.id}/addresses`);
        if (addressesResponse.ok) {
          const addressesData = await addressesResponse.json();
          // Garantir que valores null sejam convertidos para string vazia
          const formattedAddresses = addressesData.map((addr: any) => ({
            ...addr,
            cep: addr.cep || '',
            street: addr.street || '',
            number: addr.number || '',
            complement: addr.complement || '',
            neighborhood: addr.neighborhood || '',
            city: addr.city || '',
            state: addr.state || 'MS',
            isActive: addr.isActive !== undefined ? addr.isActive : true,
          }));
          setAddresses(formattedAddresses);
          // Manter todos os cards reduzidos inicialmente
          setExpandedCards([]);
        }
      } else {
        router.push('/ccr/recursos');
      }
    } catch (error) {
      console.error('Error fetching resource:', error);
      toast.error('Erro ao carregar recurso');
      router.push('/ccr/recursos');
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (index: number) => {
    setExpandedCards(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const addAddress = () => {
    const newIndex = addresses.length;
    setAddresses([
      ...addresses,
      {
        type: 'CORRESPONDENCIA',
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: 'MS',
        isPrimary: false,
        isActive: true,
        isNew: true,
      },
    ]);
    // Expandir automaticamente o novo card
    setExpandedCards([...expandedCards, newIndex]);
  };

  const removeNewAddress = (index: number) => {
    const updated = addresses.filter((_, i) => i !== index);
    setAddresses(updated);
    // Atualizar índices dos cards expandidos
    setExpandedCards(expandedCards.filter(i => i !== index).map(i => i > index ? i - 1 : i));
    toast.success('Endereço removido');
  };

  const updateAddress = (
    index: number,
    field: keyof Address,
    value: any
  ) => {
    const updated = [...addresses];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setAddresses(updated);
  };

  const handleToggleActive = async (addressId: string, addressLabel: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'desativar' : 'ativar';
      const actionPast = currentStatus ? 'desativado' : 'ativado';

      toast.warning(`Tem certeza que deseja ${action} o endereço?`, {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            setActionLoading(addressId);
            const response = await fetch(`/api/ccr/addresses/${addressId}`, {
              method: 'PATCH',
            });

            if (response.ok) {
              toast.success(`Endereço ${actionPast} com sucesso`);
              await fetchResource();
            } else {
              const error = await response.text();
              toast.error(error);
            }
            setActionLoading(null);
          },
        },
        cancel: {
          label: 'Cancelar',
          onClick: () => {},
        },
      });
    } catch (error) {
      console.error('Error toggling address:', error);
      toast.error('Erro ao atualizar status');
      setActionLoading(null);
    }
  };

  const handleDelete = async (addressId: string, addressLabel: string) => {
    try {
      toast.warning(`Tem certeza que deseja excluir permanentemente o endereço?`, {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            setActionLoading(addressId);
            const response = await fetch(`/api/ccr/addresses/${addressId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              toast.success('Endereço excluído permanentemente');
              await fetchResource();
            } else {
              const error = await response.text();
              toast.error(error);
            }
            setActionLoading(null);
          },
        },
        cancel: {
          label: 'Cancelar',
          onClick: () => {},
        },
      });
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Erro ao excluir endereço');
      setActionLoading(null);
    }
  };

  const formatCEP = (value: string): string => {
    const onlyNumbers = value.replace(/\D/g, '');
    if (onlyNumbers.length <= 5) {
      return onlyNumbers;
    }
    return `${onlyNumbers.slice(0, 5)}-${onlyNumbers.slice(5, 8)}`;
  };

  const searchCEP = async (index: number, cep: string) => {
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
      const updated = [...addresses];
      updated[index] = {
        ...updated[index],
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || 'MS',
        complement: data.complemento || updated[index].complement,
      };
      setAddresses(updated);

      toast.success('Endereço encontrado!');
    } catch (error) {
      console.error('Error fetching CEP:', error);
      toast.error('Erro ao buscar CEP');
    }
  };

  const handleSave = async () => {
    try {
      // Validar endereços ativos
      const activeAddresses = addresses.filter(a => a.isActive || a.isNew);

      if (activeAddresses.length === 0) {
        toast.error('Não há endereços ativos para salvar');
        return;
      }

      for (let i = 0; i < activeAddresses.length; i++) {
        const addr = activeAddresses[i];
        if (!addr.street.trim()) {
          toast.error(`Rua do endereço é obrigatória`);
          return;
        }
        if (!addr.city.trim()) {
          toast.error(`Cidade do endereço é obrigatória`);
          return;
        }
        if (!addr.state.trim()) {
          toast.error(`Estado do endereço é obrigatório`);
          return;
        }
      }

      setSaving(true);

      const response = await fetch(`/api/ccr/resources/${params.id}/addresses`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: addresses.filter(a => a.isNew || a.id) }),
      });

      if (response.ok) {
        toast.success('Endereços atualizados com sucesso');
        router.push(`/ccr/recursos/${params.id}`);
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error('Error saving addresses:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar endereços');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Recursos', href: '/ccr/recursos' },
    { label: resource?.resourceNumber || 'Carregando...', href: `/ccr/recursos/${params.id}` },
    { label: 'Endereços' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Gerenciar Endereços" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Endereços do Recurso</CardTitle>
              <CardDescription>
                Gerencie os endereços vinculados ao recurso.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border rounded-lg">
                  {/* Header do Card */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5" />
                        <Skeleton className="h-5 w-40" />
                      </div>
                      <Skeleton className="h-4 w-64" />
                    </div>
                    <div className="flex gap-2 items-center shrink-0">
                      <Skeleton className="h-6 w-11" />
                      <Skeleton className="h-10 w-10" />
                    </div>
                  </div>

                  {/* Conteúdo Expandido */}
                  <div className="p-4 space-y-4 border-t">
                    {/* Linha 1: Tipo, CEP, Rua */}
                    <div className="grid grid-cols-6 gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="col-span-4 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>

                    {/* Linha 2: Número, Complemento, Bairro, Cidade, Estado */}
                    <div className="grid grid-cols-6 gap-4">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Botão Adicionar Endereço */}
              <Skeleton className="h-10 w-full" />

              {/* Botões de Ação */}
              <div className="flex justify-end gap-4 pt-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!resource) return null;

  return (
    <CCRPageWrapper title="Gerenciar Endereços" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <div className="space-y-1.5">
            <CardTitle>Endereços do Recurso</CardTitle>
            <CardDescription>
              Gerencie os endereços vinculados ao recurso.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {addresses.length > 0 && (
              <>
                {addresses.map((address, index) => {
                  const isExpanded = expandedCards.includes(index);
                  const addressLabel = addressTypeOptions.find(opt => opt.value === address.type)?.label || 'Endereço';
                  const addressSummary = address.street && address.city
                    ? `${address.street}${address.number ? ', ' + address.number : ''} - ${address.city}/${address.state}`
                    : 'Sem informações';

                  return (
                    <div key={address.id || index} className="border rounded-lg">
                      {/* Header do Card - Sempre visível */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleCard(index)}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-gray-500" />
                            )}
                            <span className="font-medium">{addressLabel}</span>
                            {!address.isNew && !address.isActive && (
                              <Badge variant="secondary" className="ml-2">Desativado</Badge>
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{addressSummary}</span>
                        </div>

                        {/* Botões de Ação */}
                        <div className="flex gap-2 items-center shrink-0" onClick={(e) => e.stopPropagation()}>
                          {address.isNew ? (
                            // Botão Remover para endereços novos (não salvos)
                            <TooltipWrapper content="Remover endereço">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeNewAddress(index)}
                                className="cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </TooltipWrapper>
                          ) : (
                            <>
                              {/* Switch Ativar/Desativar */}
                              {canToggle && (
                                <TooltipWrapper content={address.isActive ? "Desativar endereço" : "Ativar endereço"}>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={address.isActive}
                                      onCheckedChange={() => handleToggleActive(address.id!, addressLabel, address.isActive)}
                                      disabled={actionLoading === address.id}
                                    />
                                  </div>
                                </TooltipWrapper>
                              )}

                              {/* Botão Excluir (apenas ADMIN) */}
                              {isAdmin && (
                                <TooltipWrapper content="Excluir endereço">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(address.id!, addressLabel)}
                                    disabled={actionLoading === address.id}
                                    className="cursor-pointer"
                                  >
                                    {actionLoading === address.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <X className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipWrapper>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo do Card - Expansível */}
                      {isExpanded && (
                        <div className="p-4 space-y-4 border-t">
                          {/* Linha 1: Tipo, CEP, Rua */}
                          <div className="grid grid-cols-6 gap-4">
                            {/* Tipo de Endereço */}
                            <div>
                              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                Tipo de Endereço
                              </label>
                              <Select
                                value={address.type}
                                onValueChange={(value) => updateAddress(index, 'type', value)}
                                disabled={!address.isNew && !address.isActive}
                              >
                                <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg">
                                  {addressTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* CEP */}
                            <div>
                              <label className="block text-sm font-medium mb-1.5 text-gray-700 flex items-center gap-1.5">
                                CEP
                                <TooltipWrapper content="Preencha o CEP e aperte a tecla TAB">
                                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                </TooltipWrapper>
                              </label>
                              <Input
                                placeholder="00000-000"
                                value={address.cep}
                                onChange={(e) => {
                                  const formatted = formatCEP(e.target.value);
                                  updateAddress(index, 'cep', formatted);
                                }}
                                onBlur={(e) => {
                                  const cep = e.target.value;
                                  if (cep && cep.replace(/\D/g, '').length === 8) {
                                    searchCEP(index, cep);
                                  }
                                }}
                                maxLength={9}
                                disabled={!address.isNew && !address.isActive}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Rua */}
                            <div className="col-span-4">
                              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                Rua/Logradouro <span className="text-red-500">*</span>
                              </label>
                              <Input
                                placeholder="Nome da rua, avenida, etc."
                                value={address.street}
                                onChange={(e) => updateAddress(index, 'street', e.target.value)}
                                disabled={!address.isNew && !address.isActive}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          </div>

                          {/* Linha 2: Número, Complemento, Bairro, Cidade, Estado */}
                          <div className="grid grid-cols-6 gap-4">
                            {/* Número */}
                            <div>
                              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                Número
                              </label>
                              <Input
                                placeholder="Número"
                                value={address.number}
                                onChange={(e) => updateAddress(index, 'number', e.target.value)}
                                disabled={!address.isNew && !address.isActive}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Complemento */}
                            <div>
                              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                Complemento
                              </label>
                              <Input
                                placeholder="Apto, sala, etc."
                                value={address.complement}
                                onChange={(e) => updateAddress(index, 'complement', e.target.value)}
                                disabled={!address.isNew && !address.isActive}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Bairro */}
                            <div>
                              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                Bairro
                              </label>
                              <Input
                                placeholder="Bairro"
                                value={address.neighborhood}
                                onChange={(e) => updateAddress(index, 'neighborhood', e.target.value)}
                                disabled={!address.isNew && !address.isActive}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Cidade */}
                            <div className="col-span-2">
                              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                Cidade <span className="text-red-500">*</span>
                              </label>
                              <Input
                                placeholder="Cidade"
                                value={address.city}
                                onChange={(e) => updateAddress(index, 'city', e.target.value)}
                                disabled={!address.isNew && !address.isActive}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>

                            {/* Estado */}
                            <div>
                              <label className="block text-sm font-medium mb-1.5 text-gray-700">
                                Estado (UF) <span className="text-red-500">*</span>
                              </label>
                              <Select
                                value={address.state}
                                onValueChange={(value) => updateAddress(index, 'state', value)}
                                disabled={!address.isNew && !address.isActive}
                              >
                                <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg max-h-[300px]">
                                  {brazilianStates.map((state) => (
                                    <SelectItem key={state} value={state}>
                                      {state}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}

            {/* Botão Adicionar Endereço */}
            <Button
              type="button"
              variant="outline"
              onClick={addAddress}
              className="w-full cursor-pointer"
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Endereço
            </Button>

            {/* Botões de Ação */}
            {addresses.length > 0 && (
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/ccr/recursos/${params.id}`)}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Endereços
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
