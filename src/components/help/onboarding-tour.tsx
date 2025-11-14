'use client'

import { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';

interface OnboardingTourProps {
  run: boolean;
  onFinish: () => void;
}

export function OnboardingTour({ run, onFinish }: OnboardingTourProps) {
  const [steps, setSteps] = useState<Step[]>([]);

  useEffect(() => {
    // Define steps only on client side to avoid SSR issues
    setSteps([
      {
        target: 'body',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Bem-vindo ao Tour!</h3>
            <p>Vamos conhecer as principais funcionalidades do Sistema JURFIS.</p>
          </div>
        ),
        placement: 'center',
      },
      {
        target: '[data-tour="sidebar"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Menu Lateral</h3>
            <p>
              Use o menu lateral para navegar entre os módulos do sistema. Você pode recolhê-lo
              clicando no ícone de menu.
            </p>
          </div>
        ),
        placement: 'right',
      },
      {
        target: '[data-tour="user-menu"]',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Menu do Usuário</h3>
            <p>
              Clique aqui para acessar suas informações, a Central de Ajuda ou fazer logout.
            </p>
          </div>
        ),
        placement: 'top',
      },
      {
        target: 'body',
        content: (
          <div>
            <h3 className="text-lg font-bold mb-2">Pronto!</h3>
            <p className="mb-3">
              Agora você está pronto para usar o sistema. Se tiver dúvidas, acesse a Central de
              Ajuda no menu do usuário.
            </p>
            <p className="text-sm text-gray-600">
              Dica: Cada módulo tem seu próprio tour guiado disponível na Central de Ajuda.
            </p>
          </div>
        ),
        placement: 'center',
      },
    ]);
  }, []);

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;

    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      onFinish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#1f2937',
          textColor: '#374151',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        },
        buttonNext: {
          backgroundColor: '#1f2937',
          color: '#ffffff',
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          fontSize: '0.875rem',
          fontWeight: '500',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: '0.5rem',
          fontSize: '0.875rem',
        },
        buttonSkip: {
          color: '#6b7280',
          fontSize: '0.875rem',
        },
        tooltip: {
          borderRadius: '0.75rem',
          padding: '1.25rem',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: '0.5rem 0',
        },
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}
