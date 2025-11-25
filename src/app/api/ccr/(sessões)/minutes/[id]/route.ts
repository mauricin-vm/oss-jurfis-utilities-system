import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = params;

    const minutes = await prismadb.sessionMinutes.findUnique({
      where: { id },
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
        distributions: {
          include: {
            distribution: {
              include: {
                resource: true,
              },
            },
          },
        },
      },
    });

    if (!minutes) {
      return new NextResponse('Ata não encontrada', { status: 404 });
    }

    return NextResponse.json(minutes);
  } catch (error) {
    console.error('[MINUTES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verificar se é EXTERNAL
    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = params;

    // Verificar se a ata existe
    const existingMinutes = await prismadb.sessionMinutes.findUnique({
      where: { id },
    });

    if (!existingMinutes) {
      return new NextResponse('Ata não encontrada', { status: 404 });
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

    // Atualizar a ata
    const minutes = await prismadb.sessionMinutes.update({
      where: { id },
      data: {
        ordinalNumber,
        ordinalType,
        endTime: endTime.trim(),
        administrativeMatters: administrativeMatters?.trim() || null,
        sessionId: sessionId || null,
        presidentId: presidentId || null,
        presentMembers: {
          deleteMany: {},
          create: (presentMembers || []).map((pm: any) => ({
            memberId: pm.memberId,
          })),
        },
        absentMembers: {
          deleteMany: {},
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
    console.error('[MINUTES_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apenas ADMIN pode excluir
    if (session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = params;

    // Verificar se a ata existe
    const existingMinutes = await prismadb.sessionMinutes.findUnique({
      where: { id },
    });

    if (!existingMinutes) {
      return new NextResponse('Ata não encontrada', { status: 404 });
    }

    // Excluir a ata (cascade irá excluir membros e ausências relacionadas)
    await prismadb.sessionMinutes.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Ata removida com sucesso' });
  } catch (error) {
    console.error('[MINUTES_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
