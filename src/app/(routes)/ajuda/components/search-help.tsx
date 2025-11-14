'use client'

import { useState } from 'react';
import { Search } from 'lucide-react';

interface SearchHelpProps {
  onSearch: (query: string) => void;
}

export function SearchHelp({ onSearch }: SearchHelpProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar na ajuda... (ex: como criar protocolo, agendar reunião)"
          className="w-full h-14 pl-12 pr-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 transition-colors text-base"
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Dica: Tente pesquisar por "como fazer", "o que é", ou palavras-chave específicas
      </p>
    </form>
  );
}
