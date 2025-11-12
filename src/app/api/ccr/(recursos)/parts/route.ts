import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canAccessParts } from '@/lib/permissions';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canAccessParts(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const processNumber = searchParams.get('processNumber');

    if (!processNumber) {
      return new NextResponse('processNumber é obrigatório', { status: 400 });
    }

    // Buscar todas as partes do processo com seus contatos (ativos e inativos)
    const parts = await prismadb.part.findMany({
      where: {
        processNumber,
      },
      include: {
        contacts: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(parts);
  } catch (error) {
    console.log('[PARTS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
