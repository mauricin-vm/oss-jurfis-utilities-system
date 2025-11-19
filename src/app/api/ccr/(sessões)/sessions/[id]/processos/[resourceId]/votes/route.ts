import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * POST /api/ccr/sessions/[id]/processos/[resourceId]/votes
 * Adiciona um voto a um resultado de votação existente
 *
 * Nota: Este endpoint está usando a estrutura antiga e precisa ser atualizado
 * para usar SessionVote ao invés de SessionMemberVote (que não existe mais)
 */
export async function POST(
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
    const body = await req.json();
    const {
      resultId,
      memberId,
      voteType,
      participationStatus,
      voteKnowledgeType,
      preliminaryDecisionId,
      meritDecisionId,
      officialDecisionId,
      voteText,
      followsVoteId,
    } = body;

    // Validações
    if (!resultId || !memberId || !voteKnowledgeType) {
      return NextResponse.json(
        { error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    // Verificar se resultado existe
    const result = await prismadb.sessionResult.findUnique({
      where: { id: resultId },
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Resultado não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se membro já votou nesta votação
    const existingVote = await prismadb.sessionVote.findFirst({
      where: {
        sessionResultId: resultId,
        memberId,
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: 'Este membro já votou nesta votação' },
        { status: 400 }
      );
    }

    // Criar voto
    const vote = await prismadb.sessionVote.create({
      data: {
        sessionResourceId: resourceId,
        sessionResultId: resultId,
        memberId,
        sessionId,
        voteType: voteType || 'REVISOR',
        participationStatus: participationStatus || 'PRESENTE',
        voteKnowledgeType,
        preliminaryDecisionId: preliminaryDecisionId || null,
        meritDecisionId: meritDecisionId || null,
        officialDecisionId: officialDecisionId || null,
        voteText: voteText || null,
        followsVoteId: followsVoteId || null,
      },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            role: true,
            gender: true,
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
    });

    // Atualizar contadores do resultado
    await prismadb.sessionResult.update({
      where: { id: resultId },
      data: {
        totalVotes: {
          increment: 1,
        },
      },
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error('Erro ao adicionar voto:', error);
    return NextResponse.json(
      { error: 'Erro ao adicionar voto' },
      { status: 500 }
    );
  }
}
