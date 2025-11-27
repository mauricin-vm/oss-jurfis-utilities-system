'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CCRPageWrapper } from '../../../../../../../../components/ccr-page-wrapper';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getResourceStatusLabel, getResourceStatusColor, type ResourceStatusKey } from '@/app/(routes)/ccr/hooks/resource-status';

interface NotificationItemDetails {
  id: string;
  observations: string | null;
  resource: {
    id: string;
    resourceNumber: string;
    processNumber: string;
    processName: string | null;
    status: string;
  };
  list: {
    id: string;
    listNumber: string;
    type: string;
    status: string;
  };
}

interface Contact {
  id: string;
  type: string;
  value: string;
  isPrimary: boolean;
  isActive: boolean;
  isVerified: boolean;
}

interface Part {
  id: string;
  name: string;
  role: string;
  contacts: Contact[];
}

interface Address {
  id: string;
  type: string;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  isPrimary: boolean;
  isActive: boolean;
}

const channelLabels: Record<string, string> = {
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  CORREIOS: 'Correios',
  PESSOALMENTE: 'Pessoalmente',
  EDITAL: 'Edital',
};

export default function NovaTentativaPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [item, setItem] = useState<NotificationItemDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('');
  const [deadline, setDeadline] = useState('');
  const [observations, setObservations] = useState('');
  const [saving, setSaving] = useState(false);
  const [emails, setEmails] = useState<{ value: string; partName: string; isPrimary: boolean }[]>([]);
  const [phones, setPhones] = useState<{ value: string; partName: string; isPrimary: boolean }[]>([]);
  const [addresses, setAddresses] = useState<{ id: string; formatted: string; isPrimary: boolean }[]>([]);
  const [selectedDestination, setSelectedDestination] = useState('');

  useEffect(() => {
    if (session?.user?.role === 'EXTERNAL') {
      router.push('/ccr');
    }
  }, [session, router]);

  useEffect(() => {
    if (params.id && params.itemId) {
      fetchItem();
    }
  }, [params.id, params.itemId]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ccr/intimacoes/${params.id}/items/${params.itemId}`);
      if (response.ok) {
        const data = await response.json();
        setItem(data);

        // Verificar se a lista está finalizada
        if (data.list.status === 'FINALIZADA') {
          toast.error('Não é possível adicionar tentativas a uma lista finalizada');
          router.push(`/ccr/intimacoes/${params.id}/recursos/${params.itemId}`);
          return;
        }

        // Buscar contatos (emails e telefones) do recurso
        const partsResponse = await fetch(`/api/ccr/parts?processNumber=${encodeURIComponent(data.resource.processNumber)}`);
        if (partsResponse.ok) {
          const partsData: Part[] = await partsResponse.json();
          // Extrair emails e telefones ativos
          const emailList: { value: string; partName: string; isPrimary: boolean }[] = [];
          const phoneList: { value: string; partName: string; isPrimary: boolean }[] = [];
          partsData.forEach((part) => {
            part.contacts
              .filter((contact) => contact.isActive)
              .forEach((contact) => {
                if (contact.type === 'EMAIL') {
                  emailList.push({
                    value: contact.value,
                    partName: part.name,
                    isPrimary: contact.isPrimary,
                  });
                } else if (contact.type === 'TELEFONE') {
                  phoneList.push({
                    value: contact.value,
                    partName: part.name,
                    isPrimary: contact.isPrimary,
                  });
                }
              });
          });
          setEmails(emailList);
          setPhones(phoneList);
        }

        // Buscar endereços do recurso
        const addressesResponse = await fetch(`/api/ccr/resources/${data.resource.id}/addresses`);
        if (addressesResponse.ok) {
          const addressesData: Address[] = await addressesResponse.json();
          // Formatar endereços ativos
          const addressList = addressesData
            .filter((addr) => addr.isActive)
            .map((addr) => {
              const parts = [addr.street];
              if (addr.number) parts.push(addr.number);
              if (addr.complement) parts.push(addr.complement);
              if (addr.neighborhood) parts.push(addr.neighborhood);
              parts.push(`${addr.city}/${addr.state}`);
              return {
                id: addr.id,
                formatted: parts.join(', '),
                isPrimary: addr.isPrimary,
              };
            });
          setAddresses(addressList);
        }
      } else {
        toast.error('Item não encontrado');
        router.push(`/ccr/intimacoes/${params.id}`);
      }
    } catch (error) {
      console.error('Error fetching item:', error);
      toast.error('Erro ao carregar item');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!channel) {
      toast.error('Selecione um canal de intimação');
      return;
    }

    if (channel === 'EMAIL' && !selectedDestination) {
      toast.error('Selecione um email para envio');
      return;
    }

    if (channel === 'WHATSAPP' && !selectedDestination) {
      toast.error('Selecione um telefone para envio');
      return;
    }

    if (channel === 'CORREIOS' && !selectedDestination) {
      toast.error('Selecione um endereço para envio');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/ccr/intimacoes/${params.id}/items/${params.itemId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          deadline: deadline || null,
          sentTo: ['EMAIL', 'WHATSAPP', 'CORREIOS'].includes(channel) ? selectedDestination : null,
          observations: observations.trim() || null,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Tentativa adicionada com sucesso');
      router.push(`/ccr/intimacoes/${params.id}/recursos/${params.itemId}`);
    } catch (error) {
      console.error('Error adding attempt:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar tentativa');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Intimações', href: '/ccr/intimacoes' },
    { label: item ? `Lista n. ${item.list.listNumber}` : 'Lista', href: `/ccr/intimacoes/${params.id}` },
    { label: item ? item.resource.resourceNumber : 'Recurso', href: `/ccr/intimacoes/${params.id}/recursos/${params.itemId}` },
    { label: 'Nova Tentativa' },
  ];

  if (status === 'loading') {
    return null;
  }

  if (session?.user?.role === 'EXTERNAL') {
    return null;
  }

  if (loading) {
    return (
      <CCRPageWrapper title="Nova Tentativa" breadcrumbs={breadcrumbs}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-0">
                    <Skeleton className="h-4 w-24 mb-1.5" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </CCRPageWrapper>
    );
  }

  if (!item) {
    return (
      <CCRPageWrapper title="Nova Tentativa" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="flex h-[400px] items-center justify-center">
            <p className="text-muted-foreground">Item não encontrado</p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  return (
    <CCRPageWrapper title="Nova Tentativa" breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        {/* Card de Informações do Recurso */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Informações do Recurso</CardTitle>
              <CardDescription>Dados do recurso para o qual será adicionada a tentativa.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Número do Processo</label>
                <p className="text-sm">
                  <Link
                    href={`/ccr/recursos/${item.resource.id}`}
                    target="_blank"
                    className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.resource.processNumber}
                  </Link>
                </p>
              </div>
              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                <p className="text-sm">{item.resource.resourceNumber}</p>
              </div>
              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Status</label>
                <span
                  className={cn(
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border w-fit',
                    getResourceStatusColor(item.resource.status as ResourceStatusKey)
                  )}
                >
                  {getResourceStatusLabel(item.resource.status as ResourceStatusKey)}
                </span>
              </div>
              {item.resource.processName && (
                <div className="space-y-0 md:col-span-3">
                  <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                  <p className="text-sm">{item.resource.processName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card de Nova Tentativa */}
        <Card>
          <CardHeader>
            <div className="space-y-1.5">
              <CardTitle>Nova Tentativa de Intimação</CardTitle>
              <CardDescription>Preencha os dados da nova tentativa de intimação.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Canal de Intimação <span className="text-red-500">*</span>
                  </label>
                  <Select
                    value={channel}
                    onValueChange={(value) => {
                      setChannel(value);
                      setSelectedDestination('');
                    }}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione o canal" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {Object.entries(channelLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="cursor-pointer h-9">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Prazo
                  </label>
                  <Input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </div>

              {/* Seleção de Email */}
              {channel === 'EMAIL' && (
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Email de Destino <span className="text-red-500">*</span>
                  </label>
                  {emails.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum email cadastrado para este recurso.
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push(`/ccr/recursos/${item?.resource.id}/contatos`)}
                        className="cursor-pointer mt-1"
                      >
                        Cadastrar emails
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione o email" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {emails.map((email, index) => (
                          <SelectItem key={index} value={email.value} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span>{email.value}</span>
                              <span className="text-xs text-muted-foreground">
                                ({email.partName})
                              </span>
                              {email.isPrimary && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  Principal
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Seleção de Telefone (WhatsApp) */}
              {channel === 'WHATSAPP' && (
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Telefone de Destino <span className="text-red-500">*</span>
                  </label>
                  {phones.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum telefone cadastrado para este recurso.
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push(`/ccr/recursos/${item?.resource.id}/contatos`)}
                        className="cursor-pointer mt-1"
                      >
                        Cadastrar telefones
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione o telefone" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {phones.map((phone, index) => (
                          <SelectItem key={index} value={phone.value} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span>{phone.value}</span>
                              <span className="text-xs text-muted-foreground">
                                ({phone.partName})
                              </span>
                              {phone.isPrimary && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  Principal
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Seleção de Endereço (Correios) */}
              {channel === 'CORREIOS' && (
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">
                    Endereço de Destino <span className="text-red-500">*</span>
                  </label>
                  {addresses.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhum endereço cadastrado para este recurso.
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push(`/ccr/recursos/${item?.resource.id}/enderecos`)}
                        className="cursor-pointer mt-1"
                      >
                        Cadastrar endereços
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedDestination} onValueChange={setSelectedDestination}>
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione o endereço" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {addresses.map((address) => (
                          <SelectItem key={address.id} value={address.formatted} className="cursor-pointer">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[400px]">{address.formatted}</span>
                              {address.isPrimary && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded flex-shrink-0">
                                  Principal
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="space-y-0">
                <label className="block text-sm font-medium mb-1.5">Observações</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações sobre esta tentativa..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors resize-none text-sm"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/ccr/intimacoes/${params.id}/recursos/${params.itemId}`)}
                  disabled={saving}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={saving} className="cursor-pointer">
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {saving ? 'Salvando...' : 'Adicionar Tentativa'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </CCRPageWrapper>
  );
}
