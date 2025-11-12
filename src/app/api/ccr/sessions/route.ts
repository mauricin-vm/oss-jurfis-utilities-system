import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    const sessions = await prismadb.session.findMany({
      where: {
        ...(type && { type: type as any }),
        ...(status && { status: status as any }),
        ...(year && {
          date: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`),
          },
        }),
      },
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
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.log('[SESSIONS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const {
      sessionNumber,
      sessionDate,
      type,
      startTime,
      endTime,
      observations,
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

    // Verificar se já existe sessão com o mesmo número no mesmo ano
    const existingSession = await prismadb.session.findFirst({
      where: {
        sequenceNumber,
        year,
      },
    });

    if (existingSession) {
      return new NextResponse(
        `Já existe uma sessão com o número ${sessionNumber}`,
        { status: 400 }
      );
    }

    // Buscar o último ordinalNumber para o tipo de sessão
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

    const ordinalNumber = lastSessionOfType ? lastSessionOfType.ordinalNumber + 1 : 1;

    // Criar data no horário local (meio-dia UTC evita problemas de timezone)
    const [year_date, month, day] = sessionDate.split('-');
    const localDate = new Date(parseInt(year_date), parseInt(month) - 1, parseInt(day), 12, 0, 0);

    const newSession = await prismadb.session.create({
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
        status: 'PENDENTE',
        presidentId: presidentId || null,
        createdBy: session.user.id,
      },
      include: {
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

    return NextResponse.json(newSession);
  } catch (error) {
    console.log('[SESSIONS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
