'use client'

import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { Meeting, MeetingFormData } from '../types';
import { formatPhoneForDisplay, formatPhoneToRaw, formatPhoneToDatabase } from '@/lib/validations';

interface AdminModalProps {
  isOpen: boolean;
  meeting?: Meeting | null;
  onClose: () => void;
  onSave: (data: MeetingFormData) => void;
}

export function AdminModal({ isOpen, meeting, onClose, onSave }: AdminModalProps) {
  const { apiFetch } = useApi();
  const [formData, setFormData] = useState<MeetingFormData>({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    requestedBy: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [isClosing, setIsClosing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setShouldAnimate(false);
      // Pequeno delay para permitir a animação de entrada
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldAnimate(true);
        });
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title,
        date: new Date(meeting.date).toISOString().split('T')[0],
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        requestedBy: meeting.requestedBy || '',
        email: meeting.email || '',
        phone: meeting.phone || '',
        notes: meeting.notes || ''
      });
    } else {
      setFormData({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        requestedBy: '',
        email: '',
        phone: '',
        notes: ''
      });
    }
  }, [meeting, isOpen]);

  const handleClose = () => {
    if (isSubmitting) return; // Não permite fechar enquanto está enviando
    setIsClosing(true);
    setShouldAnimate(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  // Handler para formatar telefone enquanto digita
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const onlyNumbers = formatPhoneToRaw(value);
    const formatted = formatPhoneForDisplay(onlyNumbers);

    // Atualizar o campo com valor formatado para visualização
    e.target.value = formatted;

    // Salvar apenas números no estado
    setFormData({ ...formData, phone: onlyNumbers });
  };

  // Handler para finalizar formatação do telefone
  const handlePhoneBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const onlyNumbers = formatPhoneToRaw(value);

    // Converter para formato do banco com DDD padrão 67
    const result = formatPhoneToDatabase(onlyNumbers, '67');

    if (result.formated) {
      // Exibir formatado
      const formatted = formatPhoneForDisplay(result.phone || '');
      e.target.value = formatted;
      // Salvar apenas números no estado
      setFormData({ ...formData, phone: result.phone || '' });
    } else {
      // Se falhou a validação, manter o valor digitado
      const formatted = formatPhoneForDisplay(onlyNumbers);
      e.target.value = formatted;
      setFormData({ ...formData, phone: onlyNumbers });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de campos obrigatórios
    if (!formData.title.trim()) {
      toast.warning('Título é obrigatório');
      return;
    }

    if (!formData.date) {
      toast.warning('Data é obrigatória');
      return;
    }

    if (!formData.startTime) {
      toast.warning('Horário inicial é obrigatório');
      return;
    }

    if (!formData.endTime) {
      toast.warning('Horário final é obrigatório');
      return;
    }

    // Validação de email (apenas se preenchido)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.warning('Email inválido');
        return;
      }
    }

    // Validação de telefone (apenas se preenchido)
    if (formData.phone.trim()) {
      const phoneResult = formatPhoneToDatabase(formData.phone, '67');
      if (!phoneResult.formated) {
        toast.warning(phoneResult.message || 'Telefone inválido');
        return;
      }
    }

    // Validação de horários
    if (formData.startTime >= formData.endTime) {
      toast.warning('Horário final deve ser posterior ao inicial');
      return;
    }

    setIsSubmitting(true);

    try {
      // Verificar conflito de horário (excluindo a reunião atual se for edição)
      const conflictResponse = await apiFetch('/api/meetings/check-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          excludeMeetingId: meeting?.id // Excluir a reunião atual ao editar
        })
      });

      const conflictData = await conflictResponse.json();

      if (conflictData.hasConflict) {
        toast.warning(conflictData.message || 'Já existe uma reunião agendada neste horário. Por favor, escolha outro horário.');
        setIsSubmitting(false);
        return;
      }

      // Se não há conflito, prosseguir
      onSave(formData);
    } catch (error) {
      console.error('Erro ao verificar conflito:', error);
      toast.error('Erro ao verificar disponibilidade');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 pt-16 transition-opacity duration-200 ${isClosing ? 'opacity-0' : shouldAnimate ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : shouldAnimate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {meeting ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">Sala Alberto Kalachi (CAC, 4° andar, sala 4)</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Título <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                placeholder="Ex: Reunião de Planejamento"
                disabled={isSubmitting}
              />
            </div>

            {/* Data e Horários */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Início <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Término <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Nome do Solicitante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nome do Solicitante
              </label>
              <input
                type="text"
                value={formData.requestedBy}
                onChange={(e) => setFormData({ ...formData, requestedBy: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                placeholder="Seu nome completo"
                disabled={isSubmitting}
              />
            </div>

            {/* Email e Telefone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                  placeholder="seu@email.com"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefone
                </label>
                <input
                  type="tel"
                  defaultValue={formatPhoneForDisplay(formData.phone)}
                  onChange={handlePhoneChange}
                  onBlur={handlePhoneBlur}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                  placeholder="(67) 00000-0000"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Observações
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors resize-none"
                rows={3}
                placeholder="Informações adicionais sobre a reunião"
                disabled={isSubmitting}
              />
            </div>

            {/* Informação */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 mb-1">Informação</p>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {meeting
                    ? 'Ao atualizar o agendamento, se houver email cadastrado, uma notificação será enviada ao solicitante com as novas informações.'
                    : 'O agendamento será criado e confirmado imediatamente. Se houver email cadastrado, uma confirmação será enviada ao solicitante.'}
                </p>
              </div>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Verificando...' : meeting ? 'Atualizar Agendamento' : 'Criar Agendamento'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
