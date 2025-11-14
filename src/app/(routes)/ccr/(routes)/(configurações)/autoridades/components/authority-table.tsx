'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import { MoreHorizontal, Pencil, Trash2, Filter, ChevronLeft, ChevronsLeft, ChevronsRight, ChevronRight, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { TooltipWrapper } from '@/components/ui/tooltip-wrapper';
import { DeleteModal } from './delete-modal';
import { AuthorityTableSkeleton } from './authority-skeleton';

interface Authority {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  isInUse?: boolean;
}

interface AuthorityTableProps {
  data: Authority[];
  loading: boolean;
  onRefresh: () => void;
  onNewAuthority: () => void;
  userRole?: string;
}

export function AuthorityTable({ data, loading, onRefresh, onNewAuthority, userRole }: AuthorityTableProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const canDelete = userRole === 'ADMIN';
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [authorityToDelete, setAuthorityToDelete] = useState<{ id: string; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
  };

  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearchExpanded(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleDeleteClick = (id: string, name: string) => {
    setAuthorityToDelete({ id, name });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!authorityToDelete) return;

    try {
      setDeletingId(authorityToDelete.id);
      const response = await fetch(`/api/ccr/authorities-registered/${authorityToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Autoridade removida com sucesso');
        setIsDeleteModalOpen(false);
        setAuthorityToDelete(null);
        onRefresh();
      } else {
        const data = await response.json();
        toast.error(data.message || 'Erro ao remover autoridade');
      }
    } catch (error) {
      console.error('Error deleting authority:', error);
      toast.error('Erro ao remover autoridade');
    } finally {
      setDeletingId(null);
    }
  };

  // Filtrar dados
  const filteredData = data.filter((authority) => {
    const statusMatch = statusFilter === 'all' ||
      (statusFilter === 'active' && authority.isActive) ||
      (statusFilter === 'inactive' && !authority.isActive);

    const searchMatch = !searchQuery ||
      authority.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      authority.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      authority.email?.toLowerCase().includes(searchQuery.toLowerCase());

    return statusMatch && searchMatch;
  });

  // Ordenar dados alfabeticamente
  const sortedData = filteredData.sort((a, b) => a.name.localeCompare(b.name));

  // Paginação
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Reset page when filtered data changes
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Contadores
  const activeAuthorities = data.filter((a) => a.isActive).length;
  const inactiveAuthorities = data.filter((a) => !a.isActive).length;

  if (loading) {
    return <AuthorityTableSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Botões de Busca, Filtros e Nova Autoridade */}
      <div className="flex justify-end gap-2">
        {/* Busca Animada */}
        <div className="relative flex items-center">
          <div
            className={cn(
              "relative flex items-center justify-end transition-all duration-300 ease-in-out",
              isSearchExpanded ? "w-[200px] sm:w-[250px]" : "w-8"
            )}
          >
            <div className="relative w-full h-8">
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar autoridades..."
                value={searchQuery}
                onChange={handleSearchChange}
                onBlur={handleSearchBlur}
                className={cn(
                  "absolute right-0 top-0 h-8 w-full pr-8 text-sm border-gray-200 focus:border-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 transition-opacity duration-300",
                  isSearchExpanded ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
                )}
              />
              <TooltipWrapper content="Buscar por nome, telefone ou email">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearchClick}
                  className={cn(
                    "absolute right-0 top-0 h-8 w-8 p-0 cursor-pointer transition-opacity duration-300",
                    isSearchExpanded ? "opacity-0 pointer-events-none" : "opacity-100 z-10"
                  )}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </TooltipWrapper>
            </div>
          </div>
          {isSearchExpanded && (
            <Search className="absolute right-2 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 cursor-pointer">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px] sm:w-[320px] p-0">
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                >
                  <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="all" className="cursor-pointer h-9">
                      Todos
                    </SelectItem>
                    <SelectItem value="active" className="cursor-pointer h-9">
                      Ativos ({activeAuthorities})
                    </SelectItem>
                    <SelectItem value="inactive" className="cursor-pointer h-9">
                      Inativos ({inactiveAuthorities})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t p-3">
              <div className="text-xs text-muted-foreground text-center">
                {filteredData.length} {filteredData.length === 1 ? 'autoridade' : 'autoridades'} encontrada{filteredData.length !== 1 ? 's' : ''}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button size="sm" onClick={onNewAuthority} className="h-8 gap-2 cursor-pointer">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nova Autoridade</span>
        </Button>
      </div>

      {/* Tabela */}
      {filteredData.length === 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Nenhuma autoridade encontrada.</p>
            <p className="text-sm text-muted-foreground mt-2">Clique em "Nova Autoridade" para adicionar.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="relative w-full overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-muted hover:bg-muted border-b">
                    <TableHead className="font-semibold">Nome</TableHead>
                    <TableHead className="font-semibold">Telefone</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((authority) => (
                    <TableRow key={authority.id} className="bg-white hover:bg-muted/40 min-h-[49px]">
                      <TableCell className="font-medium">{authority.name}</TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {authority.phone || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {authority.email || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={authority.isActive ? 'default' : 'secondary'}
                          className="cursor-default"
                        >
                          {authority.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => router.push(`/ccr/autoridades/${authority.id}`)}
                              className="cursor-pointer h-9"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {canDelete && !authority.isInUse && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(authority.id, authority.name)}
                                className="cursor-pointer text-red-600 h-9"
                                disabled={deletingId === authority.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer com Paginação */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-4 px-2 py-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full sm:w-auto">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-16 rounded-md border bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md min-w-[4rem]">
                  <SelectPrimitive.Item
                    value="10"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>10</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                  <SelectPrimitive.Item
                    value="20"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>20</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                  <SelectPrimitive.Item
                    value="50"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>50</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                  <SelectPrimitive.Item
                    value="100"
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 h-9"
                    )}
                  >
                    <SelectPrimitive.ItemText>100</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <TooltipWrapper content="Primeira página">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Página anterior">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Próxima página">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                  <TooltipWrapper content="Última página">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </TooltipWrapper>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setAuthorityToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        authorityName={authorityToDelete?.name || ''}
        isDeleting={deletingId === authorityToDelete?.id}
      />
    </div>
  );
}
