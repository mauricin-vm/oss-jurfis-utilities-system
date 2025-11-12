import { OrganizationRole } from '@prisma/client';

export function canAccessSubjects(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canCreateSubject(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canEditSubject(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteSubject(role: OrganizationRole): boolean {
  return role === 'ADMIN';
}

export function canAccessMembers(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canCreateMember(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canEditMember(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteMember(role: OrganizationRole): boolean {
  return role === 'ADMIN';
}

export function canAccessSectors(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canCreateSector(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canEditSector(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteSector(role: OrganizationRole): boolean {
  return role === 'ADMIN';
}

// Permissões para Recursos
export function canAccessResources(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE' || role === 'EXTERNAL';
}

export function canCreateResource(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canEditResource(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteResource(role: OrganizationRole): boolean {
  return role === 'ADMIN';
}

// Permissões para Tramitações
export function canAccessTramitations(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE' || role === 'EXTERNAL';
}

export function canCreateTramitation(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canEditTramitation(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteTramitation(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE'; // ADMIN e EMPLOYEE podem excluir tramitações PENDENTES
}

// Permissões para Inscrições/Débitos
export function canAccessRegistrations(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE' || role === 'EXTERNAL';
}

export function canEditRegistrations(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteRegistrations(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

// Permissões para Partes
export function canAccessParts(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE' || role === 'EXTERNAL';
}

export function canEditParts(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteParts(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

// Permissões para Contatos
export function canAccessContacts(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE' || role === 'EXTERNAL';
}

export function canEditContacts(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteContacts(role: OrganizationRole): boolean {
  return role === 'ADMIN'; // Apenas ADMIN pode excluir permanentemente
}

export function canToggleContactActive(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE'; // EMPLOYEE pode ativar/desativar
}

// Permissões para Endereços
export function canAccessAddresses(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE' || role === 'EXTERNAL';
}

export function canEditAddresses(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE';
}

export function canDeleteAddresses(role: OrganizationRole): boolean {
  return role === 'ADMIN'; // Apenas ADMIN pode excluir permanentemente
}

export function canToggleAddressActive(role: OrganizationRole): boolean {
  return role === 'ADMIN' || role === 'EMPLOYEE'; // EMPLOYEE pode ativar/desativar
}
