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
    const year = searchParams.get('year');

    const minutes = await prismadb.sessionMinutes.findMany({
      where: {
        ...(year && { year: parseInt(year) }),
      },
      include: {
        president: {
          select: {
            id: true,
            name: true,
          },
        },
        session: {
          select: {
            id: true,
            sessionNumber: true,
          },
        },
        _count: {
          select: {
            presentMembers: true,
            absentMembers: true,
            distributions: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { sequenceNumber: 'desc' },
      ],
    });

    return NextResponse.json(minutes);
  } catch (error) {
    console.error('[MINUTES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verificar se é EXTERNAL
    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const {
      ordinalNumber,
      ordinalType,
      endTime,
      administrativeMatters,
      sessionId,
      presidentId,
      presentMembers,
      absentMembers,
    } = body;

    // Validações
    if (!ordinalNumber || ordinalNumber < 1) {
      return new NextResponse('Número ordinal é obrigatório', { status: 400 });
    }

    if (!ordinalType) {
      return new NextResponse('Tipo de sessão é obrigatório', { status: 400 });
    }

    if (!endTime || endTime.trim() === '') {
      return new NextResponse('Horário de encerramento é obrigatório', { status: 400 });
    }

    // Obter o ano atual
    const currentYear = new Date().getFullYear();

    // Buscar o último sequenceNumber do ano atual
    const lastMinutes = await prismadb.sessionMinutes.findFirst({
      where: { year: currentYear },
      orderBy: { sequenceNumber: 'desc' },
    });

    const sequenceNumber = lastMinutes ? lastMinutes.sequenceNumber + 1 : 1;

    // Gerar número da ata: sequenceNumber/year
    const minutesNumber = `${String(sequenceNumber).padStart(3, '0')}/${currentYear}`;

    // Criar a ata
    const minutes = await prismadb.sessionMinutes.create({
      data: {
        minutesNumber,
        sequenceNumber,
        year: currentYear,
        ordinalNumber,
        ordinalType,
        endTime: endTime.trim(),
        administrativeMatters: administrativeMatters?.trim() || null,
        sessionId: sessionId || null,
        presidentId: presidentId || null,
        createdBy: session.user.id,
        presentMembers: {
          create: (presentMembers || []).map((pm: any) => ({
            memberId: pm.memberId,
          })),
        },
        absentMembers: {
          create: (absentMembers || []).map((am: any) => ({
            memberId: am.memberId,
            isJustified: am.isJustified || false,
            justification: am.justification || null,
          })),
        },
      },
      include: {
        president: {
          select: {
            id: true,
            name: true,
          },
        },
        session: {
          select: {
            id: true,
            sessionNumber: true,
          },
        },
        presentMembers: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        absentMembers: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(minutes);
  } catch (error) {
    console.error('[MINUTES_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
