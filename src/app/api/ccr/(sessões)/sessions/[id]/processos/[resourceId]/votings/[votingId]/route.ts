import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// GET /api/ccr/sessions/[id]/processos/[resourceId]/votings/[votingId] - Detalhes da votação
export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; resourceId: string; votingId: string }>;
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: sessionId, resourceId, votingId } = await params;

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

    // Buscar o resultado da votação com todos os dados
    const result = await prismadb.sessionResult.findUnique({
      where: { id: votingId },
      include: {
        resource: {
          select: {
            id: true,
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
          include: {
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
            followsVote: {
              include: {
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
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });
    }

    // Adicionar label
    const resultWithLabel = {
      ...result,
      label: result.preliminaryDecision
        ? `Não Conhecimento - ${result.preliminaryDecision.identifier}`
        : result.votingType === 'NAO_CONHECIMENTO'
        ? 'Não Conhecimento'
        : 'Mérito',
    };

    return NextResponse.json(resultWithLabel);
  } catch (error) {
    console.log('[VOTING_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// DELETE /api/ccr/sessions/[id]/processos/[resourceId]/votings/[votingId] - Excluir votação
export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; resourceId: string; votingId: string }>;
  }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: sessionId, resourceId, votingId } = await params;

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

    // Buscar o resultado da votação com os votos
    const result = await prismadb.sessionResult.findUnique({
      where: { id: votingId },
      include: {
        votes: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Votação não encontrada' }, { status: 404 });
    }

    // Verificar se a votação está concluída
    if (result.status === 'CONCLUIDA') {
      return NextResponse.json(
        { error: 'Não é possível excluir uma votação já concluída' },
        { status: 400 }
      );
    }

    // Para cada voto de revisor, verificar se deve ser removido da lista de revisores
    const revisorVotes = result.votes.filter((v) => v.voteType === 'REVISOR');

    for (const vote of revisorVotes) {
      // Buscar a distribuição ativa do processo
      const distribution = await prismadb.sessionDistribution.findFirst({
        where: {
          resourceId: sessionResource.resourceId,
          isActive: true,
        },
      });

      if (distribution) {
        // Verificar se o voto foi criado NESTA sessão
        // Se sim, significa que o revisor foi adicionado nesta sessão (pedido de vista)
        const voteCreatedInCurrentSession = vote.sessionId === sessionId;

        // Se o voto foi criado nesta sessão E o revisor está na lista de revisores, remover
        if (voteCreatedInCurrentSession && distribution.reviewersIds.includes(vote.memberId)) {
          // Verificar se há distribuições anteriores onde esse membro já era revisor
          const previousDistributions = await prismadb.sessionDistribution.findMany({
            where: {
              resourceId: sessionResource.resourceId,
              sessionId: { not: sessionId },
              reviewersIds: { has: vote.memberId },
            },
          });

          // Se não há distribuições anteriores, significa que foi adicionado APENAS nesta sessão
          if (previousDistributions.length === 0) {
            const updatedReviewersIds = distribution.reviewersIds.filter(
              (id) => id !== vote.memberId
            );

            await prismadb.sessionDistribution.update({
              where: { id: distribution.id },
              data: {
                reviewersIds: updatedReviewersIds,
              },
            });
          }
        }
      }
    }

    // Deletar os votos vinculados à votação
    await prismadb.sessionVote.deleteMany({
      where: {
        sessionResultId: votingId,
      },
    });

    // Deletar o resultado da votação
    await prismadb.sessionResult.delete({
      where: { id: votingId },
    });

    return NextResponse.json({ message: 'Votação excluída com sucesso' });
  } catch (error) {
    console.log('[VOTING_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
