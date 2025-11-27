import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// POST - Registrar ciência da tentativa de intimação
// Nota: itemId aqui é na verdade o attemptId (ID da tentativa)
export async function POST(
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

    const { id, itemId: attemptId } = await params;

    // Verificar se a tentativa existe
    const attempt = await prismadb.notificationAttempt.findUnique({
      where: { id: attemptId },
      include: {
        item: {
          include: {
            list: true,
          },
        },
      },
    });

    if (!attempt || attempt.item.listId !== id) {
      return new NextResponse('Tentativa não encontrada', { status: 404 });
    }

    // Verificar se já foi confirmada ou expirada
    if (attempt.status === 'CONFIRMADO') {
      return new NextResponse('Ciência já registrada', { status: 400 });
    }

    if (attempt.status === 'EXPIRADO') {
      return new NextResponse('Tentativa expirada, não é possível registrar ciência', { status: 400 });
    }

    // Registrar ciência
    const updatedAttempt = await prismadb.notificationAttempt.update({
      where: { id: attemptId },
      data: {
        status: 'CONFIRMADO',
        confirmedAt: new Date(),
        confirmedBy: session.user.id,
      },
      include: {
        item: {
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
        },
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
