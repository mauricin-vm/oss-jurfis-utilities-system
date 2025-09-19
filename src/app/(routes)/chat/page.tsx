'use client'

import { useRouter } from 'next/navigation';
import { ChatHeader } from '@/app/(routes)/chat/ui/chat-header';
import { MediaModal } from '@/app/(routes)/chat/ui/media-modal';
import { useSession } from 'next-auth/react';
import { ChatSidebar } from '@/app/(routes)/chat/ui/chat-sidebar';
import { MessageList } from '@/app/(routes)/chat/ui/message-list';
import { MessageInput } from '@/app/(routes)/chat/ui/message-input';
import { QRCodeDisplay } from '@/app/(routes)/chat/ui/qr-code-display';
import { useSocket } from '@/app/(routes)/chat/hooks/useSocket';
import { Chats, Message, widToString } from '@/app/(routes)/chat/types/chat';
import { useState, useEffect, useCallback, useRef } from 'react';

// Estados simplificados
interface LoadingState {
  isAuthenticated: boolean;
  areChatsLoaded: boolean;
  areInitialMessagesLoaded: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Socket como única fonte da verdade
  const {
    connectionState,
    newMessages,
    messageAcks,
    presenceState,
    getPresence,
    generateQRCode
  } = useSocket({ schema: process.env.NEXT_PUBLIC_WHATSAPP_SESSION_NAME || 'jurfis' });

