'use client'

import { useState, useRef, useEffect } from 'react';
import { HiOutlinePlus, HiOutlineEmojiHappy } from 'react-icons/hi';
import { HiOutlinePaperAirplane } from 'react-icons/hi2';
import { Chats, Message } from '@/app/(routes)/chat/types/chat';

interface MessageInputProps {
  selectedChat: { chat: Chats, isOnline: string } | null,
  onSendMessage: (message: string) => void;
  onFileUpload: (file: File) => void;
}

// Interface global removida

export function MessageInput({ selectedChat, onSendMessage, onFileUpload }: MessageInputProps) {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Removida lógica de stickers
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Lista expandida de emojis organizados por categoria
  const emojiCategories = {
    faces: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓'],
    gestures: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝', '👐', '🤲', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '👀', '👁️', '🧠', '🫀', '🫁'],
    objects: ['💻', '📱', '⌚', '📷', '📺', '🎮', '🕹️', '🎧', '🎤', '🎬', '📹', '📽️', '💿', '💾', '💽', '📀', '☎️', '📞', '📟', '📠', '🔌', '🔋', '🪫', '💡', '🔦', '🕯️', '🪔', '🧯', '🗑️', '💎', '🔨', '🪓', '⛏️', '🛠️', '🗡️', '⚔️', '🔫', '🪃', '🏹', '🛡️', '🪚', '🔧', '🪛', '🔩', '⚙️', '🗜️', '⚖️', '🦯', '🔗', '⛓️', '🪝', '🧰', '🧲', '🪜'],
    symbols: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'],
    activities: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🤹‍♀️', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♠️', '♥️', '♦️', '♣️', '♟️', '🃏', '🀄', '🎴', '🎯', '🎳'],
    food: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗', '🍖', '🦴', '🌭', '🍔', '🍟', '🍕', '🫓', '🥪', '🥙', '🧆', '🌮', '🌯', '🫔', '🥗', '🥘', '🫕', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕', '🫖', '🍵', '🧃', '🥤', '🧋', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🧊'],
    travel: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️', '🚉', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚨', '🚥', '🚦', '🛑', '🚧', '⚓', '⛵', '🛶', '🚤', '🛳️', '⛴️', '🛥️', '🚢']
  };

  // Lógica de stickers removida

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    setNewMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedChat) return;
    onFileUpload(file);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10">
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute bottom-20 left-4 w-[28rem] bg-white rounded-lg border shadow-lg z-20 max-h-[28rem] overflow-hidden"
        >
          {/* Conteúdo dos emojis */}
          <div className="p-3 overflow-y-auto max-h-[25rem]">
            <div className="space-y-1">
              {Object.entries(emojiCategories).map(([category, emojis]) => (
                <div key={category}>
                  <div className="grid grid-cols-12 gap-1">
                    {emojis.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => {
                          setNewMessage(prev => prev + emoji);
                          setShowEmojiPicker(false);
                        }}
                        className="text-2xl hover:bg-gray-200 p-1.5 rounded transition-colors aspect-square flex items-center justify-center cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mx-4 mb-4">
        <div className="flex items-center bg-white rounded-full border border-gray-300 px-2 py-1 shadow-lg w-full">
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleFileUpload}
            accept="*/*"
          />

          <button
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 cursor-pointer"
            onClick={() => document.getElementById('file-upload')?.click()}
            title="Anexar arquivo"
          >
            <HiOutlinePlus className="w-5 h-5 text-gray-600" />
          </button>

          <button
            type="button"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 cursor-pointer"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            title="Emojis"
          >
            <HiOutlineEmojiHappy className="w-5 h-5 text-gray-600" />
          </button>

          <textarea
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="flex-1 resize-none bg-transparent px-3 py-2 min-h-[36px] max-h-[120px] focus:outline-none placeholder-gray-500 text-gray-900"
            rows={1}
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            title="Enviar mensagem"
          >
            <HiOutlinePaperAirplane className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}