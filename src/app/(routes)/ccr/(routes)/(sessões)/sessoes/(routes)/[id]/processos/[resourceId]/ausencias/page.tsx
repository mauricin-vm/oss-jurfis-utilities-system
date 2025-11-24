'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CCRPageWrapper } from '@/app/(routes)/ccr/components/ccr-page-wrapper';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: string | null;
  gender: string | null;
}

interface SessionMember {
  id: string;
  member: Member;
}

interface Absence {
  id: string;
  memberId: string;
}

interface AbsencesData {
  session: {
    id: string;
    sessionNumber: string;
    date: Date;
    status: string;
    members: SessionMember[];
  };
  sessionResource: {
    id: string;
    absences: Absence[];
    resource: {
      id: string;
      processNumber: string;
      resourceNumber: string;
    };
  };
}

export default function AusenciasPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<AbsencesData | null>(null);
  const [selectedAbsences, setSelectedAbsences] = useState<string[]>([]);

  useEffect(() => {
    if (params.id && params.resourceId) {
      fetchData();
    }
  }, [params.id, params.resourceId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/ausencias`
      );

      if (response.ok) {
        const result = await response.json();
        setData(result);

        // Preencher ausências já registradas
        const absentMemberIds = result.sessionResource.absences.map((a: Absence) => a.memberId);
        setSelectedAbsences(absentMemberIds);
      } else {
        toast.error('Erro ao carregar dados');
      }
    } catch (error) {
      console.error('Error fetching absences data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAbsence = (memberId: string) => {
    setSelectedAbsences((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/ccr/sessions/${params.id}/processos/${params.resourceId}/ausencias`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ absentMemberIds: selectedAbsences }),
        }
      );

      if (response.ok) {
        toast.success('Ausências atualizadas com sucesso');
        router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Erro ao atualizar ausências');
      }
    } catch (error) {
      console.error('Error saving absences:', error);
      toast.error('Erro ao salvar ausências');
    } finally {
      setSaving(false);
    }
  };

  const breadcrumbs = [
    { label: 'Menu', href: '/' },
    { label: 'CCR', href: '/ccr' },
    { label: 'Sessões', href: '/ccr/sessoes' },
    { label: `Sessão n. ${data?.session.sessionNumber || 'Carregando...'}`, href: `/ccr/sessoes/${params.id}` },
    { label: `Processo n. ${data?.sessionResource.resource.resourceNumber || 'Carregando...'}`, href: `/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar` },
    { label: 'Ausências' },
  ];

  if (loading) {
    return (
      <CCRPageWrapper title="Gerenciar Ausências" breadcrumbs={breadcrumbs}>
        <Card>
          <CardHeader>
            <CardTitle>Membros da Sessão</CardTitle>
            <CardDescription>
              Selecione os membros que estavam ausentes durante este processo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-5 w-64" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  if (!data) {
    return (
      <CCRPageWrapper title="Gerenciar Ausências" breadcrumbs={breadcrumbs}>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Dados não encontrados
            </p>
          </CardContent>
        </Card>
      </CCRPageWrapper>
    );
  }

  const isSessionCompleted = data.session.status === 'CONCLUIDA';

  return (
    <CCRPageWrapper title={isSessionCompleted ? "Ausências" : "Gerenciar Ausências"} breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Membros da Sessão</CardTitle>
            <CardDescription>
              {isSessionCompleted
                ? 'Membros que estavam ausentes durante o julgamento deste processo.'
                : 'Selecione os membros que estavam ausentes durante o julgamento deste processo.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.session.members.map((sessionMember) => {
                const isAbsent = selectedAbsences.includes(sessionMember.member.id);

                return (
                  <div
                    key={sessionMember.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${!isSessionCompleted ? 'hover:bg-gray-50 cursor-pointer' : 'bg-gray-50'} transition-colors`}
                    onClick={() => !isSessionCompleted && handleToggleAbsence(sessionMember.member.id)}
                  >
                    <Checkbox
                      checked={isAbsent}
                      onCheckedChange={() => !isSessionCompleted && handleToggleAbsence(sessionMember.member.id)}
                      className={!isSessionCompleted ? "cursor-pointer" : "pointer-events-none"}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sessionMember.member.name}</p>
                      {sessionMember.member.role && (
                        <p className="text-xs text-muted-foreground">
                          {sessionMember.member.role}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Botões de Ação - apenas quando sessão não está concluída */}
        {!isSessionCompleted && (
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`)}
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
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Ausências
            </Button>
          </div>
        )}

        {/* Botão de Voltar - apenas quando sessão está concluída */}
        {isSessionCompleted && (
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/ccr/sessoes/${params.id}/processos/${params.resourceId}/julgar`)}
              className="cursor-pointer"
            >
              Voltar
            </Button>
          </div>
        )}
      </div>
    </CCRPageWrapper>
  );
}
