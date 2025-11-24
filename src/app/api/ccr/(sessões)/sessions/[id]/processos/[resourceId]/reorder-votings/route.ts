import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * PATCH /api/ccr/sessions/[id]/processos/[resourceId]/reorder-votings
 * Reordena as votações de um processo
 */
export async function PATCH(
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

    const { id, resourceId } = await params;
    const body = await req.json();
    const { votingOrders } = body;

    if (!votingOrders || !Array.isArray(votingOrders)) {
      return NextResponse.json(
        { error: 'votingOrders é obrigatório e deve ser um array' },
        { status: 400 }
      );
    }

    // Buscar o session resource para validar
    const sessionResource = await prismadb.sessionResource.findFirst({
      where: {
        id: resourceId,
        sessionId: id,
      },
    });

    if (!sessionResource) {
      return NextResponse.json(
        { error: 'Processo não encontrado na sessão' },
        { status: 404 }
      );
    }

    // Atualizar a ordem de cada votação
    await Promise.all(
      votingOrders.map(async (item: { id: string; order: number }) => {
        await prismadb.sessionResult.updateMany({
          where: {
            id: item.id,
            resourceId: sessionResource.resourceId,
          },
          data: {
            order: item.order,
          },
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao reordenar votações:', error);
    return NextResponse.json(
      { error: 'Erro ao reordenar votações' },
      { status: 500 }
    );
  }
}
