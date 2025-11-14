import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canEditContacts } from '@/lib/permissions';

interface ContactUpdate {
  id?: string;
  type: string;
  value: string;
  isPrimary: boolean;
  isVerified: boolean;
  isNew?: boolean;
}

interface PartUpdate {
  partId: string;
  contacts: ContactUpdate[];
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canEditContacts(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const { processNumber, protocolId, parts } = body as {
      processNumber: string;
      protocolId: string;
      parts: PartUpdate[];
    };

    if (!processNumber || !parts || !Array.isArray(parts)) {
      return new NextResponse('Dados inválidos', { status: 400 });
    }

    // Processar cada parte
    for (const partUpdate of parts) {
      const { partId, contacts } = partUpdate;

      // Buscar contatos existentes desta parte
      const existingContacts = await prismadb.contact.findMany({
        where: {
          partId,
          processNumber,
        },
      });

      // Não há mais lógica de exclusão automática ao salvar
      // Contatos devem ser excluídos/desativados através de botões específicos

      // Atualizar ou criar contatos
      for (const contact of contacts) {
        if (contact.id && !contact.isNew) {
          // Atualizar contato existente
          await prismadb.contact.update({
            where: { id: contact.id },
            data: {
              type: contact.type as any,
              value: contact.value,
              isPrimary: contact.isPrimary,
              isVerified: contact.isVerified,
            },
          });
        } else {
          // Criar novo contato
          await prismadb.contact.create({
            data: {
              partId,
              protocolId,
              processNumber,
              type: contact.type as any,
              value: contact.value,
              isPrimary: contact.isPrimary,
              isVerified: contact.isVerified,
              isActive: true,
              createdBy: session.user.id,
            },
          });
        }
      }
    }

    return NextResponse.json({ message: 'Contatos atualizados com sucesso' });
  } catch (error) {
    console.log('[PARTS_CONTACTS_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
