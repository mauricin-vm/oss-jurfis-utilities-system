import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * DELETE /api/ccr/sessions/[id]/processos/[resourceId]/votes/[voteId]
 * Remove um voto de uma votação, com verificação especial para revisores
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string; voteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: sessionId, resourceId, voteId } = await params;

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

    // Verificar se o voto existe
    const vote = await prismadb.sessionVote.findUnique({
      where: { id: voteId },
      include: {
        member: true,
      },
    });

    if (!vote) {
      return NextResponse.json(
        { error: 'Voto não encontrado' },
        { status: 404 }
      );
    }

    // Se for voto de REVISOR, verificar se deve remover da lista de revisores
    if (vote.voteType === 'REVISOR') {
      // Buscar distribuição ativa
      const distribution = await prismadb.sessionDistribution.findFirst({
        where: {
          resourceId: sessionResource.resourceId,
          isActive: true,
        },
      });

      if (distribution && distribution.reviewersIds.includes(vote.memberId)) {
        // Verificar se o revisor foi adicionado NESTA sessão
        // Buscar se há votos de revisor deste membro em sessões anteriores
        const previousRevisorVotes = await prismadb.sessionVote.findFirst({
          where: {
            sessionResourceId: resourceId,
            memberId: vote.memberId,
            voteType: 'REVISOR',
            sessionId: { not: sessionId }, // Sessões diferentes desta
          },
        });

        // Se NÃO há votos anteriores, remover da lista de revisores
        if (!previousRevisorVotes) {
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

    // Verificar a qual votação este voto pertence
    const votingId = vote.sessionResultId;

    // Deletar o voto
    await prismadb.sessionVote.delete({
      where: { id: voteId },
    });

    // Verificar se ainda há votos nesta votação
    if (votingId) {
      const remainingVotes = await prismadb.sessionVote.count({
        where: { sessionResultId: votingId },
      });

      // Se não há mais votos, deletar a votação também
      if (remainingVotes === 0) {
        await prismadb.sessionResult.delete({
          where: { id: votingId },
        });
        return NextResponse.json({
          success: true,
          message: 'Voto excluído com sucesso. A votação foi removida pois não tinha mais votos.',
          votingDeleted: true
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Voto excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar voto:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar voto' },
      { status: 500 }
    );
  }
}
