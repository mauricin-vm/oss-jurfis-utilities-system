import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * PATCH /api/ccr/sessions/[id]/revert
 * Reverte a sessão de CONCLUIDA para PENDENTE (apenas ADMIN)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário é ADMIN
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Apenas administradores podem reverter sessões concluídas' },
        { status: 403 }
      );
    }

    // Await params
    const { id } = await params;

    // Buscar sessão
    const sessionData = await prismadb.session.findUnique({
      where: { id }
    });

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a sessão está no status CONCLUIDA
    if (sessionData.status !== 'CONCLUIDA') {
      return NextResponse.json(
        { error: 'Apenas sessões com status CONCLUIDA podem ser revertidas' },
        { status: 400 }
      );
    }

    // Atualizar status da sessão para PENDENTE
    const updatedSession = await prismadb.session.update({
      where: { id },
      data: {
        status: 'PENDENTE'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Sessão revertida para PENDENTE com sucesso',
      session: updatedSession
    });
  } catch (error) {
    console.error('Erro ao reverter sessão:', error);
    return NextResponse.json(
      { error: 'Erro ao reverter sessão' },
      { status: 500 }
    );
  }
}
