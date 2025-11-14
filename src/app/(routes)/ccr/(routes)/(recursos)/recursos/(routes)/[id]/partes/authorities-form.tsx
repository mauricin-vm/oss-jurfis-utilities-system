'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { Loader2, Plus, HelpCircle, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { Switch } from '@/components/ui/switch';
import { applyPhoneMask, formatPhoneToDatabase, formatPhoneForDisplay } from '@/lib/validations';

interface Authority {
  id?: string;
  type: string;
  authorityRegisteredId: string;
}

interface RegisteredAuthority {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
}

interface Part {
  id?: string;
  name: string;
  role: string;
  registrationType: string;
  registrationNumber: string;
  isActive?: boolean;
  isNew?: boolean;
}

interface AuthoritiesFormProps {
  initialData: {
    id: string;
    resourceNumber: string;
    authorities: Array<{
      id: string;
      type: string;
      authorityRegisteredId: string;
      authorityRegistered: {
        id: string;
        name: string;
        isActive: boolean;
      };
    }>;
    parts: Array<{
      id: string;
      name: string;
      role: string;
      registrationType: string | null;
      registrationNumber: string | null;
      isActive: boolean;
    }>;
  };
  registeredAuthorities: RegisteredAuthority[];
}

const authorityTypeLabels: Record<string, string> = {
  AUTOR_PROCEDIMENTO_FISCAL: 'Autor Procedimento Fiscal',
  JULGADOR_SINGULAR: 'Julgador Singular',
  COORDENADOR: 'Coordenador',
  OUTROS: 'Outros',
};

const partRoleLabels: Record<string, string> = {
  REQUERENTE: 'Requerente',
  PATRONO: 'Patrono',
  REPRESENTANTE: 'Representante',
  OUTRO: 'Outro',
};

