'use client'

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { OvertimeRecord, OvertimeFormData } from '../types';

interface EditRecordModalProps {
  isOpen: boolean;
  record: OvertimeRecord | null;
  onClose: () => void;
  onSave: (id: string, formData: OvertimeFormData) => Promise<void>;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function EditRecordModal({ isOpen, record, onClose, onSave }: EditRecordModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<OvertimeFormData>({
    month: 1,
    year: new Date().getFullYear(),
    extraHours: 0,
    lateHours: 0,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [keepExistingDocument, setKeepExistingDocument] = useState(true);
  const [extraHoursInput, setExtraHoursInput] = useState<string>('00:00');
  const [lateHoursInput, setLateHoursInput] = useState<string>('00:00');

  // Converter decimal para HH:MM
  const convertDecimalToTime = (decimal: number): string => {
    const isNegative = decimal < 0;
    const absDecimal = Math.abs(decimal);
    const hours = Math.floor(absDecimal);
    const minutes = Math.round((absDecimal - hours) * 60);
    return `${isNegative ? '-' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Converter HH:MM para decimal
  const convertTimeToDecimal = (time: string): number => {
    const parts = time.split(':');
    if (parts.length !== 2) return 0;

    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;

    return hours + (minutes / 60);
  };

  // Validar formato HH:MM
  const isValidTimeFormat = (time: string): boolean => {
    const regex = /^([0-9]{1,3}):([0-5][0-9])$/;
    return regex.test(time);
  };

  const handleExtraHoursChange = (value: string) => {
    setExtraHoursInput(value);
    if (isValidTimeFormat(value)) {
      setFormData({ ...formData, extraHours: convertTimeToDecimal(value) });
    }
  };

  const handleLateHoursChange = (value: string) => {
    setLateHoursInput(value);
    if (isValidTimeFormat(value)) {
      setFormData({ ...formData, lateHours: convertTimeToDecimal(value) });
    }
  };

  useEffect(() => {
    if (isOpen && record) {
      setIsClosing(false);
      setShouldAnimate(false);
      setFormData({
        month: record.month,
        year: record.year,
        extraHours: record.extraHours,
        lateHours: record.lateHours,
      });
      setExtraHoursInput(convertDecimalToTime(record.extraHours));
      setLateHoursInput(convertDecimalToTime(record.lateHours));
      setSelectedFile(null);
      setKeepExistingDocument(true);
      setIsSubmitting(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldAnimate(true);
        });
      });
    }
  }, [isOpen, record]);

  const handleClose = () => {
    if (isSubmitting) return;
    setIsClosing(true);
    setShouldAnimate(false);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }

      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Tipo de arquivo inválido. Use PDF, PNG ou JPG');
        return;
      }

      setSelectedFile(file);
      setKeepExistingDocument(false);
    }
  };

  const validateForm = (): boolean => {
    // Validar formato de horas extras
    if (!isValidTimeFormat(extraHoursInput)) {
      toast.warning('Formato inválido para Horas Extras. Use HH:MM (ex: 01:30)');
      return false;
    }

    // Validar formato de horas de atraso
    if (!isValidTimeFormat(lateHoursInput)) {
      toast.warning('Formato inválido para Horas de Atraso. Use HH:MM (ex: 00:15)');
      return false;
    }

    if (formData.extraHours < 0 || formData.lateHours < 0) {
      toast.warning('Horas não podem ser negativas');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!record || !validateForm()) return;

    setIsSubmitting(true);

    try {
      await onSave(record.id, {
        ...formData,
        document: selectedFile || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setIsSubmitting(false);
    }
  };

  // Calcular saldo com base nos inputs válidos
  const extraDecimal = isValidTimeFormat(extraHoursInput) ? convertTimeToDecimal(extraHoursInput) : 0;
  const lateDecimal = isValidTimeFormat(lateHoursInput) ? convertTimeToDecimal(lateHoursInput) : 0;
  const calculatedBalance = extraDecimal - lateDecimal;
  const balanceColor = calculatedBalance >= 0 ? 'text-green-600' : 'text-red-600';
  const balanceFormatted = convertDecimalToTime(calculatedBalance);

  if (!isOpen && !isClosing) return null;
  if (!record) return null;

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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Editar Registro</h2>
              <p className="text-sm text-gray-600 mt-1">Atualize as informações do registro mensal</p>
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
            {/* Mês/Ano (somente leitura) */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 mb-1">Período:</p>
              <p className="text-lg font-semibold text-gray-900">
                {monthNames[record.month - 1]} / {record.year}
              </p>
            </div>

            {/* Horas Extras e Atrasos */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Horas Extras <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={extraHoursInput}
                  onChange={(e) => handleExtraHoursChange(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                  placeholder="00:00"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Horas de Atraso <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lateHoursInput}
                  onChange={(e) => handleLateHoursChange(e.target.value)}
                  className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors"
                  placeholder="00:00"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Saldo Calculado */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 mb-1">Novo Saldo Mensal (calculado):</p>
              <p className={`text-2xl font-bold ${balanceColor}`}>
                {calculatedBalance >= 0 ? '+' : ''}{balanceFormatted}
              </p>
            </div>

            {/* Upload de Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Atualizar Folha de Ponto
              </label>

              {keepExistingDocument && record.documentPath && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-blue-900">Documento atual mantido</span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting}
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
                >
                  {selectedFile ? 'Trocar Arquivo' : 'Escolher Novo Arquivo'}
                </button>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate max-w-xs">{selectedFile.name}</span>
                    <span className="text-gray-500">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Formatos aceitos: PDF, PNG, JPG (máx. 10MB)
              </p>
            </div>

            {/* Botões */}
            <div className="flex justify-end gap-3 pt-4">
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
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
