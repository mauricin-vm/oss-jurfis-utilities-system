import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// POST - Adicionar nova tentativa de intimação
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

    const { id, itemId } = await params;

    // Verificar se a lista existe e está pendente
    const list = await prismadb.notificationList.findUnique({
      where: { id },
    });

    if (!list) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    if (list.status === 'FINALIZADA') {
      return new NextResponse('Não é possível adicionar tentativas a uma lista finalizada', { status: 400 });
    }

    // Verificar se o item existe
    const item = await prismadb.notificationItem.findUnique({
      where: { id: itemId },
      include: {
        attempts: {
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!item || item.listId !== id) {
      return new NextResponse('Item não encontrado', { status: 404 });
    }

    const body = await req.json();
    const { channel, deadline, sentTo, observations } = body;

    if (!channel) {
      return new NextResponse('Canal é obrigatório', { status: 400 });
    }

    // Validar destino para canais que requerem seleção
    if (channel === 'EMAIL' && !sentTo) {
      return new NextResponse('Email de destino é obrigatório para o canal E-mail', { status: 400 });
    }

    if (channel === 'WHATSAPP' && !sentTo) {
      return new NextResponse('Telefone de destino é obrigatório para o canal WhatsApp', { status: 400 });
    }

    if (channel === 'CORREIOS' && !sentTo) {
      return new NextResponse('Endereço de destino é obrigatório para o canal Correios', { status: 400 });
    }

    // Calcular próximo número de tentativa
    const lastAttemptNumber = item.attempts.length > 0 ? item.attempts[0].attemptNumber : 0;
    const nextAttemptNumber = lastAttemptNumber + 1;

    // Criar a tentativa
    const attempt = await prismadb.notificationAttempt.create({
      data: {
        itemId,
        attemptNumber: nextAttemptNumber,
        channel,
        deadline: deadline ? new Date(deadline) : null,
        sentTo: sentTo || null,
        observations: observations || null,
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

    return NextResponse.json(attempt);
  } catch (error) {
    console.error('[INTIMACAO_ATTEMPT_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
