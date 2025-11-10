import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// Gerar número de recurso no formato XXXX/YYYY
async function generateResourceNumber(): Promise<{
  resourceNumber: string;
  sequenceNumber: number;
  year: number;
}> {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Buscar o último recurso do ano
  const lastResource = await prismadb.resource.findFirst({
    where: {
      year: currentYear,
    },
    orderBy: {
      sequenceNumber: 'desc',
    },
  });

  const sequenceNumber = lastResource ? lastResource.sequenceNumber + 1 : 1;

  // Formatar: XXXX/YYYY
  const formattedSeq = sequenceNumber.toString().padStart(4, '0');
  const resourceNumber = `${formattedSeq}/${currentYear}`;

  return {
    resourceNumber,
    sequenceNumber,
    year: currentYear,
  };
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { type, justification } = body;

    // Validar tipo
    if (!type || (type !== 'CONCLUIDO' && type !== 'ARQUIVADO')) {
      return new NextResponse('Tipo inválido', { status: 400 });
    }

    // Validar justificativa para ARQUIVADO
    if (type === 'ARQUIVADO' && (!justification || !justification.trim())) {
      return new NextResponse('Justificativa é obrigatória para arquivamento', { status: 400 });
    }

    // Buscar protocolo
    const protocol = await prismadb.protocol.findUnique({
      where: { id },
      include: {
        resource: true,
      },
    });

    if (!protocol) {
      return new NextResponse('Protocolo não encontrado', { status: 404 });
    }

    // Validar status
    if (protocol.status !== 'PENDENTE') {
      return new NextResponse('Apenas protocolos pendentes podem ser concluídos', { status: 400 });
    }

    // Validar se já foi convertido em recurso
    if (protocol.resource) {
      return new NextResponse('Protocolo já foi convertido em recurso', { status: 400 });
    }

    if (type === 'CONCLUIDO') {
      // Gerar número de recurso
      const resourceNumberData = await generateResourceNumber();

      // Criar recurso
      await prismadb.resource.create({
        data: {
          ...resourceNumberData,
          protocolId: protocol.id,
          processNumber: protocol.processNumber,
          status: 'EM_ANALISE',
          type: 'VOLUNTARIO', // Assumir VOLUNTARIO por padrão (pode ser alterado depois)
        },
      });

      // Atualizar protocolo para CONCLUIDO
      await prismadb.protocol.update({
        where: { id },
        data: {
          status: 'CONCLUIDO',
        },
      });
    } else if (type === 'ARQUIVADO') {
      // Atualizar protocolo para ARQUIVADO com justificativa
      await prismadb.protocol.update({
        where: { id },
        data: {
          status: 'ARQUIVADO',
          archiveReason: justification,
        },
      });
    }

    // Buscar protocolo atualizado
    const updatedProtocol = await prismadb.protocol.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parts: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        resource: {
          select: {
            id: true,
            resourceNumber: true,
            status: true,
          },
        },
        _count: {
          select: {
            parts: true,
            tramitations: true,
          },
        },
      },
    });

    return NextResponse.json(updatedProtocol);
  } catch (error) {
    console.log('[PROTOCOL_CONCLUDE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