export function AuthoritiesForm({ initialData, registeredAuthorities }: AuthoritiesFormProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const userRole = session?.user?.role;
  const isAdmin = userRole === 'ADMIN';
  const canToggle = isAdmin || userRole === 'EMPLOYEE';

  const [parts, setParts] = useState<Part[]>(
    initialData.parts && initialData.parts.length > 0
      ? initialData.parts.map((part) => ({
        id: part.id,
        name: part.name,
        role: part.role,
        registrationType: part.registrationType || '',
        registrationNumber: part.registrationNumber || '',
        isActive: part.isActive,
      }))
      : []
  );

  const [authorities, setAuthorities] = useState<Authority[]>(
    initialData.authorities && initialData.authorities.length > 0
      ? initialData.authorities.map((auth) => ({
        id: auth.id,
        type: auth.type,
        authorityRegisteredId: auth.authorityRegisteredId,
      }))
      : []
  );

  const addPart = () => {
    setParts([
      ...parts,
      {
        name: '',
        role: 'REQUERENTE',
        registrationType: '',
        registrationNumber: '',
        isActive: true,
        isNew: true,
      },
    ]);
  };

  const handleToggleActivePart = async (partId: string, partName: string, currentStatus: boolean) => {
    try {
      setActionLoading(partId);

      const action = currentStatus ? 'desativar' : 'ativar';
      const actionPast = currentStatus ? 'desativada' : 'ativada';

      toast.warning(`Tem certeza que deseja ${action} a parte "${partName}"?`, {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            const response = await fetch(`/api/ccr/parts/${partId}`, {
              method: 'PATCH',
            });

            if (response.ok) {
              toast.success(`Parte ${actionPast} com sucesso`);
              // Atualizar o estado local
              setParts(parts.map(p =>
                p.id === partId ? { ...p, isActive: !currentStatus } : p
              ));
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
      console.error('Error toggling part:', error);
      toast.error('Erro ao atualizar status');
      setActionLoading(null);
    }
  };

  const handleDeletePart = async (partId: string, partName: string) => {
    try {
      setActionLoading(partId);

      toast.warning(`Tem certeza que deseja excluir permanentemente a parte "${partName}"?`, {
        duration: 10000,
        action: {
          label: 'Confirmar',
          onClick: async () => {
            const response = await fetch(`/api/ccr/parts/${partId}`, {
              method: 'DELETE',
            });

            if (response.ok) {
              toast.success('Parte excluída permanentemente');
              // Remover do estado local
              setParts(parts.filter(p => p.id !== partId));
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
      console.error('Error deleting part:', error);
      toast.error('Erro ao excluir parte');
      setActionLoading(null);
    }
  };

  const removePart = async (index: number) => {
    const part = parts[index];

    // Se a parte tem ID (já existe no banco), verificar se tem contatos
    if (part.id) {
      try {
        // Buscar contatos da parte
        const response = await fetch(`/api/ccr/parts/${part.id}/contacts`);
        if (response.ok) {
          const contacts = await response.json();

          if (contacts.length > 0) {
            // Mostrar confirmação
            const message = contacts.length === 1
              ? 'Esta parte possui 1 contato vinculado. Deseja realmente excluir?'
              : `Esta parte possui ${contacts.length} contatos vinculados. Deseja realmente excluir?`;

            toast.warning(message, {
              duration: 10000,
              action: {
                label: 'Confirmar',
                onClick: () => {
                  setParts(parts.filter((_, i) => i !== index));
                  toast.success('Parte removida com sucesso');
                },
              },
              cancel: {
                label: 'Cancelar',
                onClick: () => {},
              },
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error checking contacts:', error);
      }
    }

    // Se não tem ID ou não tem contatos, pode remover direto
    setParts(parts.filter((_, i) => i !== index));
  };

  const updatePart = (index: number, field: keyof Part, value: any) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };
    setParts(updated);
  };

  const addAuthority = () => {
    setAuthorities([
      ...authorities,
      {
        type: 'AUTOR_PROCEDIMENTO_FISCAL',
        authorityRegisteredId: '',
      },
    ]);
  };

  const removeAuthority = (index: number) => {
    setAuthorities(authorities.filter((_, i) => i !== index));
  };

  const updateAuthority = (index: number, field: keyof Authority, value: any) => {
    const updated = [...authorities];
    updated[index] = { ...updated[index], [field]: value };
    setAuthorities(updated);
  };

  const onSubmit = async () => {
    try {
      // Validação partes
      for (const part of parts) {
        if (!part.name.trim()) {
          toast.error('Todos os nomes de parte devem ser preenchidos');
          return;
        }
        // Validação específica para PATRONO
        if (part.role === 'PATRONO') {
          if (!part.registrationType.trim()) {
            toast.error('O tipo de registro é obrigatório para Patrono');
            return;
          }
          if (!part.registrationNumber.trim()) {
            toast.error('O número de registro é obrigatório para Patrono');
            return;
          }
        }
      }

      // Validação autoridades
      for (const auth of authorities) {
        if (!auth.type || !auth.type.trim()) {
          toast.error('O tipo de autoridade é obrigatório');
          return;
        }
        if (!auth.authorityRegisteredId || !auth.authorityRegisteredId.trim()) {
          toast.error('Todas as autoridades devem ser selecionadas');
          return;
        }
      }

      setLoading(true);

      const response = await fetch(`/api/ccr/resources/${initialData.id}/authorities`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parts: parts.map((part) => ({
            id: part.id,
            name: part.name,
            role: part.role,
            registrationType: part.registrationType || null,
            registrationNumber: part.registrationNumber || null,
            isActive: part.isActive ?? true,
          })),
          authorities: authorities.map((auth) => ({
            id: auth.id,
            type: auth.type,
            authorityRegisteredId: auth.authorityRegisteredId,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Partes interessadas atualizadas com sucesso');
      router.push(`/ccr/recursos/${initialData.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error saving authorities:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar partes interessadas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Partes */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-1.5">
            Partes
            <TooltipWrapper content="As partes são as pessoas que possuem legitimidade">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
            </TooltipWrapper>
          </h3>
        </div>

        <div className="space-y-3">
          {parts.map((part, index) => (
            <div key={index} className="flex flex-wrap gap-3 items-start">
              {/* Nome */}
              <div className="flex-1 min-w-[200px]">
                {index === 0 && (
                  <Label className="block text-sm font-medium mb-1.5">
                    Nome <span className="text-red-500">*</span>
                  </Label>
                )}
                <Input
                  value={part.name}
                  onChange={(e) => updatePart(index, 'name', e.target.value)}
                  disabled={loading || (!part.isNew && !part.isActive)}
                  placeholder="Nome da parte"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Tipo */}
              <div className="w-full sm:w-[200px]">
                {index === 0 && (
                  <Label className="block text-sm font-medium mb-1.5">
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                )}
                <Select
                  value={part.role}
                  onValueChange={(value) => updatePart(index, 'role', value)}
                  disabled={loading || (!part.isNew && !part.isActive)}
                >
                  <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {Object.entries(partRoleLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Registro */}
              <div className="w-full sm:w-[230px]">
                {index === 0 && (
                  <Label className="block text-sm font-medium mb-1.5">
                    Tipo de Registro{part.role === 'PATRONO' && <span className="text-red-500"> *</span>}
                  </Label>
                )}
                <Input
                  value={part.registrationType}
                  onChange={(e) => updatePart(index, 'registrationType', e.target.value)}
                  disabled={loading || (!part.isNew && !part.isActive)}
                  placeholder="Ex: OAB, CRC"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Número de Registro */}
              <div className="w-full sm:w-[230px]">
                {index === 0 && (
                  <Label className="block text-sm font-medium mb-1.5">
                    Nº Registro{part.role === 'PATRONO' && <span className="text-red-500"> *</span>}
                  </Label>
                )}
                <Input
                  value={part.registrationNumber}
                  onChange={(e) => updatePart(index, 'registrationNumber', e.target.value)}
                  disabled={loading || (!part.isNew && !part.isActive)}
                  placeholder="Número do registro"
                  className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Botões de Ação */}
              <div className={index === 0 ? "pt-[28px]" : ""}>
                <div className="flex gap-2 items-center shrink-0">
                  {/* Switch Ativar/Desativar */}
                  {canToggle && (
                    <TooltipWrapper content={part.isActive ? "Desativar parte" : "Ativar parte"}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={part.isActive}
                          onCheckedChange={() => {
                            if (part.isNew) {
                              // Para partes novas, apenas atualizar o estado local
                              updatePart(index, 'isActive', !part.isActive);
                            } else {
                              // Para partes existentes, fazer chamada à API
                              handleToggleActivePart(part.id!, part.name, part.isActive!);
                            }
                          }}
                          disabled={!part.isNew && actionLoading === part.id}
                        />
                      </div>
                    </TooltipWrapper>
                  )}

                  {/* Botão Remover/Excluir */}
                  {part.isNew ? (
                    // Botão Remover para partes novas (não salvas)
                    <TooltipWrapper content="Remover parte">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePart(index)}
                        disabled={loading}
                        className="cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipWrapper>
                  ) : (
                    // Botão Excluir (apenas ADMIN para partes existentes)
                    isAdmin && (
                      <TooltipWrapper content="Excluir parte">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePart(part.id!, part.name)}
                          disabled={actionLoading === part.id}
                          className="cursor-pointer"
                        >
                          {actionLoading === part.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipWrapper>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Botão Adicionar Parte */}
        <Button
          type="button"
          variant="outline"
          onClick={addPart}
          disabled={loading}
          className="w-full cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Parte
        </Button>
      </div>

      {/* Autoridades */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Autoridades</h3>
        </div>

        <div className="space-y-3">
          {authorities.map((authority, index) => {
            // Obter lista de autoridades disponíveis
            // Incluir apenas autoridades ativas + a autoridade já selecionada (se inativa)
            const availableAuthorities = registeredAuthorities.filter(
              (reg) => reg.isActive || reg.id === authority.authorityRegisteredId
            );

            return (
              <div key={index} className="flex flex-wrap gap-3 items-start">
                {/* Tipo de Autoridade - 1/3 */}
                <div className="w-full sm:w-[calc((100%-40px-1.5rem)/3)]">
                  {index === 0 && (
                    <Label className="block text-sm font-medium mb-1.5">
                      Tipo de Autoridade <span className="text-red-500">*</span>
                    </Label>
                  )}
                  <Select
                    value={authority.type}
                    onValueChange={(value) => updateAuthority(index, 'type', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg">
                      {Object.entries(authorityTypeLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Nome da Autoridade - 2/3 */}
                <div className="w-full sm:w-[calc((100%-40px-1.5rem)*2/3)]">
                  {index === 0 && (
                    <Label className="block text-sm font-medium mb-1.5">
                      Autoridade <span className="text-red-500">*</span>
                    </Label>
                  )}
                  <Select
                    value={authority.authorityRegisteredId}
                    onValueChange={(value) => updateAuthority(index, 'authorityRegisteredId', value)}
                    disabled={loading}
                  >
                    <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione uma autoridade" />
                    </SelectTrigger>
                    <SelectContent className="rounded-lg max-h-[300px]">
                      {availableAuthorities.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhuma autoridade disponível
                        </div>
                      ) : (
                        availableAuthorities.map((reg) => (
                          <SelectItem key={reg.id} value={reg.id}>
                            {reg.name} {!reg.isActive && '(Inativa)'}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Botão Remover */}
                <div className={index === 0 ? "pt-[28px]" : ""}>
                  <TooltipWrapper content="Remover autoridade">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAuthority(index)}
                      disabled={loading}
                      className="shrink-0 cursor-pointer h-10 w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão Adicionar Autoridade */}
        <Button
          type="button"
          variant="outline"
          onClick={addAuthority}
          disabled={loading}
          className="w-full cursor-pointer"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Autoridade
        </Button>
      </div>

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
