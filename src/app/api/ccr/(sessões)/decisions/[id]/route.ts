import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

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

    const decision = await prismadb.decision.findUnique({
      where: { id },
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

    if (!decision) {
      return new NextResponse('Acórdão não encontrado', { status: 404 });
    }

    return NextResponse.json(decision);
  } catch (error) {
    console.error('[DECISION_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PUT(
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

    const existingDecision = await prismadb.decision.findUnique({
      where: { id },
    });

    if (!existingDecision) {
      return new NextResponse('Acórdão não encontrado', { status: 404 });
    }

    const body = await req.json();
    const {
      decisionNumber,
      ementaTitle,
      ementaBody,
      votePath,
      decisionFilePath,
    } = body;

    // Se está alterando o número do acórdão, validar formato e unicidade
    let updateData: any = {};

    if (decisionNumber && decisionNumber !== existingDecision.decisionNumber) {
      const decisionNumberMatch = decisionNumber.match(/^(\d{4})\/(\d{4})$/);
      if (!decisionNumberMatch) {
        return new NextResponse(
          'Formato do número do acórdão inválido. Use o formato XXXX/YYYY',
          { status: 400 }
        );
      }

      const sequenceNumber = parseInt(decisionNumberMatch[1], 10);
      const year = parseInt(decisionNumberMatch[2], 10);

      // Verificar se já existe outro acórdão com este número
      const duplicateDecision = await prismadb.decision.findFirst({
        where: {
          decisionNumber,
          id: { not: id },
        },
      });

      if (duplicateDecision) {
        return new NextResponse(
          `Já existe um acórdão com o número ${decisionNumber}`,
          { status: 400 }
        );
      }

      updateData.decisionNumber = decisionNumber;
      updateData.sequenceNumber = sequenceNumber;
      updateData.year = year;
    }

    // Verificar se houve alteração na ementa quando já foi publicado
    const ementaChanged =
      (ementaTitle !== undefined && ementaTitle !== existingDecision.ementaTitle) ||
      (ementaBody !== undefined && ementaBody !== existingDecision.ementaBody);

    // Se a ementa foi alterada e o acórdão já foi publicado, voltar status para PENDENTE
    if (ementaChanged && (existingDecision.status === 'PUBLICADO' || existingDecision.status === 'REPUBLICADO')) {
      updateData.status = 'PENDENTE';
    }

    if (ementaTitle !== undefined) {
      updateData.ementaTitle = ementaTitle;
    }

    if (ementaBody !== undefined) {
      updateData.ementaBody = ementaBody;
    }

    if (votePath !== undefined) {
      updateData.votePath = votePath || null;
    }

    if (decisionFilePath !== undefined) {
      updateData.decisionFilePath = decisionFilePath || null;
    }

    const decision = await prismadb.decision.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(decision);
  } catch (error) {
    console.error('[DECISION_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apenas ADMIN pode deletar
    if (session.user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    const existingDecision = await prismadb.decision.findUnique({
      where: { id },
    });

    if (!existingDecision) {
      return new NextResponse('Acórdão não encontrado', { status: 404 });
    }

    // Não permitir deletar se já foi publicado
    if (existingDecision.status !== 'PENDENTE') {
      return new NextResponse(
        'Não é possível excluir um acórdão que já foi publicado',
        { status: 400 }
      );
    }

    await prismadb.decision.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DECISION_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
