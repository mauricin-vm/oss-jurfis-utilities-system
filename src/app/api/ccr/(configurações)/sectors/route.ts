import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canAccessSectors, canCreateSector } from '@/lib/permissions';

// GET /api/ccr/sectors - Lista todos os setores
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canAccessSectors(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');

    const sectors = await prismadb.sector.findMany({
      where: {
        ...(isActive !== null && { isActive: isActive === 'true' }),
      },
      include: {
        _count: {
          select: {
            tramitations: true,
            notificationAttempts: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Adicionar flag isInUse para indicar se o setor está sendo usado
    const sectorsWithFlag = sectors.map(sector => ({
      ...sector,
      isInUse: sector._count.tramitations > 0 || sector._count.notificationAttempts > 0,
    }));

    return NextResponse.json(sectorsWithFlag);
  } catch (error) {
    console.log('[SECTORS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

// POST /api/ccr/sectors - Cria um novo setor
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canCreateSector(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    const { name, abbreviation, dispatchCode, description, phone, email, address } = body;

    if (!name) {
      return new NextResponse('Nome é obrigatório', { status: 400 });
    }

    const sector = await prismadb.sector.create({
      data: {
        name,
        abbreviation: abbreviation || null,
        dispatchCode: dispatchCode || null,
        description: description || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        isActive: true,
      },
    });

    return NextResponse.json(sector);
  } catch (error) {
    console.log('[SECTORS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
