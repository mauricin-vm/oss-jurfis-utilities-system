import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canAccessTramitations, canEditTramitation, canDeleteTramitation } from '@/lib/permissions';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canAccessTramitations(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    const tramitation = await prismadb.tramitation.findUnique({
      where: {
        id,
      },
      include: {
        protocol: {
          select: {
            id: true,
            number: true,
            processNumber: true,
            presenter: true,
          },
        },
        sector: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!tramitation) {
      return new NextResponse('Tramitação não encontrada', { status: 404 });
    }

    return NextResponse.json(tramitation);
  } catch (error) {
    console.log('[TRAMITATION_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canEditTramitation(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, returnDate, deadline, observations } = body;

    // Verificar se tramitação existe
    const existingTramitation = await prismadb.tramitation.findUnique({
      where: { id },
    });

    if (!existingTramitation) {
      return new NextResponse('Tramitação não encontrada', { status: 404 });
    }

    const tramitation = await prismadb.tramitation.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(returnDate !== undefined && { returnDate: returnDate ? new Date(returnDate) : null }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(observations !== undefined && { observations }),
      },
      include: {
        protocol: {
          select: {
            id: true,
            number: true,
            processNumber: true,
            presenter: true,
          },
        },
        sector: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(tramitation);
  } catch (error) {
    console.log('[TRAMITATION_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canEditTramitation(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const {
      purpose,
      sectorId,
      memberId,
      destination,
      deadline,
      returnDate,
      status,
      observations,
    } = body;

    // Verificar se a tramitação existe
    const existingTramitation = await prismadb.tramitation.findUnique({
      where: { id },
    });

    if (!existingTramitation) {
      return new NextResponse('Tramitação não encontrada', { status: 404 });
    }

    // Validar se o setor existe (se fornecido)
    if (sectorId) {
      const sector = await prismadb.sector.findUnique({
        where: { id: sectorId },
      });

      if (!sector) {
        return new NextResponse('Setor não encontrado', { status: 404 });
      }
    }

    // Validar se o membro existe (se fornecido)
    if (memberId) {
      const member = await prismadb.member.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        return new NextResponse('Membro não encontrado', { status: 404 });
      }
    }

    const tramitation = await prismadb.tramitation.update({
      where: {
        id,
      },
      data: {
        ...(purpose && { purpose }),
        sectorId: sectorId || null,
        memberId: memberId || null,
        destination: destination || null,
        ...(deadline && { deadline: new Date(deadline) }),
        ...(returnDate && { returnDate: new Date(returnDate) }),
        ...(status && { status }),
        observations: observations || null,
      },
      include: {
        protocol: {
          select: {
            id: true,
            number: true,
            processNumber: true,
            presenter: true,
          },
        },
        sector: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        member: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(tramitation);
  } catch (error) {
    console.log('[TRAMITATION_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Verificar permissão
    if (!canDeleteTramitation(session.user.role)) {
      return new NextResponse('Você não tem permissão para excluir tramitações', { status: 403 });
    }

    const { id } = await params;

    const tramitation = await prismadb.tramitation.findUnique({
      where: {
        id,
      },
    });

    if (!tramitation) {
      return new NextResponse('Tramitação não encontrada', { status: 404 });
    }

    // Verificar se a tramitação está PENDENTE
    if (tramitation.status !== 'PENDENTE') {
      return new NextResponse('Apenas tramitações pendentes podem ser excluídas', { status: 403 });
    }

    // Hard delete - tramitações não têm dependências críticas
    await prismadb.tramitation.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: 'Tramitação removida com sucesso' });
  } catch (error) {
    console.log('[TRAMITATION_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
