import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * GET /api/ccr/sessions/[id]/processos/[resourceId]/ausencias
 * Busca dados para gerenciar ausências (membros da sessão + ausências já registradas)
 */
export async function GET(
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

    // Buscar Session com membros
    const sessionData = await prismadb.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        sessionNumber: true,
        date: true,
        status: true,
        members: {
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
          orderBy: {
            member: {
              name: 'asc',
            },
          },
        },
      },
    });

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Buscar SessionResource com ausências já registradas
    const sessionResource = await prismadb.sessionResource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        resourceId: true,
        absences: {
          select: {
            id: true,
            memberId: true,
          },
        },
        resource: {
          select: {
            id: true,
            processNumber: true,
            resourceNumber: true,
          },
        },
      },
    });

    if (!sessionResource) {
      return NextResponse.json(
        { error: 'Processo não encontrado na sessão' },
        { status: 404 }
      );
    }

    // Verificar se há votações concluídas nesta sessão
    const hasCompletedVotingsInSession = await prismadb.sessionResult.count({
      where: {
        resourceId: sessionResource.resourceId,
        status: 'CONCLUIDA',
        judgedInSessionId: sessionId,
      },
    });

    return NextResponse.json({
      session: sessionData,
      sessionResource,
      canEditAbsences: hasCompletedVotingsInSession === 0,
    });
  } catch (error) {
    console.error('Erro ao buscar dados de ausências:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ccr/sessions/[id]/processos/[resourceId]/ausencias
 * Atualiza ausências (cria novas e remove antigas)
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
    const { absentMemberIds } = body;

    if (!Array.isArray(absentMemberIds)) {
      return NextResponse.json(
        { error: 'Lista de ausentes inválida' },
        { status: 400 }
      );
    }

    // Verificar se SessionResource existe
    const sessionResource = await prismadb.sessionResource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        resourceId: true,
        absences: {
          select: {
            id: true,
            memberId: true,
          },
        },
      },
    });

    if (!sessionResource) {
      return NextResponse.json(
        { error: 'Processo não encontrado na sessão' },
        { status: 404 }
      );
    }

    // Verificar se há votações concluídas nesta sessão
    const hasCompletedVotingsInSession = await prismadb.sessionResult.count({
      where: {
        resourceId: sessionResource.resourceId,
        status: 'CONCLUIDA',
        judgedInSessionId: sessionId,
      },
    });

    if (hasCompletedVotingsInSession > 0) {
      return NextResponse.json(
        { error: 'Não é possível alterar ausências quando há votações concluídas nesta sessão' },
        { status: 400 }
      );
    }

    // IDs dos membros atualmente ausentes
    const currentAbsentIds = sessionResource.absences.map((a) => a.memberId);

    // Identificar quem remover e quem adicionar
    const toRemove = currentAbsentIds.filter((id) => !absentMemberIds.includes(id));
    const toAdd = absentMemberIds.filter((id: string) => !currentAbsentIds.includes(id));

    // Executar operações em transação
    await prismadb.$transaction([
      // Remover ausências que não estão mais selecionadas
      ...(toRemove.length > 0
        ? [
            prismadb.sessionResourceAbsence.deleteMany({
              where: {
                sessionResourceId: resourceId,
                memberId: { in: toRemove },
              },
            }),
          ]
        : []),

      // Adicionar novas ausências
      ...(toAdd.length > 0
        ? toAdd.map((memberId: string) =>
            prismadb.sessionResourceAbsence.create({
              data: {
                sessionResourceId: resourceId,
                memberId,
              },
            })
          )
        : []),
    ]);

    return NextResponse.json({
      message: 'Ausências atualizadas com sucesso',
      added: toAdd.length,
      removed: toRemove.length,
    });
  } catch (error) {
    console.error('Erro ao atualizar ausências:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar ausências' },
      { status: 500 }
    );
  }
}
