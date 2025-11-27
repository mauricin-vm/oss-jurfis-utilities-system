import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// POST - Adicionar recurso à lista de intimação
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    // Verificar se a lista existe
    const list = await prismadb.notificationList.findUnique({
      where: { id },
    });

    if (!list) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    // Não permitir adicionar itens se a lista está finalizada
    if (list.status === 'FINALIZADA') {
      return new NextResponse('Não é possível adicionar recursos a uma lista finalizada', { status: 400 });
    }

    const body = await req.json();
    const { resourceId, observations } = body;

    if (!resourceId) {
      return new NextResponse('Recurso é obrigatório', { status: 400 });
    }

    // Verificar se o recurso existe
    const resource = await prismadb.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return new NextResponse('Recurso não encontrado', { status: 404 });
    }

    // Verificar se o recurso já está na lista
    const existingItem = await prismadb.notificationItem.findUnique({
      where: {
        listId_resourceId: {
          listId: id,
          resourceId,
        },
      },
    });

    if (existingItem) {
      return new NextResponse('Este recurso já está na lista de intimação', { status: 400 });
    }

    // Criar o item
    const item = await prismadb.notificationItem.create({
      data: {
        listId: id,
        resourceId,
        observations: observations || null,
      },
      include: {
        resource: {
          select: {
            id: true,
            resourceNumber: true,
            processNumber: true,
            processName: true,
          },
        },
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('[INTIMACAO_ITEM_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
