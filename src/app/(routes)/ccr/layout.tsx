'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useSidebarConfig } from '@/contexts/sidebar-context';
import {
  LayoutDashboard,
  BookOpenText,
  Search,
  ArrowRightLeft,
  Calendar,
  FileStack,
  Gavel,
  Mails,
  Settings,
  Users,
  Building2,
  UserCircle,
  Contact,
  Plus,
  Phone,
  History,
  Newspaper,
} from 'lucide-react';

export default function CCRLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { setConfig } = useSidebarConfig();
  const router = useRouter();
  const pathname = usePathname();

  const isLoggedIn = !!session;
  const isCheckingSession = status === 'loading';
  const userOrganization = session?.user?.organizationName;
  const hasAccess = userOrganization === 'Junta de Recursos Fiscais';
  const userRole = session?.user?.role;
  const isExternal = userRole === 'EXTERNAL';

  useEffect(() => {
    // Não configurar enquanto está verificando a sessão
    if (isCheckingSession) {
      return;
    }

    // Só mostrar menu se estiver logado E for da organização correta
    if (isLoggedIn && session?.user && hasAccess) {
      // Construir subitens de Configurações baseado na role
      const configSubItems = [];

      // Assuntos, Autoridades, Membros, Setores e Votos - apenas para ADMIN e EMPLOYEE
      if (!isExternal) {
        configSubItems.push(
          { label: 'Assuntos', href: '/ccr/assuntos' },
          { label: 'Autoridades', href: '/ccr/autoridades' },
          { label: 'Votos', href: '/ccr/votos' },
          { label: 'Membros', href: '/ccr/membros' },
          { label: 'Setores', href: '/ccr/setores' }
        );
      }

      // Construir menuItems baseado na role
      const menuItems = [
        // Dashboard - item único sem colapsar
        { label: 'Dashboard', icon: LayoutDashboard, href: '/ccr' },
        // Recursos - colapsável
        {
          label: 'Recursos',
          icon: BookOpenText,
          collapsible: true,
          defaultOpen: false,
          subItems: [
            { label: 'Protocolos', href: '/ccr/protocolos' },
            { label: 'Consultar Recursos', href: '/ccr/recursos' },
            { label: 'Tramitações', href: '/ccr/tramitacoes' },
          ],
        },
        // Sessões - colapsável
        {
          label: 'Sessões',
          icon: Gavel,
          collapsible: true,
          defaultOpen: false,
          subItems: [
            { label: 'Consultar Sessões', href: '/ccr/sessoes' },
            { label: 'Atas', href: '/ccr/atas' },
            { label: 'Acórdãos', href: '/ccr/acordaos' },
          ],
        },
        // Intimações - item único sem colapsar
        { label: 'Intimações', icon: Mails, href: '/ccr/intimacoes' },
      ];

      // Adicionar Configurações apenas se houver subitens (não EXTERNAL)
      if (configSubItems.length > 0) {
        menuItems.push({
          label: 'Configurações',
          icon: Settings,
          collapsible: true,
          defaultOpen: false,
          subItems: configSubItems,
        });
      }

      // Determinar ações customizadas baseadas na rota atual
      const customActions = [];

      // Se estiver na página de assuntos, adicionar botão "Novo Assunto"
      if (pathname?.startsWith('/ccr/assuntos')) {
        customActions.push({
          label: 'Novo Assunto',
          icon: Plus,
          onClick: () => router.push('/ccr/assuntos/novo'),
        });
      }
      // Se estiver na página de autoridades, adicionar botão "Nova Autoridade"
      else if (pathname?.startsWith('/ccr/autoridades')) {
        customActions.push({
          label: 'Nova Autoridade',
          icon: Plus,
          onClick: () => router.push('/ccr/autoridades/novo'),
        });
      }
      // Se estiver na página de membros, adicionar botão "Novo Membro"
      else if (pathname?.startsWith('/ccr/membros')) {
        customActions.push({
          label: 'Novo Membro',
          icon: Plus,
          onClick: () => router.push('/ccr/membros/novo'),
        });
      }
      // Se estiver na página de setores, adicionar botão "Novo Setor"
      else if (pathname?.startsWith('/ccr/setores')) {
        customActions.push({
          label: 'Novo Setor',
          icon: Plus,
          onClick: () => router.push('/ccr/setores/novo'),
        });
      }
      // Se estiver na página de votos, adicionar botão "Novo Voto"
      else if (pathname?.startsWith('/ccr/votos')) {
        customActions.push({
          label: 'Novo Voto',
          icon: Plus,
          onClick: () => router.push('/ccr/votos/novo'),
        });
      }
      // Se estiver na página de protocolos, adicionar botão "Novo Protocolo"
      else if (pathname?.startsWith('/ccr/protocolos')) {
        customActions.push({
          label: 'Novo Protocolo',
          icon: Plus,
          onClick: () => router.push('/ccr/protocolos/novo'),
        });
      }
      // Se estiver na página de tramitações, adicionar botão "Nova Tramitação"
      else if (pathname?.startsWith('/ccr/tramitacoes')) {
        customActions.push({
          label: 'Nova Tramitação',
          icon: Plus,
          onClick: () => router.push('/ccr/tramitacoes/nova'),
        });
      }
      // Se estiver na página de listagem de sessões ou nova sessão, adicionar botão "Nova Sessão"
      else if (pathname === '/ccr/sessoes' || pathname === '/ccr/sessoes/novo') {
        customActions.push({
          label: 'Nova Sessão',
          icon: Plus,
          onClick: () => router.push('/ccr/sessoes/novo'),
        });
      }
      // Se estiver na página de partes de um recurso
      else if (pathname?.match(/^\/ccr\/recursos\/[^/]+\/partes$/)) {
        const resourceId = pathname.split('/')[3];
        customActions.push({
          label: 'Gerenciar Contatos',
          icon: Phone,
          onClick: () => router.push(`/ccr/recursos/${resourceId}/contatos`),
        });
      }
      // Se estiver na página de contatos de um recurso
      else if (pathname?.match(/^\/ccr\/recursos\/[^/]+\/contatos$/)) {
        const resourceId = pathname.split('/')[3];
        customActions.push({
          label: 'Gerenciar Partes',
          icon: Users,
          onClick: () => router.push(`/ccr/recursos/${resourceId}/partes`),
        });
      }
      // Se estiver na página de membros de uma sessão
      else if (pathname?.match(/^\/ccr\/sessoes\/[^/]+\/membros$/)) {
        customActions.push({
          label: 'Recuperar Última Sessão',
          icon: History,
          onClick: () => {
            // Disparar evento customizado para o form carregar membros da última sessão
            window.dispatchEvent(new Event('loadLastSessionMembers'));
          },
        });
      }
      // Se estiver na página de acórdãos, adicionar botões "Novo Acórdão" e "Publicar Acórdãos"
      else if (pathname?.startsWith('/ccr/acordaos')) {
        customActions.push({
          label: 'Novo Acórdão',
          icon: Plus,
          onClick: () => router.push('/ccr/acordaos/novo'),
        });
        customActions.push({
          label: 'Publicar Acórdãos',
          icon: Newspaper,
          onClick: () => router.push('/ccr/acordaos/publicar'),
        });
      }
      // Se estiver na página de listagem de intimações, adicionar botão "Nova Lista"
      else if (pathname === '/ccr/intimacoes') {
        customActions.push({
          label: 'Nova Lista',
          icon: Plus,
          onClick: () => router.push('/ccr/intimacoes/nova'),
        });
      }

      setConfig({
        showAppSwitcher: true,
        showUserAuth: true,
        customSections: [
        {
          title: 'Menu',
          menuItems,
        },
      ],
      customActions,
    });
    } else {
      // Se não estiver logado OU não for da organização correta, não mostrar menu
      setConfig({
        showAppSwitcher: true,
        showUserAuth: true,
        customActions: [],
        customSections: [],
        customContent: null,
      });
    }
  }, [isCheckingSession, isLoggedIn, session?.user, hasAccess, setConfig, pathname, router, isExternal]);

  return <>{children}</>;
}
