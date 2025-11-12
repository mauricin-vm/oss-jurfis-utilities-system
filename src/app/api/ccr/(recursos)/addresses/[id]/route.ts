import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canToggleAddressActive, canDeleteAddresses } from '@/lib/permissions';

// PATCH /api/ccr/addresses/[id] - Toggle ativar/desativar endereço
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canToggleAddressActive(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    // Buscar endereço atual
    const address = await prismadb.address.findUnique({
      where: { id },
    });

    if (!address) {
      return new NextResponse('Endereço não encontrado', { status: 404 });
    }

    // Toggle isActive
    const updatedAddress = await prismadb.address.update({
      where: { id },
      data: {
        isActive: !address.isActive,
      },
    });

    return NextResponse.json(updatedAddress);
  } catch (error) {
    console.log('[ADDRESS_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// DELETE /api/ccr/addresses/[id] - Excluir permanentemente endereço (apenas ADMIN)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canDeleteAddresses(session.user.role)) {
      return new NextResponse('Apenas administradores podem excluir endereços permanentemente', { status: 403 });
    }

    const { id } = await params;

    // Verificar se o endereço existe
    const address = await prismadb.address.findUnique({
      where: { id },
    });

    if (!address) {
      return new NextResponse('Endereço não encontrado', { status: 404 });
    }

    // Hard delete
    await prismadb.address.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Endereço excluído permanentemente' });
  } catch (error) {
    console.log('[ADDRESS_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
