'use client'

import { useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
}

const faqData: Record<string, FAQItem[]> = {
  ccr: [
    {
      question: 'O que é um Protocolo?',
      answer: 'O Protocolo é o registro inicial de entrada de um recurso no sistema. É a primeira etapa do processo, onde são registradas as informações básicas do recurso, as partes envolvidas e os documentos relacionados.',
    },
    {
      question: 'Como criar um novo Protocolo?',
      answer: 'Acesse o menu CCR > Protocolos e clique no botão "Novo Protocolo". Preencha os dados do processo, adicione as partes envolvidas (Requerente, Patrono, etc.) e seus respectivos contatos. Após salvar, o protocolo poderá ser convertido em Recurso.',
    },
    {
      question: 'Qual a diferença entre Protocolo e Recurso?',
      answer: 'O Protocolo é o registro inicial, uma espécie de "rascunho" do processo. O Recurso é criado a partir de um protocolo aprovado e contém todas as informações completas para tramitação, sessões de julgamento e decisões.',
    },
    {
      question: 'O que é uma Tramitação?',
      answer: 'Tramitação é a movimentação do recurso entre diferentes setores ou estágios do processo. Por exemplo: "Enviado para análise", "Em julgamento", "Aguardando documentação", etc. Cada tramitação registra data, responsável e observações.',
    },
    {
      question: 'Como funciona a hierarquia de Assuntos?',
      answer: 'Os assuntos podem ser organizados em hierarquia (pai e filho) para facilitar a categorização. Por exemplo: IPTU (pai) > Isenção de IPTU (filho) > Isenção por idade (neto). Isso ajuda a organizar recursos por temas relacionados.',
    },
    {
      question: 'O que é uma Sessão de julgamento?',
      answer: 'A Sessão é a reunião formal onde os recursos são julgados pelos membros da Junta. Durante a sessão, são registrados os votos, a decisão final e gerada a ata da reunião.',
    },
  ],
  calendario: [
    {
      question: 'Como solicitar o agendamento da sala?',
      answer: 'Clique em "Solicitar Agendamento" no calendário, preencha os dados da reunião (título, data, horários, seus contatos) e envie. Você receberá um email quando sua solicitação for aprovada ou rejeitada por um administrador.',
    },
    {
      question: 'Quem pode aprovar solicitações?',
      answer: 'Apenas usuários com perfil de Administrador e que pertencem à organização "Junta de Recursos Fiscais" podem aprovar ou rejeitar solicitações de agendamento.',
    },
    {
      question: 'Posso agendar direto sem aprovação?',
      answer: 'Sim, se você for funcionário da JURFIS (perfil ADMIN ou EMPLOYEE). Neste caso, o agendamento é criado diretamente sem necessidade de aprovação.',
    },
    {
      question: 'O que acontece se houver conflito de horário?',
      answer: 'O sistema detecta automaticamente conflitos de horário e exibe um aviso antes de criar a solicitação. Se for administrador fazendo agendamento direto, o sistema também alertará sobre o conflito.',
    },
    {
      question: 'Como editar ou cancelar um agendamento?',
      answer: 'Clique no agendamento desejado no calendário. Se você for administrador, poderá editar os dados ou cancelar. Ao editar, todos os participantes receberão email de notificação da alteração.',
    },
  ],
  'horas-extras': [
    {
      question: 'Como registrar minhas horas extras?',
      answer: 'Acesse o menu "Horas Extras" e clique em "Novo Registro". Preencha o mês/ano de referência, quantidade de horas extras, atrasos e horas compensadas. Você pode anexar o PDF do comprovante se desejar.',
    },
    {
      question: 'Quem pode ver meus registros?',
      answer: 'Usuários comuns veem apenas seus próprios registros. Administradores podem visualizar os registros de todos os usuários do sistema.',
    },
    {
      question: 'Posso editar um registro após salvar?',
      answer: 'Sim, você pode editar seus próprios registros a qualquer momento. Clique no registro desejado e faça as alterações necessárias.',
    },
    {
      question: 'O que significa "Saldo Acumulado"?',
      answer: 'O Saldo Acumulado é o total de horas que você tem a receber ou compensar, considerando todas as horas extras, atrasos e compensações registradas.',
    },
  ],
  documentos: [
    {
      question: 'Como mesclar vários PDFs em um único arquivo?',
      answer: 'Acesse "Manipulação de Documentos" > "Mesclar PDFs". Faça upload dos arquivos PDF na ordem desejada, visualize a prévia se necessário, e clique em "Mesclar Documentos". O arquivo final será baixado automaticamente.',
    },
    {
      question: 'O que é a anonimização de documentos?',
      answer: 'A anonimização remove informações pessoais sensíveis do documento PDF conforme a LGPD (Lei Geral de Proteção de Dados). O sistema detecta e remove automaticamente CPFs, nomes, endereços e outros dados pessoais.',
    },
    {
      question: 'Como dividir um PDF grande?',
      answer: 'Acesse "Manipulação de Documentos" > "Dividir PDF". Faça upload do arquivo, selecione as páginas ou intervalos desejados, e o sistema gerará arquivos separados para cada seleção.',
    },
    {
      question: 'Os documentos processados ficam salvos no servidor?',
      answer: 'Não. Todo o processamento é feito temporariamente e os arquivos são excluídos imediatamente após a conclusão. O sistema não armazena os documentos enviados.',
    },
  ],
};

export function FAQSection({ id, title, icon: Icon }: FAQSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = faqData[id] || [];

  if (faqs.length === 0) return null;

  return (
    <div id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100">
          <Icon className="w-5 h-5 text-gray-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg overflow-hidden bg-white"
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <span className="text-base font-medium text-gray-900 pr-4">
                {faq.question}
              </span>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200',
                  openIndex === index && 'rotate-180'
                )}
              />
            </button>

            {openIndex === index && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
