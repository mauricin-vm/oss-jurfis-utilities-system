import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canEditParts } from '@/lib/permissions';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canEditParts(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { parts, authorities } = body;

    // Verificar se o recurso existe
    const resource = await prismadb.resource.findUnique({
      where: { id },
      select: { processNumber: true },
    });

    if (!resource) {
      return new NextResponse('Recurso não encontrado', { status: 404 });
    }

    // Processar partes se fornecidas
    if (parts && Array.isArray(parts)) {
      // Buscar partes existentes pelo processNumber
      const existingParts = await prismadb.part.findMany({
        where: { processNumber: resource.processNumber },
      });

      // IDs das partes que devem ser mantidas
      const partIdsToKeep = parts
        .filter((p: any) => p.id)
        .map((p: any) => p.id);

      // Deletar partes que não estão mais na lista
      const partsToDelete = existingParts.filter(
        (part) => !partIdsToKeep.includes(part.id)
      );

      for (const part of partsToDelete) {
        await prismadb.part.delete({
          where: { id: part.id },
        });
      }

      // Processar cada parte
      for (const part of parts) {
        if (part.id) {
          // Atualizar parte existente
          await prismadb.part.update({
            where: { id: part.id },
            data: {
              name: part.name,
              role: part.role,
              registrationType: part.registrationType,
              registrationNumber: part.registrationNumber,
              isActive: part.isActive ?? true,
            },
          });
        } else {
          // Criar nova parte
          await prismadb.part.create({
            data: {
              processNumber: resource.processNumber,
              name: part.name,
              role: part.role,
              registrationType: part.registrationType,
              registrationNumber: part.registrationNumber,
              isActive: part.isActive ?? true,
              createdBy: session.user.id,
            },
          });
        }
      }
    }

    // Processar autoridades se fornecidas
    if (authorities && Array.isArray(authorities)) {
      // Buscar todas as autoridades existentes
      const existingAuthorities = await prismadb.authority.findMany({
        where: { resourceId: id },
      });

      // IDs das autoridades que devem ser mantidas
      const authorityIdsToKeep = authorities
        .filter((a: any) => a.id)
        .map((a: any) => a.id);

      // Deletar autoridades que não estão mais na lista
      const authoritiesToDelete = existingAuthorities.filter(
        (auth) => !authorityIdsToKeep.includes(auth.id)
      );

      for (const auth of authoritiesToDelete) {
        await prismadb.authority.delete({
          where: { id: auth.id },
        });
      }

      // Processar cada autoridade
      for (const authority of authorities) {
        if (authority.id) {
          // Atualizar autoridade existente
          await prismadb.authority.update({
            where: { id: authority.id },
            data: {
              type: authority.type,
              authorityRegisteredId: authority.authorityRegisteredId,
            },
          });
        } else {
          // Criar nova autoridade
          await prismadb.authority.create({
            data: {
              resourceId: id,
              type: authority.type,
              authorityRegisteredId: authority.authorityRegisteredId,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log('[RESOURCE_AUTHORITIES_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
