'use client'

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ConcludeModalProps {
  isOpen: boolean;
  protocolNumber: string;
  protocolId: string;
  onClose: () => void;
  onConfirm: (type: 'CONCLUIDO' | 'ARQUIVADO', justification?: string) => Promise<void>;
}

export function ConcludeModal({ isOpen, protocolNumber, protocolId, onClose, onConfirm }: ConcludeModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedType, setSelectedType] = useState<'CONCLUIDO' | 'ARQUIVADO' | null>(null);
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setShouldAnimate(false);
      setIsSubmitting(false);
      setSelectedType(null);
      setJustification('');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldAnimate(true);
        });
      });
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isSubmitting) return;
    setIsClosing(true);
    setShouldAnimate(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleConfirm = async () => {
    if (!selectedType) {
      toast.error('Selecione uma opção');
      return;
    }

    if (selectedType === 'ARQUIVADO' && !justification.trim()) {
      toast.error('Justificativa é obrigatória para arquivamento');
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm(selectedType, justification.trim() || undefined);
      handleClose();
    } catch (error) {
      setIsSubmitting(false);
      // Erro será tratado pelo componente pai
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-start justify-center z-[60] p-4 pt-16 transition-opacity duration-200 ${isClosing ? 'opacity-0' : shouldAnimate ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl max-w-md w-full transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : shouldAnimate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Concluir Protocolo</h2>
              <p className="text-sm text-gray-600 mt-1">Protocolo {protocolNumber}</p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-5">
            {/* Opções */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Selecione o destino do protocolo:
              </p>

              {/* Opção 1: Concluído (vira Recurso) */}
              <div
                onClick={() => !isSubmitting && setSelectedType('CONCLUIDO')}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedType === 'CONCLUIDO'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedType === 'CONCLUIDO'
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                        }`}
                    >
                      {selectedType === 'CONCLUIDO' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Concluir como Recurso</p>
                    <p className="text-sm text-gray-600 mt-1">
                      O protocolo será convertido em recurso e receberá um número de recurso automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Opção 2: Arquivado (não vira Recurso) */}
              <div
                onClick={() => !isSubmitting && setSelectedType('ARQUIVADO')}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${selectedType === 'ARQUIVADO'
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center h-5">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedType === 'ARQUIVADO'
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300'
                        }`}
                    >
                      {selectedType === 'ARQUIVADO' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Apenas Arquivar</p>
                    <p className="text-sm text-gray-600 mt-1">
                      O protocolo será arquivado sem conversão em recurso. É necessário informar uma justificativa.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Campo de Justificativa (aparece se ARQUIVADO) */}
            {selectedType === 'ARQUIVADO' && (
              <div className="space-y-2">
                <label htmlFor="justification" className="block text-sm font-medium text-gray-700">
                  Justificativa <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Informe o motivo do arquivamento..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-400 transition-colors resize-none disabled:opacity-50 disabled:bg-gray-50"
                />
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isSubmitting || !selectedType}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
