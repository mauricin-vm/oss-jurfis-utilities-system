import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Atualizar o usuário para marcar onboarding como concluído
    await prismadb.user.update({
      where: { email: session.user.email },
      data: {
        hasCompletedOnboarding: true,
        lastOnboardingDate: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar onboarding:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar onboarding' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Buscar status do onboarding do usuário
    const user = await prismadb.user.findUnique({
      where: { email: session.user.email },
      select: {
        hasCompletedOnboarding: true,
        lastOnboardingDate: true,
      },
    });

    return NextResponse.json({
      hasCompletedOnboarding: user?.hasCompletedOnboarding ?? false,
      lastOnboardingDate: user?.lastOnboardingDate,
    });
  } catch (error) {
    console.error('Erro ao buscar status do onboarding:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status do onboarding' },
      { status: 500 }
    );
  }
}
