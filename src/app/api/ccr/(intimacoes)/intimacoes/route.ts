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
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (year) {
      where.year = parseInt(year);
    }

    const lists = await prismadb.notificationList.findMany({
      where,
      include: {
        items: {
          include: {
            resource: {
              select: {
                id: true,
                resourceNumber: true,
                processNumber: true,
                processName: true,
              },
            },
            attempts: {
              select: {
                id: true,
                channel: true,
                status: true,
                deadline: true,
              },
              orderBy: {
                attemptNumber: 'asc',
              },
            },
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { sequenceNumber: 'desc' },
      ],
    });

    return NextResponse.json(lists);
  } catch (error) {
    console.error('[INTIMACOES_LISTS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const { type } = body;

    // Validar tipo
    const validTypes = ['ADMISSIBILIDADE', 'SESSAO', 'DILIGENCIA', 'DECISAO', 'OUTRO'];
    if (!type || !validTypes.includes(type)) {
      return new NextResponse('Tipo de lista inválido', { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    // Buscar o último número do ano
    const lastList = await prismadb.notificationList.findFirst({
      where: { year: currentYear },
      orderBy: { sequenceNumber: 'desc' },
    });

    // Gerar próximo número sequencial (1, 2, etc)
    const nextSequenceNumber = lastList ? lastList.sequenceNumber + 1 : 1;
    const listNumber = `${String(nextSequenceNumber).padStart(3, '0')}/${currentYear}`;

    // Criar a lista
    const list = await prismadb.notificationList.create({
      data: {
        listNumber,
        sequenceNumber: nextSequenceNumber,
        year: currentYear,
        type: type,
        createdBy: session.user.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error('[INTIMACOES_LISTS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
