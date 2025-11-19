import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// PATCH /api/ccr/sessions/[id]/processos/[resourceId]/votings/[votingId]/complete - Concluir votação
export async function PATCH(
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
    const body = await req.json();
    const {
      winningMemberId,
      qualityVoteUsed,
      qualityVoteMemberId,
      finalText,
      totalVotes,
      votesInFavor,
      votesAgainst,
      abstentions,
      absences,
      impediments,
      suspicions,
    } = body;

    // Validações
    if (!winningMemberId) {
      return NextResponse.json(
        { error: 'ID do membro vencedor é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o resultado existe
    const result = await prismadb.sessionResult.findUnique({
      where: { id: votingId },
      include: {
        votes: true,
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Resultado não encontrado' }, { status: 404 });
    }

    if (result.status === 'CONCLUIDA') {
      return NextResponse.json({ error: 'Votação já foi concluída' }, { status: 400 });
    }

    // Verificar se o membro vencedor fez parte da votação
    const winningVote = result.votes.find((v) => v.memberId === winningMemberId);
    if (!winningVote) {
      return NextResponse.json(
        { error: 'Membro vencedor não está entre os votos desta votação' },
        { status: 400 }
      );
    }

    // Atualizar o resultado
    const updatedResult = await prismadb.sessionResult.update({
      where: { id: votingId },
      data: {
        status: 'CONCLUIDA',
        judgedInSessionId: sessionId, // Registra em qual sessão foi julgado
        completedAt: new Date(), // Registra data/hora da conclusão
        winningVoteId: winningVote.id,
        winningMemberId,
        qualityVoteUsed,
        qualityVoteMemberId: qualityVoteUsed ? qualityVoteMemberId : null,
        finalText: finalText || null,
        totalVotes,
        votesInFavor,
        votesAgainst,
        abstentions: abstentions || 0,
        absences: absences || 0,
        impediments: impediments || 0,
        suspicions: suspicions || 0,
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
    });

    // Adicionar label
    const resultWithLabel = {
      ...updatedResult,
      label: updatedResult.preliminaryDecision
        ? `Não Conhecimento - ${updatedResult.preliminaryDecision.identifier}`
        : updatedResult.votingType === 'NAO_CONHECIMENTO'
        ? 'Não Conhecimento'
        : 'Mérito',
    };

    return NextResponse.json(resultWithLabel);
  } catch (error) {
    console.log('[VOTING_COMPLETE_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
