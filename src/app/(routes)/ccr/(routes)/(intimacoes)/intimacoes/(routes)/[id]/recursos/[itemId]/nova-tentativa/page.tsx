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
import { Switch } from '@/components/ui/switch';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { formatPhoneForDisplay } from '@/lib/validations';
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
  id?: string;
  type: string;
  value: string;
  isPrimary: boolean;
  isActive: boolean;
  isVerified: boolean;
  isNew?: boolean;
  isEdited?: boolean;
  originalValue?: string;
  shouldSend?: boolean; // Indica se este contato receberá a intimação
}

interface Part {
  id: string;
  name: string;
  role: string;
  contacts: Contact[];
}

const roleLabels: Record<string, string> = {
  REQUERENTE: 'Requerente',
  PATRONO: 'Patrono',
  REPRESENTANTE: 'Representante',
  OUTRO: 'Outro',
};

interface Address {
  id: string;
  type: string;
  recipient: string | null;
  street: string;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  isPrimary: boolean;
  isActive: boolean;
  formatted: string;
  shouldSend?: boolean;
}

const addressTypeLabels: Record<string, string> = {
  CORRESPONDENCIA: 'Correspondência',
  RECURSO: 'Recurso',
  OUTRO: 'Outro',
};

const channelLabels: Record<string, string> = {
  EMAIL: 'E-mail',
  WHATSAPP: 'WhatsApp',
  CORREIOS: 'Correios',
  PESSOALMENTE: 'Pessoalmente',
  SETOR: 'Setor',
  EXTERNO: 'Externo',
  EDITAL: 'Edital',
};

interface Sector {
  id: string;
  name: string;
  abbreviation: string | null;
}

