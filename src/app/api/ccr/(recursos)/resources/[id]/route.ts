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

    const resource = await prismadb.resource.findUnique({
      where: { id },
      include: {
        protocol: {
          select: {
            id: true,
            number: true,
            processNumber: true,
            presenter: true,
            createdAt: true,
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        },
        registrations: {
          include: {
            values: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        authorities: {
          include: {
            authorityRegistered: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            documents: true,
            sessions: true,
            registrations: true,
          },
        },
      },
    });

    if (!resource) {
      return new NextResponse('Recurso não encontrado', { status: 404 });
    }

    // Buscar as partes via processNumber
    const parts = await prismadb.part.findMany({
      where: {
        processNumber: resource.processNumber,
      },
      select: {
        id: true,
        name: true,
        role: true,
        registrationType: true,
        registrationNumber: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      ...resource,
      parts,
    });
  } catch (error) {
    console.log('[RESOURCE_GET]', error);
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

    const { processName, attachedProcesses, status, type } = body;

    const resource = await prismadb.resource.update({
      where: { id },
      data: {
        processName: processName || null,
        ...(attachedProcesses !== undefined && { attachedProcesses }),
        ...(status && { status }),
        ...(type && { type }),
      },
      include: {
        protocol: {
          select: {
            id: true,
            number: true,
            processNumber: true,
            presenter: true,
            createdAt: true,
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        subjects: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        },
        registrations: {
          include: {
            values: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        authorities: {
          include: {
            authorityRegistered: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: {
          select: {
            documents: true,
            sessions: true,
            registrations: true,
          },
        },
      },
    });

    // Buscar as partes via processNumber
    const parts = await prismadb.part.findMany({
      where: {
        processNumber: resource.processNumber,
      },
      select: {
        id: true,
        name: true,
        role: true,
        registrationType: true,
        registrationNumber: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      ...resource,
      parts,
    });
  } catch (error) {
    console.log('[RESOURCE_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
