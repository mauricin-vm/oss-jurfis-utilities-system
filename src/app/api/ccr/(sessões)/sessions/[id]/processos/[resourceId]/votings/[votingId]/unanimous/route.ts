import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// POST /api/ccr/sessions/[id]/processos/[resourceId]/votings/[votingId]/unanimous - Declarar votação como unânime
export async function POST(
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

    // Verificar se já está concluída
    if (result.status === 'CONCLUIDA') {
      return NextResponse.json(
        { error: 'Esta votação já está concluída' },
        { status: 400 }
      );
    }

    // Verificar se há exatamente 1 voto
    if (result.votes.length !== 1) {
      return NextResponse.json(
        { error: 'Só é possível declarar como unânime quando há exatamente 1 voto registrado' },
        { status: 400 }
      );
    }

    const originalVote = result.votes[0];

    // Buscar a sessão para obter todos os membros
    const sessionData = await prismadb.session.findUnique({
      where: { id: sessionId },
      include: {
        members: {
          include: {
            member: true,
          },
        },
      },
    });

    if (!sessionData) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }

    // Buscar distribuição para identificar relator e revisores
    const distribution = await prismadb.sessionDistribution.findFirst({
      where: {
        resourceId: sessionResource.resourceId,
        isActive: true,
      },
    });

    // IDs de membros que não devem votar (relator e revisores)
    const excludedMemberIds = new Set<string>();
    if (distribution) {
      excludedMemberIds.add(distribution.distributedToId); // Relator
      distribution.reviewersIds.forEach(id => excludedMemberIds.add(id)); // Revisores
    }

    // Filtrar membros que podem votar (excluindo quem já votou, relator e revisores)
    const membersThatShouldVote = sessionData.members.filter(
      sm => !excludedMemberIds.has(sm.member.id) && sm.member.id !== originalVote.memberId
    );

    // Criar votos para todos os demais membros seguindo o voto original
    const newVotes = membersThatShouldVote.map(sm => ({
      sessionId,
      sessionResourceId: resourceId,
      memberId: sm.member.id,
      voteType: 'VOTANTE',
      voteKnowledgeType: originalVote.voteKnowledgeType,
      voteText: originalVote.voteText,
      participationStatus: 'PRESENTE',
      preliminaryDecisionId: originalVote.preliminaryDecisionId,
      meritDecisionId: originalVote.meritDecisionId,
      officialDecisionId: originalVote.officialDecisionId,
      followsVoteId: originalVote.id, // Seguir o voto original
      sessionResultId: votingId,
    }));

    // Criar os votos em lote
    if (newVotes.length > 0) {
      await prismadb.sessionVote.createMany({
        data: newVotes,
      });
    }

    // Marcar votação como concluída e definir vencedor
    await prismadb.sessionResult.update({
      where: { id: votingId },
      data: {
        status: 'CONCLUIDA',
        completedAt: new Date(),
        winningMemberId: originalVote.memberId, // O único votante é o vencedor
        qualityVoteMemberId: null, // Não houve voto de qualidade
      },
    });

    return NextResponse.json({
      message: 'Votação declarada como unânime com sucesso',
      votesCreated: newVotes.length,
    });
  } catch (error) {
    console.log('[VOTING_UNANIMOUS]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
