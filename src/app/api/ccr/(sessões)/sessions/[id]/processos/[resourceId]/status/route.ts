import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * PATCH /api/ccr/sessions/[id]/processos/[resourceId]/status
 * Atualiza o status do processo e informações relacionadas
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

    const { id: sessionId, resourceId } = await params;
    const body = await req.json();
    const {
      status,
      viewRequestedMemberId,
      diligenceDaysDeadline,
      minutesText,
      specificPresidentId,
    } = body;

    // Validar status
    const validStatuses = ['EM_PAUTA', 'SUSPENSO', 'DILIGENCIA', 'PEDIDO_VISTA', 'JULGADO'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status inválido' },
        { status: 400 }
      );
    }

    // Buscar SessionResource
    const sessionResource = await prismadb.sessionResource.findUnique({
      where: { id: resourceId },
      include: {
        resource: true,
      },
    });

    if (!sessionResource) {
      return NextResponse.json(
        { error: 'Processo não encontrado na sessão' },
        { status: 404 }
      );
    }

    // Validações específicas por status
    if (status === 'SUSPENSO') {
      // Validar se texto contém [DETALHAR]
      if (minutesText && minutesText.includes('[DETALHAR]')) {
        return NextResponse.json(
          { error: 'O texto da ata contém [DETALHAR]. Por favor, complete o texto antes de salvar.' },
          { status: 400 }
        );
      }
    }

    if (status === 'DILIGENCIA') {
      // Validar prazo preenchido
      if (!diligenceDaysDeadline) {
        return NextResponse.json(
          { error: 'O prazo em dias é obrigatório para Pedido de Diligência' },
          { status: 400 }
        );
      }

      // Validar se texto contém [DETALHAR]
      if (minutesText && minutesText.includes('[DETALHAR]')) {
        return NextResponse.json(
          { error: 'O texto da ata contém [DETALHAR]. Por favor, complete o texto antes de salvar.' },
          { status: 400 }
        );
      }
    }

    if (status === 'PEDIDO_VISTA') {
      // Validar se membro foi selecionado
      if (!viewRequestedMemberId) {
        return NextResponse.json(
          { error: 'Selecione o membro que solicitou vista' },
          { status: 400 }
        );
      }

      // Verificar se quem pediu vista é autoridade cadastrada no processo
      const authorities = await prismadb.authority.findMany({
        where: {
          resourceId: sessionResource.resource.id,
        },
        select: {
          authorityRegisteredId: true,
        },
      });

      const isAuthority = authorities.some(auth => auth.authorityRegisteredId === viewRequestedMemberId);

      if (isAuthority) {
        return NextResponse.json(
          { error: 'O membro selecionado é uma autoridade cadastrada no processo e não pode solicitar vista' },
          { status: 400 }
        );
      }
    }

    // Preparar dados de atualização
    const updateData: any = {
      status,
      minutesText: minutesText || null,
    };

    // Só atualizar specificPresidentId se foi explicitamente fornecido
    if (specificPresidentId !== undefined) {
      updateData.specificPresidentId = specificPresidentId || null;
    }

    // Campos específicos por status
    if (status === 'PEDIDO_VISTA') {
      if (viewRequestedMemberId) {
        updateData.viewRequestedById = viewRequestedMemberId;
      }
    } else {
      updateData.viewRequestedById = null;
    }

    if (status === 'DILIGENCIA') {
      if (diligenceDaysDeadline) {
        updateData.diligenceDaysDeadline = parseInt(diligenceDaysDeadline);
      }
    } else {
      updateData.diligenceDaysDeadline = null;
    }

    // Se marcar como JULGADO, validar se há resultados concluídos
    if (status === 'JULGADO') {
      // Buscar resultados de votação para validar
      const results = await prismadb.sessionResult.findMany({
        where: {
          resourceId: sessionResource.resource.id,
        },
        include: {
          votes: {
            include: {
              preliminaryDecision: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // 1. Verificar se há pelo menos uma votação
      if (results.length === 0) {
        return NextResponse.json(
          { error: 'É necessário ao menos uma votação concluída para finalizar o julgamento' },
          { status: 400 }
        );
      }

      // 2. Verificar se todas as votações estão concluídas
      const hasIncompletedVoting = results.some(v => v.status !== 'CONCLUIDA');
      if (hasIncompletedVoting) {
        return NextResponse.json(
          { error: 'Todas as votações devem estar concluídas antes de finalizar o julgamento' },
          { status: 400 }
        );
      }

      // 3. Verificar votação de mérito e preliminares
      const meritVoting = results.find(v => v.votingType === 'MERITO' && v.status === 'CONCLUIDA');
      const preliminaryVotings = results.filter(v => v.votingType === 'NAO_CONHECIMENTO' && v.status === 'CONCLUIDA');

      // Se existe votação de mérito, verificar se alguma preliminar foi acatada
      if (meritVoting && preliminaryVotings.length > 0) {
        const hasPreliminaryAccepted = preliminaryVotings.some(prelim => {
          if (!prelim.winningVoteId) return false;
          const winningVote = prelim.votes.find(v => v.id === prelim.winningVoteId);
          if (!winningVote || !winningVote.preliminaryDecision) return false;
          return winningVote.preliminaryDecision.type === 'ACATAR';
        });

        if (hasPreliminaryAccepted) {
          return NextResponse.json(
            { error: 'Não é possível finalizar: existe votação de mérito mas uma preliminar foi acatada' },
            { status: 400 }
          );
        }
      }

      // 4. Para prosseguir: necessário ao menos uma votação preliminar concluída no sentido de não acatar OU votação de mérito concluída
      const hasPreliminaryRejected = preliminaryVotings.some(prelim => {
        if (!prelim.winningVoteId) return false;
        const winningVote = prelim.votes.find(v => v.id === prelim.winningVoteId);
        if (!winningVote || !winningVote.preliminaryDecision) return false;
        return winningVote.preliminaryDecision.type !== 'ACATAR';
      });

      if (!meritVoting && !hasPreliminaryRejected) {
        return NextResponse.json(
          { error: 'É necessário ao menos uma votação preliminar concluída no sentido de não acatar ou uma votação de mérito concluída' },
          { status: 400 }
        );
      }

      // Atualizar status do Resource para PUBLICACAO_ACORDAO
      await prismadb.resource.update({
        where: { id: sessionResource.resource.id },
        data: { status: 'PUBLICACAO_ACORDAO' },
      });
    }

    // Atualizar status do Resource para outros tipos
    if (status === 'SUSPENSO') {
      await prismadb.resource.update({
        where: { id: sessionResource.resource.id },
        data: { status: 'SUSPENSO' },
      });
    }

    if (status === 'DILIGENCIA') {
      await prismadb.resource.update({
        where: { id: sessionResource.resource.id },
        data: { status: 'DILIGENCIA' },
      });
    }

    if (status === 'PEDIDO_VISTA') {
      await prismadb.resource.update({
        where: { id: sessionResource.resource.id },
        data: { status: 'PEDIDO_VISTA' },
      });
    }

    if (status === 'EM_PAUTA') {
      await prismadb.resource.update({
        where: { id: sessionResource.resource.id },
        data: { status: 'JULGAMENTO' },
      });
    }

    // Atualizar SessionResource
    const updated = await prismadb.sessionResource.update({
      where: { id: resourceId },
      data: updateData,
      include: {
        viewRequestedBy: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        resource: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar status' },
      { status: 500 }
    );
  }
}
