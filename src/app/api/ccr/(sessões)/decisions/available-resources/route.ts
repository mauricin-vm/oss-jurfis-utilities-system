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
    const search = searchParams.get('search');

    // Buscar recursos que:
    // 1. Têm resultado de sessão (foram julgados)
    // 2. Ainda não têm acórdão criado
    const resources = await prismadb.resource.findMany({
      where: {
        // Tem resultado de sessão
        sessionResults: {
          some: {},
        },
        // Não tem acórdão
        decisions: {
          none: {},
        },
        // Filtro de busca
        ...(search && {
          OR: [
            { resourceNumber: { contains: search, mode: 'insensitive' } },
            { processNumber: { contains: search, mode: 'insensitive' } },
            { processName: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true,
        resourceNumber: true,
        processNumber: true,
        processName: true,
        sessionResults: {
          where: {
            status: 'CONCLUIDA',
          },
          select: {
            id: true,
            votingType: true,
            status: true,
            winningMember: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            judgedInSession: {
              select: {
                id: true,
                sessionNumber: true,
                date: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        // Buscar a sessão onde foi julgado para obter relator, revisores e texto da ata
        sessions: {
          where: {
            status: 'JULGADO',
          },
          select: {
            id: true,
            minutesText: true,
            session: {
              select: {
                id: true,
                sessionNumber: true,
                date: true,
                distributions: {
                  select: {
                    id: true,
                    resourceId: true,
                    firstDistribution: {
                      select: {
                        id: true,
                        name: true,
                        role: true,
                      },
                    },
                    reviewersIds: true,
                  },
                },
                members: {
                  select: {
                    member: {
                      select: {
                        id: true,
                        name: true,
                        role: true,
                      },
                    },
                  },
                },
                president: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: [
        { year: 'desc' },
        { sequenceNumber: 'desc' },
      ],
      take: 50, // Limitar resultados
    });

    return NextResponse.json(resources);
  } catch (error) {
    console.error('[DECISIONS_AVAILABLE_RESOURCES]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
