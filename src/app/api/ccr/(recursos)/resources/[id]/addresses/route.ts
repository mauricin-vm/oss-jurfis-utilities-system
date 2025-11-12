import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canAccessAddresses, canEditAddresses } from '@/lib/permissions';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canAccessAddresses(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;

    // Buscar todos os endereços do recurso (ativos e inativos)
    const addresses = await prismadb.address.findMany({
      where: {
        resourceId: id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(addresses);
  } catch (error) {
    console.log('[ADDRESSES_GET]', error);
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

    if (!canEditAddresses(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { addresses } = body;

    if (!addresses || !Array.isArray(addresses)) {
      return new NextResponse('Dados inválidos', { status: 400 });
    }

    // Verificar se o recurso existe
    const resource = await prismadb.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return new NextResponse('Recurso não encontrado', { status: 404 });
    }

    // Buscar endereços existentes
    const existingAddresses = await prismadb.address.findMany({
      where: { resourceId: id },
    });

    // Não há mais lógica de exclusão automática ao salvar
    // Endereços devem ser excluídos/desativados através de botões específicos

    // Atualizar ou criar endereços
    for (const address of addresses) {
      if (address.id && !address.isNew) {
        // Atualizar endereço existente
        await prismadb.address.update({
          where: { id: address.id },
          data: {
            type: address.type,
            cep: address.cep || null,
            street: address.street,
            number: address.number || null,
            complement: address.complement || null,
            neighborhood: address.neighborhood || null,
            city: address.city,
            state: address.state,
            isPrimary: address.isPrimary || false,
          },
        });
      } else {
        // Criar novo endereço
        await prismadb.address.create({
          data: {
            resourceId: id,
            type: address.type,
            cep: address.cep || null,
            street: address.street,
            number: address.number || null,
            complement: address.complement || null,
            neighborhood: address.neighborhood || null,
            city: address.city,
            state: address.state,
            isPrimary: address.isPrimary || false,
            isActive: true,
          },
        });
      }
    }

    return NextResponse.json({ message: 'Endereços atualizados com sucesso' });
  } catch (error) {
    console.log('[ADDRESSES_PUT]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
