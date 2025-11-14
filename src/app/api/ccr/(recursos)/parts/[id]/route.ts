import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userRole = session.user.role;

    // Apenas ADMIN e EMPLOYEE podem ativar/desativar partes
    if (userRole !== 'ADMIN' && userRole !== 'EMPLOYEE') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const partId = params.id;

    // Buscar a parte
    const part = await prismadb.part.findUnique({
      where: { id: partId },
    });

    if (!part) {
      return new NextResponse('Parte não encontrada', { status: 404 });
    }

    // Alternar o status isActive
    const updatedPart = await prismadb.part.update({
      where: { id: partId },
      data: {
        isActive: !part.isActive,
      },
    });

    return NextResponse.json(updatedPart);
  } catch (error) {
    console.log('[PART_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const userRole = session.user.role;

    // Apenas ADMIN pode excluir partes
    if (userRole !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const partId = params.id;

    // Verificar se a parte existe
    const part = await prismadb.part.findUnique({
      where: { id: partId },
      include: {
        contacts: true,
      },
    });

    if (!part) {
      return new NextResponse('Parte não encontrada', { status: 404 });
    }

    // Verificar se a parte tem contatos
    if (part.contacts.length > 0) {
      return new NextResponse(
        'Não é possível excluir uma parte que possui contatos. Exclua os contatos primeiro.',
        { status: 400 }
      );
    }

    // Excluir a parte
    await prismadb.part.delete({
      where: { id: partId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log('[PART_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
