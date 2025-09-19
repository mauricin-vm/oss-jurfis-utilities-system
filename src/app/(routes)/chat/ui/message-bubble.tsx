'use client'

import { useCallback, useState, useRef, useEffect } from 'react';
import { Message } from '@/app/(routes)/chat/types/chat';
import { HiOutlineClock, HiOutlinePlay, HiOutlineZoomIn, HiOutlineDownload, HiOutlineUser } from 'react-icons/hi';
import { FaRegFilePdf, FaRegFileExcel, FaRegFileWord, FaRegFilePowerpoint, FaRegFileImage, FaRegFileAlt, FaRegFileVideo, FaRegFileArchive, FaRegFileAudio, FaRegFile } from 'react-icons/fa';
import { MdFileDownload } from "react-icons/md";

import { HiOutlineChatBubbleLeftEllipsis } from 'react-icons/hi2';

import { BsCheckLg, BsCheckAll } from 'react-icons/bs';
import { GifPlayer } from './gif-player';
import { FaPlay, FaPause } from 'react-icons/fa';
import { HiMicrophone } from 'react-icons/hi2';
import { IoSpeedometer } from 'react-icons/io5';
import { cn } from '@/lib/utils';

interface AudioStates {
  [key: string]: {
    isPlaying: boolean;
    progress: number;
    audio?: HTMLAudioElement;
    playbackRate?: number;
    currentTime?: number;
    duration?: number;
    hasStartedOnce?: boolean;
  };
}

interface MessageBubbleProps {
  message: Message;
  audioStates: AudioStates;
  onAudioPlay: (messageId: string, audioBase64: string) => void;
  onAudioProgress: (e: React.MouseEvent<HTMLDivElement>, messageId: string) => void;
  onMediaModal: (isOpen: boolean, type: string, url: string) => void;
  onAudioSpeedChange?: (messageId: string, speed: number) => void;
  profilePics?: Record<string, string | null>;
  selectedChatId?: string;
}