  // Estados da aplicação
  const [chats, setChats] = useState<Chats[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [profilePics, setProfilePics] = useState<Record<string, string | null>>({});
  const [activeFilter, setActiveFilter] = useState('all');
  const [hasMoreChats, setHasMoreChats] = useState(true);
  const [selectedChat, setSelectedChat] = useState<{ chat: Chats, isOnline: string } | null>(null);
  const [chatPresenceStates, setChatPresenceStates] = useState<Record<string, string>>({});
  const [isLoadingMoreChats, setIsLoadingMoreChats] = useState(false);
  const [forceScrollToBottom, setForceScrollToBottom] = useState(false);

  // Ref para rastrear estado anterior de conexão
  const previousConnectionStatus = useRef<string>('checking');

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isAuthenticated: false,
    areChatsLoaded: false,
    areInitialMessagesLoaded: false
  });

  // Estados para mensagens
  const [messagesState, setMessagesState] = useState({
    lastMessageId: null as string | null,
    hasMoreMessages: true,
    isLoadingMessages: false,
    isLoadingOlderMessages: false
  });

  // Estados para mídia
  const [mediaModal, setMediaModal] = useState<{ isOpen: boolean, type: string, url: string }>({
    isOpen: false, type: '', url: ''
  });

  // Estados para áudio
  type AudioStates = {
    [key: string]: {
      isPlaying: boolean;
      progress: number;
      audio?: HTMLAudioElement;
      playbackRate?: number;
      currentTime?: number;
      duration?: number;
      hasStartedOnce?: boolean;
    }
  };
  const [audioStates, setAudioStates] = useState<AudioStates>({});

  // === AUTENTICAÇÃO ===
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) return router.push('/auth/signin');

    setLoadingState(prev => ({ ...prev, isAuthenticated: true }));
  }, [session, status, router]);

  // === CARREGAR CHATS COM RETRY ===
  const loadChats = useCallback(async (page = 1, append = false, attempt = 1) => {
    const maxAttempts = 3;
    const retryDelays = [0, 3000, 6000]; // 0s, 3s, 6s

    // Para carregamento inicial, só procede se status for 'connected'
    if (connectionState.status !== 'connected' && !append) {
      console.log('⚠️ Status não é "connected", cancelando carregamento de chats');
      return; // Não marca como carregado - mantém na tela de loading
    }

    try {
      if (page === 1 && attempt === 1) {
        setCurrentPage(1);
        setHasMoreChats(true);
      }
      if (page > 1) setIsLoadingMoreChats(true);

      console.log(`📡 Carregando chats da API (tentativa ${attempt}/${maxAttempts})...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`/api/chat/chats?page=${page}&limit=20`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();

      if (data.success) {
        if (append) {
          setChats(prev => [...prev, ...data.chats]);
        } else {
          setChats(data.chats);
          // IMPORTANTE: Só marca como carregado APÓS receber dados da API
          setLoadingState(prev => ({ ...prev, areChatsLoaded: true }));
          console.log(`✅ Chats carregados da API (${data.chats?.length || 0} chats), saindo do loading`);
        }
        setHasMoreChats(data.chats.length === 20 && page < data.totalPages);
        setCurrentPage(page);
      } else {
        console.error(`❌ API retornou erro (tentativa ${attempt}/${maxAttempts}):`, data.error);

        // Se não foi sucesso, tentar novamente
        if (attempt < maxAttempts) {
          const delay = retryDelays[attempt];
          console.log(`🔄 Tentando novamente em ${delay / 1000}s... (${attempt + 1}/${maxAttempts})`);
          setTimeout(() => {
            loadChats(page, append, attempt + 1);
          }, delay);
          return; // Não marcar como carregado ainda
        } else {
          console.error('❌ Todas as tentativas de carregar chats falharam');
          setChats([]);
          setLoadingState(prev => ({ ...prev, areChatsLoaded: true }));
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar chats (tentativa ${attempt}/${maxAttempts}):`, error);

      // Se houve erro de rede/timeout, tentar novamente
      if (attempt < maxAttempts) {
        const delay = retryDelays[attempt];
        console.log(`🔄 Erro de rede - tentando novamente em ${delay / 1000}s... (${attempt + 1}/${maxAttempts})`);
        setTimeout(() => {
          loadChats(page, append, attempt + 1);
        }, delay);
        return; // Não marcar como carregado ainda
      } else {
        console.error('❌ Todas as tentativas de carregar chats falharam por erro de rede');
        setChats([]);
        setLoadingState(prev => ({ ...prev, areChatsLoaded: true }));
      }
    } finally {
      if (page > 1) setIsLoadingMoreChats(false);
    }
  }, [connectionState.status]);

  // === FUNÇÃO PARA CARREGAR CHATS DIRETAMENTE (BYPASS STATUS) ===
  const loadChatsDirectly = useCallback(async (attempt = 1) => {
    const maxAttempts = 2;

    try {
      console.log(`📡 Carregando chats diretamente da API (fallback, tentativa ${attempt}/${maxAttempts})...`);
      const response = await fetch(`/api/chat/chats?page=1&limit=20`);
      const data = await response.json();

      if (data.success && data.chats) {
        setChats(data.chats);
        // IMPORTANTE: Só marca como carregado APÓS receber dados da API
        setLoadingState(prev => ({ ...prev, areChatsLoaded: true }));
        setHasMoreChats(data.chats.length === 20);
        setCurrentPage(1);
        console.log('✅ Chats carregados via fallback, saindo do loading');
      } else {
        console.error('❌ API fallback retornou erro:', data.error);

        // Tentar novamente se não foi sucesso
        if (attempt < maxAttempts) {
          console.log(`🔄 Tentando novamente em 3s... (${attempt + 1}/${maxAttempts})`);
          setTimeout(() => loadChatsDirectly(attempt + 1), 3000);
        } else {
          setChats([]);
          setLoadingState(prev => ({ ...prev, areChatsLoaded: true }));
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao carregar chats diretamente (tentativa ${attempt}):`, error);

      // Tentar novamente se houve erro de rede
      if (attempt < maxAttempts) {
        console.log(`🔄 Tentando novamente em 3s... (${attempt + 1}/${maxAttempts})`);
        setTimeout(() => loadChatsDirectly(attempt + 1), 3000);
      } else {
        setChats([]);
        setLoadingState(prev => ({ ...prev, areChatsLoaded: true }));
      }
    }
  }, []);

  // === FALLBACK PARA VERIFICAR STATUS INICIAL ===
  useEffect(() => {
    // Após autenticação, se socket ainda está 'checking' por muito tempo, usar API como fallback
    if (loadingState.isAuthenticated && connectionState.status === 'checking') {
      const timeoutId = setTimeout(async () => {
        try {
          const response = await fetch('/api/chat/status');

          if (response.ok) {
            const data = await response.json();

            if (data.success && data.connected) {
              // API confirma conectado - carregar chats diretamente
              await loadChatsDirectly();
            } else {
              // API indica não conectado - marcar como carregado para mostrar QR
              setLoadingState(prev => ({
                ...prev,
                areChatsLoaded: true
              }));
            }
          }
        } catch (error) {
          console.error('❌ Erro na verificação de status:', error);
          // Em caso de erro, sair do loading
          setLoadingState(prev => ({
            ...prev,
            areChatsLoaded: true
          }));
        }
      }, 5000); // Aumentado para 5s para dar tempo da API inicializar

      return () => clearTimeout(timeoutId);
    }
  }, [loadingState.isAuthenticated, connectionState.status, loadChatsDirectly]);

  // === GERENCIAR ESTADO DA CONEXÃO ===
  useEffect(() => {
    const currentStatus = connectionState.status;
    const previousStatus = previousConnectionStatus.current;


    // Quando conectado, resetar loading e carregar chats (com delay para sincronização)
    if (currentStatus === 'connected') {
      console.log('🎉 Estado mudou para CONNECTED - aguardando sincronização...');
      // Garantir que o estado de loading está correto para permitir carregamento
      setLoadingState(prev => ({
        ...prev,
        areChatsLoaded: false // Resetar para forçar carregamento
      }));

      // Aguardar 2s para dar tempo do wppconnect-server sincronizar completamente
      setTimeout(() => {
        console.log('🚀 Iniciando carregamento de chats após sincronização...');
        loadChats();
      }, 2000);
    }
    // Quando desconectado, limpar dados
    else if (currentStatus === 'server_offline' || currentStatus === 'qr_required') {
      setChats([]);
      setMessages([]);
      setSelectedChat(null);
      setLoadingState(prev => ({
        ...prev,
        areChatsLoaded: true,
        areInitialMessagesLoaded: true
      }));
    }
    // IMPORTANTE: Se mudou de server_offline para checking (servidor voltou online)
    else if (previousStatus === 'server_offline' && currentStatus === 'checking') {
      setLoadingState(prev => ({
        ...prev,
        areChatsLoaded: false // Forçar novo carregamento
      }));
      setChats([]); // Limpar chats antigos
    }

    // Atualizar referência do estado anterior
    previousConnectionStatus.current = currentStatus;
  }, [connectionState.status, loadChats]);

  // === CARREGAR MENSAGENS ===
  const loadMessages = useCallback(async (chatId: string, loadMore = false) => {
    try {
      if (messagesState.isLoadingMessages || (!loadMore && !messagesState.hasMoreMessages && messagesState.lastMessageId)) return;

      setMessagesState(prev => ({
        ...prev,
        isLoadingMessages: true,
        isLoadingOlderMessages: loadMore
      }));

      const params = new URLSearchParams();
      params.append('count', '20');
      if (loadMore && messagesState.lastMessageId) {
        params.append('id', messagesState.lastMessageId);
        params.append('direction', 'before');
      }

      const response = await fetch(`/api/chat/messages/${encodeURIComponent(chatId)}?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        if (loadMore) {
          setMessages(prev => [...data.messages, ...prev]);
        } else {
          setMessages(data.messages);
          setLoadingState(prev => ({ ...prev, areInitialMessagesLoaded: true }));
        }

        const firstMessageId = loadMore && data.messages.length > 0 ? data.messages[0].id :
          (!loadMore && data.messages.length > 0 ? data.messages[0].id : null);

        setMessagesState({
          lastMessageId: firstMessageId,
          hasMoreMessages: data.hasMore,
          isLoadingMessages: false,
          isLoadingOlderMessages: false
        });
      } else {
        setMessages([]);
        setMessagesState({
          lastMessageId: null,
          hasMoreMessages: false,
          isLoadingMessages: false,
          isLoadingOlderMessages: false
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar mensagens:', error);
      if (!loadMore) {
        setMessages([]);
        setMessagesState({
          lastMessageId: null,
          hasMoreMessages: false,
          isLoadingMessages: false,
          isLoadingOlderMessages: false
        });
      } else {
        setMessagesState(prev => ({ ...prev, isLoadingMessages: false }));
      }
    }
  }, [messagesState]);

  // === SELECIONAR CHAT ===
  const handleChatSelect = async (chat: Chats) => {
    const updatedChat = chat.unreadCount > 0 ? { ...chat, unreadCount: 0 } : chat;

    // IMPORTANTE: Iniciar loading imediatamente antes de qualquer operação
    setLoadingState(prev => ({ ...prev, areInitialMessagesLoaded: false }));
    setMessagesState({
      lastMessageId: null,
      hasMoreMessages: true,
      isLoadingMessages: true, // Iniciar loading imediatamente
      isLoadingOlderMessages: false
    });

    // Definir o chat selecionado imediatamente para mostrar o cabeçalho
    setSelectedChat({ chat: updatedChat, isOnline: 'Carregando...' });

    // Limpar mensagens do chat anterior imediatamente
    setMessages([]);

    let onlineStatus = chatPresenceStates[chat.id._serialized] || '';
    try {
      const response = await fetch(`/api/chat/is-online?chatId=${encodeURIComponent(chat.id._serialized)}`);
      const data = await response.json();
      if (data.success) {
        onlineStatus = data.isOnline ? 'Online' : '';
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status online:', error);
    }

    // Atualizar status online após verificação
    setSelectedChat({ chat: updatedChat, isOnline: onlineStatus });

    // Carregar mensagens
    loadMessages(widToString(chat.id));

    // Marcar como lido
    setChats(prevChats => {
      return prevChats.map(prevChat => {
        if (prevChat.id._serialized === chat.id._serialized) {
          return { ...prevChat, unreadCount: 0 };
        }
        return prevChat;
      });
    });

    // Enviar send-seen
    sendSeenForChat(chat.id._serialized);
  };

  // === ENVIAR MENSAGEM ===
  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || !selectedChat || !session?.user?.name) return;

    const messageWithUser = `_*${session.user.name}*_:\n\n${messageContent}`;

    // Forçar scroll para baixo imediatamente para dar feedback visual
    setForceScrollToBottom(true);
    setTimeout(() => setForceScrollToBottom(false), 100);

    try {
      const response = await fetch('/api/chat/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat.chat.id._serialized,
          message: messageWithUser
        })
      });

      const data = await response.json();
      if (!data.success) {
        console.error('❌ Erro ao enviar mensagem:', data.error);
      }
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
    }
  };

  // === OUTRAS FUNÇÕES (mantidas para compatibilidade) ===
  const handleScroll = useCallback(() => {
    if (!hasMoreChats || isLoadingMoreChats || connectionState.status !== 'connected') return;

    // Chamar API diretamente para evitar dependência circular
    const loadMoreChats = async () => {
      setIsLoadingMoreChats(true);
      try {
        const response = await fetch(`/api/chat/chats?page=${currentPage + 1}&limit=20`);
        const data = await response.json();

        if (data.success) {
          setChats(prev => [...prev, ...data.chats]);
          setHasMoreChats(data.chats.length === 20 && (currentPage + 1) < data.totalPages);
          setCurrentPage(currentPage + 1);
        }
      } catch (error) {
        console.error('❌ Erro ao carregar mais chats:', error);
      } finally {
        setIsLoadingMoreChats(false);
      }
    };

    loadMoreChats();
  }, [hasMoreChats, isLoadingMoreChats, currentPage, connectionState.status]);

  const handleFileUpload = (file: File) => {
    if (!file || !selectedChat) return;
    const message: Message = {
      id: Date.now().toString(),
      chatId: selectedChat.chat.id,
      content: `📎 ${file.name}`,
      type: 'file',
      timestamp: Date.now(),
      fromMe: true,
      status: 'sending'
    } as unknown as Message;
    setMessages(prev => [...prev, message]);
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === message.id ? { ...m, status: 'delivered' } : m));
    }, 2000);
  };

  const handleMediaModal = (isOpen: boolean, type: string, url: string) => {
    setMediaModal({ isOpen, type, url });
  };

  const handleAudioPlay = useCallback((messageId: string, audioBase64: string) => {
    if (!audioStates[messageId]?.audio) {
      const newAudio = new Audio(`data:audio/ogg;base64,${audioBase64}`);
      newAudio.onerror = () => {
        setAudioStates(prev => ({ ...prev, [messageId]: { ...prev[messageId], isPlaying: false } }));
      };

      newAudio.onloadedmetadata = () => {
        setAudioStates(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            duration: newAudio.duration
          }
        }));
      };

      newAudio.oncanplaythrough = () => {
        newAudio.addEventListener('timeupdate', () => {
          setAudioStates(prev => ({
            ...prev,
            [messageId]: {
              ...prev[messageId],
              progress: (newAudio.currentTime / newAudio.duration) * 100,
              currentTime: newAudio.currentTime
            }
          }));
        });
        newAudio.addEventListener('ended', () => {
          setAudioStates(prev => ({
            ...prev,
            [messageId]: {
              ...prev[messageId],
              isPlaying: false,
              progress: 0,
              currentTime: 0
            }
          }));
        });
        setAudioStates(prev => {
          const currentRate = prev[messageId]?.playbackRate || 1;
          newAudio.playbackRate = currentRate;
          return {
            ...prev,
            [messageId]: {
              ...prev[messageId], // Preserva propriedades existentes (incluindo playbackRate se já definido)
              isPlaying: true,
              progress: 0,
              audio: newAudio,
              playbackRate: currentRate,
              currentTime: 0,
              duration: newAudio.duration,
              hasStartedOnce: true
            }
          };
        });
        newAudio.play().catch(err => console.error('❌ Erro ao tocar áudio:', err));
      };
    } else {
      const audio = audioStates[messageId].audio;
      const isPlaying = audioStates[messageId].isPlaying;

      if (isPlaying) {
        audio?.pause();
        setAudioStates(prev => ({ ...prev, [messageId]: { ...prev[messageId], isPlaying: false } }));
      } else {
        // Aplicar a velocidade atual antes de tocar
        const currentRate = audioStates[messageId]?.playbackRate || 1;
        if (audio) {
          audio.playbackRate = currentRate;
        }
        audio?.play().catch(err => console.error('❌ Erro ao tocar áudio:', err));
        setAudioStates(prev => ({
          ...prev,
          [messageId]: {
            ...prev[messageId],
            isPlaying: true,
            hasStartedOnce: true
          }
        }));
      }
    }
  }, [audioStates]);

  const handleAudioSpeedChange = useCallback((messageId: string, speed: number) => {
    const audio = audioStates[messageId]?.audio;
    if (audio) {
      audio.playbackRate = speed;
    }
    // Sempre atualizar o estado, mesmo se o áudio ainda não existir
    setAudioStates(prev => ({
      ...prev,
      [messageId]: {
        ...prev[messageId],
        playbackRate: speed
      }
    }));
  }, [audioStates]);

  const handleAudioProgress = useCallback((e: React.MouseEvent<HTMLDivElement>, messageId: string) => {
    const audio = audioStates[messageId]?.audio;
    if (!audio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    audio.currentTime = audio.duration * clickPosition;
  }, [audioStates]);

  const sendSeenForChat = async (chatId: string) => {
    try {
      await fetch('/api/chat/send-seen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId })
      });
    } catch (error) {
      console.error('❌ Erro ao enviar send-seen:', error);
    }
  };

  // === SOCKET LISTENERS ===
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Função para buscar dados de mídia
  const fetchMediaData = useCallback(async (messageId: string, messageType: string) => {
    if (!['image', 'video', 'document', 'ptt', 'sticker'].includes(messageType)) {
      return null;
    }

    try {
      const mediaUrl = `/api/chat/media/${messageId}`;
      const response = await fetch(mediaUrl);

      if (response.ok) {
        const mediaData = await response.json();

        // Extrair base64 puro se vier com prefixo data:
        let cleanBase64 = mediaData.base64;
        if (typeof cleanBase64 === 'string' && cleanBase64.includes('base64,')) {
          cleanBase64 = cleanBase64.split('base64,').pop() || cleanBase64;
        }

        return {
          body: cleanBase64 || null,
          mimetype: mediaData.mimetype || null,
          caption: mediaData.caption || null
        };
      }
    } catch (error) {
      console.error(`Erro ao buscar mídia para ${messageId}:`, error);
    }

    return null;
  }, []);

  // Listener para novas mensagens
  useEffect(() => {
    if (newMessages.length === 0) return;

    const latestMessage = newMessages[newMessages.length - 1];
    if (processedMessageIds.current.has(latestMessage.id)) return;

    processedMessageIds.current.add(latestMessage.id);
    const chatId = latestMessage.chatId;

    // Atualizar lista de chats
    setChats(prevChats => {
      const chatIndex = prevChats.findIndex(chat => chat.id._serialized === chatId);
      if (chatIndex === -1) return prevChats;

      const updatedChat: Chats = {
        ...prevChats[chatIndex],
        lastReceivedKey: {
          ...latestMessage,
          content: latestMessage.content || latestMessage.body,
          timestamp: latestMessage.timestamp || latestMessage.t
        } as any,
        // Só incrementar unreadCount se não for mensagem minha
        unreadCount: latestMessage.fromMe ? prevChats[chatIndex].unreadCount || 0 : (prevChats[chatIndex].unreadCount || 0) + 1
      };

      const newChats = [...prevChats];
      newChats.splice(chatIndex, 1);
      newChats.unshift(updatedChat);
      return newChats;
    });

    // Se for do chat selecionado, adicionar às mensagens
    if (selectedChat && widToString(selectedChat.chat.id) === chatId) {
      // Função assíncrona para processar mensagens com mídia
      const processMessage = async () => {
        let messageData = {
          id: latestMessage.id,
          chatId: latestMessage.chatId,
          content: latestMessage.content || latestMessage.body,
          type: latestMessage.type,
          timestamp: latestMessage.timestamp || latestMessage.t,
          fromMe: latestMessage.fromMe,
          status: latestMessage.fromMe ? 'sent' as const : 'delivered' as const
        };

        // Se for mensagem de mídia, buscar os dados
        if (['image', 'video', 'document', 'ptt', 'sticker'].includes(latestMessage.type)) {
          const mediaData = await fetchMediaData(latestMessage.id, latestMessage.type);
          if (mediaData) {
            messageData = {
              ...messageData,
              ...mediaData
            } as any;
          }
        }

        setMessages(prevMessages => {
          const messageExists = prevMessages.some(msg => msg.id === latestMessage.id);
          if (messageExists) return prevMessages;

          return [...prevMessages, messageData as any];
        });

        // Sinalizar scroll após a mensagem ser adicionada
        // Timeout para garantir que o DOM foi atualizado, especialmente importante para mídias
        setTimeout(() => {
          setForceScrollToBottom(true);
          setTimeout(() => setForceScrollToBottom(false), 100);
        }, 100);
      };

      processMessage();

      // Só marcar como lido e enviar seen se não for mensagem minha
      if (!latestMessage.fromMe) {
        setChats(prevChats => prevChats.map(chat =>
          chat.id._serialized === chatId ? { ...chat, unreadCount: 0 } : chat
        ));
        sendSeenForChat(chatId);
      }
    }
  }, [newMessages, selectedChat, fetchMediaData]);

  // Listener para ACKs
  useEffect(() => {
    if (messageAcks.length === 0) return;

    const latestAck = messageAcks[messageAcks.length - 1];
    setTimeout(() => {
      setMessages(currentMessages => {
        return currentMessages.map(message => {
          if (message.id === latestAck.id) {
            let newStatus = 'sent';
            if (latestAck.ack === 1) newStatus = 'sent';
            else if (latestAck.ack === 2) newStatus = 'delivered';
            else if (latestAck.ack === 3) newStatus = 'read';

            return { ...message, status: newStatus, ack: latestAck.ack };
          }
          return message;
        });
      });
    }, 50);
  }, [messageAcks]);

  // Listener para presença
  useEffect(() => {
    if (!getPresence) return;

    const cleanup = getPresence((err: any, message: any) => {
      if (err) return;

      const chatId = message.id;
      let presenceText = '';

      if (message.state === 'typing') {
        presenceText = 'Digitando...';
      } else if (message.state === 'recording_audio') {
        presenceText = 'Gravando...';
      } else if (message.isOnline) {
        presenceText = 'Online';
      }

      setChatPresenceStates(prev => ({ ...prev, [chatId]: presenceText }));

      setSelectedChat(prev => {
        if (!prev || widToString(prev.chat.id) !== message.id) return prev;
        return { ...prev, isOnline: presenceText };
      });
    }, 'jurfis');

    return cleanup;
  }, [getPresence]);

  // === CARREGAR FOTOS DE PERFIL ===
  const profilePicRequests = useRef<Set<string>>(new Set());

  const fetchProfilePic = useCallback(async (chatId: string) => {
    if (profilePics[chatId] || profilePicRequests.current.has(chatId)) return;

    profilePicRequests.current.add(chatId);

    try {
      const response = await fetch(`/api/chat/profile-pic?chatId=${encodeURIComponent(chatId)}`);
      const data = await response.json();

      if (data.success && data.profilePic) {
        setProfilePics(prev => ({ ...prev, [chatId]: data.profilePic }));
      } else {
        setProfilePics(prev => ({ ...prev, [chatId]: null }));
      }
    } catch (error) {
      setProfilePics(prev => ({ ...prev, [chatId]: null }));
    } finally {
      profilePicRequests.current.delete(chatId);
    }
  }, [profilePics]);

  useEffect(() => {
    if (chats.length > 0) {
      chats.slice(0, 8).forEach(chat => {
        const chatId = widToString(chat.id);
        if (profilePics[chatId] === undefined && !profilePicRequests.current.has(chatId)) {
          fetchProfilePic(chatId);
        }
      });
    }
  }, [chats, fetchProfilePic]);

  // === RENDERIZAÇÃO ===

  // Verificação de autenticação
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">💬</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Carregando Chat</h1>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // Se não autenticado, aguardar
  if (!session || !loadingState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">💬</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Carregando Chat</h1>
            <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  // === FLUXO CORRETO DE ESTADOS ===

  // 1. Se socket desconectado → Tela "API desligada"
  if (connectionState.status === 'server_offline') {
    return (
      <QRCodeDisplay
        qrCode={null}
        onGenerateNew={generateQRCode}
        connectionState={{
          status: connectionState.status,
          sessionState: connectionState.sessionState
        }}
      />
    );
  }

  // 2. Se estado UNPAIRED → Tela QR Code
  if (connectionState.status === 'qr_required' ||
    connectionState.sessionState === 'UNPAIRED' ||
    connectionState.sessionState === 'UNPAIRED_IDLE') {
    return (
      <QRCodeDisplay
        qrCode={connectionState.qrCode}
        onGenerateNew={generateQRCode}
        connectionState={{
          status: connectionState.status,
          sessionState: connectionState.sessionState
        }}
      />
    );
  }

  // 3. Se conectando (após QR Code) → Mostrar feedback de conexão
  if (connectionState.status === 'connecting' ||
    connectionState.sessionState === 'PAIRING' ||
    connectionState.sessionState === 'OPENING') {
    return (
      <QRCodeDisplay
        qrCode={connectionState.qrCode}
        onGenerateNew={generateQRCode}
        connectionState={{
          status: connectionState.status,
          sessionState: connectionState.sessionState
        }}
      />
    );
  }

  // 4. Se CONNECTED mas chats ainda não carregaram → Tela loading
  if (connectionState.status === 'connected' && !loadingState.areChatsLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Carregando Conversas</h1>
            <p className="text-gray-600">WhatsApp conectado! Carregando suas conversas...</p>
          </div>
        </div>
      </div>
    );
  }

  // 5. Se ainda checando ou estado desconhecido → Loading genérico
  if (connectionState.status === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="w-full max-w-md bg-white rounded-lg shadow-sm border p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Conectando</h1>
            <p className="text-gray-600">Verificando status da conexão...</p>
          </div>
        </div>
      </div>
    );
  }

  // Interface principal do chat
  return (
    <>
      <div className="h-screen bg-white flex">
        <ChatSidebar
          chats={chats}
          selectedChat={selectedChat}
          searchTerm={searchTerm}
          activeFilter={activeFilter}
          isLoadingMoreChats={isLoadingMoreChats}
          profilePics={profilePics}
          chatPresenceStates={chatPresenceStates}
          session={session}
          onSearchChange={setSearchTerm}
          onFilterChange={setActiveFilter}
          onChatSelect={handleChatSelect}
          onScroll={handleScroll}
        />

        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              <ChatHeader
                selectedChat={selectedChat}
                profilePic={profilePics[widToString(selectedChat.chat.id)]}
              />

              <div className="flex-1 relative"
                style={{
                  backgroundColor: '#f5f1eb',
                  backgroundImage: 'url("/chat/images/bg-chat.png")',
                  backgroundRepeat: 'repeat',
                  backgroundSize: 'auto',
                  backgroundPosition: 'center',
                  backgroundAttachment: 'fixed'
                }}
              >
                <MessageList
                  messages={messages}
                  audioStates={audioStates}
                  onAudioPlay={handleAudioPlay}
                  onAudioProgress={handleAudioProgress}
                  onMediaModal={handleMediaModal}
                  onAudioSpeedChange={handleAudioSpeedChange}
                  profilePics={profilePics}
                  onLoadMoreMessages={() => selectedChat && loadMessages(widToString(selectedChat.chat.id), true)}
                  hasMoreMessages={messagesState.hasMoreMessages}
                  isLoadingMessages={messagesState.isLoadingMessages}
                  isLoadingInitialMessages={!loadingState.areInitialMessagesLoaded && selectedChat !== null}
                  scrollToBottom={forceScrollToBottom}
                  chatId={selectedChat ? widToString(selectedChat.chat.id) : undefined}
                />

                <MessageInput
                  selectedChat={selectedChat}
                  onSendMessage={handleSendMessage}
                  onFileUpload={handleFileUpload}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center text-gray-500">
                <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">💬</span>
                </div>
                <h2 className="text-xl font-medium mb-2">Selecione uma conversa</h2>
                <p className="text-sm">Escolha uma conversa da lista para começar a atender</p>
              </div>
            </div>
          )}
        </div>

        <MediaModal
          isOpen={mediaModal.isOpen}
          type={mediaModal.type}
          url={mediaModal.url}
          onClose={() => setMediaModal({ isOpen: false, type: '', url: '' })}
        />
      </div>
    </>
  );
}