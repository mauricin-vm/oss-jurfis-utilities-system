import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

interface Contact {
  type: string;
  value: string;
  isPrimary: boolean;
}

interface GroupedPart {
  name: string;
  role: string;
  document: string | null;
  contacts: Contact[];
}

// Gerar número de protocolo no formato XXX/MM-YYYY
async function generateProtocolNumber(): Promise<{
  number: string;
  sequenceNumber: number;
  month: number;
  year: number;
}> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentYear = now.getFullYear();

  // Buscar o último protocolo do mês/ano
  const lastProtocol = await prismadb.protocol.findFirst({
    where: {
      month: currentMonth,
      year: currentYear,
    },
    orderBy: {
      sequenceNumber: 'desc',
    },
  });

  const sequenceNumber = lastProtocol ? lastProtocol.sequenceNumber + 1 : 1;

  // Formatar: XXX/MM-YYYY
  const formattedSeq = sequenceNumber.toString().padStart(3, '0');
  const formattedMonth = currentMonth.toString().padStart(2, '0');
  const number = `${formattedSeq}/${formattedMonth}-${currentYear}`;

  return {
    number,
    sequenceNumber,
    month: currentMonth,
    year: currentYear,
  };
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const year = searchParams.get('year');

    const protocols = await prismadb.protocol.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(year && { year: parseInt(year) }),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parts: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        resource: {
          select: {
            id: true,
            resourceNumber: true,
            status: true,
          },
        },
        _count: {
          select: {
            tramitations: true,
            parts: true,
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { sequenceNumber: 'desc' },
      ],
    });

    // Identificar o último protocolo criado (maior year + month + sequenceNumber)
    let latestProtocolId: string | null = null;
    if (protocols.length > 0) {
      const latest = protocols.reduce((prev, current) => {
        if (current.year > prev.year) return current;
        if (current.year === prev.year && current.month > prev.month) return current;
        if (current.year === prev.year && current.month === prev.month && current.sequenceNumber > prev.sequenceNumber) return current;
        return prev;
      });
      latestProtocolId = latest.id;
    }

    // Adicionar flag isLatest a cada protocolo
    const protocolsWithFlag = protocols.map(protocol => ({
      ...protocol,
      isLatest: protocol.id === latestProtocolId,
    }));

    return NextResponse.json(protocolsWithFlag);
  } catch (error) {
    console.log('[PROTOCOLS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { processNumber, presenter, parts = [] } = body;

    if (!processNumber) {
      return new NextResponse('Número do processo é obrigatório', { status: 400 });
    }

    if (!presenter) {
      return new NextResponse('Apresentante é obrigatório', { status: 400 });
    }

    // Gerar número do protocolo
    const protocolNumberData = await generateProtocolNumber();

    // Criar protocolo primeiro
    const protocol = await prismadb.protocol.create({
      data: {
        ...protocolNumberData,
        processNumber,
        presenter,
        employeeId: session.user.id,
        status: 'PENDENTE',
      },
    });

    // Agrupar partes por nome + role (pode haver nomes repetidos com contatos diferentes)
    const groupedParts: Record<string, GroupedPart> = {};

    for (const part of parts) {
      const key = `${part.name}|${part.role}`;
      if (!groupedParts[key]) {
        groupedParts[key] = {
          name: part.name,
          role: part.role,
          document: part.document || null,
          contacts: [],
        };
      }

      // Adicionar todos os contatos desta parte
      if (part.contacts && part.contacts.length > 0) {
        groupedParts[key].contacts.push(...part.contacts);
      }
    }

    // Para cada parte única, buscar/criar e vincular ao protocolo
    for (const partData of Object.values(groupedParts)) {
      // Buscar ou criar Part (única por name + role + processNumber)
      let dbPart = await prismadb.part.findUnique({
        where: {
          name_role_processNumber: {
            name: partData.name,
            role: partData.role as any,
            processNumber: processNumber,
          },
        },
      });

      if (!dbPart) {
        // Criar nova Part
        dbPart = await prismadb.part.create({
          data: {
            name: partData.name,
            role: partData.role as any,
            document: partData.document,
            processNumber: processNumber,
            createdBy: session.user.id,
          },
        });
      }

      // Criar relacionamento Protocol <-> Part (se ainda não existir)
      const existingLink = await prismadb.protocolPart.findUnique({
        where: {
          protocolId_partId: {
            protocolId: protocol.id,
            partId: dbPart.id,
          },
        },
      });

      if (!existingLink) {
        await prismadb.protocolPart.create({
          data: {
            protocolId: protocol.id,
            partId: dbPart.id,
          },
        });
      }

      // Criar todos os contatos vinculados ao Protocol E à Part
      for (const contact of partData.contacts) {
        await prismadb.contact.create({
          data: {
            partId: dbPart.id,
            protocolId: protocol.id,
            processNumber: processNumber,
            type: contact.type as any,
            value: contact.value,
            isPrimary: contact.isPrimary || true,
            createdBy: session.user.id,
          },
        });
      }
    }

    // Buscar protocolo completo para retornar
    const fullProtocol = await prismadb.protocol.findUnique({
      where: { id: protocol.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        parts: {
          include: {
            part: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            parts: true,
            tramitations: true,
          },
        },
      },
    });

    return NextResponse.json(fullProtocol);
  } catch (error) {
    console.log('[PROTOCOLS_POST]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
