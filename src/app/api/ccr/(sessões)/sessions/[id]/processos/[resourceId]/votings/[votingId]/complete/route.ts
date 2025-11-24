import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// POST /api/ccr/sessions/[id]/processos/[resourceId]/votings/[votingId]/complete - Concluir votação
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
    const body = await req.json();
    const { winningMemberId } = body;

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
        votes: {
          include: {
            member: true,
            followsVote: {
              include: {
                member: true,
              },
            },
          },
        },
      },
    });

    if (!result) {
      return NextResponse.json({ error: 'Resultado não encontrado' }, { status: 404 });
    }

    // Verificar se o membro vencedor fez parte da votação (deve ser relator ou revisor)
    const winningVote = result.votes.find(
      (v) => v.member.id === winningMemberId && (v.voteType === 'RELATOR' || v.voteType === 'REVISOR')
    );
    if (!winningVote) {
      return NextResponse.json(
        { error: 'Membro vencedor não está entre os votos desta votação' },
        { status: 400 }
      );
    }

    // Calcular totais automaticamente dos votos
    let totalVotes = 0;
    let abstentions = 0;
    let absences = 0;
    let impediments = 0;
    let suspicions = 0;
    let qualityVoteUsed = false;
    let qualityVoteMemberId: string | null = null;

    result.votes.forEach((vote) => {
      if (vote.participationStatus === 'PRESENTE' && vote.followsVote) {
        totalVotes++;
        // Verificar se é voto de qualidade (presidente)
        if (vote.voteType === 'PRESIDENTE') {
          qualityVoteUsed = true;
          qualityVoteMemberId = vote.memberId;
        }
      } else if (vote.participationStatus === 'ABSTENCAO') {
        abstentions++;
      } else if (vote.participationStatus === 'AUSENTE') {
        absences++;
      } else if (vote.participationStatus === 'IMPEDIDO') {
        impediments++;
      } else if (vote.participationStatus === 'SUSPEITO') {
        suspicions++;
      }
    });

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
        qualityVoteMemberId,
        totalVotes,
        abstentions,
        absences,
        impediments,
        suspicions,
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
    console.log('[VOTING_COMPLETE_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
