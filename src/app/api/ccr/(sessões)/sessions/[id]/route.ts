import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const sessionData = await prismadb.session.findUnique({
      where: {
        id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        president: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        resources: {
          orderBy: {
            order: 'asc',
          },
          include: {
            resource: {
              include: {
                protocol: true,
              },
            },
            specificPresident: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            attendances: {
              include: {
                part: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        members: {
          include: {
            member: true,
          },
        },
        distributions: {
          where: {
            isActive: true,
          },
          include: {
            resource: {
              select: {
                id: true,
                resourceNumber: true,
                processNumber: true,
              },
            },
            firstDistribution: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: {
            distributionOrder: 'asc',
          },
        },
        minutes: {
          select: {
            id: true,
            minutesNumber: true,
          },
        },
        publications: {
          select: {
            id: true,
            publicationNumber: true,
            publicationDate: true,
            type: true,
          },
          where: {
            type: 'SESSAO',
          },
          orderBy: {
            publicationDate: 'desc',
          },
        },
        _count: {
          select: {
            resources: true,
          },
        },
      },
    });

    if (!sessionData) {
      return new NextResponse('Sessão não encontrada', { status: 404 });
    }

    return NextResponse.json(sessionData);
  } catch (error) {
    console.log('[SESSION_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PATCH(
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

    // PATCH permite atualização parcial
    const updatedSession = await prismadb.session.update({
      where: { id },
      data: body,
      include: {
        president: true,
        resources: {
          include: {
            resource: {
              include: {
                protocol: true,
              },
            },
          },
        },
        members: {
          include: {
            member: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.log('[SESSION_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
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
    const {
      sessionNumber,
      sessionDate,
      type,
      startTime,
      endTime,
      observations,
      status,
      presidentId,
    } = body;

    if (!sessionNumber) {
      return new NextResponse('Número da sessão é obrigatório', { status: 400 });
    }

    if (!sessionDate) {
      return new NextResponse('Data da sessão é obrigatória', { status: 400 });
    }

    if (!type) {
      return new NextResponse('Tipo de sessão é obrigatório', { status: 400 });
    }

    // Validar tipo
    const validTypes = ['ORDINARIA', 'EXTRAORDINARIA', 'OUTRO'];

    if (!validTypes.includes(type)) {
      return new NextResponse('Tipo de sessão inválido', { status: 400 });
    }

    // Validar status
    const validStatuses = ['PUBLICACAO', 'PENDENTE', 'CONCLUIDA', 'CANCELADA'];

    if (status && !validStatuses.includes(status)) {
      return new NextResponse('Status inválido', { status: 400 });
    }

    // Extrair sequenceNumber e year do sessionNumber (formato: "XXXX/YYYY")
    const sessionNumberMatch = sessionNumber.match(/^(\d{4})\/(\d{4})$/);
    if (!sessionNumberMatch) {
      return new NextResponse(
        'Formato do número da sessão inválido. Use o formato XXXX/YYYY',
        { status: 400 }
      );
    }

    const sequenceNumber = parseInt(sessionNumberMatch[1], 10);
    const year = parseInt(sessionNumberMatch[2], 10);

    // Verificar se a sessão existe
    const existingSession = await prismadb.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return new NextResponse('Sessão não encontrada', { status: 404 });
    }

    // Verificar se já existe outra sessão com o mesmo número no mesmo ano
    const duplicateSession = await prismadb.session.findFirst({
      where: {
        sequenceNumber,
        year,
        id: {
          not: id,
        },
      },
    });

    if (duplicateSession) {
      return new NextResponse(
        `Já existe outra sessão com o número ${sessionNumber}`,
        { status: 400 }
      );
    }

    // Se o tipo mudou, recalcular o ordinalNumber
    let ordinalNumber = existingSession.ordinalNumber;
    if (type !== existingSession.type) {
      const lastSessionOfType = await prismadb.session.findFirst({
        where: {
          type: type as any,
        },
        orderBy: {
          ordinalNumber: 'desc',
        },
        select: {
          ordinalNumber: true,
        },
      });

      ordinalNumber = lastSessionOfType ? lastSessionOfType.ordinalNumber + 1 : 1;
    }

    // Criar data no horário local (meio-dia UTC evita problemas de timezone)
    const [year_date, month, day] = sessionDate.split('-');
    const localDate = new Date(parseInt(year_date), parseInt(month) - 1, parseInt(day), 12, 0, 0);

    const updatedSession = await prismadb.session.update({
      where: {
        id,
      },
      data: {
        sessionNumber,
        sequenceNumber,
        year,
        ordinalNumber,
        date: localDate,
        type,
        startTime: startTime || null,
        endTime: endTime || null,
        observations: observations || null,
        status: status || existingSession.status,
        presidentId: presidentId || null,
      },
      include: {
        president: true,
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            resources: true,
          },
        },
      },
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.log('[SESSION_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const sessionData = await prismadb.session.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            resources: true,
          },
        },
        minutes: true,
      },
    });

    if (!sessionData) {
      return new NextResponse('Sessão não encontrada', { status: 404 });
    }

    // Não permitir exclusão se já tem recursos ou atas
    if (sessionData._count.resources > 0 || sessionData.minutes !== null) {
      return new NextResponse(
        'Não é possível excluir sessão com recursos ou atas registradas',
        { status: 400 }
      );
    }

    // Hard delete - Prisma vai deletar recursos em cascata
    await prismadb.session.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: 'Sessão removida com sucesso' });
  } catch (error) {
    console.log('[SESSION_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
