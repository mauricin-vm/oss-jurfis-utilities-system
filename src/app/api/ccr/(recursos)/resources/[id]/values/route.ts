import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';
import { canEditRegistrations } from '@/lib/permissions';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canEditRegistrations(session.user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const { registrations } = body;

    // Verificar se o recurso existe
    const resource = await prismadb.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return new NextResponse('Recurso não encontrado', { status: 404 });
    }

    // Buscar todas as inscrições existentes
    const existingRegistrations = await prismadb.registration.findMany({
      where: { resourceId: id },
      include: { values: true },
    });

    // IDs das inscrições que devem ser mantidas
    const registrationIdsToKeep = registrations
      .filter((r: any) => r.id)
      .map((r: any) => r.id);

    // Deletar inscrições que não estão mais na lista
    const registrationsToDelete = existingRegistrations.filter(
      (reg) => !registrationIdsToKeep.includes(reg.id)
    );

    for (const reg of registrationsToDelete) {
      // Deletar valores da inscrição
      await prismadb.registrationValue.deleteMany({
        where: { registrationId: reg.id },
      });
      // Deletar inscrição
      await prismadb.registration.delete({
        where: { id: reg.id },
      });
    }

    // Processar cada inscrição
    for (const registration of registrations) {
      if (registration.id) {
        // Atualizar inscrição existente
        await prismadb.registration.update({
          where: { id: registration.id },
          data: {
            type: registration.type,
            registrationNumber: registration.registrationNumber,
            cep: registration.cep,
            street: registration.street,
            number: registration.number,
            complement: registration.complement,
            neighborhood: registration.neighborhood,
            city: registration.city,
            state: registration.state,
          },
        });

        // Buscar valores existentes desta inscrição
        const existingValues = await prismadb.registrationValue.findMany({
          where: { registrationId: registration.id },
        });

        // IDs dos valores que devem ser mantidos
        const valueIdsToKeep = registration.values
          .filter((v: any) => v.id)
          .map((v: any) => v.id);

        // Deletar valores que não estão mais na lista
        const valuesToDelete = existingValues.filter(
          (val) => !valueIdsToKeep.includes(val.id)
        );

        for (const val of valuesToDelete) {
          await prismadb.registrationValue.delete({
            where: { id: val.id },
          });
        }

        // Atualizar ou criar valores
        for (const value of registration.values) {
          if (value.id) {
            // Atualizar valor existente
            await prismadb.registrationValue.update({
              where: { id: value.id },
              data: {
                description: value.description,
                amount: value.amount,
                dueDate: value.dueDate ? new Date(value.dueDate) : null,
              },
            });
          } else {
            // Criar novo valor
            await prismadb.registrationValue.create({
              data: {
                registrationId: registration.id,
                description: value.description,
                amount: value.amount,
                dueDate: value.dueDate ? new Date(value.dueDate) : null,
              },
            });
          }
        }
      } else {
        // Criar nova inscrição
        const newRegistration = await prismadb.registration.create({
          data: {
            resourceId: id,
            type: registration.type,
            registrationNumber: registration.registrationNumber,
            cep: registration.cep,
            street: registration.street,
            number: registration.number,
            complement: registration.complement,
            neighborhood: registration.neighborhood,
            city: registration.city,
            state: registration.state,
          },
        });

        // Criar valores da nova inscrição
        for (const value of registration.values) {
          await prismadb.registrationValue.create({
            data: {
              registrationId: newRegistration.id,
              description: value.description,
              amount: value.amount,
              dueDate: value.dueDate ? new Date(value.dueDate) : null,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.log('[RESOURCE_VALUES_PATCH]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
