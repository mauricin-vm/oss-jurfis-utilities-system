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

    // Buscar contatos da parte
    const contacts = await prismadb.contact.findMany({
      where: {
        partId: id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.log('[PART_CONTACTS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