export function MessageBubble({
  message,
  audioStates,
  onAudioPlay,
  onAudioProgress,
  onMediaModal,
  onAudioSpeedChange,
  profilePics,
  selectedChatId
}: MessageBubbleProps) {
  const formatWhatsAppMessage = (text: string) => {
    return text
      .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/~(.*?)~/g, '<del>$1</del>')
      .replace(/\n/g, '<br>')
      .replace(/(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>'
      );
  };

  const getMessageStatus = (message: any) => {
    switch (message.ack) {
      case 0:
        return <HiOutlineClock className="text-gray-400 h-[0.8rem] w-[0.8rem] text-xs" />;
      case 1:
        return <BsCheckLg className="text-gray-400 h-[0.8rem] w-[0.8rem] text-xs" />;
      case 2:
        return <BsCheckAll className="text-gray-400 w-4 h-4 text-xs" />;
      case 3:
        return <BsCheckAll className="text-blue-500 w-4 h-4 text-xs" />;
      default:
        return <BsCheckLg className="text-gray-400 h-[0.8rem] w-[0.8rem] text-xs" />;
    }
  };

  const formatAudioTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const createWaveformBars = (progress: number, isFromMe: boolean, messageId: string) => {
    const bars = [];
    const barCount = 40;
    const progressBarIndex = Math.floor((progress / 100) * barCount);

    // Gerar padrão consistente baseado no ID da mensagem
    const generateStaticPattern = (messageId: string, index: number) => {
      // Usar hash simples do messageId + index para consistência
      const hash = messageId.split('').reduce((acc, char, i) => {
        return acc + char.charCodeAt(0) * (i + 1) + index;
      }, 0);

      // Simular padrões de áudio reais com variações mais naturais
      const baseIntensity = Math.sin((hash % 100) / 100 * Math.PI * 2);
      const variation = Math.sin((hash % 50) / 50 * Math.PI * 4) * 0.3;
      const noise = ((hash % 30) / 30) * 0.2;

      // Normalizar para valores entre 0.2 e 1
      const intensity = Math.abs(baseIntensity + variation + noise);
      return Math.max(0.2, Math.min(1, intensity * 0.8 + 0.2));
    };

    for (let i = 0; i < barCount; i++) {
      const height = generateStaticPattern(messageId, i);
      const isPlayed = i <= progressBarIndex;

      // Cores consistentes com o tema das mensagens
      const baseColor = isFromMe
        ? (isPlayed ? 'text-gray-700' : 'text-gray-400')
        : (isPlayed ? 'text-gray-600' : 'text-gray-300');

      bars.push(
        <div
          key={i}
          className={`${baseColor} rounded-sm flex-shrink-0`}
          style={{
            width: '2px', // Aumentado de 2px para 3px
            height: `${height * 100}%`,
            backgroundColor: 'currentColor'
          }}
        />
      );
    }
    return bars;
  };

  const formatMessageTime = (timestamp: string | number) => {
    // Verificar se o timestamp é válido
    if (!timestamp || isNaN(timestamp as number)) {
      return '';
    }

    // Converter para número se necessário
    const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;

    // Verificar se é um timestamp válido
    if (isNaN(numTimestamp) || numTimestamp <= 0) {
      return '';
    }

    // Verificar se timestamp está em segundos ou milissegundos
    const timestampMs = numTimestamp.toString().length === 10 ? numTimestamp * 1000 : numTimestamp;
    const messageDate = new Date(timestampMs);

    // Verificar se a data é válida
    if (isNaN(messageDate.getTime())) {
      return '';
    }

    const today = new Date();

    // Resetar as horas para comparar apenas as datas
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Calcular ontem
    const yesterday = new Date(todayDay);
    yesterday.setDate(yesterday.getDate() - 1);

    // Se for de outro ano, mostra ano, mês, dia e hora
    return messageDate.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMedia = useCallback((message: any) => {
    const messageContent = message as any;

    // Verificar se tem body válido
    if (!messageContent.body) {
      return (
        <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg">
          <span className="text-gray-500 text-sm">Carregando mídia...</span>
        </div>
      );
    }

    // se for vídeo
    if (messageContent.type === 'video') {

      // Verificar se é GIF
      if (messageContent.isGif) {
        return (
          <GifPlayer
            src={`data:video/mp4;base64,${messageContent.body}`}
            alt="GIF"
            className={cn('cursor-pointer w-[360px]')}
            onModalOpen={() => {
              onMediaModal(true, 'video', `data:video/mp4;base64,${messageContent.body}`);
            }}
          />
        );
      }

      return (
        <div
          className={cn('relative cursor-pointer w-[360px]')}
          onClick={() => {
            onMediaModal(true, 'video', `data:video/mp4;base64,${messageContent.body}`);
          }}
        >
          <video
            src={`data:video/mp4;base64,${messageContent.body}`}
            className={cn('w-full h-full max-h-[360px] object-cover rounded-lg brightness-75')}
            autoPlay={false}
            muted
          />

          {/* Círculo com ícone de play */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="bg-black/20 rounded-full w-20 h-20 flex items-center justify-center cursor-pointer transition-colors shadow-lg">
              <FaPlay className="w-6 h-6 text-white ml-1" />
            </div>
          </div>
        </div>
      );
    }

    // se for imagem (mas não sticker)
    if ((messageContent.mimetype?.includes('image') || messageContent.type === 'image') && messageContent.type !== 'sticker') {
      return (
        <div
          className={cn('flex flex-col items-center justify-center cursor-pointer w-[360px]')}
          onClick={() => {
            onMediaModal(true, 'image', `data:${messageContent.mimetype || 'image/jpeg'};base64,${messageContent.body}`);
          }}
        >
          <img
            src={`data:${messageContent.mimetype || 'image/jpeg'};base64,${messageContent.body}`}
            loading="lazy"
            alt={messageContent.caption || 'Imagem'}
            className={cn('w-full h-full max-h-[360px] | object-cover rounded-lg')}
            onError={(e) => {
              console.error('Erro ao carregar imagem:', messageContent);
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // se for documento
    if (messageContent.type === 'document') {
      const handleDownload = (dataUri: string) => {
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = messageContent.caption || 'documento';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // Função para obter informações do arquivo
      const getFileInfo = () => {
        // Debug: vamos ver que campos estão disponíveis
        console.log('messageContent para documento:', messageContent);

        const fileName = messageContent.caption || (messageContent as any)?.filename || (messageContent as any)?.fileName || (messageContent as any)?.name || 'documento';
        const mimeType = messageContent.mimetype || 'application/octet-stream';

        // Calcular tamanho aproximado do arquivo (base64 para bytes)
        const base64Length = messageContent.body?.length || 0;
        const fileSizeBytes = Math.floor((base64Length * 3) / 4);

        const formatFileSize = (bytes: number) => {
          if (bytes === 0) return '0 B';
          const k = 1024;
          const sizes = ['B', 'KB', 'MB', 'GB'];
          const i = Math.floor(Math.log(bytes) / Math.log(k));
          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        };

        // Determinar tipo de arquivo e ícone
        const getFileInfo = (mime: string) => {
          if (mime.includes('pdf')) return { type: 'PDF', icon: FaRegFilePdf, color: 'bg-red-500 text-white' };
          if (mime.includes('word') || mime.includes('msword')) return { type: 'Word', icon: FaRegFileWord, color: 'bg-blue-500 text-white' };
          if (mime.includes('excel') || mime.includes('spreadsheet')) return { type: 'Excel', icon: FaRegFileExcel, color: 'bg-green-500 text-white' };
          if (mime.includes('powerpoint') || mime.includes('presentation')) return { type: 'PowerPoint', icon: FaRegFilePowerpoint, color: 'bg-orange-500 text-white' };
          if (mime.includes('text')) return { type: 'Texto', icon: FaRegFileAlt, color: 'bg-gray-500 text-white' };
          if (mime.includes('image')) return { type: 'Imagem', icon: FaRegFileImage, color: 'bg-purple-500 text-white' };
          if (mime.includes('video')) return { type: 'Vídeo', icon: FaRegFileVideo, color: 'bg-pink-500 text-white' };
          if (mime.includes('audio')) return { type: 'Áudio', icon: FaRegFileAudio, color: 'bg-yellow-500 text-white' };
          if (mime.includes('zip') || mime.includes('rar') || mime.includes('archive')) return { type: 'Arquivo', icon: FaRegFileArchive, color: 'bg-indigo-500 text-white' };
          return { type: 'Documento', icon: FaRegFile, color: 'bg-gray-500 text-white' };
        };

        const typeInfo = getFileInfo(mimeType);

        return {
          fileName,
          fileSize: formatFileSize(fileSizeBytes),
          fileType: typeInfo.type,
          fileIcon: typeInfo.icon,
          fileColor: typeInfo.color,
          mimeType
        };
      };

      const fileInfo = getFileInfo();

      return (
        <div className="w-85">
          {/* Card do documento */}
          <div
            className={cn(
              'bg-gray-50 hover:bg-gray-100 rounded-lg p-4 cursor-pointer transition-colors',
              'border border-gray-300 shadow-sm'
            )}
            onClick={() => handleDownload(`data:${fileInfo.mimeType};base64,${messageContent.body}`)}
          >
            <div className="flex items-center gap-3">
              {/* Ícone do documento à esquerda */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${fileInfo.fileColor}`}>
                <fileInfo.fileIcon className="w-6 h-6" />
              </div>

              {/* Informações do arquivo no centro */}
              <div className="flex-1 min-w-0">
                {/* Nome do arquivo */}
                <div className="text-gray-800 text-sm font-medium mb-1 break-words">
                  {fileInfo.fileName}
                </div>

                {/* Informações técnicas */}
                <div className="text-gray-600 text-xs flex gap-2">
                  <span>{fileInfo.fileType}</span>
                  <span>•</span>
                  <span>{fileInfo.fileSize}</span>
                </div>
              </div>

              {/* Ícone de download à direita */}
              <div className="flex-shrink-0 mx-2">
                <div className="w-8 h-8 rounded-full border border-gray-400 flex items-center justify-center">
                  <MdFileDownload className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // se for áudio
    if (messageContent.type === 'ptt') {
      const audioState = audioStates[messageContent.id];
      const currentSpeed = audioState?.playbackRate || 1;
      const currentTime = audioState?.currentTime || 0;
      const duration = audioState?.duration || 0;
      const hasStarted = audioState?.hasStartedOnce || false;

      const speedOptions = [1, 1.5, 2, 0.5];

      const onClickAudio = (messageId: string, audioBase64: string) => {
        onAudioPlay(messageId, audioBase64);
      };

      const onClickSetAudioProgress = (e: React.MouseEvent<HTMLDivElement>, messageId: string) => {
        onAudioProgress(e, messageId);
      };

      const onSpeedCycle = () => {
        if (onAudioSpeedChange) {
          const currentIndex = speedOptions.indexOf(currentSpeed);
          const nextIndex = (currentIndex + 1) % speedOptions.length;
          const nextSpeed = speedOptions[nextIndex];
          onAudioSpeedChange(messageContent.id, nextSpeed);
        }
      };

      // Obter foto de perfil
      const getProfileImage = () => {
        if (message.fromMe) {
          // Para mensagens próprias - pode usar uma foto padrão ou do usuário logado
          return null;
        } else {
          // Para mensagens de outros - usar foto do chat
          return selectedChatId && profilePics?.[selectedChatId] ? profilePics[selectedChatId] : null;
        }
      };

      const profileImage = getProfileImage();

      // Layout para mensagens próprias
      if (message.fromMe) {
        return (
          <div className="flex items-stretch gap-3 w-full max-w-[500px] py-2">
            {/* Imagem de perfil com altura completa */}
            {!hasStarted ? (
              <div className="relative flex-shrink-0 h-full flex items-center">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Meu perfil"
                    className="w-[3rem] h-[3rem] rounded-full object-cover border border-gray-300"
                  />
                ) : (
                  <div className="w-[3rem] h-[3rem] bg-gray-50 border border-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    <span className="text-gray-600 text-sm font-semibold">Eu</span>
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 rounded-full p-1">
                  <HiMicrophone className="w-[1.2rem] h-[1.2rem] text-gray-900" />
                </div>
              </div>
            ) : (
              <button
                onClick={onSpeedCycle}
                className="w-12 h-12 rounded-full flex items-center justify-center text-gray-900 text-sm font-semibold transition-colors flex-shrink-0 hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: '#d9fdd3' }}
              >
                {currentSpeed}x
              </button>
            )}

            {/* Botão play/pause com altura completa */}
            <button
              className="flex items-center justify-center w-12 h-12 mx-1 rounded-full transition-colors flex-shrink-0 cursor-pointer"
              onClick={() => onClickAudio(messageContent.id, messageContent.body || '')}
            >
              {audioState?.isPlaying ? (
                <FaPause className="w-5 h-5 text-gray-600" />
              ) : (
                <FaPlay className="w-5 h-5 text-gray-600 ml-0.5" />
              )}
            </button>

            {/* Container do áudio centralizado */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {/* Waveform */}
              <div className="mb-2">
                <div
                  className="flex items-center justify-between w-full h-6 gap-0.5 cursor-pointer"
                  onClick={(e) => onClickSetAudioProgress(e, messageContent.id)}
                >
                  {createWaveformBars(audioState?.progress || 0, true, messageContent.id)}
                </div>
              </div>

              {/* Tempo e status */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-900 opacity-70">
                  {formatAudioTime(currentTime)}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-900 opacity-70">
                    {formatMessageTime(message.timestamp)}
                  </span>
                  {message.fromMe && getMessageStatus(message)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Layout para mensagens de outros
      return (
        <div className="flex items-stretch gap-3 w-full max-w-[500px] py-2">
          {/* Botão play/pause com altura completa */}
          <button
            className="flex items-center justify-center w-12 h-12 rounded-full transition-colors flex-shrink-0 cursor-pointer"
            onClick={() => onClickAudio(messageContent.id, messageContent.body || '')}
          >
            {audioState?.isPlaying ? (
              <FaPause className="w-5 h-5 text-gray-600" />
            ) : (
              <FaPlay className="w-5 h-5 text-gray-600 ml-0.5" />
            )}
          </button>

          {/* Container do áudio centralizado */}
          <div className="flex-1 min-w-0 ml-1 mr-2 flex flex-col justify-center">
            {/* Waveform */}
            <div className="mb-2">
              <div
                className="flex items-center justify-between h-6 gap-0.5 cursor-pointer"
                onClick={(e) => onClickSetAudioProgress(e, messageContent.id)}
              >
                {createWaveformBars(audioState?.progress || 0, false, messageContent.id)}
              </div>
            </div>

            {/* Tempo */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-900 opacity-70">
                {formatAudioTime(currentTime)}
              </span>
              <span className="text-xs text-gray-900 opacity-70">
                {formatMessageTime(message.timestamp)}
              </span>
            </div>
          </div>

          {/* Imagem de perfil com altura completa */}
          {!hasStarted ? (
            <div className="relative flex-shrink-0 h-full flex items-center">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Perfil do contato"
                  className="w-12 h-12 rounded-full object-cover border border-gray-300"
                />
              ) : (
                <div className="w-12 h-12 bg-gray-50 border border-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  <span className="text-gray-600 text-xs font-semibold">
                    {message.notifyName?.slice(0, 2) || '??'}
                  </span>
                </div>
              )}
              <div className="absolute -bottom-1 -left-1 rounded-full p-1">
                <HiMicrophone className="w-[1.2rem] h-[1.2rem] text-gray-900" />
              </div>
            </div>
          ) : (
            <button
              onClick={onSpeedCycle}
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-gray-900 text-sm font-semibold transition-colors flex-shrink-0 hover:opacity-80 cursor-pointer"
            >
              {currentSpeed}x
            </button>
          )}
        </div>
      );
    }

    // se for sticker
    if (messageContent.type === 'sticker') {
      // Para stickers do WhatsApp com formato especial, mostrar placeholder
      if (messageContent.mimetype === 'application/was') {
        return (
          <div
            className={cn('flex flex-col items-center justify-center | w-[160px] h-[160px] p-4 | bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800 dark:to-green-700 | rounded-2xl border-2 border-green-300 dark:border-green-600 | cursor-pointer')}
            onClick={() => {
              onMediaModal(true, 'sticker', `data:${messageContent.mimetype};base64,${messageContent.body}`);
            }}
          >
            <div className="text-5xl mb-2">🎭</div>
            <div className="text-xs text-green-700 dark:text-green-300 font-medium text-center">
              Sticker WhatsApp
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              (.was format)
            </div>
          </div>
        );
      }

      // Para outros tipos de sticker (webp, etc.)
      const mimeType = messageContent.mimetype || 'image/webp';
      const dataUrl = `data:${mimeType};base64,${messageContent.body}`;

      return (
        <div
          className={cn('flex flex-col items-center justify-center cursor-pointer w-[180px]')}
          onClick={() => {
            onMediaModal(true, 'sticker', dataUrl);
          }}
        >
          <img
            src={dataUrl}
            loading="lazy"
            alt="Sticker"
            className={cn('w-full h-full max-h-[180px] | object-cover rounded-lg')}
            onError={(e) => {
              console.error('Erro ao carregar sticker:', { mimetype: messageContent.mimetype, bodyLength: messageContent.body?.length });
              // Fallback para stickers que não carregam
              e.currentTarget.parentElement!.innerHTML = `
                <div class="flex flex-col items-center justify-center w-[180px] h-[180px] p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl border-2 border-gray-300 dark:border-gray-600 cursor-pointer">
                  <div class="text-4xl mb-2">🚫</div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Formato não suportado
                  </div>
                </div>
              `;
            }}
          />
        </div>
      );
    }

    // se for vcard
    if (messageContent.type === 'vcard') {
      return (
        <div className={cn('flex flex-col | min-w-[150px]')}>
          <div className={cn('flex items-center | gap-2 p-2 | bg-gray-600/30 dark:bg-gray-800/60 rounded-lg')}>
            <div className={cn('flex items-center justify-center | w-8 h-8 | bg-gray-700/40 dark:bg-gray-800/40 rounded-full')}>
              <HiOutlineUser className="w-5 h-5 text-white dark:text-gray-900" />
            </div>
            <span className={cn('text-white dark:text-gray-900 font-medium')}>
              {messageContent.vcardFormattedName}
            </span>
          </div>
          <button
            className={cn('flex items-center justify-center | w-full p-2 mt-1 gap-2 | bg-gray-600/30 hover:bg-gray-600/60 dark:bg-gray-800/80 dark:hover:bg-gray-800/40 rounded-lg transition')}
          // onClick={}
          >
            <HiOutlineChatBubbleLeftEllipsis className="w-5 h-5 text-white dark:text-gray-900" />
            <span className="text-sm text-white dark:text-gray-900">
              Iniciar Conversa
            </span>
          </button>
        </div>
      );
    }

    // se não for nenhum dos tipos de mensagem
    return null;
  }, [audioStates, onAudioPlay, onAudioProgress, onMediaModal]);

  // Para stickers, mostrar sem fundo padrão mas com timestamp/status embaixo
  if (message.type === 'sticker') {
    return (
      <div className={`flex flex-col ${message.fromMe ? 'items-end mr-[1.5rem]' : 'items-start ml-[1.5rem]'}`}>
        <div className="relative">
          {getMedia(message)}
          {/* Pequena caixa com fundo para timestamp e status */}
          <div className={`flex ${message.fromMe ? 'justify-end' : 'justify-end'} mt-1`}>
            <div
              className={`px-2 py-1 rounded-lg shadow-sm max-w-fit ${message.fromMe
                ? 'text-gray-900'
                : 'bg-white text-gray-900 border'
                }`}
              style={message.fromMe ? { backgroundColor: '#d9fdd3' } : {}}
            >
              <div className="flex items-center justify-end gap-1">
                <span className="text-xs opacity-70">
                  {formatMessageTime(message.timestamp)}
                </span>
                {message.fromMe && getMessageStatus(message)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${message.fromMe ? 'justify-end mr-[1.5rem]' : 'justify-start ml-[1.5rem]'}`}>
      <div
        className={`max-w-[70%] px-4 py-2 rounded-lg shadow-sm ${message.fromMe
          ? 'text-gray-900'
          : 'bg-white text-gray-900 border'
          }`}
        style={message.fromMe ? { backgroundColor: '#d9fdd3' } : {}}
      >
        {message.type && ['image', 'video', 'audio', 'ptt', 'document', 'vcard'].includes(message.type) ? (
          getMedia(message)
        ) : (
          <div
            className="text-sm break-words whitespace-pre-wrap overflow-hidden"
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
            dangerouslySetInnerHTML={{
              __html: formatWhatsAppMessage(message.content)
            }}
          />
        )}

        {/* Só mostrar timestamp se NÃO for mensagem de áudio (ptt), pois áudio já tem timestamp integrado */}
        {message.type !== 'ptt' && (
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className="text-xs opacity-70">
              {formatMessageTime(message.timestamp)}
            </span>
            {message.fromMe && getMessageStatus(message)}
          </div>
        )}
      </div>
    </div>
  );
}