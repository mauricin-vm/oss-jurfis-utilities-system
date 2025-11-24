'use client'

//importar bibliotecas e funções
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { IoCalendar, IoChatbubbles, IoTime, IoSearch } from 'react-icons/io5';
import { HiDocumentDuplicate } from 'react-icons/hi';
import { HiScale } from 'react-icons/hi2';
import { OnboardingModal } from '@/components/help/onboarding-modal';
import { OnboardingTour } from '@/components/help/onboarding-tour';

//função principal
export default function Home() {
  const { data: session } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    // Verificar se o usuário já completou o onboarding
    const checkOnboarding = async () => {
      if (!session?.user) {
        setCheckingOnboarding(false);
        return;
      }

      try {
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();

          // Mostrar onboarding se ainda não foi completado
          if (!data.hasCompletedOnboarding) {
            setShowOnboarding(true);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar onboarding:', error);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, [session]);

  const handleCloseOnboarding = async () => {
    setShowOnboarding(false);

    // Marcar como concluído no backend
    try {
      await fetch('/api/user/onboarding', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Erro ao marcar onboarding como concluído:', error);
    }
  };

  const handleStartTour = () => {
    setRunTour(true);
  };

  const handleFinishTour = () => {
    setRunTour(false);
  };
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="font-semibold">Menu</span>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-4 p-4 pt-0">
        <div className="mx-auto max-w-7xl w-full">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Junta de Recursos Fiscais</h1>
            <p className="text-sm text-muted-foreground">
              Conjunto de funcionalidades disponíveis para a realização das atividades da JURFIS/SEFAZ
            </p>
          </div>

          {/* Menu de opções */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto">

            {/* Card Buscar Acórdãos */}
            <Card className="h-full relative opacity-60 p-6 gap-3">
              <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-md">
                Em breve
              </div>
              <CardHeader className="p-0">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <IoSearch className="h-6 w-6 text-foreground" />
                  </div>
                  <CardTitle className="text-xl">Buscar Acórdãos</CardTitle>
                </div>
                <CardDescription>
                  Sistema para consultar os acórdãos da Junta
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Busca exata e semântica de acórdãos</li>
                  <li>• Filtros por palavras-chave</li>
                  <li>• Visualização de documentos</li>
                  <li>• Download de recursos, pareceres e votos</li>
                </ul>
              </CardContent>
            </Card>

            {/* Card Calendário */}
            <Link href="/calendario" className="group">
              <Card className="h-full transition-all hover:shadow-md p-6 gap-3">
                <CardHeader className="p-0">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-transform group-hover:scale-110">
                      <IoCalendar className="h-6 w-6 text-foreground" />
                    </div>
                    <CardTitle className="text-xl">Calendário</CardTitle>
                  </div>
                  <CardDescription>
                    Listagem de reuniões da Sala Alberto Kalachi (Sala 05)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Visualização de agendamentos</li>
                    <li>• Novas solicitações</li>
                    <li>• Controle de reuniões</li>
                    <li>• Feedback para usuários</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Card Chat de Atendimento */}
            <Card className="h-full relative opacity-60 p-6 gap-3">
              <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-md">
                Em breve
              </div>
              <CardHeader className="p-0">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted">
                    <IoChatbubbles className="h-6 w-6 text-foreground" />
                  </div>
                  <CardTitle className="text-xl">Chat de Atendimento</CardTitle>
                </div>
                <CardDescription>
                  Sistema de atendimento via WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Integração com WhatsApp</li>
                  <li>• Marcadores inteligentes</li>
                  <li>• Atendimento automático</li>
                  <li>• Interface amigável</li>
                </ul>
              </CardContent>
            </Card>

            {/* Card Controle de Recursos */}
            <Link href="/ccr" className="group">
              <Card className="h-full transition-all hover:shadow-md p-6 gap-3">
                <CardHeader className="p-0">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-transform group-hover:scale-110">
                      <HiScale className="h-6 w-6 text-foreground" />
                    </div>
                    <CardTitle className="text-xl">Controle de Recursos</CardTitle>
                  </div>
                  <CardDescription>
                    Sistema operacional de recursos administrativos
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Controle de protocolos e prazos</li>
                    <li>• Planejamento de pautas de julgamento</li>
                    <li>• Notificações automáticas</li>
                    <li>• Gerenciamento de julgamentos e decisões</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Card Gestão de Horas Extras */}
            <Link href="/horas-extras" className="group">
              <Card className="h-full transition-all hover:shadow-md p-6 gap-3">
                <CardHeader className="p-0">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-transform group-hover:scale-110">
                      <IoTime className="h-6 w-6 text-foreground" />
                    </div>
                    <CardTitle className="text-xl">Horas Extras</CardTitle>
                  </div>
                  <CardDescription>
                    Controle de banco de horas dos servidores
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Listagem dos servidores</li>
                    <li>• Saldo de banco de horas</li>
                    <li>• Histórico mensal</li>
                    <li>• Upload de folhas mensais</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

            {/* Card Manipular Documentos */}
            <Link href="/documentos/mesclar" className="group">
              <Card className="h-full transition-all hover:shadow-md p-6 gap-3">
                <CardHeader className="p-0">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-transform group-hover:scale-110">
                      <HiDocumentDuplicate className="h-6 w-6 text-foreground" />
                    </div>
                    <CardTitle className="text-xl">Manipular Documentos</CardTitle>
                  </div>
                  <CardDescription>
                    Ferramentas para mesclar, anonimizar e processar PDFs
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Mesclar múltiplos arquivos</li>
                    <li>• Extrair páginas específicas</li>
                    <li>• Anonimizar informações sensíveis</li>
                    <li>• Processar documentos em lote</li>
                  </ul>
                </CardContent>
              </Card>
            </Link>

          </div>
        </div>
        </div>
      </div>

      {/* Footer / Créditos */}
      <footer className="flex h-12 shrink-0 items-center justify-center">
        <p className="text-xs text-muted-foreground">
          Desenvolvido por <span className="font-medium">Virtus Code</span>
        </p>
      </footer>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleCloseOnboarding}
        onStartTour={handleStartTour}
        userName={session?.user?.name || undefined}
      />

      {/* Onboarding Tour */}
      <OnboardingTour
        run={runTour}
        onFinish={handleFinishTour}
      />
    </div>
  );
};