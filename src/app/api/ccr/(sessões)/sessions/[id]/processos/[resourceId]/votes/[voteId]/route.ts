import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * DELETE /api/ccr/sessions/[id]/processos/[resourceId]/votes/[voteId]
 * Remove um voto de uma votação
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

    const { voteId } = await params;

    // Verificar se o voto existe
    const vote = await prismadb.sessionVote.findUnique({
      where: { id: voteId },
    });

    if (!vote) {
      return NextResponse.json(
        { error: 'Voto não encontrado' },
        { status: 404 }
      );
    }

    // Deletar o voto
    await prismadb.sessionVote.delete({
      where: { id: voteId },
    });

    // Atualizar contador do resultado
    await prismadb.sessionResult.update({
      where: { id: vote.sessionResultId },
      data: {
        totalVotes: {
          decrement: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar voto:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar voto' },
      { status: 500 }
    );
  }
}
