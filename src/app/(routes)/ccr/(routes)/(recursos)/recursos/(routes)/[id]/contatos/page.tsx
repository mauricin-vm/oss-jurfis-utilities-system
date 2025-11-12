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
import { Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatPhoneForDisplay } from '@/lib/validations';

interface Contact {
  id?: string;
  type: string;
  value: string;
  isPrimary: boolean;
  isActive: boolean;
  isNew?: boolean;
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

const contactTypeOptions = [
  { value: 'TELEFONE', label: 'Telefone' },
  { value: 'EMAIL', label: 'E-mail' },
];

export default function ContatosPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [resource, setResource] = useState<any>(null);
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

        // Buscar partes do processo com seus contatos
        const partsResponse = await fetch(`/api/ccr/parts?processNumber=${encodeURIComponent(data.processNumber)}`);
        if (partsResponse.ok) {
          const partsData = await partsResponse.json();
          // Formatar contatos (aplicar máscara de telefone)
          const formattedParts = partsData.map((part: any) => ({
            ...part,
            contacts: part.contacts.map((contact: any) => ({
              ...contact,
              value: contact.type === 'TELEFONE' ? formatPhoneForDisplay(contact.value) : contact.value,
            })),
          }));
          setParts(formattedParts);
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

  const addContact = (partIndex: number) => {
    const updated = [...parts];
    updated[partIndex].contacts.push({
      type: 'TELEFONE',
      value: '',
      isPrimary: false,
      isActive: true,
      isNew: true,
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

    // Se estiver mudando o tipo de contato, limpar o valor
    if (field === 'type') {
      updated[partIndex].contacts[contactIndex] = {
        ...contact,
        [field]: value,
        value: '', // Limpar o valor ao mudar o tipo
      };
    } else if (field === 'value' && contact.type === 'TELEFONE') {
      // Aplicar máscara de telefone
      const formatted = formatPhoneForDisplay(value);
      updated[partIndex].contacts[contactIndex] = {
        ...contact,
        [field]: formatted,
      };
    } else {
      updated[partIndex].contacts[contactIndex] = {
        ...contact,
        [field]: value,
      };
    }

    setParts(updated);
  };

  const handleToggleActive = async (contactId: string, contactValue: string, currentStatus: boolean) => {
    try {
      setActionLoading(contactId);

      const action = currentStatus ? 'desativar' : 'ativar';
      const actionPast = currentStatus ? 'desativado' : 'ativado';

      toast.warning(`Tem certeza que deseja ${action} o contato?`, {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            const response = await fetch(`/api/ccr/contacts/${contactId}`, {
              method: 'PATCH',
            });

            if (response.ok) {
              toast.success(`Contato ${actionPast} com sucesso`);
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
          onClick: () => {
            setActionLoading(null);
          },
        },
      });
    } catch (error) {
      console.error('Error toggling contact:', error);
      toast.error('Erro ao atualizar status');
      setActionLoading(null);
    }
  };

  const handleDelete = async (contactId: string, contactValue: string) => {
    try {
      setActionLoading(contactId);

      toast.warning(`Tem certeza que deseja excluir permanentemente o contato?`, {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            const response = await fetch(`/api/ccr/contacts/${contactId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              toast.success('Contato excluído permanentemente');
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
          onClick: () => {
            setActionLoading(null);
          },
        },
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Erro ao excluir contato');
      setActionLoading(null);
    }
  };

  const handleSave = async () => {
    try {
      // Validar se todos os contatos ativos têm valor
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const activeContacts = part.contacts.filter(c => c.isActive);

        if (activeContacts.length === 0) {
          toast.error(`A parte "${part.name}" não possui contatos ativos`);
          return;
        }

        for (let j = 0; j < activeContacts.length; j++) {
          const contact = activeContacts[j];
          if (!contact.value || contact.value.trim() === '') {
            toast.error(`Contato da parte "${part.name}" está vazio`);
            return;
          }
        }
      }

      setSaving(true);

      // Preparar dados para salvar (apenas contatos novos ou editados)
      const updates = parts.map((part) => ({
        partId: part.id,
        contacts: part.contacts
          .filter(c => c.isNew || c.id) // Apenas novos ou existentes
          .map((contact) => ({
            id: contact.id,
            type: contact.type,
            value: contact.type === 'TELEFONE' ? contact.value.replace(/\D/g, '') : contact.value,
            isPrimary: contact.isPrimary,
            isNew: contact.isNew,
          })),
      }));

      const response = await fetch(`/api/ccr/parts/contacts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processNumber: resource.processNumber,
          protocolId: resource.protocol.id,
          parts: updates,
        }),
      });

      if (response.ok) {
        toast.success('Contatos atualizados com sucesso');
        await fetchResource();
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      console.error('Error saving contacts:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar contatos');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Recursos', href: '/ccr/recursos' },
    { label: resource?.resourceNumber || 'Carregando...', href: `/ccr/recursos/${params.id}` },
    { label: 'Contatos' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Gerenciar Contatos" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-96 mt-1.5" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!resource) return null;

  return (
    <CCRPageWrapper title="Gerenciar Contatos" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>Contatos das Partes</CardTitle>
          <CardDescription>
            Gerencie os contatos (telefones e e-mails) das partes envolvidas no processo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {parts.length === 0 ? (
              <div className="flex items-center justify-center h-40 border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma parte cadastrada
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione as partes interessadas para gerenciar os contatos
                  </p>
                </div>
              </div>
            ) : (
              <>
                {parts.map((part, partIndex) => (
                  <div
                    key={part.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-4"
                  >
                    {/* Header da Parte */}
                    <div className="border-b pb-3">
                      <h3 className="font-semibold text-base">{part.name}</h3>
                      <p className="text-sm text-gray-600">{roleLabels[part.role]}</p>
                    </div>

                    {/* Contatos da Parte */}
                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-gray-700">Contatos</label>
                      {part.contacts.map((contact, contactIndex) => (
                        <div key={contact.id || contactIndex} className="flex gap-2 items-center">
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            {/* Tipo de Contato */}
                            <div>
                              <Select
                                value={contact.type}
                                onValueChange={(value) =>
                                  updateContact(partIndex, contactIndex, 'type', value)
                                }
                                disabled={!contact.isNew && !contact.isActive}
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

                            {/* Campo de Contato */}
                            <div>
                              <Input
                                placeholder={
                                  contact.type === 'EMAIL'
                                    ? 'email@exemplo.com'
                                    : '(00) 00000-0000'
                                }
                                value={contact.value}
                                onChange={(e) =>
                                  updateContact(partIndex, contactIndex, 'value', e.target.value)
                                }
                                disabled={!contact.isNew && !contact.isActive}
                                className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          </div>

                          {/* Botões de Ação */}
                          {!contact.isNew && (
                            <div className="flex gap-2 items-center shrink-0">
                              {/* Switch Ativar/Desativar */}
                              {canToggle && (
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={contact.isActive}
                                    onCheckedChange={() => handleToggleActive(contact.id!, contact.value, contact.isActive)}
                                    disabled={actionLoading === contact.id}
                                  />
                                </div>
                              )}

                              {/* Botão Excluir (apenas ADMIN) */}
                              {isAdmin && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(contact.id!, contact.value)}
                                  disabled={actionLoading === contact.id}
                                  className="cursor-pointer"
                                  title="Excluir permanentemente"
                                >
                                  {actionLoading === contact.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <X className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Botão Adicionar Contato */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addContact(partIndex)}
                        className="w-full cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Contato
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Botões de Ação */}
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
                    Salvar Contatos
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </CCRPageWrapper>
  );
}
