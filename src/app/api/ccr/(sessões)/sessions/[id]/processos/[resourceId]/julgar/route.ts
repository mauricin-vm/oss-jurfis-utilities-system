import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * GET /api/ccr/sessions/[id]/processos/[resourceId]/julgar
 * Busca dados para julgamento do processo (incluindo votações existentes)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: sessionId, resourceId } = await params;

    // Buscar SessionResource com dados completos
    const sessionResource = await prismadb.sessionResource.findUnique({
      where: { id: resourceId },
      include: {
        resource: {
          select: {
            id: true,
            processNumber: true,
            processName: true,
            resourceNumber: true,
            status: true,
            subjects: {
              include: {
                subject: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            authorities: {
              select: {
                id: true,
                type: true,
                authorityRegistered: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        attendances: {
          select: {
            id: true,
            part: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
            customName: true,
            customRole: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        viewRequestedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!sessionResource) {
      return NextResponse.json(
        { error: 'Processo não encontrado na sessão' },
        { status: 404 }
      );
    }

    // Buscar Session com membros
    const sessionData = await prismadb.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        sessionNumber: true,
        date: true,
        members: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Buscar distribuição do recurso nesta sessão
    const distribution = await prismadb.sessionDistribution.findFirst({
      where: {
        resourceId: sessionResource.resource.id,
        sessionId,
        isActive: true,
      },
      include: {
        firstDistribution: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        session: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
          },
        },
      },
    });

    // Buscar dados dos revisores com suas distribuições
    let reviewers: Array<{
      id: string;
      name: string;
      role: string;
      distributionDate: Date | null;
    }> = [];
    if (distribution?.reviewersIds && distribution.reviewersIds.length > 0) {
      const membersData = await prismadb.member.findMany({
        where: {
          id: { in: distribution.reviewersIds },
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
      });

      // Para cada revisor, buscar se ele tem uma distribuição
      reviewers = await Promise.all(
        membersData.map(async (member) => {
          // Buscar distribuição onde este membro foi o distributedTo
          const memberDistribution = await prismadb.sessionDistribution.findFirst({
            where: {
              resourceId: sessionResource.resource.id,
              distributedToId: member.id,
              isActive: true,
            },
            include: {
              session: {
                select: {
                  date: true,
                },
              },
            },
            orderBy: {
              session: {
                date: 'asc',
              },
            },
          });

          return {
            id: member.id,
            name: member.name,
            role: member.role,
            distributionDate: memberDistribution?.session.date || null,
          };
        })
      );
    }

    // Buscar decisões disponíveis
    const preliminaryDecisions = await prismadb.sessionVoteDecision.findMany({
      where: {
        type: 'PRELIMINAR',
        isActive: true,
      },
      orderBy: {
        identifier: 'asc',
      },
    });

    const meritDecisions = await prismadb.sessionVoteDecision.findMany({
      where: {
        type: 'MERITO',
        isActive: true,
      },
      orderBy: {
        identifier: 'asc',
      },
    });

    const officialDecisions = await prismadb.sessionVoteDecision.findMany({
      where: {
        type: 'OFICIO',
        isActive: true,
      },
      orderBy: {
        identifier: 'asc',
      },
    });

    return NextResponse.json({
      sessionResource,
      session: sessionData,
      distribution,
      reviewers,
      preliminaryDecisions,
      meritDecisions,
      officialDecisions,
    });
  } catch (error) {
    console.error('Erro ao buscar dados para julgamento:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}
