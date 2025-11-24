import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// GET /api/ccr/sessions/[id]/processos/[resourceId]/group-votes - Agrupar votos em votações
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

    // Buscar todos os votos ainda não vinculados a votações
    const votes = await prismadb.sessionVote.findMany({
      where: {
        sessionResourceId: sessionResource.id,
        sessionResultId: null, // Apenas votos não vinculados
      },
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
    });

    // Agrupar votos por tipo
    const groupedResults: any[] = [];

    // Grupo 1: Votos de Não Conhecimento com preliminar
    const preliminaryVotes = votes.filter(
      (v) => v.voteKnowledgeType === 'NAO_CONHECIMENTO' && v.preliminaryDecisionId
    );

    // Agrupar por decisão preliminar
    const preliminaryGroups = new Map<string, typeof votes>();
    preliminaryVotes.forEach((vote) => {
      const key = vote.preliminaryDecisionId!;
      if (!preliminaryGroups.has(key)) {
        preliminaryGroups.set(key, []);
      }
      preliminaryGroups.get(key)!.push(vote);
    });

    preliminaryGroups.forEach((groupVotes, preliminaryDecisionId) => {
      const decision = groupVotes[0].preliminaryDecision!;
      groupedResults.push({
        votingType: 'NAO_CONHECIMENTO',
        preliminaryDecisionId,
        preliminaryDecision: decision,
        votes: groupVotes,
        status: 'PENDENTE',
        label: `Não Conhecimento - ${decision.identifier}`,
      });
    });

    // Grupo 2: Votos de Não Conhecimento sem preliminar (só ofício)
    const naoConhecimentoSemPreliminar = votes.filter(
      (v) => v.voteKnowledgeType === 'NAO_CONHECIMENTO' && !v.preliminaryDecisionId
    );

    if (naoConhecimentoSemPreliminar.length > 0) {
      groupedResults.push({
        votingType: 'NAO_CONHECIMENTO',
        preliminaryDecisionId: null,
        preliminaryDecision: null,
        votes: naoConhecimentoSemPreliminar,
        status: 'PENDENTE',
        label: 'Não Conhecimento',
      });
    }

    // Grupo 3: Votos de Conhecimento (Mérito) - TODOS em um único card
    const meritoVotes = votes.filter((v) => v.voteKnowledgeType === 'CONHECIMENTO');

    if (meritoVotes.length > 0) {
      groupedResults.push({
        votingType: 'MERITO',
        preliminaryDecisionId: null,
        preliminaryDecision: null,
        votes: meritoVotes,
        status: 'PENDENTE',
        label: 'Mérito',
      });
    }

    return NextResponse.json({
      sessionResourceId: sessionResource.id,
      totalVotes: votes.length,
      groupedResults,
    });
  } catch (error) {
    console.log('[GROUP_VOTES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// POST /api/ccr/sessions/[id]/processos/[resourceId]/group-votes - Criar votações a partir do agrupamento
export async function POST(
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

    // Buscar votos não vinculados
    const votes = await prismadb.sessionVote.findMany({
      where: {
        sessionResourceId: sessionResource.id,
        sessionResultId: null,
      },
      include: {
        preliminaryDecision: true,
        meritDecision: true,
      },
    });

    if (votes.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum voto disponível para criar votações' },
        { status: 400 }
      );
    }

    const createdResults: any[] = [];

    // Criar votações de Não Conhecimento com preliminar
    const preliminaryVotes = votes.filter(
      (v) => v.voteKnowledgeType === 'NAO_CONHECIMENTO' && v.preliminaryDecisionId
    );

    // Buscar o maior valor de order existente para este recurso
    const maxOrderResult = await prismadb.sessionResult.findFirst({
      where: {
        resourceId: sessionResource.resourceId,
      },
      orderBy: {
        order: 'desc',
      },
      select: {
        order: true,
      },
    });

    let currentOrder = maxOrderResult?.order ?? 0;

    const preliminaryGroups = new Map<string, typeof votes>();
    preliminaryVotes.forEach((vote) => {
      const key = vote.preliminaryDecisionId!;
      if (!preliminaryGroups.has(key)) {
        preliminaryGroups.set(key, []);
      }
      preliminaryGroups.get(key)!.push(vote);
    });

    for (const [preliminaryDecisionId, groupVotes] of preliminaryGroups) {
      currentOrder++;
      const result = await prismadb.sessionResult.create({
        data: {
          resourceId: sessionResource.resourceId,
          votingType: 'NAO_CONHECIMENTO',
          preliminaryDecisionId,
          status: 'PENDENTE',
          order: currentOrder,
        },
      });

      // Vincular votos à votação
      await prismadb.sessionVote.updateMany({
        where: {
          id: { in: groupVotes.map((v) => v.id) },
        },
        data: {
          sessionResultId: result.id,
        },
      });

      createdResults.push(result);
    }

    // Criar votação de Não Conhecimento sem preliminar
    const naoConhecimentoSemPreliminar = votes.filter(
      (v) => v.voteKnowledgeType === 'NAO_CONHECIMENTO' && !v.preliminaryDecisionId
    );

    if (naoConhecimentoSemPreliminar.length > 0) {
      currentOrder++;
      const result = await prismadb.sessionResult.create({
        data: {
          resourceId: sessionResource.resourceId,
          votingType: 'NAO_CONHECIMENTO',
          status: 'PENDENTE',
          order: currentOrder,
        },
      });

      await prismadb.sessionVote.updateMany({
        where: {
          id: { in: naoConhecimentoSemPreliminar.map((v) => v.id) },
        },
        data: {
          sessionResultId: result.id,
        },
      });

      createdResults.push(result);
    }

    // Criar votação de Mérito (única)
    const meritoVotes = votes.filter((v) => v.voteKnowledgeType === 'CONHECIMENTO');

    if (meritoVotes.length > 0) {
      currentOrder++;
      const result = await prismadb.sessionResult.create({
        data: {
          resourceId: sessionResource.resourceId,
          votingType: 'MERITO',
          status: 'PENDENTE',
          order: currentOrder,
        },
      });

      await prismadb.sessionVote.updateMany({
        where: {
          id: { in: meritoVotes.map((v) => v.id) },
        },
        data: {
          sessionResultId: result.id,
        },
      });

      createdResults.push(result);
    }

    return NextResponse.json({
      message: `${createdResults.length} votações criadas com sucesso`,
      results: createdResults,
    });
  } catch (error) {
    console.log('[GROUP_VOTES_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
