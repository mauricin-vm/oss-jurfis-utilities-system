import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canAccessTramitations, canCreateTramitation } from '@/lib/permissions';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canAccessTramitations(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const protocolId = searchParams.get('protocolId');
    const processNumber = searchParams.get('processNumber');
    const sectorId = searchParams.get('sectorId');
    const status = searchParams.get('status');

    const tramitations = await prismadb.tramitation.findMany({
      where: {
        ...(protocolId && { protocolId }),
        ...(processNumber && {
          processNumber: {
            equals: processNumber.trim(),
            mode: 'insensitive',
          }
        }),
        ...(sectorId && { sectorId }),
        ...(status && { status: status as any }),
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Para cada tramitação, buscar o recurso associado pelo processNumber
    const tramitationsWithResource = await Promise.all(
      tramitations.map(async (tramitation) => {
        // Normalizar o número do processo (remover espaços)
        const normalizedProcessNumber = tramitation.processNumber.trim();

        const resource = await prismadb.resource.findFirst({
          where: {
            processNumber: {
              equals: normalizedProcessNumber,
              mode: 'insensitive',
            },
          },
          select: {
            id: true,
            processNumber: true,
          },
        });


        return {
          ...tramitation,
          resource,
        };
      })
    );

    return NextResponse.json(tramitationsWithResource);
  } catch (error) {
    console.log('[TRAMITATIONS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canCreateTramitation(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const {
      protocolId,
      processNumber,
      purpose,
      sectorId,
      memberId,
      destination,
      deadline,
      observations,
    } = body;

    // Validar processNumber obrigatório
    if (!processNumber) {
      return new NextResponse('Número do processo é obrigatório', { status: 400 });
    }

    // Validar finalidade obrigatória
    if (!purpose) {
      return new NextResponse('Finalidade da tramitação é obrigatória', { status: 400 });
    }

    // Deve ter pelo menos um destino (setor, membro ou destino texto)
    if (!sectorId && !memberId && !destination) {
      return new NextResponse('É necessário fornecer um destino (setor, membro ou descrição)', { status: 400 });
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

    // Validar se protocolo existe (se fornecido)
    if (protocolId) {
      const protocol = await prismadb.protocol.findUnique({
        where: { id: protocolId },
        select: { processNumber: true },
      });

      if (!protocol) {
        return new NextResponse('Protocolo não encontrado', { status: 404 });
      }

      // Verificar se o processNumber fornecido é do protocolo
      if (protocol.processNumber !== processNumber) {
        return new NextResponse('Número do processo não corresponde ao protocolo', { status: 400 });
      }
    }

    const tramitation = await prismadb.tramitation.create({
      data: {
        protocolId: protocolId || null,
        processNumber: processNumber.trim(),
        purpose,
        sectorId: sectorId || null,
        memberId: memberId || null,
        destination: destination || null,
        deadline: deadline ? new Date(deadline) : null,
        observations: observations || null,
        createdBy: session.user.id,
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
    console.log('[TRAMITATIONS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
