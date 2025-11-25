import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

/**
 * Verifica se a pauta atual tem os mesmos processos e distribuições da última publicação
 * (independente da ordem)
 * Retorna true se tiver os mesmos processos com mesmas distribuições, false caso contrário
 */
async function isAgendaEqualToLastPublication(sessionId: string): Promise<boolean> {
  // Buscar a última publicação da sessão
  const lastPublication = await prismadb.publication.findFirst({
    where: {
      sessionId,
      type: 'SESSAO'
    },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      sessionSnapshots: true
    }
  });

  if (!lastPublication || lastPublication.sessionSnapshots.length === 0) {
    return false;
  }

  // Buscar recursos atuais da sessão com suas distribuições
  const currentResources = await prismadb.sessionResource.findMany({
    where: {
      sessionId
    },
    select: {
      resourceId: true
    }
  });

  // Buscar distribuições atuais da sessão
  const currentDistributions = await prismadb.sessionDistribution.findMany({
    where: {
      sessionId,
      isActive: true
    },
    select: {
      resourceId: true,
      distributedToId: true
    }
  });

  // Comparar: mesmo número de processos
  if (currentResources.length !== lastPublication.sessionSnapshots.length) {
    return false;
  }

  // Criar mapa de resourceId -> distributedToId para a publicação
  const publishedDistributionMap = new Map(
    lastPublication.sessionSnapshots.map(s => [s.resourceId, s.distributedToId])
  );

  // Criar mapa de resourceId -> distributedToId para o estado atual
  const currentDistributionMap = new Map(
    currentDistributions.map(d => [d.resourceId, d.distributedToId])
  );

  // Verificar se todos os processos atuais estão na publicação
  for (const resource of currentResources) {
    const publishedDistributedTo = publishedDistributionMap.get(resource.resourceId);
    const currentDistributedTo = currentDistributionMap.get(resource.resourceId);

    // Se processo não estava na publicação, pauta mudou
    if (!publishedDistributedTo) {
      return false;
    }

    // Se distribuição mudou, pauta mudou
    if (publishedDistributedTo !== currentDistributedTo) {
      return false;
    }
  }

  // Verificar se há processos na publicação que não estão mais na pauta atual
  const currentResourceIds = new Set(currentResources.map(r => r.resourceId));
  for (const snapshot of lastPublication.sessionSnapshots) {
    if (!currentResourceIds.has(snapshot.resourceId)) {
      return false;
    }
  }

  return true;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const sessionResource = await prismadb.sessionResource.findUnique({
      where: {
        id,
      },
      include: {
        session: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
            type: true,
            status: true,
          },
        },
        resource: {
          include: {
            protocol: true,
          },
        },
        specificPresident: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!sessionResource) {
      return new NextResponse('Recurso de sessão não encontrado', { status: 404 });
    }

    return NextResponse.json(sessionResource);
  } catch (error) {
    console.log('[SESSION_RESOURCE_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { specificPresidentId, order, status } = body;

    // Verificar se o sessionResource existe
    const existingSessionResource = await prismadb.sessionResource.findUnique({
      where: { id },
    });

    if (!existingSessionResource) {
      return new NextResponse('Recurso de sessão não encontrado', { status: 404 });
    }

    // Verificar se o presidente específico existe (se fornecido)
    if (specificPresidentId) {
      const specificPresident = await prismadb.member.findUnique({
        where: { id: specificPresidentId },
      });

      if (!specificPresident) {
        return new NextResponse('Presidente específico não encontrado', { status: 404 });
      }
    }

    // Validar status se fornecido
    if (status) {
      const validStatuses = [
        'EM_PAUTA',
        'SUSPENSO',
        'DILIGENCIA',
        'PEDIDO_VISTA',
        'JULGADO',
      ];

      if (!validStatuses.includes(status)) {
        return new NextResponse('Status inválido', { status: 400 });
      }
    }

    const sessionResource = await prismadb.sessionResource.update({
      where: {
        id,
      },
      data: {
        specificPresidentId: specificPresidentId !== undefined ? specificPresidentId : existingSessionResource.specificPresidentId,
        order: order !== undefined ? order : existingSessionResource.order,
        status: status !== undefined ? status : existingSessionResource.status,
      },
      include: {
        session: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
            type: true,
            status: true,
          },
        },
        resource: {
          include: {
            protocol: true,
          },
        },
        specificPresident: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Se status mudou para JULGADO, atualizar status do recurso
    if (status === 'JULGADO') {
      await prismadb.resource.update({
        where: { id: existingSessionResource.resourceId },
        data: { status: 'PUBLICACAO_ACORDAO' },
      });
    }

    return NextResponse.json(sessionResource);
  } catch (error) {
    console.log('[SESSION_RESOURCE_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Verificar se o sessionResource existe
    const existingSessionResource = await prismadb.sessionResource.findUnique({
      where: { id },
    });

    if (!existingSessionResource) {
      return new NextResponse('Recurso de sessão não encontrado', { status: 404 });
    }

    // Verificar se o presidente específico existe (se fornecido)
    if (body.specificPresidentId) {
      const specificPresident = await prismadb.member.findUnique({
        where: { id: body.specificPresidentId },
      });

      if (!specificPresident) {
        return new NextResponse('Presidente específico não encontrado', { status: 404 });
      }
    }

    // Atualizar apenas os campos fornecidos
    const sessionResource = await prismadb.sessionResource.update({
      where: { id },
      data: body,
      include: {
        session: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
            type: true,
            status: true,
          },
        },
        resource: {
          include: {
            protocol: true,
          },
        },
        specificPresident: {
          select: {
            id: true,
            name: true,
            role: true,
            gender: true,
          },
        },
      },
    });

    return NextResponse.json(sessionResource);
  } catch (error) {
    console.log('[SESSION_RESOURCE_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const sessionResource = await prismadb.sessionResource.findUnique({
      where: {
        id,
      },
    });

    if (!sessionResource) {
      return new NextResponse('Recurso de sessão não encontrado', { status: 404 });
    }

    // Não permitir exclusão se já tem resultados de votação para este processo
    const sessionResultsCount = await prismadb.sessionResult.count({
      where: {
        resourceId: sessionResource.resourceId,
      },
    });

    if (sessionResultsCount > 0) {
      return new NextResponse(
        'Não é possível excluir recurso de sessão com votações registradas',
        { status: 400 }
      );
    }

    // Deletar distribuições relacionadas a este recurso nesta sessão
    await prismadb.sessionDistribution.deleteMany({
      where: {
        resourceId: sessionResource.resourceId,
        sessionId: sessionResource.sessionId,
      },
    });

    // Hard delete - Prisma vai deletar relacionamentos em cascata
    await prismadb.sessionResource.delete({
      where: {
        id,
      },
    });

    // Atualizar status do recurso para DISTRIBUICAO
    await prismadb.resource.update({
      where: { id: sessionResource.resourceId },
      data: { status: 'DISTRIBUICAO' },
    });

    // Verificar se há publicações da pauta e ajustar status
    const hasPublications = await prismadb.publication.count({
      where: {
        sessionId: sessionResource.sessionId,
        type: 'SESSAO'
      }
    });

    if (hasPublications > 0) {
      // Se já há publicações, verificar se a pauta atual está igual à última publicação
      const isEqual = await isAgendaEqualToLastPublication(sessionResource.sessionId);

      // Se estiver igual, status = PENDENTE; se diferente, status = PUBLICACAO
      await prismadb.session.update({
        where: { id: sessionResource.sessionId },
        data: { status: isEqual ? 'PENDENTE' : 'PUBLICACAO' }
      });
    } else {
      // Se não há publicações, verificar quantos processos restam na sessão
      const remainingResources = await prismadb.sessionResource.count({
        where: { sessionId: sessionResource.sessionId }
      });

      // Se não há processos, status = PENDENTE; se há processos, status = PUBLICACAO
      await prismadb.session.update({
        where: { id: sessionResource.sessionId },
        data: { status: remainingResources === 0 ? 'PENDENTE' : 'PUBLICACAO' }
      });
    }

    return NextResponse.json({ message: 'Recurso removido da sessão com sucesso' });
  } catch (error) {
    console.log('[SESSION_RESOURCE_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
