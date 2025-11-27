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

    const list = await prismadb.notificationList.findUnique({
      where: { id },
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
              include: {
                confirmedByUser: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              orderBy: {
                attemptNumber: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
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
    });

    if (!list) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    return NextResponse.json(list);
  } catch (error) {
    console.error('[INTIMACAO_LIST_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    const existingList = await prismadb.notificationList.findUnique({
      where: { id },
    });

    if (!existingList) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    const body = await req.json();
    const { status } = body;

    const list = await prismadb.notificationList.update({
      where: { id },
      data: {
        status: status !== undefined ? status : existingList.status,
      },
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
              include: {
                confirmedByUser: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
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
    });

    return NextResponse.json(list);
  } catch (error) {
    console.error('[INTIMACAO_LIST_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    const existingList = await prismadb.notificationList.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!existingList) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    // Não permitir deletar se já tem itens
    if (existingList._count.items > 0) {
      return new NextResponse('Não é possível excluir uma lista com processos', { status: 400 });
    }

    await prismadb.notificationList.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[INTIMACAO_LIST_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
