import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verificar se é EXTERNAL
    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    const decision = await prismadb.decision.findUnique({
      where: { id },
      include: {
        publications: {
          orderBy: {
            publicationOrder: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!decision) {
      return new NextResponse('Acórdão não encontrado', { status: 404 });
    }

    // Só pode reverter se estiver PENDENTE e tiver publicações anteriores
    if (decision.status !== 'PENDENTE') {
      return new NextResponse('Apenas acórdãos pendentes podem ser revertidos', { status: 400 });
    }

    if (decision.publications.length === 0) {
      return new NextResponse('Este acórdão não possui publicações anteriores para reverter', { status: 400 });
    }

    const lastPublication = decision.publications[0];

    // Determinar o status anterior baseado no número de publicações
    const previousStatus = lastPublication.publicationOrder > 1 ? 'REPUBLICADO' : 'PUBLICADO';

    // Reverter para o snapshot da última publicação
    const updatedDecision = await prismadb.decision.update({
      where: { id },
      data: {
        ementaTitle: lastPublication.ementaTitleSnapshot,
        ementaBody: lastPublication.ementaBodySnapshot,
        status: previousStatus,
      },
      include: {
        resource: {
          select: {
            id: true,
            resourceNumber: true,
            processNumber: true,
            processName: true,
          },
        },
        publications: {
          orderBy: {
            publicationOrder: 'desc',
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(updatedDecision);
  } catch (error) {
    console.error('[DECISION_REVERT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
