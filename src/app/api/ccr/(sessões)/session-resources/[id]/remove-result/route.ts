import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * DELETE /api/ccr/session-resources/[id]/remove-result
 * Remove o resultado de um processo em pauta (votações, votos e status)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    // Buscar o SessionResource
    const sessionResource = await prismadb.sessionResource.findUnique({
      where: {
        id,
      },
      include: {
        session: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!sessionResource) {
      return new NextResponse('Recurso de sessão não encontrado', { status: 404 });
    }

    // Validar se a sessão não está concluída
    if (sessionResource.session.status === 'CONCLUIDA') {
      return NextResponse.json(
        { error: 'Não é possível remover resultado de sessão concluída' },
        { status: 400 }
      );
    }

    // Buscar todos os resultados e votos antes de deletar (para processar revisores)
    const results = await prismadb.sessionResult.findMany({
      where: {
        resourceId: sessionResource.resourceId,
      },
      include: {
        votes: {
          include: {
            member: true,
          },
        },
      },
    });

    // Para cada voto de revisor, verificar se deve ser removido da lista de revisores
    for (const result of results) {
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
          const voteCreatedInCurrentSession = vote.sessionId === sessionResource.sessionId;

          // Se o voto foi criado nesta sessão E o revisor está na lista de revisores, remover
          if (voteCreatedInCurrentSession && distribution.reviewersIds.includes(vote.memberId)) {
            // Verificar se há distribuições anteriores onde esse membro já era revisor
            const previousDistributions = await prismadb.sessionDistribution.findMany({
              where: {
                resourceId: sessionResource.resourceId,
                sessionId: { not: sessionResource.sessionId },
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
    }

    // Deletar todos os SessionResult (votações) do recurso
    await prismadb.sessionResult.deleteMany({
      where: {
        resourceId: sessionResource.resourceId,
      },
    });

    // Deletar todos os SessionVote do recurso
    await prismadb.sessionVote.deleteMany({
      where: {
        sessionResourceId: sessionResource.id,
      },
    });

    // Resetar o SessionResource para status EM_PAUTA e limpar campos de resultado
    await prismadb.sessionResource.update({
      where: {
        id,
      },
      data: {
        status: 'EM_PAUTA',
        minutesText: null,
        diligenceDaysDeadline: null,
        viewRequestedById: null,
      },
    });

    return NextResponse.json({ message: 'Resultado removido com sucesso' });
  } catch (error) {
    console.error('Erro ao remover resultado:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
