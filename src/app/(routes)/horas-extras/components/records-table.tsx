'use client'

import { useState } from 'react';
import { OvertimeRecord } from '../types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Pencil, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter, User, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";

interface RecordsTableProps {
  records: OvertimeRecord[];
  onEdit: (record: OvertimeRecord) => void;
  onDelete: (id: string) => void;
  onViewDocument: (id: string) => void;
  isAdmin: boolean;
  users: Array<{ id: string; name?: string; email: string }>;
  selectedUserId: string | null;
  onUserChange: (userId: string | null) => void;
  selectedYear: number | null;
  onYearChange: (year: number | null) => void;
  currentUserId?: string;
}

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function RecordsTable({
  records,
  onEdit,
  onDelete,
  onViewDocument,
  isAdmin,
  users,
  selectedUserId,
  onUserChange,
  selectedYear,
  onYearChange,
  currentUserId
}: RecordsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  // Converter decimal para HH:MM
  const convertDecimalToTime = (decimal: number): string => {
    const isNegative = decimal < 0;
    const absDecimal = Math.abs(decimal);
    const hours = Math.floor(absDecimal);
    const minutes = Math.round((absDecimal - hours) * 60);
    return `${isNegative ? '-' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Paginação
  const totalPages = Math.ceil(records.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecords = records.slice(startIndex, endIndex);

  // Reset page when records change
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // Anos disponíveis
  const years = (() => {
    const currentYear = new Date().getFullYear();
    const yearList = [];
    for (let i = currentYear; i >= currentYear - 4; i--) {
      yearList.push(i);
    }
    return yearList;
  })();

  return (
    <div className="space-y-4">
      {/* Botão de Filtros */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-2 cursor-pointer">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[280px] sm:w-[320px] p-0">
            <div className="p-4 space-y-4">

              {isAdmin && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Servidor
                  </label>
                  <Select
                    value={selectedUserId || currentUserId || ''}
                    onValueChange={(value) => onUserChange(value || null)}
                  >
                    <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                      <SelectValue placeholder="Selecione um servidor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      {users.map(user => (
                        <SelectItem
                          key={user.id}
                          value={user.id}
                          className="cursor-pointer h-9"
                        >
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Período
                </label>
                <Select
                  value={selectedYear?.toString() || 'todos'}
                  onValueChange={(value) => onYearChange(value === 'todos' ? null : Number(value))}
                >
                  <SelectTrigger className="h-10 w-full px-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-400 transition-colors">
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="todos" className="cursor-pointer h-9">
                      Todos os anos
                    </SelectItem>
                    {years.map(year => (
                      <SelectItem
                        key={year}
                        value={year.toString()}
                        className="cursor-pointer h-9"
                      >
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t p-3">
              <div className="text-xs text-muted-foreground text-center">
                {records.length} {records.length === 1 ? 'registro' : 'registros'} encontrado{records.length !== 1 ? 's' : ''}
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tabela */}
      {records.length === 0 ? (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum registro encontrado.</p>
            <p className="text-sm text-muted-foreground mt-2">Clique em &quot;Novo Registro&quot; para adicionar.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="relative w-full overflow-x-auto">
              <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted border-b">
                <TableHead className="w-[200px] font-semibold">Mês/Ano</TableHead>
                {isAdmin && <TableHead className="w-[200px] font-semibold">Servidor</TableHead>}
                <TableHead className="font-semibold">Horas Extras</TableHead>
                <TableHead className="font-semibold">Atrasos</TableHead>
                <TableHead className="font-semibold">Saldo Mensal</TableHead>
                <TableHead className="font-semibold">Saldo Acumulado</TableHead>
                <TableHead className="w-[120px] font-semibold">Documento</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRecords.map((record, index) => {
                const isCurrentMonth = record.month === currentMonth && record.year === currentYear;
                const balanceColor = record.balance >= 0 ? 'text-green-600' : 'text-red-600';
                const accBalanceColor = record.accumulatedBalance >= 0 ? 'text-blue-600' : 'text-orange-600';

                return (
                  <TableRow
                    key={record.id}
                    className="bg-white hover:bg-muted/40"
                  >
                    <TableCell className="font-medium">
                      {monthNames[record.month - 1]} / {record.year}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {record.user?.name || record.user?.email || 'N/A'}
                      </TableCell>
                    )}
                    <TableCell className="text-green-600 font-medium">
                      +{convertDecimalToTime(record.extraHours)}
                    </TableCell>
                    <TableCell className="text-red-600 font-medium">
                      -{convertDecimalToTime(record.lateHours)}
                    </TableCell>
                    <TableCell className={`font-semibold ${balanceColor}`}>
                      {record.balance >= 0 ? '+' : ''}{convertDecimalToTime(record.balance)}
                    </TableCell>
                    <TableCell className={`font-semibold ${accBalanceColor}`}>
                      {record.accumulatedBalance >= 0 ? '+' : ''}{convertDecimalToTime(record.accumulatedBalance)}
                    </TableCell>
                    <TableCell className="text-center">
                      {record.documentPath ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDocument(record.id);
                          }}
                          className="h-7 text-xs cursor-pointer"
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          Ver
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(record);
                            }}
                            className="h-9 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(record.id);
                            }}
                            className="h-9 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Footer com Paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-4 px-2 py-4">
        {/* Select de itens por página e navegação */}
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
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
