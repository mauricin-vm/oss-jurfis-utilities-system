'use client'

import { useState } from 'react';
import { X, Rocket, BookOpen, Calendar, FileStack, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTour?: () => void;
  userName?: string;
}

export function OnboardingModal({ isOpen, onClose, onStartTour, userName }: OnboardingModalProps) {
  if (!isOpen) return null;

  const features = [
    {
      icon: FileStack,
      title: 'CCR - Controle de Recursos',
      description: 'Gerencie protocolos, recursos, tramitações e sessões de julgamento',
    },
    {
      icon: Calendar,
      title: 'Sistema de Calendário',
      description: 'Agende reuniões na Sala Alberto Kalachi de forma simples',
    },
    {
      icon: BookOpen,
      title: 'Central de Ajuda',
      description: 'FAQs, glossário e guias para te auxiliar no uso do sistema',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="relative p-8 pb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-b">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600">
              <Rocket className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Bem-vindo{userName ? `, ${userName}` : ''}!
              </h2>
              <p className="text-gray-600 mt-1">
                Vamos conhecer o Sistema JURFIS
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-gray-700 leading-relaxed mb-8">
            O Sistema JURFIS foi desenvolvido para facilitar a gestão de recursos fiscais e
            processos administrativos da Junta de Recursos Fiscais da SEFAZ. Aqui estão os
            principais recursos disponíveis:
          </p>

          {/* Features */}
          <div className="space-y-4 mb-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-white border border-gray-200 shrink-0">
                  <feature.icon className="w-6 h-6 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Help Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8">
            <div className="flex items-start gap-3">
              <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-blue-900 font-medium mb-1">
                  Precisa de ajuda?
                </p>
                <p className="text-sm text-blue-800 mb-3">
                  Acesse a Central de Ajuda a qualquer momento clicando no seu perfil e depois em "Ajuda".
                </p>
                <Link
                  href="/ajuda"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Ir para a Central de Ajuda →
                </Link>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {onStartTour && (
              <Button
                onClick={() => {
                  onClose();
                  onStartTour();
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 cursor-pointer"
              >
                <PlayCircle className="w-5 h-5" />
                Fazer Tour Guiado
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1 cursor-pointer"
            >
              Começar a Usar
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-4">
            Você pode refazer este tour a qualquer momento pela Central de Ajuda
          </p>
        </div>
      </div>
    </div>
  );
}
