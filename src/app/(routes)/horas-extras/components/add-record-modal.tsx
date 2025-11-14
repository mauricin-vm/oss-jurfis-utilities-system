'use client'

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { HelpCircle } from 'lucide-react';
import { OvertimeFormData } from '../types';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: OvertimeFormData) => Promise<void>;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function AddRecordModal({ isOpen, onClose, onSave }: AddRecordModalProps) {

  const [isClosing, setIsClosing] = useState(false);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<OvertimeFormData>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    extraHours: 0,
    lateHours: 0,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extraHoursInput, setExtraHoursInput] = useState<string>('00:00');
  const [lateHoursInput, setLateHoursInput] = useState<string>('00:00');

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setShouldAnimate(false);
      setFormData({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        extraHours: 0,
        lateHours: 0,
      });
      setSelectedFile(null);
      setExtraHoursInput('00:00');
      setLateHoursInput('00:00');
      setIsSubmitting(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setShouldAnimate(true);
        });
      });
    }
  }, [isOpen]);

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
      // Validar tamanho (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.warning('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }

      // Validar tipo
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.warning('Tipo de arquivo inválido. Use PDF, PNG ou JPG');
        return;
      }

      setSelectedFile(file);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.month || !formData.year) {
      toast.warning('Mês e ano são obrigatórios');
      return false;
    }

    // Verificar se não é mês futuro
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (formData.year > currentYear || (formData.year === currentYear && formData.month > currentMonth)) {
      toast.warning('Não é possível adicionar registros de meses futuros');
      return false;
    }

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

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      await onSave({
        ...formData,
        document: selectedFile || undefined,
      });
      handleClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setIsSubmitting(false);
    }
  };

  // Converter decimal para HH:MM
  const convertDecimalToTime = (decimal: number): string => {
    const isNegative = decimal < 0;
    const absDecimal = Math.abs(decimal);
    const hours = Math.floor(absDecimal);
    const minutes = Math.round((absDecimal - hours) * 60);
    return `${isNegative ? '-' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Calcular saldo com base nos inputs válidos
  const extraDecimal = isValidTimeFormat(extraHoursInput) ? convertTimeToDecimal(extraHoursInput) : 0;
  const lateDecimal = isValidTimeFormat(lateHoursInput) ? convertTimeToDecimal(lateHoursInput) : 0;
  const calculatedBalance = extraDecimal - lateDecimal;
  const balanceColor = calculatedBalance >= 0 ? 'text-green-600' : 'text-red-600';
  const balanceFormatted = convertDecimalToTime(calculatedBalance);

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
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Novo Registro Mensal
                <TooltipWrapper content="O saldo é calculado automaticamente: Horas Extras - Horas de Atraso = Saldo do Mês">
                  <HelpCircle className="h-5 w-5 text-gray-400 cursor-help" />
                </TooltipWrapper>
              </h2>
              <p className="text-sm text-gray-600 mt-1">Registre suas horas extras e atrasos do mês</p>
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
            {/* Mês e Ano */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mês <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.month.toString()}
                  onValueChange={(value) => setFormData({ ...formData, month: Number(value) })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {monthNames.map((name, index) => (
                      <SelectItem
                        key={index + 1}
                        value={(index + 1).toString()}
                        className="cursor-pointer"
                      >
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ano <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.year.toString()}
                  onValueChange={(value) => setFormData({ ...formData, year: Number(value) })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    {Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <SelectItem
                        key={year}
                        value={year.toString()}
                        className="cursor-pointer"
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                  autoComplete="off"
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
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Saldo Calculado */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 mb-1">Saldo Mensal (calculado):</p>
              <p className={`text-2xl font-bold ${balanceColor}`}>
                {calculatedBalance >= 0 ? '+' : ''}{balanceFormatted}
              </p>
            </div>

            {/* Upload de Documento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Folha de Ponto
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
                disabled={isSubmitting}
                autoComplete="off"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
                >
                  Escolher Arquivo
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
                {isSubmitting ? 'Salvando...' : 'Salvar Registro'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
