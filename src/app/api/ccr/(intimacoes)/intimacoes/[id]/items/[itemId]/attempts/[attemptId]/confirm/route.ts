import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// POST - Confirmar ciência de uma tentativa
export async function POST(
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

    // Não permitir confirmar se já foi confirmada ou expirada
    if (attempt.status === 'CONFIRMADO') {
      return new NextResponse('Esta tentativa já foi confirmada', { status: 400 });
    }

    if (attempt.status === 'EXPIRADO') {
      return new NextResponse('Não é possível confirmar uma tentativa expirada', { status: 400 });
    }

    // Atualizar a tentativa com a confirmação
    const updatedAttempt = await prismadb.notificationAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'CONFIRMADO',
        confirmedAt: new Date(),
        confirmedBy: session.user.id,
      },
      include: {
        confirmedByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedAttempt);
  } catch (error) {
    console.error('[INTIMACAO_ATTEMPT_CONFIRM]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
