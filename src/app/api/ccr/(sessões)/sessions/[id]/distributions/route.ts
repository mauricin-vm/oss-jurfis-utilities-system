import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// GET - Buscar distribuições da sessão
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

    const distributions = await prismadb.sessionDistributionRecord.findMany({
      where: {
        distributionSessionId: id,
      },
      include: {
        resource: {
          select: {
            id: true,
            resourceNumber: true,
            processNumber: true,
            processName: true,
            status: true,
          },
        },
        distributedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        targetSession: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(distributions);
  } catch (error) {
    console.log('[SESSION_DISTRIBUTIONS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// POST - Criar nova distribuição (individual)
export async function POST(
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
    const { resourceId, distributedToId, targetSessionId } = body;

    if (!resourceId || !distributedToId) {
      return new NextResponse('resourceId e distributedToId são obrigatórios', { status: 400 });
    }

    // Verificar se a sessão existe
    const existingSession = await prismadb.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return new NextResponse('Sessão não encontrada', { status: 404 });
    }

    // Verificar se o recurso existe
    const resource = await prismadb.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return new NextResponse('Recurso não encontrado', { status: 404 });
    }

    // Verificar se já existe distribuição para este recurso nesta sessão
    const existingDistribution = await prismadb.sessionDistributionRecord.findUnique({
      where: {
        resourceId_distributionSessionId: {
          resourceId: resourceId,
          distributionSessionId: id,
        },
      },
    });

    if (existingDistribution) {
      return new NextResponse('Já existe uma distribuição para este recurso nesta sessão', { status: 400 });
    }

    // Criar a distribuição
    const distribution = await prismadb.sessionDistributionRecord.create({
      data: {
        resourceId,
        distributionSessionId: id,
        distributedToId,
        targetSessionId: targetSessionId || null,
      },
      include: {
        resource: {
          select: {
            id: true,
            resourceNumber: true,
            processNumber: true,
            processName: true,
            status: true,
          },
        },
        distributedTo: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        targetSession: {
          select: {
            id: true,
            sessionNumber: true,
            date: true,
          },
        },
      },
    });

    return NextResponse.json(distribution);
  } catch (error) {
    console.log('[SESSION_DISTRIBUTIONS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// DELETE - Remover distribuição
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const distributionId = searchParams.get('distributionId');

    if (!distributionId) {
      return new NextResponse('distributionId é obrigatório', { status: 400 });
    }

    // Verificar se a distribuição existe
    const distribution = await prismadb.sessionDistributionRecord.findUnique({
      where: { id: distributionId },
    });

    if (!distribution) {
      return new NextResponse('Distribuição não encontrada', { status: 404 });
    }

    // Deletar a distribuição
    await prismadb.sessionDistributionRecord.delete({
      where: { id: distributionId },
    });

    return new NextResponse('Distribuição removida com sucesso', { status: 200 });
  } catch (error) {
    console.log('[SESSION_DISTRIBUTIONS_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
