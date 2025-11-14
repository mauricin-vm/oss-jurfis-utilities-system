'use client'

import { useState, useMemo } from 'react';
import { BookOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface GlossaryTerm {
  term: string;
  definition: string;
  category: 'Jurídico' | 'Fiscal' | 'Processual' | 'Geral';
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Protocolo',
    definition: 'Registro inicial de entrada de um recurso no sistema. É a primeira etapa do processo, onde são cadastradas as informações básicas antes da conversão em recurso oficial.',
    category: 'Processual',
  },
  {
    term: 'Recurso',
    definition: 'Processo administrativo fiscal completo, criado a partir de um protocolo aprovado. Contém todas as informações necessárias para tramitação, julgamento e decisão.',
    category: 'Processual',
  },
  {
    term: 'Tramitação',
    definition: 'Movimentação do recurso entre diferentes setores ou estágios do processo. Registra o histórico de encaminhamentos e status do processo.',
    category: 'Processual',
  },
  {
    term: 'Sessão de Julgamento',
    definition: 'Reunião formal da Junta de Recursos Fiscais onde os processos são analisados, votados e julgados pelos membros. Ao final, é gerada a ata com as decisões.',
    category: 'Processual',
  },
  {
    term: 'IPTU',
    definition: 'Imposto sobre a Propriedade Predial e Territorial Urbana. Tributo municipal cobrado anualmente dos proprietários de imóveis urbanos.',
    category: 'Fiscal',
  },
  {
    term: 'ITCD',
    definition: 'Imposto sobre Transmissão Causa Mortis e Doação. Tributo estadual incidente sobre heranças e doações de bens e direitos.',
    category: 'Fiscal',
  },
  {
    term: 'ICMS',
    definition: 'Imposto sobre Circulação de Mercadorias e Serviços. Tributo estadual que incide sobre a movimentação de mercadorias e alguns serviços específicos.',
    category: 'Fiscal',
  },
  {
    term: 'Requerente',
    definition: 'Pessoa física ou jurídica que solicita a apreciação de um recurso administrativo fiscal. É a parte interessada no processo.',
    category: 'Jurídico',
  },
  {
    term: 'Patrono',
    definition: 'Advogado ou representante legal que atua em nome do requerente no processo administrativo.',
    category: 'Jurídico',
  },
  {
    term: 'Auto de Infração',
    definition: 'Documento oficial lavrado pela autoridade fiscal que registra uma irregularidade ou descumprimento de obrigação tributária, aplicando penalidade cabível.',
    category: 'Fiscal',
  },
  {
    term: 'Inscrição',
    definition: 'Registro numérico único que identifica um contribuinte ou propriedade no sistema tributário. Pode ser inscrição municipal, estadual ou cadastral.',
    category: 'Geral',
  },
  {
    term: 'Lançamento Tributário',
    definition: 'Ato administrativo pelo qual a autoridade fiscal constitui o crédito tributário, identificando o fato gerador, calculando o valor devido e identificando o sujeito passivo.',
    category: 'Fiscal',
  },
  {
    term: 'Recurso Ordinário',
    definition: 'Recurso administrativo interposto em primeira instância contra decisão da autoridade fiscal.',
    category: 'Jurídico',
  },
  {
    term: 'Recurso Extraordinário',
    definition: 'Recurso administrativo interposto em segunda instância contra decisão de primeira instância, quando cabível.',
    category: 'Jurídico',
  },
  {
    term: 'Anistia',
    definition: 'Perdão legal de infrações tributárias, eliminando a punibilidade das penalidades aplicadas, mas mantendo a obrigação de pagar o tributo principal.',
    category: 'Fiscal',
  },
  {
    term: 'Remissão',
    definition: 'Perdão total ou parcial do crédito tributário, incluindo tanto o tributo quanto as penalidades.',
    category: 'Fiscal',
  },
  {
    term: 'Isenção',
    definition: 'Dispensa legal do pagamento de tributo, concedida por lei a determinadas pessoas, situações ou operações.',
    category: 'Fiscal',
  },
  {
    term: 'Base de Cálculo',
    definition: 'Valor sobre o qual é aplicada a alíquota do tributo para determinar o montante a ser pago.',
    category: 'Fiscal',
  },
  {
    term: 'Alíquota',
    definition: 'Percentual ou valor fixo aplicado sobre a base de cálculo para determinar o valor do tributo devido.',
    category: 'Fiscal',
  },
  {
    term: 'Fato Gerador',
    definition: 'Situação definida em lei como necessária e suficiente para o surgimento da obrigação tributária.',
    category: 'Fiscal',
  },
];

export default function GlossarioPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const categories = ['Todos', 'Jurídico', 'Fiscal', 'Processual', 'Geral'];

  const filteredTerms = useMemo(() => {
    return glossaryTerms
      .filter((term) => {
        const matchesSearch =
          term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
          term.definition.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory =
          selectedCategory === 'Todos' || term.category === selectedCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [searchQuery, selectedCategory]);

  // Group terms by first letter
  const groupedTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    filteredTerms.forEach((term) => {
      const letter = term.term[0].toUpperCase();
      if (!groups[letter]) {
        groups[letter] = [];
      }
      groups[letter].push(term);
    });
    return groups;
  }, [filteredTerms]);

  const letters = Object.keys(groupedTerms).sort();

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/ajuda">Ajuda</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Glossário</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Glossário</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Termos jurídicos e fiscais explicados de forma simples
                </p>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar termo..."
                className="w-full h-12 pl-12 pr-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Terms Count */}
          <div className="mb-6 text-sm text-gray-600">
            {filteredTerms.length} {filteredTerms.length === 1 ? 'termo encontrado' : 'termos encontrados'}
          </div>

          {/* Terms List */}
          {letters.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Nenhum termo encontrado</p>
            </div>
          ) : (
            <div className="space-y-8">
              {letters.map((letter) => (
                <div key={letter}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
                    {letter}
                  </h2>
                  <div className="space-y-6">
                    {groupedTerms[letter].map((term, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {term.term}
                          </h3>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full shrink-0">
                            {term.category}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {term.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