interface PartForSend {
  id: string;
  name: string;
  role: string;
  shouldSend: boolean;
}

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
  const [parts, setParts] = useState<Part[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Estados para canal SETOR
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState('');

  // Estados para canal PESSOALMENTE (partes)
  const [partsForSend, setPartsForSend] = useState<PartForSend[]>([]);

  // Estados para canal EXTERNO
  const [externalDestination, setExternalDestination] = useState('');

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

        // Verificar se é lista de decisão (regras especiais de envio)
        const isDecisionList = data.list.type === 'DECISAO';

        // Buscar partes do processo com seus contatos
        const partsResponse = await fetch(`/api/ccr/parts?processNumber=${encodeURIComponent(data.resource.processNumber)}`);
        if (partsResponse.ok) {
          const partsData: Part[] = await partsResponse.json();
          // Formatar contatos (aplicar máscara de telefone) e salvar valor original
          const formattedParts = partsData.map((part: Part) => ({
            ...part,
            contacts: part.contacts.map((contact: Contact) => {
              const formattedValue = contact.type === 'TELEFONE' ? formatPhoneForDisplay(contact.value) : contact.value;
              // Para lista de decisão, apenas contatos validados são marcados para envio
              const shouldSend = isDecisionList ? contact.isVerified : true;
              return {
                ...contact,
                value: formattedValue,
                originalValue: formattedValue,
                shouldSend,
              };
            }),
          }));
          setParts(formattedParts);
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
              // Para lista de decisão, apenas endereços de correspondência são marcados para envio
              const shouldSend = isDecisionList ? addr.type === 'CORRESPONDENCIA' : true;
              return {
                ...addr,
                formatted: parts.join(', '),
                shouldSend,
              };
            });
          setAddresses(addressList);
        }

        // Para diligência, buscar setores e preparar partes para envio
        if (data.list.type === 'DILIGENCIA') {
          const sectorsResponse = await fetch('/api/ccr/sectors');
          if (sectorsResponse.ok) {
            const sectorsData = await sectorsResponse.json();
            setSectors(sectorsData.filter((s: Sector) => s.id));
          }

          // Preparar partes para canal PESSOALMENTE (todas marcadas por padrão)
          const partsResponse = await fetch(`/api/ccr/parts?processNumber=${encodeURIComponent(data.resource.processNumber)}`);
          if (partsResponse.ok) {
            const partsData = await partsResponse.json();
            const partsToSend = partsData.map((part: Part) => ({
              id: part.id,
              name: part.name,
              role: part.role,
              shouldSend: true,
            }));
            setPartsForSend(partsToSend);
          }
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

  // Funções para gerenciar contatos
  const addContact = (partIndex: number, contactType: 'EMAIL' | 'TELEFONE') => {
    const updated = [...parts];
    updated[partIndex].contacts.push({
      type: contactType,
      value: '',
      isPrimary: false,
      isActive: true,
      isVerified: false,
      isNew: true,
      shouldSend: true, // Novos contatos já vêm marcados para envio
    });
    setParts(updated);
  };

  const updateContact = (
    partIndex: number,
    contactIndex: number,
    field: keyof Contact,
    value: any
  ) => {
    const updated = [...parts];
    const contact = updated[partIndex].contacts[contactIndex];

    let newValue = value;
    if (field === 'value' && contact.type === 'TELEFONE') {
      // Aplicar máscara de telefone
      newValue = formatPhoneForDisplay(value);
    }

    // Marcar como editado se for um contato existente e o valor mudou
    const isEdited = !contact.isNew && contact.id && (
      (field === 'value' && newValue !== contact.originalValue) ||
      (field === 'isVerified' && value !== contact.isVerified) ||
      contact.isEdited // Manter editado se já estava
    );

    updated[partIndex].contacts[contactIndex] = {
      ...contact,
      [field]: newValue,
      isEdited: isEdited || contact.isEdited,
    };

    setParts(updated);
  };

  const removeContact = (partIndex: number, contactIndex: number) => {
    const updated = [...parts];
    updated[partIndex].contacts.splice(contactIndex, 1);
    setParts(updated);
  };

  const toggleShouldSend = (partIndex: number, contactIndex: number) => {
    const updated = [...parts];
    const contact = updated[partIndex].contacts[contactIndex];
    updated[partIndex].contacts[contactIndex] = {
      ...contact,
      shouldSend: !contact.shouldSend,
    };
    setParts(updated);
  };

  const toggleShouldSendAddress = (addressIndex: number) => {
    const updated = [...addresses];
    updated[addressIndex] = {
      ...updated[addressIndex],
      shouldSend: !updated[addressIndex].shouldSend,
    };
    setAddresses(updated);
  };

  // Função para salvar contatos novos e editados
  const saveContacts = async () => {
    // Verificar se há contatos novos ou editados para salvar
    const hasChanges = parts.some(part =>
      part.contacts.some(c => c.isNew || c.isEdited)
    );

    if (!hasChanges) return true;

    // Validar contatos novos
    for (const part of parts) {
      for (const contact of part.contacts.filter(c => c.isNew)) {
        if (!contact.value || contact.value.trim() === '') {
          toast.error(`Preencha o valor do contato na parte "${part.name}"`);
          return false;
        }
      }
    }

    try {
      // Preparar dados para novos contatos
      const newContactsUpdates = parts.map((part) => ({
        partId: part.id,
        contacts: part.contacts
          .filter(c => c.isNew)
          .map((contact) => ({
            type: contact.type,
            value: contact.type === 'TELEFONE' ? contact.value.replace(/\D/g, '') : contact.value,
            isPrimary: contact.isPrimary,
            isVerified: contact.isVerified,
            isNew: true,
          })),
      })).filter(update => update.contacts.length > 0);

      // Salvar novos contatos
      if (newContactsUpdates.length > 0) {
        const response = await fetch(`/api/ccr/parts/contacts`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            processNumber: item?.resource.processNumber,
            protocolId: null,
            parts: newContactsUpdates,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
      }

      // Atualizar contatos editados individualmente
      const editedContacts = parts.flatMap(part =>
        part.contacts.filter(c => c.isEdited && c.id)
      );

      for (const contact of editedContacts) {
        const response = await fetch(`/api/ccr/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: contact.type === 'TELEFONE' ? contact.value.replace(/\D/g, '') : contact.value,
            isVerified: contact.isVerified,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error saving contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar contatos');
      return false;
    }
  };

  // Obter destinatários marcados para envio
  const getEmailsToSend = () => {
    const emails: { contactId: string; value: string }[] = [];
    parts.forEach((part) => {
      part.contacts
        .filter((contact) => contact.shouldSend && contact.type === 'EMAIL' && contact.value && contact.id)
        .forEach((contact) => {
          emails.push({ contactId: contact.id!, value: contact.value });
        });
    });
    return emails;
  };

  const getPhonesToSend = () => {
    const phones: { contactId: string; value: string }[] = [];
    parts.forEach((part) => {
      part.contacts
        .filter((contact) => contact.shouldSend && contact.type === 'TELEFONE' && contact.value && contact.id)
        .forEach((contact) => {
          phones.push({ contactId: contact.id!, value: contact.value.replace(/\D/g, '') });
        });
    });
    return phones;
  };

  const getAddressesToSend = () => {
    return addresses
      .filter((addr) => addr.shouldSend)
      .map((addr) => ({ addressId: addr.id, value: addr.formatted }));
  };

  // Funções para canal PESSOALMENTE (partes)
  const togglePartForSend = (partId: string) => {
    setPartsForSend((prev) =>
      prev.map((part) =>
        part.id === partId ? { ...part, shouldSend: !part.shouldSend } : part
      )
    );
  };

  const getPartsToSend = () => {
    return partsForSend
      .filter((part) => part.shouldSend)
      .map((part) => ({ partId: part.id, value: part.name }));
  };

  const handleSubmit = async () => {
    if (!channel) {
      toast.error('Selecione um canal de intimação');
      return;
    }

    const emailsToSend = getEmailsToSend();
    const phonesToSend = getPhonesToSend();
    const addressesToSend = getAddressesToSend();
    const partsToSend = getPartsToSend();

    if (channel === 'EMAIL' && emailsToSend.length === 0) {
      toast.error('Selecione pelo menos um email para envio da intimação');
      return;
    }

    if (channel === 'WHATSAPP' && phonesToSend.length === 0) {
      toast.error('Selecione pelo menos um telefone para envio da intimação');
      return;
    }

    if (channel === 'CORREIOS' && addressesToSend.length === 0) {
      toast.error('Selecione pelo menos um endereço para envio da intimação');
      return;
    }

    // Validação para canal SETOR
    if (channel === 'SETOR' && !selectedSectorId) {
      toast.error('Selecione um setor');
      return;
    }

    // Validação para canal PESSOALMENTE
    if (channel === 'PESSOALMENTE' && partsToSend.length === 0) {
      toast.error('Selecione pelo menos uma parte para a intimação');
      return;
    }

    // Validação para canal EXTERNO
    if (channel === 'EXTERNO' && !externalDestination.trim()) {
      toast.error('Informe o destino da intimação externa');
      return;
    }

    try {
      setSaving(true);

      // Salvar contatos novos e editados primeiro (se houver)
      if (channel === 'EMAIL' || channel === 'WHATSAPP') {
        const contactsSaved = await saveContacts();
        if (!contactsSaved) {
          setSaving(false);
          return;
        }
      }

      // Montar lista de destinatários
      let recipients: { contactId?: string; addressId?: string; partId?: string; recipientValue: string }[] = [];
      if (channel === 'EMAIL') {
        recipients = emailsToSend.map((e) => ({ contactId: e.contactId, recipientValue: e.value }));
      } else if (channel === 'WHATSAPP') {
        recipients = phonesToSend.map((p) => ({ contactId: p.contactId, recipientValue: p.value }));
      } else if (channel === 'CORREIOS') {
        recipients = addressesToSend.map((a) => ({ addressId: a.addressId, recipientValue: a.value }));
      } else if (channel === 'PESSOALMENTE') {
        recipients = partsToSend.map((p) => ({ partId: p.partId, recipientValue: p.value }));
      }

      const response = await fetch(`/api/ccr/intimacoes/${params.id}/items/${params.itemId}/attempts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          deadline: deadline || null,
          recipients,
          sectorId: channel === 'SETOR' ? selectedSectorId : null,
          externalDestination: channel === 'EXTERNO' ? externalDestination.trim() : null,
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
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Número do Recurso</label>
                  <Skeleton className="h-5 w-28" />
                </div>
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Status</label>
                  <Skeleton className="h-6 w-28 rounded-full" />
                </div>
                <div className="space-y-0 md:col-span-3">
                  <label className="block text-sm font-medium mb-1.5">Razão Social</label>
                  <Skeleton className="h-5 w-48" />
                </div>
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
                {/* Canal e Prazo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Canal de Intimação</label>
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-0">
                    <label className="block text-sm font-medium mb-1.5">Prazo</label>
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>

                {/* Box de destinatários */}
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="border-b pb-3 space-y-1">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-4 w-72" />
                  </div>
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, partIndex) => (
                      <div key={partIndex} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                        {Array.from({ length: 2 }).map((_, contactIndex) => (
                          <div key={contactIndex} className="flex gap-2 items-center ml-4">
                            <Skeleton className="h-6 w-10" />
                            <Skeleton className="h-10 flex-1" />
                            <Skeleton className="h-10 w-36" />
                          </div>
                        ))}
                        <Skeleton className="h-8 w-32 ml-4" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Observações */}
                <div className="space-y-0">
                  <label className="block text-sm font-medium mb-1.5">Observações</label>
                  <Skeleton className="h-20 w-full" />
                </div>

                {/* Botões */}
                <div className="flex justify-end gap-4 pt-4">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-40" />
                </div>
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
                    onValueChange={(value) => setChannel(value)}
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

              {/* Gerenciamento de Emails */}
              {channel === 'EMAIL' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-base">Emails para Intimação</h3>
                    <p className="text-sm text-gray-600">Selecione os emails que receberão a intimação ou adicione novos.</p>
                  </div>

                  {parts.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma parte cadastrada para este recurso.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {parts.map((part, partIndex) => (
                        <div key={part.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-sm">{part.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({roleLabels[part.role]})</span>
                            </div>
                          </div>

                          {/* Emails da Parte */}
                          {part.contacts
                            .map((contact, originalIndex) => ({ contact, originalIndex }))
                            .filter(({ contact }) => contact.type === 'EMAIL')
                            .map(({ contact, originalIndex }) => (
                              <div key={contact.id || originalIndex} className="flex gap-2 items-center ml-4">
                                {/* Switch Enviar Intimação */}
                                <TooltipWrapper content={contact.shouldSend ? "Não enviar" : "Enviar intimação"}>
                                  <div className="flex items-center shrink-0">
                                    <Switch
                                      checked={contact.shouldSend}
                                      onCheckedChange={() => toggleShouldSend(partIndex, originalIndex)}
                                      disabled={!contact.value}
                                    />
                                  </div>
                                </TooltipWrapper>

                                <div className="flex-1">
                                  <Input
                                    placeholder="email@exemplo.com"
                                    value={contact.value}
                                    onChange={(e) =>
                                      updateContact(partIndex, originalIndex, 'value', e.target.value)
                                    }
                                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                </div>

                                {/* Status de Validação */}
                                <div className="w-36">
                                  <Select
                                    value={contact.isVerified ? 'VALIDADO' : 'NAO_VALIDADO'}
                                    onValueChange={(value) =>
                                      updateContact(partIndex, originalIndex, 'isVerified', value === 'VALIDADO')
                                    }
                                  >
                                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      <SelectItem value="VALIDADO">Validado</SelectItem>
                                      <SelectItem value="NAO_VALIDADO">Não Validado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Botão Remover (apenas contatos novos) */}
                                {contact.isNew && (
                                  <TooltipWrapper content="Remover">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeContact(partIndex, originalIndex)}
                                      className="cursor-pointer h-10 w-10 shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipWrapper>
                                )}
                              </div>
                            ))}

                          {/* Botão Adicionar Email */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addContact(partIndex, 'EMAIL')}
                            className="ml-4 cursor-pointer"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Email
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Gerenciamento de Telefones (WhatsApp) */}
              {channel === 'WHATSAPP' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-base">Telefones para Intimação</h3>
                    <p className="text-sm text-gray-600">Selecione os telefones que receberão a intimação ou adicione novos.</p>
                  </div>

                  {parts.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma parte cadastrada para este recurso.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {parts.map((part, partIndex) => (
                        <div key={part.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-sm">{part.name}</span>
                              <span className="text-xs text-gray-500 ml-2">({roleLabels[part.role]})</span>
                            </div>
                          </div>

                          {/* Telefones da Parte */}
                          {part.contacts
                            .map((contact, originalIndex) => ({ contact, originalIndex }))
                            .filter(({ contact }) => contact.type === 'TELEFONE')
                            .map(({ contact, originalIndex }) => (
                              <div key={contact.id || originalIndex} className="flex gap-2 items-center ml-4">
                                {/* Switch Enviar Intimação */}
                                <TooltipWrapper content={contact.shouldSend ? "Não enviar" : "Enviar intimação"}>
                                  <div className="flex items-center shrink-0">
                                    <Switch
                                      checked={contact.shouldSend}
                                      onCheckedChange={() => toggleShouldSend(partIndex, originalIndex)}
                                      disabled={!contact.value}
                                    />
                                  </div>
                                </TooltipWrapper>

                                <div className="flex-1">
                                  <Input
                                    placeholder="(00) 00000-0000"
                                    value={contact.value}
                                    onChange={(e) =>
                                      updateContact(partIndex, originalIndex, 'value', e.target.value)
                                    }
                                    className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                                  />
                                </div>

                                {/* Status de Validação */}
                                <div className="w-36">
                                  <Select
                                    value={contact.isVerified ? 'VALIDADO' : 'NAO_VALIDADO'}
                                    onValueChange={(value) =>
                                      updateContact(partIndex, originalIndex, 'isVerified', value === 'VALIDADO')
                                    }
                                  >
                                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-lg">
                                      <SelectItem value="VALIDADO">Validado</SelectItem>
                                      <SelectItem value="NAO_VALIDADO">Não Validado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Botão Remover (apenas contatos novos) */}
                                {contact.isNew && (
                                  <TooltipWrapper content="Remover">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => removeContact(partIndex, originalIndex)}
                                      className="cursor-pointer h-10 w-10 shrink-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipWrapper>
                                )}
                              </div>
                            ))}

                          {/* Botão Adicionar Telefone */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addContact(partIndex, 'TELEFONE')}
                            className="ml-4 cursor-pointer"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Telefone
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Gerenciamento de Endereços (Correios) */}
              {channel === 'CORREIOS' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-base">Endereços para Intimação</h3>
                    <p className="text-sm text-gray-600">Selecione os endereços que receberão a intimação.</p>
                  </div>

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
                    <div className="space-y-3">
                      {addresses.map((address, index) => (
                        <div key={address.id} className="flex gap-3 items-start">
                          {/* Switch Enviar Intimação */}
                          <TooltipWrapper content={address.shouldSend ? "Não enviar" : "Enviar intimação"}>
                            <div className="flex items-center shrink-0 pt-1">
                              <Switch
                                checked={address.shouldSend}
                                onCheckedChange={() => toggleShouldSendAddress(index)}
                              />
                            </div>
                          </TooltipWrapper>

                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">
                                {addressTypeLabels[address.type] || address.type}
                              </span>
                              {address.isPrimary && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  Principal
                                </span>
                              )}
                            </div>
                            {address.recipient && (
                              <p className="text-sm font-medium">{address.recipient}</p>
                            )}
                            <p className="text-sm">{address.formatted}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Canal SETOR - Selecionar setor */}
              {channel === 'SETOR' && item?.list.type === 'DILIGENCIA' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-base">Diligência para Setor</h3>
                    <p className="text-sm text-gray-600">Selecione o setor de destino da diligência.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Setor <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={selectedSectorId}
                      onValueChange={setSelectedSectorId}
                    >
                      <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                        <SelectValue placeholder="Selecione um setor" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg">
                        {sectors.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Canal PESSOALMENTE - Selecionar partes */}
              {channel === 'PESSOALMENTE' && item?.list.type === 'DILIGENCIA' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-base">Intimação Pessoal</h3>
                    <p className="text-sm text-gray-600">Selecione as partes que serão intimadas pessoalmente.</p>
                  </div>

                  {partsForSend.length === 0 ? (
                    <div className="p-4 border border-dashed rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Nenhuma parte cadastrada para este processo.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {partsForSend.map((part) => (
                        <div key={part.id} className="flex gap-3 items-center">
                          <TooltipWrapper content={part.shouldSend ? "Não intimar" : "Intimar"}>
                            <div className="flex items-center shrink-0">
                              <Switch
                                checked={part.shouldSend}
                                onCheckedChange={() => togglePartForSend(part.id)}
                              />
                            </div>
                          </TooltipWrapper>
                          <div className="flex-1">
                            <span className="text-sm font-medium">{part.name}</span>
                            <span className="text-xs text-gray-500 ml-2">({roleLabels[part.role]})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Canal EXTERNO - Campo livre */}
              {channel === 'EXTERNO' && item?.list.type === 'DILIGENCIA' && (
                <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-base">Diligência Externa</h3>
                    <p className="text-sm text-gray-600">Informe o destino da diligência externa.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Destino <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Informe o destino da diligência externa"
                      value={externalDestination}
                      onChange={(e) => setExternalDestination(e.target.value)}
                      className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
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
