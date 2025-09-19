'use client'

import { useRef, useEffect, useState, useCallback } from 'react';
import { Message } from '@/app/(routes)/chat/types/chat';
import { MessageBubble } from './message-bubble';

// Estilos CSS para o scrollbar customizado
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background-color: #f5f1eb;
    background-image: url("/chat/images/bg-chat.png");
    background-repeat: repeat;
    background-size: auto;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0, 0, 0, 0.5);
  }
  
  .custom-scrollbar {
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.3) #f5f1eb;
  }
`;

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

interface MessageListProps {
  messages: Message[];
  audioStates: AudioStates;
  onAudioPlay: (messageId: string, audioBase64: string) => void;
  onAudioProgress: (e: React.MouseEvent<HTMLDivElement>, messageId: string) => void;
  onMediaModal: (isOpen: boolean, type: string, url: string) => void;
  onAudioSpeedChange?: (messageId: string, speed: number) => void;
  profilePics?: Record<string, string | null>;
  onLoadMoreMessages?: () => void;
  hasMoreMessages?: boolean;
  isLoadingMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  isLoadingInitialMessages?: boolean;
  scrollToBottom?: boolean;
  chatId?: string; // ID do chat selecionado para detectar mudanças
}

export function MessageList({
  messages,
  audioStates,
  onAudioPlay,
  onAudioProgress,
  onMediaModal,
  onAudioSpeedChange,
  profilePics,
  onLoadMoreMessages,
  hasMoreMessages,
  isLoadingMessages,
  isLoadingOlderMessages,
  isLoadingInitialMessages,
  scrollToBottom,
  chatId
}: MessageListProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const endMessagesRef = useRef<HTMLDivElement>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [previousMessageCount, setPreviousMessageCount] = useState(0);
  const previousScrollHeight = useRef<number>(0);
  const previousScrollTop = useRef<number>(0);
  const shouldMaintainScrollPosition = useRef<boolean>(false);
  const lastLoadRequest = useRef<number>(0);
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(chatId);

  // Detectar mudança de chat e forçar scroll para baixo
  useEffect(() => {
    if (chatId !== currentChatId) {
      setCurrentChatId(chatId);
      setIsInitialLoad(true);
      setPreviousMessageCount(0);
      previousScrollHeight.current = 0;
      previousScrollTop.current = 0;
      shouldMaintainScrollPosition.current = false;
      lastLoadRequest.current = 0;
      
      // Forçar scroll para baixo imediatamente quando mudamos de chat
      if (messagesContainerRef.current && endMessagesRef.current) {
        setTimeout(() => {
          if (endMessagesRef.current) {
            endMessagesRef.current.scrollIntoView({ behavior: 'instant' });
          }
        }, 50); // Pequeno delay para garantir que o DOM foi atualizado
      }
    }
  }, [chatId, currentChatId]);

  // Salvar posição do scroll antes de carregar mensagens antigas
  useEffect(() => {
    if (isLoadingOlderMessages && messagesContainerRef.current && !shouldMaintainScrollPosition.current) {
      const container = messagesContainerRef.current;

      // Esperar um frame para garantir que o scroll está estável
      requestAnimationFrame(() => {
        previousScrollHeight.current = container.scrollHeight;
        previousScrollTop.current = container.scrollTop;
        shouldMaintainScrollPosition.current = true;
      });

      // Timeout de segurança para resetar a flag caso algo dê errado
      setTimeout(() => {
        if (shouldMaintainScrollPosition.current) {
          shouldMaintainScrollPosition.current = false;
        }
      }, 5000);
    }
  }, [isLoadingOlderMessages]);

  // Scroll automático para o final quando mensagens carregarem/mudarem
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      const container = messagesContainerRef.current;

      // Detectar se é carregamento inicial, nova mensagem ou mensagens antigas
      const isNewMessage = messages.length > previousMessageCount && !isInitialLoad && !shouldMaintainScrollPosition.current;
      const isOlderMessagesLoaded = shouldMaintainScrollPosition.current;

      if (isInitialLoad) {
        // Carregamento inicial - ir para o final com múltiplas tentativas
        const scrollToEnd = () => {
          if (endMessagesRef.current) {
            endMessagesRef.current.scrollIntoView({ behavior: 'instant' });
            
            // Verificar se chegou ao final, se não, tentar novamente
            setTimeout(() => {
              const container = messagesContainerRef.current;
              if (container && endMessagesRef.current) {
                const isAtBottom = container.scrollTop >= container.scrollHeight - container.clientHeight - 10;
                if (!isAtBottom) {
                  endMessagesRef.current.scrollIntoView({ behavior: 'instant' });
                }
              }
            }, 100);
          }
        };
        
        // Usar requestAnimationFrame para garantir que o DOM foi totalmente renderizado
        requestAnimationFrame(() => {
          requestAnimationFrame(scrollToEnd);
        });
        
        setIsInitialLoad(false);
      } else if (isOlderMessagesLoaded) {
        // Mensagens antigas carregadas - manter posição visual com múltiplas tentativas
        const adjustScroll = () => {
          const newScrollHeight = container.scrollHeight;
          const heightDifference = newScrollHeight - previousScrollHeight.current;

          // Verificar se realmente precisa ajustar - só se houve mudança no height
          if (heightDifference > 0) {
            const newScrollTop = previousScrollTop.current + heightDifference;

            // Garantir que o scroll não vá para baixo demais
            const maxScrollTop = newScrollHeight - container.clientHeight;
            const finalScrollTop = Math.min(Math.max(newScrollTop, 0), maxScrollTop);

            container.scrollTop = finalScrollTop;

            // Verificar se o ajuste funcionou, se não, tentar novamente
            setTimeout(() => {
              const currentScrollTop = container.scrollTop;
              const expectedScrollTop = finalScrollTop;
              const tolerance = 10; // 10px de tolerância

              if (Math.abs(currentScrollTop - expectedScrollTop) > tolerance) {
                container.scrollTop = expectedScrollTop;
              }

              // Garantir que a flag seja resetada após o ajuste
              setTimeout(() => {
                shouldMaintainScrollPosition.current = false;
              }, 100);
            }, 50);

          } else {
            // Reset flag imediatamente se não houve ajuste
            shouldMaintainScrollPosition.current = false;
          }
        };

        // Usar requestAnimationFrame duplo para garantir que o DOM foi atualizado
        requestAnimationFrame(() => {
          requestAnimationFrame(adjustScroll);
        });
      } else if (isNewMessage || scrollToBottom) {
        // Nova mensagem ou forçar scroll para baixo
        const isNearBottom = container.scrollTop >= container.scrollHeight - container.clientHeight - 100;

        if ((isNearBottom || scrollToBottom) && endMessagesRef.current) {
          // Para mensagens forçadas (scrollToBottom), usar múltiplas tentativas para garantir scroll
          if (scrollToBottom) {
            // Primeira tentativa imediata
            endMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
            
            // Segunda tentativa após o DOM estar completamente renderizado
            setTimeout(() => {
              if (endMessagesRef.current) {
                endMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 150);
          } else {
            // Para mensagens normais próximas ao final, scroll simples
            endMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }

      setPreviousMessageCount(messages.length);
    }
  }, [messages, isInitialLoad, previousMessageCount, scrollToBottom]);

  // Reset quando muda de chat (mensagens são limpas)
  useEffect(() => {
    if (messages.length === 0) {
      setIsInitialLoad(true);
      setPreviousMessageCount(0);
      previousScrollHeight.current = 0;
      previousScrollTop.current = 0;
      shouldMaintainScrollPosition.current = false;
      lastLoadRequest.current = 0;
    }
  }, [messages.length]);

  // Função para detectar scroll no topo e carregar mais mensagens
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    // Condições básicas para carregar mensagens antigas
    const isNearTop = scrollTop <= 100; // Aumentei a área de detecção
    const canLoadMore = hasMoreMessages && onLoadMoreMessages && !isLoadingMessages && !isInitialLoad;

    // Se chegou perto do topo e pode carregar mais
    if (isNearTop && canLoadMore) {
      const now = Date.now();
      const timeSinceLastLoad = now - lastLoadRequest.current;

      // Só aplicar throttle se a última requisição foi muito recente (menos de 300ms)
      if (timeSinceLastLoad < 300) {
        return;
      }

      lastLoadRequest.current = now;
      onLoadMoreMessages();
    }
  }, [hasMoreMessages, isLoadingMessages, onLoadMoreMessages, isInitialLoad]);

  return (
    <>
      {/* Injetar estilos CSS do scrollbar */}
      <style dangerouslySetInnerHTML={{ __html: scrollbarStyles }} />

      <div
        ref={messagesContainerRef}
        className="absolute inset-0 overflow-y-auto p-4 custom-scrollbar"
        onScroll={handleScroll}
        style={{
          paddingBottom: '65px'
        }}
      >
        <div className="relative space-y-4" style={{ zIndex: 1 }}>
          {/* Loading inicial das mensagens quando nenhuma mensagem está carregada */}
          {isLoadingInitialMessages && messages.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-3 text-gray-500">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Carregando mensagens...</span>
              </div>
            </div>
          )}

          {/* Indicador de carregamento no topo para mensagens antigas - só mostra se não for loading inicial */}
          {!isLoadingInitialMessages && isLoadingMessages && hasMoreMessages && (
            <div className="flex justify-center py-4">
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm">Carregando mensagens antigas...</span>
              </div>
            </div>
          )}

          {messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              audioStates={audioStates}
              onAudioPlay={onAudioPlay}
              onAudioProgress={onAudioProgress}
              onMediaModal={onMediaModal}
              onAudioSpeedChange={onAudioSpeedChange}
              profilePics={profilePics}
              selectedChatId={chatId}
            />
          ))}
          <div ref={endMessagesRef} />
        </div>
      </div>
    </>
  );
}