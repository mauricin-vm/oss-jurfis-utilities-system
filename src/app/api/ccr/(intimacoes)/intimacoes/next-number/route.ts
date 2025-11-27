import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentYear = new Date().getFullYear();

    // Buscar o último número do ano
    const lastList = await prismadb.notificationList.findFirst({
      where: { year: currentYear },
      orderBy: { sequenceNumber: 'desc' },
    });

    // Gerar próximo número sequencial (1, 2, etc)
    const nextSequenceNumber = lastList ? lastList.sequenceNumber + 1 : 1;
    const listNumber = `${String(nextSequenceNumber).padStart(3, '0')}/${currentYear}`;

    return NextResponse.json({ listNumber, sequenceNumber: nextSequenceNumber, year: currentYear });
  } catch (error) {
    console.error('[INTIMACOES_NEXT_NUMBER_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
