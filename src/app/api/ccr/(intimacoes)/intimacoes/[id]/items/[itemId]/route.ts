import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// GET - Buscar detalhes de um item da lista
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id, itemId } = await params;

    const item = await prismadb.notificationItem.findUnique({
      where: { id: itemId },
      include: {
        resource: {
          select: {
            id: true,
            resourceNumber: true,
            processNumber: true,
            processName: true,
            status: true,
          },
        },
        list: {
          select: {
            id: true,
            listNumber: true,
            type: true,
            status: true,
          },
        },
        attempts: {
          orderBy: { attemptNumber: 'asc' },
          include: {
            confirmedByUser: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!item || item.list.id !== id) {
      return new NextResponse('Item não encontrado', { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('[INTIMACAO_ITEM_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// DELETE - Remover tentativa ou item da lista
// itemId pode ser um attemptId (tentativa) ou itemId (item sem tentativas)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id, itemId } = await params;

    // Verificar se a lista existe
    const list = await prismadb.notificationList.findUnique({
      where: { id },
    });

    if (!list) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    // Não permitir remover itens se a lista está finalizada
    if (list.status === 'FINALIZADA') {
      return new NextResponse('Não é possível remover intimações de uma lista finalizada', { status: 400 });
    }

    // Primeiro, tentar encontrar como tentativa
    const attempt = await prismadb.notificationAttempt.findUnique({
      where: { id: itemId },
      include: {
        item: {
          include: {
            _count: {
              select: { attempts: true },
            },
          },
        },
      },
    });

    if (attempt) {
      // É uma tentativa
      if (attempt.item.listId !== id) {
        return new NextResponse('Tentativa não encontrada', { status: 404 });
      }

      // Não permitir remover se já foi confirmada
      if (attempt.status === 'CONFIRMADO') {
        return new NextResponse('Não é possível remover uma tentativa com ciência confirmada', { status: 400 });
      }

      // Deletar a tentativa
      await prismadb.notificationAttempt.delete({
        where: { id: itemId },
      });

      // Se o item não tem mais tentativas, deletar o item também
      if (attempt.item._count.attempts <= 1) {
        await prismadb.notificationItem.delete({
          where: { id: attempt.itemId },
        });
      }

      return new NextResponse(null, { status: 204 });
    }

    // Se não é tentativa, tentar como item
    const item = await prismadb.notificationItem.findUnique({
      where: { id: itemId },
      include: {
        attempts: {
          where: { status: 'CONFIRMADO' },
        },
      },
    });

    if (!item || item.listId !== id) {
      return new NextResponse('Item não encontrado', { status: 404 });
    }

    // Não permitir remover se tem alguma tentativa confirmada
    if (item.attempts.length > 0) {
      return new NextResponse('Não é possível remover um recurso com tentativas confirmadas', { status: 400 });
    }

    // Deletar o item (cascade deleta as tentativas)
    await prismadb.notificationItem.delete({
      where: { id: itemId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[INTIMACAO_ITEM_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
