import { Chat as WppChat, Message as WppMessage, MessageType, Wid } from '@wppconnect-team/wppconnect';

// Helper function to convert Wid to string
export const widToString = (wid: string | Wid): string => {
  return typeof wid === 'string' ? wid : (wid as any)?._serialized || wid.toString();
};

// Extend the wppconnect Chat type with additional properties needed by the UI
// export interface Chat extends Omit<WppChat, 'id'> {
//   id: string;
//   phone?: string;
//   avatar?: string;
//   lastMessage?: string;
//   lastMessageTime?: string;
//   lastMessageType?: string;
//   isOnline?: boolean;
// }

// Extend the wppconnect Message type with additional properties needed by the UI
// export interface Message extends Omit<WppMessage, 'chatId' | 'type'> {
//   chatId: string;
//   type: MessageType | 'text' | 'image' | 'file' | 'audio' | 'ptt' | 'video' | 'document';
//   status?: 'sending' | 'sent' | 'delivered' | 'read';
// }


// Estender WppMessage com propriedades customizadas para mídia
export interface Message extends WppMessage {
  body?: string; // Base64 da mídia
  mimetype?: string; // Tipo MIME da mídia
  caption?: string; // Legenda da mídia
  vcardFormattedName?: string; // Nome formatado do vCard
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'received';
  isGif?: boolean; // Indica se o vídeo é um GIF
}

export type Chats = Omit<WppChat, `lastReceivedKey`> & { lastReceivedKey: Message | null };

/**
 * Parameters for returning messages
 */
export interface GetMessagesParam {
    /**
     * Number of messages to return.
     * Set it to `-1` to return everything (may take a while and crash the interface).
     *
     * @default 20
     */
    count?: number;
    /**
     * ID of the last message to continue the search.
     * This works like pagination, so when you get an ID,
     * you can use it to get the next messages from it.
     */
    id?: string;
    fromMe?: boolean;
    /**
     * Whether you want to retrieve the messages before or after the ID entered.
     *
     * @default 'before'
     */
    direction?: 'before' | 'after';
}