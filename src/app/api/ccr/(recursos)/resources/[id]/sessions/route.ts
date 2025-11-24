import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * GET /api/ccr/resources/[id]/sessions
 * Busca todas as sessões onde o recurso foi pautado
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: resourceId } = await params;

    // Buscar o recurso para validação
    const resource = await prismadb.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Recurso não encontrado' },
        { status: 404 }
      );
    }

    // Buscar todas as sessões onde o recurso foi pautado
    const sessionResources = await prismadb.sessionResource.findMany({
      where: {
        resourceId: resourceId,
      },
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
      orderBy: {
        session: {
          date: 'desc',
        },
      },
    });

    // Buscar todos os resultados do recurso
    const allResults = await prismadb.sessionResult.findMany({
      where: {
        resourceId: resourceId,
      },
      include: {
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
        votes: {
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Para cada sessionResource, buscar a distribuição ativa, os revisores e os resultados
    const sessionsWithDistribution = await Promise.all(
      sessionResources.map(async (sessionResource) => {
        const distribution = await prismadb.sessionDistribution.findFirst({
          where: {
            resourceId: resourceId,
            sessionId: sessionResource.sessionId,
          },
        });

        let firstDistribution = null;
        let distributedTo = null;
        let reviewers = [];

        if (distribution) {
          // Buscar o primeiro distribuído (relator)
          if (distribution.firstDistributionId) {
            firstDistribution = await prismadb.member.findUnique({
              where: { id: distribution.firstDistributionId },
              select: {
                id: true,
                name: true,
                role: true,
              },
            });
          }

          // Buscar quem recebeu a distribuição nesta sessão
          distributedTo = await prismadb.member.findUnique({
            where: { id: distribution.distributedToId },
            select: {
              id: true,
              name: true,
              role: true,
            },
          });

          // Buscar os revisores usando os IDs
          if (distribution.reviewersIds && distribution.reviewersIds.length > 0) {
            reviewers = await prismadb.member.findMany({
              where: {
                id: { in: distribution.reviewersIds },
              },
              select: {
                id: true,
                name: true,
                role: true,
              },
            });
          }
        }

        // Filtrar resultados julgados nesta sessão específica
        const sessionResults = allResults.filter(
          (result) => result.judgedInSessionId === sessionResource.sessionId
        );

        return {
          ...sessionResource,
          distribution: distribution ? {
            firstDistribution,
            distributedTo,
            reviewers,
          } : null,
          results: sessionResults,
        };
      })
    );

    return NextResponse.json(sessionsWithDistribution);
  } catch (error) {
    console.log('[RESOURCE_SESSIONS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
