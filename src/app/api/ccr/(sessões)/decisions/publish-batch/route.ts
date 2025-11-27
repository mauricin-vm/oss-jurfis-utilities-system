import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verificar se é EXTERNAL
    if (session.user.role === 'EXTERNAL') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const { decisionIds, publicationNumber, publicationDate } = body;

    if (!decisionIds || !Array.isArray(decisionIds) || decisionIds.length === 0) {
      return new NextResponse('Selecione pelo menos um acórdão', { status: 400 });
    }

    if (!publicationNumber) {
      return new NextResponse('Número da publicação é obrigatório', { status: 400 });
    }

    if (!publicationDate) {
      return new NextResponse('Data da publicação é obrigatória', { status: 400 });
    }

    // Buscar todos os acórdãos selecionados
    const decisions = await prismadb.decision.findMany({
      where: {
        id: { in: decisionIds },
        status: 'PENDENTE', // Apenas acórdãos pendentes
      },
      include: {
        publications: {
          orderBy: {
            publicationOrder: 'desc',
          },
          take: 1,
        },
      },
    });

    if (decisions.length === 0) {
      return new NextResponse('Nenhum acórdão pendente encontrado', { status: 400 });
    }

    // Publicar cada acórdão
    const results = [];
    for (const decision of decisions) {
      // Determinar a ordem da publicação
      const lastPublicationOrder = decision.publications[0]?.publicationOrder || 0;
      const publicationOrder = lastPublicationOrder + 1;

      // Criar o registro de publicação com snapshot do conteúdo atual
      await prismadb.decisionPublication.create({
        data: {
          decisionId: decision.id,
          publicationOrder,
          publicationNumber,
          publicationDate: new Date(publicationDate),
          ementaTitleSnapshot: decision.ementaTitle,
          ementaBodySnapshot: decision.ementaBody,
          republishReason: null,
        },
      });

      // Atualizar status do acórdão
      const newStatus = publicationOrder > 1 ? 'REPUBLICADO' : 'PUBLICADO';

      await prismadb.decision.update({
        where: { id: decision.id },
        data: {
          status: newStatus,
        },
      });

      results.push({
        id: decision.id,
        decisionNumber: decision.decisionNumber,
        status: newStatus,
      });
    }

    return NextResponse.json({
      success: true,
      published: results.length,
      results,
    });
  } catch (error) {
    console.error('[DECISIONS_PUBLISH_BATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
