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
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');

    if (!search || search.trim().length < 1) {
      return new NextResponse('Busca deve ter pelo menos 1 caractere', { status: 400 });
    }

    const searchTerm = search.trim();

    // Verificar se a lista existe
    const list = await prismadb.notificationList.findUnique({
      where: { id },
      include: {
        items: {
          select: {
            resourceId: true,
          },
        },
      },
    });

    if (!list) {
      return new NextResponse('Lista não encontrada', { status: 404 });
    }

    // IDs dos recursos já na lista (para excluir da busca)
    const existingResourceIds = list.items.map((item) => item.resourceId);

    // Verificar se a busca parece ser uma data (dd/mm/yyyy)
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const dateMatch = searchTerm.match(dateRegex);
    let sessionDateFilter: Date | null = null;

    if (dateMatch) {
      const [, day, month, year] = dateMatch;
      sessionDateFilter = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Buscar recursos
    const resources = await prismadb.resource.findMany({
      where: {
        id: {
          notIn: existingResourceIds,
        },
        OR: [
          // Busca por número do recurso
          {
            resourceNumber: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          // Busca por número do processo
          {
            processNumber: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          // Busca por nome do processo (razão social)
          {
            processName: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          // Busca por número da sessão
          {
            sessions: {
              some: {
                session: {
                  sessionNumber: {
                    contains: searchTerm,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
          // Busca por data da sessão (se for uma data válida)
          ...(sessionDateFilter
            ? [
                {
                  sessions: {
                    some: {
                      session: {
                        date: sessionDateFilter,
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },
      include: {
        sessions: {
          orderBy: {
            session: {
              date: 'desc',
            },
          },
          take: 1,
          include: {
            session: {
              select: {
                id: true,
                sessionNumber: true,
                date: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { sequenceNumber: 'desc' },
      ],
      take: 20,
    });

    // Formatar resposta
    const formattedResources = resources.map((resource) => ({
      id: resource.id,
      resourceNumber: resource.resourceNumber,
      processNumber: resource.processNumber,
      processName: resource.processName,
      year: resource.year,
      type: resource.type,
      status: resource.status,
      lastSession: resource.sessions[0]
        ? {
            id: resource.sessions[0].session.id,
            sessionNumber: resource.sessions[0].session.sessionNumber,
            date: resource.sessions[0].session.date,
            status: resource.sessions[0].session.status,
          }
        : null,
    }));

    return NextResponse.json(formattedResources);
  } catch (error) {
    console.error('[INTIMACAO_AVAILABLE_RESOURCES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
