'use client'

import * as React from 'react';
import { signOut, useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AppSwitcher } from './app-switcher';
import { NavUser } from './nav-user';
import { useSidebarConfig } from '@/contexts/sidebar-context';
import { LoginModal } from '@/components/auth/login-modal';
import { RegisterModal } from '@/components/auth/register-modal';

interface GlobalSidebarProps {
  onLogin?: () => void;
}

export function GlobalSidebar({ onLogin }: GlobalSidebarProps) {
  const { data: session } = useSession();
  const { config } = useSidebarConfig();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [openMenuIndex, setOpenMenuIndex] = useState<string | null>(null);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await signOut({ redirect: false });
      toast.success('Logout realizado com sucesso!');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const isLoggedIn = !!session?.user;
  const userName = session?.user?.name;
  const userEmail = session?.user?.email;
  const isAdmin = session?.user?.role === 'ADMIN';
  const organizationName = session?.user?.organizationName;
  const role = session?.user?.role;

  return (
    <Sidebar collapsible="icon" data-tour="sidebar">
      {/* Header com AppSwitcher (se configurado) */}
      {config.showAppSwitcher && (
        <SidebarHeader>
          <AppSwitcher />
        </SidebarHeader>
      )}

      <SidebarContent>
        {/* Custom Content (ex: Mini Calendário) */}
        {config.customContent && (
          <SidebarGroup className="group-data-[collapsible=icon]:hidden">
            {config.customContent}
          </SidebarGroup>
        )}

        {/* Custom Sections */}
        {config.customSections && config.customSections.map((section, sectionIndex) => (
          <SidebarGroup key={sectionIndex}>
            {section.title && <SidebarGroupLabel>{section.title}</SidebarGroupLabel>}
            <SidebarMenu>
              {/* Nova estrutura com menuItems */}
              {section.menuItems ? (
                section.menuItems.map((menuItem, menuIndex) => {
                  const menuKey = `${sectionIndex}-${menuIndex}`;
                  return menuItem.collapsible && menuItem.subItems ? (
                    // Item colapsável com submenus
                    <Collapsible
                      key={menuIndex}
                      asChild
                      open={openMenuIndex === menuKey}
                      onOpenChange={(open) => {
                        setOpenMenuIndex(open ? menuKey : null);
                      }}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton className="cursor-pointer">
                            {menuItem.icon &&
                              React.createElement(menuItem.icon, { className: "size-4" })
                            }
                            <span>{menuItem.label}</span>
                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {menuItem.subItems.map((subItem, subIndex) => (
                              <SidebarMenuSubItem key={subIndex}>
                                <SidebarMenuSubButton
                                  asChild={!!subItem.href}
                                  isActive={subItem.active}
                                >
                                  {subItem.href ? (
                                    <Link href={subItem.href}>
                                      <span>{subItem.label}</span>
                                    </Link>
                                  ) : (
                                    <span>{subItem.label}</span>
                                  )}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    // Item normal sem submenu
                    <SidebarMenuItem key={menuIndex}>
                      <SidebarMenuButton
                        onClick={menuItem.onClick}
                        asChild={!!menuItem.href}
                        className="cursor-pointer"
                        isActive={menuItem.active}
                      >
                        {menuItem.href ? (
                          <Link href={menuItem.href}>
                            {menuItem.icon && <menuItem.icon className="size-4" />}
                            <span>{menuItem.label}</span>
                          </Link>
                        ) : (
                          <>
                            {menuItem.icon && <menuItem.icon className="size-4" />}
                            <span>{menuItem.label}</span>
                          </>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })
              ) : (
                /* Estrutura antiga para compatibilidade */
                <>
                  {/* Seção colapsável com submenus */}
                  {section.collapsible && section.subItems ? (
                    <Collapsible
                      key={sectionIndex}
                      asChild
                      open={openMenuIndex === `section-${sectionIndex}`}
                      onOpenChange={(open) => {
                        setOpenMenuIndex(open ? `section-${sectionIndex}` : null);
                      }}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton tooltip={section.title} className="cursor-pointer">
                            {section.items && section.items[0]?.icon &&
                              React.createElement(section.items[0].icon, { className: "size-4" })
                            }
                            <span>{section.title}</span>
                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {section.subItems.map((subItem, subIndex) => (
                              <SidebarMenuSubItem key={subIndex}>
                                <SidebarMenuSubButton
                                  asChild={!!subItem.href}
                                  isActive={subItem.active}
                                >
                                  {subItem.href ? (
                                    <Link href={subItem.href}>
                                      <span>{subItem.label}</span>
                                    </Link>
                                  ) : (
                                    <span>{subItem.label}</span>
                                  )}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  ) : (
                    /* Itens normais sem submenu */
                    section.items && section.items.map((item, itemIndex) => (
                      <SidebarMenuItem key={itemIndex}>
                        <SidebarMenuButton
                          onClick={item.onClick}
                          asChild={!!item.href}
                          className="cursor-pointer"
                          isActive={item.active}
                        >
                          {item.href ? (
                            <Link href={item.href}>
                              {item.icon && <item.icon className="size-4" />}
                              <span>{item.label}</span>
                            </Link>
                          ) : (
                            <>
                              {item.icon && <item.icon className="size-4" />}
                              <span>{item.label}</span>
                            </>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))
                  )}
                </>
              )}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {/* Custom Actions */}
        {config.customActions && config.customActions.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Ações</SidebarGroupLabel>
            <SidebarMenu>
              {config.customActions.map((action, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton
                    onClick={action.onClick}
                    className="cursor-pointer"
                  >
                    {action.icon && <action.icon className="size-4" />}
                    <span>{action.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer com NavUser (se configurado) */}
      {config.showUserAuth && (
        <SidebarFooter>
          <NavUser
            userName={userName}
            userEmail={userEmail}
            isAdmin={isAdmin}
            organizationName={organizationName}
            role={role}
            onLogout={handleLogout}
            onLogin={handleLogin}
          />
        </SidebarFooter>
      )}

      {/* Modais de Login e Registro */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenRegister={() => {
          setIsLoginModalOpen(false);
          setIsRegisterModalOpen(true);
        }}
      />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
      />
    </Sidebar>
  );
}
