import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

// GET - Buscar recursos disponíveis para distribuição
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: sessionId } = await params;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    if (!search.trim()) {
      return NextResponse.json([]);
    }

    // Buscar recursos que correspondem à busca
    const resources = await prismadb.resource.findMany({
      where: {
        OR: [
          { processNumber: { contains: search, mode: 'insensitive' } },
          { resourceNumber: { contains: search, mode: 'insensitive' } },
          { processName: { contains: search, mode: 'insensitive' } },
          {
            protocol: {
              number: { contains: search, mode: 'insensitive' },
            },
          },
        ],
      },
      select: {
        id: true,
        resourceNumber: true,
        processNumber: true,
        processName: true,
        status: true,
        type: true,
        protocol: {
          select: {
            presenter: true,
          },
        },
      },
      take: 20,
      orderBy: [
        { year: 'desc' },
        { sequenceNumber: 'desc' },
      ],
    });

    // Buscar distribuições já existentes nesta sessão
    const existingDistributions = await prismadb.sessionDistributionRecord.findMany({
      where: {
        distributionSessionId: sessionId,
      },
      select: {
        resourceId: true,
      },
    });

    const existingResourceIds = new Set(existingDistributions.map((d) => d.resourceId));

    // Marcar recursos que já têm distribuição nesta sessão
    const resourcesWithInfo = resources.map((resource) => ({
      ...resource,
      hasDistributionInSession: existingResourceIds.has(resource.id),
    }));

    return NextResponse.json(resourcesWithInfo);
  } catch (error) {
    console.log('[DISTRIBUTIONS_AVAILABLE_RESOURCES_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
