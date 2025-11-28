import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

interface Recipient {
  contactId?: string;
  addressId?: string;
  partId?: string;
  recipientValue: string;
}

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
    const { channel, deadline, recipients, sectorId, externalDestination, observations } = body;

    if (!channel) {
      return new NextResponse('Canal é obrigatório', { status: 400 });
    }

    // Validar destinatários para canais que requerem seleção
    const recipientsList: Recipient[] = recipients || [];

    if (channel === 'EMAIL' && recipientsList.length === 0) {
      return new NextResponse('Selecione pelo menos um email de destino para o canal E-mail', { status: 400 });
    }

    if (channel === 'WHATSAPP' && recipientsList.length === 0) {
      return new NextResponse('Selecione pelo menos um telefone de destino para o canal WhatsApp', { status: 400 });
    }

    if (channel === 'CORREIOS' && recipientsList.length === 0) {
      return new NextResponse('Selecione pelo menos um endereço de destino para o canal Correios', { status: 400 });
    }

    if (channel === 'PESSOALMENTE' && recipientsList.length === 0) {
      return new NextResponse('Selecione pelo menos uma parte para o canal Pessoalmente', { status: 400 });
    }

    if (channel === 'SETOR' && !sectorId) {
      return new NextResponse('Selecione um setor para o canal Setor', { status: 400 });
    }

    if (channel === 'EXTERNO' && !externalDestination) {
      return new NextResponse('Informe o destino para o canal Externo', { status: 400 });
    }

    // Calcular próximo número de tentativa
    const lastAttemptNumber = item.attempts.length > 0 ? item.attempts[0].attemptNumber : 0;
    const nextAttemptNumber = lastAttemptNumber + 1;

    // Criar a tentativa com os destinatários em transação
    const attempt = await prismadb.$transaction(async (tx) => {
      // Criar a tentativa
      const newAttempt = await tx.notificationAttempt.create({
        data: {
          itemId,
          attemptNumber: nextAttemptNumber,
          channel,
          deadline: deadline ? new Date(deadline) : null,
          observations: observations || null,
          sectorId: channel === 'SETOR' ? sectorId : null,
          externalDestination: channel === 'EXTERNO' ? externalDestination : null,
        },
      });

      // Criar os destinatários (se houver)
      if (recipientsList.length > 0) {
        await tx.notificationAttemptRecipient.createMany({
          data: recipientsList.map((recipient: Recipient) => ({
            attemptId: newAttempt.id,
            contactId: recipient.contactId || null,
            addressId: recipient.addressId || null,
            partId: recipient.partId || null,
            recipientValue: recipient.recipientValue,
          })),
        });
      }

      // Retornar a tentativa com os relacionamentos
      return tx.notificationAttempt.findUnique({
        where: { id: newAttempt.id },
        include: {
          confirmedByUser: {
            select: {
              id: true,
              name: true,
            },
          },
          sector: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            },
          },
          recipients: {
            include: {
              contact: {
                select: {
                  id: true,
                  type: true,
                  value: true,
                },
              },
              address: {
                select: {
                  id: true,
                  type: true,
                  street: true,
                  city: true,
                  state: true,
                },
              },
              part: {
                select: {
                  id: true,
                  name: true,
                  role: true,
                },
              },
            },
          },
        },
      });
    });

    return NextResponse.json(attempt);
  } catch (error) {
    console.error('[INTIMACAO_ATTEMPT_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
