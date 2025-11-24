import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * POST /api/ccr/sessions/[id]/complete
 * Conclui a sessão
 */
export async function POST(
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

    // Await params
    const { id } = await params;

    // Buscar sessão
    const sessionData = await prismadb.session.findUnique({
      where: { id },
      include: {
        resources: true
      }
    });

    if (!sessionData) {
      return NextResponse.json(
        { error: 'Sessão não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a sessão está no status PENDENTE
    if (sessionData.status !== 'PENDENTE') {
      return NextResponse.json(
        { error: 'Apenas sessões com status PENDENTE podem ser concluídas' },
        { status: 400 }
      );
    }

    // Verificar se todos os processos têm resultado (ou não há processos)
    const totalProcessos = sessionData.resources.length;
    const processosSemResultado = sessionData.resources.filter(
      r => !['JULGADO', 'SUSPENSO', 'DILIGENCIA', 'PEDIDO_VISTA'].includes(r.status)
    );

    if (totalProcessos > 0 && processosSemResultado.length > 0) {
      return NextResponse.json(
        {
          error: 'Todos os processos da pauta devem ter um resultado antes de concluir a sessão',
          processosSemResultado: processosSemResultado.length
        },
        { status: 400 }
      );
    }

    // Atualizar status da sessão para CONCLUIDA
    const updatedSession = await prismadb.session.update({
      where: { id },
      data: {
        status: 'CONCLUIDA'
      }
    });

    return NextResponse.json({
      success: true,
      session: updatedSession
    });
  } catch (error) {
    console.error('Erro ao concluir sessão:', error);
    return NextResponse.json(
      { error: 'Erro ao concluir sessão' },
      { status: 500 }
    );
  }
}
