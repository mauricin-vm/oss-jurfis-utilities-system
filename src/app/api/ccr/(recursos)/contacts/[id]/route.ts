import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canToggleContactActive, canDeleteContacts } from '@/lib/permissions';

// PATCH /api/ccr/contacts/[id] - Toggle ativar/desativar contato
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canToggleContactActive(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    // Buscar contato atual
    const contact = await prismadb.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      return new NextResponse('Contato não encontrado', { status: 404 });
    }

    // Toggle isActive
    const updatedContact = await prismadb.contact.update({
      where: { id },
      data: {
        isActive: !contact.isActive,
      },
    });

    return NextResponse.json(updatedContact);
  } catch (error) {
    console.log('[CONTACT_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// DELETE /api/ccr/contacts/[id] - Excluir permanentemente contato (apenas ADMIN)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canDeleteContacts(session.user.role)) {
      return new NextResponse('Apenas administradores podem excluir contatos permanentemente', { status: 403 });
    }

    const { id } = await params;

    // Verificar se o contato existe
    const contact = await prismadb.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      return new NextResponse('Contato não encontrado', { status: 404 });
    }

    // Hard delete
    await prismadb.contact.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Contato excluído permanentemente' });
  } catch (error) {
    console.log('[CONTACT_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
