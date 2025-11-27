import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// DELETE - Remover tentativa de intimação
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; itemId: string; attemptId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id, itemId, attemptId } = await params;

    // Verificar se a lista existe e está pendente
    const list = await prismadb.notificationList.findUnique({
      where: { id },
    });

    if (!list) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    if (list.status === 'FINALIZADA') {
      return new NextResponse('Não é possível remover tentativas de uma lista finalizada', { status: 400 });
    }

    // Verificar se a tentativa existe
    const attempt = await prismadb.notificationAttempt.findUnique({
      where: { id: attemptId },
      include: {
        item: true,
      },
    });

    if (!attempt || attempt.item.id !== itemId || attempt.item.listId !== id) {
      return new NextResponse('Tentativa não encontrada', { status: 404 });
    }

    // Não permitir remover se já foi confirmada
    if (attempt.status === 'CONFIRMADO') {
      return new NextResponse('Não é possível remover uma tentativa com ciência confirmada', { status: 400 });
    }

    // Deletar a tentativa
    await prismadb.notificationAttempt.delete({
      where: { id: attemptId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[INTIMACAO_ATTEMPT_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
