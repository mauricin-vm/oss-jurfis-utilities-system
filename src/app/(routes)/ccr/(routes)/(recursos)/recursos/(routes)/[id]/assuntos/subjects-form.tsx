'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, HelpCircle } from 'lucide-react';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';

interface Subject {
  id: string;
  name: string;
  parentId: string | null;
}

interface SubjectsFormProps {
  initialData: {
    id: string;
    resourceNumber: string;
    subjects: Array<{
      id: string;
      isPrimary: boolean;
      subject: {
        id: string;
        name: string;
        parentId: string | null;
      };
    }>;
  };
  onSubjectsLoaded?: () => void;
}

export function SubjectsForm({ initialData, onSubjectsLoaded }: SubjectsFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [mainSubjects, setMainSubjects] = useState<Subject[]>([]);
  const [childSubjects, setChildSubjects] = useState<Subject[]>([]);

  const [selectedMainSubject, setSelectedMainSubject] = useState<string>('');
  const [selectedSubitems, setSelectedSubitems] = useState<string[]>([]);

  // Carregar assuntos
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Inicializar valores do formulário
  useEffect(() => {
    if (initialData.subjects && initialData.subjects.length > 0) {
      const primarySubject = initialData.subjects.find((s) => s.isPrimary);
      if (primarySubject) {
        setSelectedMainSubject(primarySubject.subject.id);
      }

      const subitems = initialData.subjects
        .filter((s) => !s.isPrimary)
        .map((s) => s.subject.id);
      setSelectedSubitems(subitems);
    }
  }, [initialData.subjects]);

  // Quando o assunto principal muda, carregar seus filhos
  useEffect(() => {
    if (selectedMainSubject) {
      const children = allSubjects.filter(
        (s) => s.parentId === selectedMainSubject
      );
      setChildSubjects(children);

      // Limpar subitens selecionados que não são filhos do novo assunto principal
      setSelectedSubitems((prev) =>
        prev.filter((id) => children.some((child) => child.id === id))
      );
    } else {
      setChildSubjects([]);
      setSelectedSubitems([]);
    }
  }, [selectedMainSubject, allSubjects]);

  const fetchSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const response = await fetch('/api/ccr/subjects');
      if (response.ok) {
        const data = await response.json();
        setAllSubjects(data);

        // Filtrar assuntos principais (sem pai)
        const main = data.filter((s: Subject) => s.parentId === null);
        setMainSubjects(main);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Erro ao carregar assuntos');
    } finally {
      setLoadingSubjects(false);
      onSubjectsLoaded?.();
    }
  };

  const handleSubitemToggle = (subitemId: string) => {
    setSelectedSubitems((prev) =>
      prev.includes(subitemId)
        ? prev.filter((id) => id !== subitemId)
        : [...prev, subitemId]
    );
  };

  const onSubmit = async () => {
    try {
      // Validação
      if (!selectedMainSubject) {
        toast.error('Selecione o assunto principal');
        return;
      }

      setLoading(true);

      const response = await fetch(`/api/ccr/resources/${initialData.id}/subjects`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainSubjectId: selectedMainSubject,
          subitemIds: selectedSubitems,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast.success('Assuntos atualizados com sucesso');
      router.push(`/ccr/recursos/${initialData.id}`);
      router.refresh();
    } catch (error) {
      console.error('Error saving subjects:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar assuntos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assunto Principal */}
      <div className="space-y-0">
        <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
          Assunto Principal <span className="text-red-500">*</span>
          <TooltipWrapper content="Selecione o assunto principal do recurso">
            <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
          </TooltipWrapper>
        </label>
        <Select value={selectedMainSubject} onValueChange={setSelectedMainSubject}>
          <SelectTrigger className="h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
            <SelectValue placeholder="Selecione o assunto principal" />
          </SelectTrigger>
          <SelectContent className="rounded-lg max-h-[300px]">
            {mainSubjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subitens */}
      {selectedMainSubject && childSubjects.length > 0 && (
        <div className="space-y-0">
          <label className="block text-sm font-medium mb-1.5 flex items-center gap-1.5">
            Subitens
            <TooltipWrapper content="Selecione os subitens que fundamentaram o indeferimento do pedido na decisão singular">
              <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
            </TooltipWrapper>
          </label>
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 max-h-[300px] overflow-y-auto">
            {childSubjects.map((subitem) => (
              <div key={subitem.id} className="flex items-center space-x-2">
                <Checkbox
                  id={subitem.id}
                  checked={selectedSubitems.includes(subitem.id)}
                  onCheckedChange={() => handleSubitemToggle(subitem.id)}
                />
                <label
                  htmlFor={subitem.id}
                  className="text-sm cursor-pointer flex-1"
                >
                  {subitem.name}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedMainSubject && childSubjects.length === 0 && (
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-muted-foreground text-center">
            Este assunto não possui subitens cadastrados
          </p>
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-4">
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
