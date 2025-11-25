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
        absences: {
          select: {
            id: true,
            member: {
              select: {
                id: true,
                name: true,
                role: true,
                gender: true,
              },
            },
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
        specificPresident: {
          select: {
            id: true,
            name: true,
            role: true,
            gender: true,
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
        status: true,
        president: {
          select: {
            id: true,
            name: true,
            role: true,
            gender: true,
          },
        },
        members: {
          include: {
            member: {
              select: {
                id: true,
                name: true,
                role: true,
                gender: true,
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

    // Buscar a primeira distribuição do relator (primeira vez que ele foi distributedTo)
    let relatorDistributionDate: Date | null = null;
    if (distribution?.firstDistribution) {
      const firstRelatorDistribution = await prismadb.sessionDistribution.findFirst({
        where: {
          resourceId: sessionResource.resource.id,
          distributedToId: distribution.firstDistribution.id,
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
      relatorDistributionDate = firstRelatorDistribution?.session.date || null;
    }

    // Buscar dados dos revisores com suas distribuições
    let reviewers: Array<{
      id: string;
      name: string;
      role: string | null;
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

    // Buscar todos os membros que já receberam distribuição (distributedToId) neste recurso
    const allDistributions = await prismadb.sessionDistribution.findMany({
      where: {
        resourceId: sessionResource.resource.id,
        isActive: true,
      },
      select: {
        firstDistributionId: true,
        distributedToId: true,
      },
    });

    const distributedMemberIds = new Set<string>();

    // Adicionar firstDistributionId (relator)
    allDistributions.forEach(dist => {
      if (dist.firstDistributionId) {
        distributedMemberIds.add(dist.firstDistributionId);
      }
      // Adicionar distributedToId (quem recebeu distribuição nesta sessão)
      distributedMemberIds.add(dist.distributedToId);
    });

    // Buscar todas as votações deste recurso para debug
    const allVotings = await prismadb.sessionResult.findMany({
      where: {
        resourceId: sessionResource.resource.id,
      },
      select: {
        id: true,
        status: true,
        votingType: true,
      },
    });

    // Buscar votações concluídas (de todas as sessões)
    const completedVotings = await prismadb.sessionResult.findMany({
      where: {
        resourceId: sessionResource.resource.id,
        status: 'CONCLUIDA',
      },
      select: {
        id: true,
        votingType: true,
        status: true,
        order: true,
        judgedInSession: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
          },
        },
        votes: {
          select: {
            id: true,
            voteType: true,
            voteKnowledgeType: true,
            voteText: true,
            participationStatus: true,
            followsVoteId: true,
            member: {
              select: {
                id: true,
                name: true,
                role: true,
                gender: true,
              },
            },
            preliminaryDecision: {
              select: {
                id: true,
                identifier: true,
              },
            },
            meritDecision: {
              select: {
                id: true,
                identifier: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        winningMember: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          judgedInSession: {
            date: 'asc',
          },
        },
        {
          order: 'asc',
        },
      ],
    });

    return NextResponse.json({
      sessionResource,
      session: sessionData,
      distribution,
      relatorDistributionDate,
      reviewers,
      distributedMemberIds: Array.from(distributedMemberIds),
      completedVotings,
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
