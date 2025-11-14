'use client'

import { useState } from 'react';
import { BookOpen, FileText, Calendar, Clock, FileStack, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { FAQSection } from './components/faq-section';
import { SearchHelp } from './components/search-help';

export default function AjudaPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const modules = [
    {
      icon: FileStack,
      title: 'CCR - Controle de Recursos',
      description: 'Aprenda sobre protocolos, recursos, tramitações e sessões',
      href: '#ccr',
    },
    {
      icon: Calendar,
      title: 'Sistema de Calendário',
      description: 'Como agendar a Sala Alberto Kalachi e gerenciar reuniões',
      href: '#calendario',
    },
    {
      icon: Clock,
      title: 'Horas Extras',
      description: 'Registro e acompanhamento de horas extras',
      href: '#horas-extras',
    },
    {
      icon: FileText,
      title: 'Manipulação de Documentos',
      description: 'Mesclar, dividir e anonimizar PDFs',
      href: '#documentos',
    },
  ];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Ajuda</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
              <HelpCircle className="w-8 h-8 text-gray-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Central de Ajuda
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Encontre respostas para suas dúvidas sobre o Sistema JURFIS
            </p>
          </div>

          {/* Search */}
          <div className="mb-12">
            <SearchHelp onSearch={setSearchQuery} />
          </div>

          {/* Quick Links to Glossary */}
          <div className="mb-12 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <BookOpen className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Glossário de Termos Jurídicos e Fiscais
                </h3>
                <p className="text-sm text-blue-800 mb-4">
                  Não entende algum termo técnico? Consulte nosso glossário completo com definições claras.
                </p>
                <Link
                  href="/ajuda/glossario"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Acessar Glossário
                </Link>
              </div>
            </div>
          </div>

          {/* Module Cards */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Guias por Módulo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {modules.map((module) => (
                <a
                  key={module.href}
                  href={module.href}
                  className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors shrink-0">
                      <module.icon className="w-6 h-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-black">
                        {module.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {module.description}
                      </p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* FAQ Sections */}
          <div className="space-y-12">
            <FAQSection
              id="ccr"
              title="CCR - Controle de Recursos"
              icon={FileStack}
            />
            <FAQSection
              id="calendario"
              title="Sistema de Calendário"
              icon={Calendar}
            />
            <FAQSection
              id="horas-extras"
              title="Horas Extras"
              icon={Clock}
            />
            <FAQSection
              id="documentos"
              title="Manipulação de Documentos"
              icon={FileText}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
