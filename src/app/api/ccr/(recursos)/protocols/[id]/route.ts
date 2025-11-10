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

    const protocol = await prismadb.protocol.findUnique({
      where: {
        id,
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
              include: {
                contacts: {
                  where: {
                    protocolId: id, // Apenas contatos deste protocolo
                  },
                },
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
        tramitations: {
          include: {
            sector: {
              select: {
                id: true,
                name: true,
              },
            },
            member: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
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

    if (!protocol) {
      return new NextResponse('Protocolo não encontrado', { status: 404 });
    }

    return NextResponse.json(protocol);
  } catch (error) {
    console.log('[PROTOCOL_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function PUT(
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
    const { processNumber, presenter, status, createdAt, parts } = body;

    // Verificar se o protocolo existe
    const existingProtocol = await prismadb.protocol.findUnique({
      where: { id },
      include: {
        resource: true,
      },
    });

    if (!existingProtocol) {
      return new NextResponse('Protocolo não encontrado', { status: 404 });
    }

    // Se já foi convertido em recurso, não permitir algumas alterações
    if (existingProtocol.resource) {
      return new NextResponse('Protocolo já foi convertido em recurso', { status: 400 });
    }

    // Validar enum de status
    if (status) {
      const validStatuses = ['PENDENTE', 'CONCLUIDO', 'ARQUIVADO'];
      if (!validStatuses.includes(status)) {
        return new NextResponse('Status inválido', { status: 400 });
      }
    }

    // Atualizar campos básicos do protocolo
    await prismadb.protocol.update({
      where: { id },
      data: {
        ...(processNumber && { processNumber }),
        ...(presenter && { presenter }),
        ...(status && { status }),
        ...(createdAt && { createdAt: new Date(createdAt) }),
      },
    });

    // Se parts foi enviado, recriar tudo
    if (parts !== undefined) {
      // Buscar parts vinculadas antes de deletar
      const oldProtocolParts = await prismadb.protocolPart.findMany({
        where: { protocolId: id },
        select: { partId: true },
      });

      const oldPartIds = oldProtocolParts.map(pp => pp.partId);

      // Deletar ProtocolPart (junção) - isso não deleta a Part
      await prismadb.protocolPart.deleteMany({
        where: { protocolId: id },
      });

      // Deletar Contacts deste protocolo
      await prismadb.contact.deleteMany({
        where: { protocolId: id },
      });

      // Verificar e deletar Parts órfãs (sem contacts em NENHUM protocolo)
      for (const partId of oldPartIds) {
        const contactsCount = await prismadb.contact.count({
          where: { partId },
        });

        if (contactsCount === 0) {
          // Também verificar se tem outras ligações de protocolo
          const protocolPartsCount = await prismadb.protocolPart.count({
            where: { partId },
          });

          if (protocolPartsCount === 0) {
            await prismadb.part.delete({
              where: { id: partId },
            });
          }
        }
      }

      // Agrupar partes por nome + role
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

        if (part.contacts && part.contacts.length > 0) {
          groupedParts[key].contacts.push(...part.contacts);
        }
      }

      // Recriar parts e contacts
      const currentProcessNumber = processNumber || existingProtocol.processNumber;

      for (const partData of Object.values(groupedParts)) {
        // Buscar ou criar Part (única por name + role + processNumber)
        let dbPart = await prismadb.part.findUnique({
          where: {
            name_role_processNumber: {
              name: partData.name,
              role: partData.role as any,
              processNumber: currentProcessNumber,
            },
          },
        });

        if (!dbPart) {
          dbPart = await prismadb.part.create({
            data: {
              name: partData.name,
              role: partData.role as any,
              document: partData.document,
              processNumber: currentProcessNumber,
              createdBy: session.user.id,
            },
          });
        }

        // Criar relacionamento Protocol <-> Part (se ainda não existir)
        const existingLink = await prismadb.protocolPart.findUnique({
          where: {
            protocolId_partId: {
              protocolId: id,
              partId: dbPart.id,
            },
          },
        });

        if (!existingLink) {
          await prismadb.protocolPart.create({
            data: {
              protocolId: id,
              partId: dbPart.id,
            },
          });
        }

        // Criar contatos
        for (const contact of partData.contacts) {
          await prismadb.contact.create({
            data: {
              partId: dbPart.id,
              protocolId: id,
              processNumber: currentProcessNumber,
              type: contact.type as any,
              value: contact.value,
              isPrimary: contact.isPrimary || true,
              createdBy: session.user.id,
            },
          });
        }
      }
    }

    // Buscar protocolo atualizado
    const protocol = await prismadb.protocol.findUnique({
      where: { id },
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
        resource: true,
        _count: {
          select: {
            parts: true,
            tramitations: true,
          },
        },
      },
    });

    return NextResponse.json(protocol);
  } catch (error) {
    console.log('[PROTOCOL_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;

    const protocol = await prismadb.protocol.findUnique({
      where: {
        id,
      },
      include: {
        resource: true,
        tramitations: true,
      },
    });

    if (!protocol) {
      return new NextResponse('Protocolo não encontrado', { status: 404 });
    }

    // Não permitir deletar se já foi convertido em recurso
    if (protocol.resource) {
      return new NextResponse(
        'Não é possível deletar protocolo que já foi convertido em recurso',
        { status: 400 }
      );
    }

    // Verificar se é o último protocolo criado
    const latestProtocol = await prismadb.protocol.findFirst({
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { sequenceNumber: 'desc' },
      ],
    });

    if (!latestProtocol || latestProtocol.id !== id) {
      return new NextResponse(
        'Apenas o último protocolo criado pode ser excluído',
        { status: 400 }
      );
    }

    // Buscar todas as parts vinculadas a este protocolo antes de deletar
    const protocolParts = await prismadb.protocolPart.findMany({
      where: { protocolId: id },
      select: { partId: true },
    });

    const partIds = protocolParts.map(pp => pp.partId);

    // Delete Protocol - cascade delete irá remover:
    // - ProtocolPart (junção)
    // - Contacts (onDelete: Cascade)
    // - Tramitations
    await prismadb.protocol.delete({
      where: {
        id,
      },
    });

    // Para cada Part, verificar se ficou órfã (sem contacts e sem outros protocolos)
    for (const partId of partIds) {
      const contactsCount = await prismadb.contact.count({
        where: { partId },
      });

      // Se a Part não tem mais contatos
      if (contactsCount === 0) {
        // Verificar se ainda está vinculada a outros protocolos
        const protocolPartsCount = await prismadb.protocolPart.count({
          where: { partId },
        });

        // Se não está vinculada a nenhum protocolo, deletá-la
        if (protocolPartsCount === 0) {
          await prismadb.part.delete({
            where: { id: partId },
          });
        }
      }
    }

    return NextResponse.json({ message: 'Protocolo removido com sucesso' });
  } catch (error) {
    console.log('[PROTOCOL_DELETE]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
