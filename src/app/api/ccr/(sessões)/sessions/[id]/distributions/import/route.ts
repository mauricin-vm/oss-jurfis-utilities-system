import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// POST - Importar distribuições a partir dos recursos em pauta de outra sessão
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: targetSessionId } = await params;
    const body = await req.json();
    const { sourceSessionId } = body;

    if (!sourceSessionId) {
      return new NextResponse('sourceSessionId é obrigatório', { status: 400 });
    }

    // Verificar se a sessão de destino existe
    const targetSession = await prismadb.session.findUnique({
      where: { id: targetSessionId },
    });

    if (!targetSession) {
      return new NextResponse('Sessão de destino não encontrada', { status: 404 });
    }

    // Verificar se a sessão de origem existe e buscar seus recursos em pauta
    const sourceSession = await prismadb.session.findUnique({
      where: { id: sourceSessionId },
      include: {
        resources: {
          include: {
            resource: {
              select: {
                id: true,
                resourceNumber: true,
                processNumber: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        // Buscar distribuições existentes na sessão de origem para pegar quem foi distribuído
        distributions: {
          where: {
            isActive: true,
          },
        },
      },
    });

    if (!sourceSession) {
      return new NextResponse('Sessão de origem não encontrada', { status: 404 });
    }

    if (sourceSession.resources.length === 0) {
      return new NextResponse('Nenhum recurso em pauta na sessão de origem', { status: 400 });
    }

    // Buscar distribuições já existentes na sessão de destino
    const existingDistributions = await prismadb.sessionDistributionRecord.findMany({
      where: {
        distributionSessionId: targetSessionId,
      },
    });

    const existingResourceIds = new Set(existingDistributions.map((d) => d.resourceId));

    // Criar mapa de distribuições da sessão de origem por resourceId
    const sourceDistributionsMap = new Map(
      sourceSession.distributions.map((d) => [d.resourceId, d])
    );

    // Filtrar recursos que ainda não têm distribuição na sessão de destino
    const resourcesToCreate = sourceSession.resources.filter(
      (sr) => !existingResourceIds.has(sr.resourceId)
    );

    if (resourcesToCreate.length === 0) {
      return new NextResponse('Todos os recursos já possuem distribuição na sessão de destino', { status: 400 });
    }

    // Criar as novas distribuições
    const createdDistributions = await prismadb.$transaction(
      resourcesToCreate.map((sr) => {
        const sourceDistribution = sourceDistributionsMap.get(sr.resourceId);

        return prismadb.sessionDistributionRecord.create({
          data: {
            resourceId: sr.resourceId,
            distributionSessionId: targetSessionId,
            // Se existe distribuição na sessão de origem, usa o mesmo membro
            // Caso contrário, usa string vazia (será preenchido depois)
            distributedToId: sourceDistribution?.distributedToId || '',
            targetSessionId: null, // Sessão de análise será definida depois
          },
        });
      })
    );

    return NextResponse.json({
      message: `${createdDistributions.length} distribuições criadas com sucesso`,
      count: createdDistributions.length,
      skipped: sourceSession.resources.length - resourcesToCreate.length,
    });
  } catch (error) {
    console.log('[SESSION_DISTRIBUTIONS_IMPORT_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
