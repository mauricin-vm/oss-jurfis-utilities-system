'use client'

import { useState, useEffect } from 'react';

interface MediaModalProps {
  isOpen: boolean;
  type: string;
  url: string;
  onClose: () => void;
}

export function MediaModal({ isOpen, type, url, onClose }: MediaModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else if (isVisible) {
      // Aguardar a transição CSS antes de ocultar
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  const handleClose = () => {
    onClose();
  };

  // Se não está visível, não renderiza nada
  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-white bg-opacity-95
        transition-all duration-300 ease-out
        ${isOpen ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleClose}
    >
      <div
        className={`
          relative w-full h-full flex items-center justify-center
          ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
        `}
      >
        <button
          className={`
            absolute -top-10 right-0 z-10 text-xl font-bold
            text-gray-800 hover:text-gray-600
            transition-all duration-200 hover:scale-110
            ${isOpen ? 'opacity-100' : 'opacity-0'}
          `}
          onClick={handleClose}
        >
          ✕
        </button>

        {type === 'image' && (
          <img
            src={url}
            alt="Imagem ampliada"
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {type === 'sticker' && (
          <img
            src={url}
            alt="Sticker ampliado"
            className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        )}

        {type === 'video' && (
          <video
            src={url}
            controls
            className="min-w-[600px] min-h-[500px] max-w-[80vw] max-h-[80vh] rounded-lg shadow-lg"
            onClick={(e) => e.stopPropagation()}
            autoPlay
          />
        )}
      </div>
    </div>
  );
}