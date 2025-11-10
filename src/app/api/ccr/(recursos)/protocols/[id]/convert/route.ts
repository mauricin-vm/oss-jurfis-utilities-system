import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { type } = body; // VOLUNTARIO ou OFICIO

    if (!type) {
      return new NextResponse('Tipo de recurso é obrigatório', { status: 400 });
    }

    // Validar enum ResourceType
    const validTypes = ['VOLUNTARIO', 'OFICIO'];
    if (!validTypes.includes(type)) {
      return new NextResponse('Tipo de recurso inválido', { status: 400 });
    }

    // Verificar se o protocolo existe e está admitido
    const protocol = await prismadb.protocol.findUnique({
      where: { id },
      include: {
        resource: true,
        parts: true,
      },
    });

    if (!protocol) {
      return new NextResponse('Protocolo não encontrado', { status: 404 });
    }

    if (!protocol.isAdmittedAsResource || protocol.isAdmittedAsResource !== true) {
      return new NextResponse(
        'Apenas protocolos admitidos podem ser convertidos em recursos',
        { status: 400 }
      );
    }

    if (protocol.resource) {
      return new NextResponse(
        'Este protocolo já foi convertido em recurso',
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();

    // Gerar número do recurso (sequencial por ano) - Formato: XXXX/YYYY
    const lastResource = await prismadb.resource.findFirst({
      where: {
        year: currentYear,
      },
      orderBy: {
        sequenceNumber: 'desc',
      },
    });

    const sequenceNumber = lastResource ? lastResource.sequenceNumber + 1 : 1;
    const formattedSeq = sequenceNumber.toString().padStart(4, '0');
    const resourceNumber = `${formattedSeq}/${currentYear}`;

    // Criar recurso em uma transação
    const resource = await prismadb.$transaction(async (tx) => {
      // Criar recurso
      const newResource = await tx.resource.create({
        data: {
          resourceNumber,
          sequenceNumber,
          year: currentYear,
          protocolId: id,
          processNumber: protocol.processNumber,
          type,
          status: 'EM_ANALISE',
        },
        include: {
          protocol: {
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              parts: true,
            },
          },
          _count: {
            select: {
              tramitations: true,
              documents: true,
              sessions: true,
            },
          },
        },
      });

      // Atualizar o protocolo para status CONCLUIDO
      await tx.protocol.update({
        where: { id },
        data: {
          status: 'CONCLUIDO',
        },
      });

      return newResource;
    });

    return NextResponse.json(resource);
  } catch (error) {
    console.log('[PROTOCOL_CONVERT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
