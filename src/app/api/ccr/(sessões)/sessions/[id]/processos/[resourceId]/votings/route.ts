import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// GET /api/ccr/sessions/[id]/processos/[resourceId]/votings - Listar votações do processo
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: sessionId, resourceId } = await params;

    // Buscar o SessionResource
    const sessionResource = await prismadb.sessionResource.findUnique({
      where: {
        id: resourceId,
      },
    });

    if (!sessionResource || sessionResource.sessionId !== sessionId) {
      return NextResponse.json(
        { error: 'Processo não encontrado na sessão' },
        { status: 404 }
      );
    }

    // Buscar TODOS os resultados das votações do processo (de todas as sessões)
    const results = await prismadb.sessionResult.findMany({
      where: {
        resourceId: sessionResource.resourceId, // Busca pelo Resource (processo)
      },
      include: {
        resource: {
          select: {
            processNumber: true,
            processName: true,
            resourceNumber: true,
          },
        },
        judgedInSession: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
          },
        },
        preliminaryDecision: {
          select: {
            id: true,
            identifier: true,
            type: true,
          },
        },
        winningMember: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        qualityVoteMember: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        votes: {
          select: {
            id: true,
            voteType: true,
            voteKnowledgeType: true,
            participationStatus: true,
            member: {
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
            preliminaryDecision: {
              select: {
                id: true,
                identifier: true,
                type: true,
              },
            },
            meritDecision: {
              select: {
                id: true,
                identifier: true,
                type: true,
              },
            },
            officialDecision: {
              select: {
                id: true,
                identifier: true,
                type: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Adicionar label para cada resultado
    const resultsWithLabels = results.map((result) => ({
      ...result,
      label: result.preliminaryDecision
        ? `Não Conhecimento - ${result.preliminaryDecision.identifier}`
        : result.votingType === 'NAO_CONHECIMENTO'
        ? 'Não Conhecimento'
        : 'Mérito',
    }));

    return NextResponse.json(resultsWithLabels);
  } catch (error) {
    console.log('[VOTINGS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
