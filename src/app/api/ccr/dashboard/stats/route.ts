import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prismadb from '@/lib/prismadb';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const selectedYear = year ? parseInt(year) : new Date().getFullYear();

    // Protocolos
    const totalProtocols = await prismadb.protocol.count();
    const protocolsByStatus = await prismadb.protocol.groupBy({
      by: ['status'],
      _count: true,
    });

    const protocolsThisYear = await prismadb.protocol.count({
      where: {
        year: selectedYear,
      },
    });

    // Protocolos por mês do ano selecionado
    const protocolsByMonth = await prismadb.protocol.groupBy({
      by: ['month'],
      where: {
        year: selectedYear,
      },
      _count: true,
    });

    const monthlyProtocols = protocolsByMonth.map((pm) => ({
      month: pm.month,
      count: pm._count,
    }));

    // Recursos
    const totalResources = await prismadb.resource.count();
    const resourcesByStatus = await prismadb.resource.groupBy({
      by: ['status'],
      _count: true,
    });

    const resourcesThisYear = await prismadb.resource.count({
      where: {
        year: selectedYear,
      },
    });

    // Recursos por ano
    const resourcesByYear = await prismadb.resource.groupBy({
      by: ['year'],
      _count: true,
      orderBy: {
        year: 'desc',
      },
      take: 5,
    });

    // Top 5 assuntos mais utilizados
    const resourcesBySubject = await prismadb.subjectChildren.groupBy({
      by: ['subjectId'],
      _count: true,
      orderBy: {
        _count: {
          subjectId: 'desc',
        },
      },
      take: 5,
    });

    // Buscar nomes dos assuntos
    const subjectIds = resourcesBySubject.map((rs) => rs.subjectId);
    const subjects = await prismadb.subject.findMany({
      where: {
        id: {
          in: subjectIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const resourcesBySubjectWithNames = resourcesBySubject.map((rs) => ({
      subject: subjects.find((s) => s.id === rs.subjectId)?.name || 'Desconhecido',
      count: rs._count,
    }));

    // Documentos
    const totalDocuments = await prismadb.document.count();

    // Tramitações
    const totalTramitations = await prismadb.tramitation.count();
    const tramitationsThisMonth = await prismadb.tramitation.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
        },
      },
    });

    // Intimações (Listas de Intimação)
    const totalNotifications = await prismadb.notificationList.count();
    const notificationsByStatus = await prismadb.notificationList.groupBy({
      by: ['status'],
      _count: true,
    });

    const pendingNotifications = await prismadb.notificationList.count({
      where: {
        status: 'PENDENTE',
      },
    });

    return NextResponse.json({
      year: selectedYear,
      protocols: {
        total: totalProtocols,
        thisYear: protocolsThisYear,
        byStatus: protocolsByStatus,
        byMonth: monthlyProtocols,
      },
      resources: {
        total: totalResources,
        thisYear: resourcesThisYear,
        byStatus: resourcesByStatus,
        byYear: resourcesByYear.map((r) => ({
          year: r.year,
          count: r._count,
        })),
        bySubject: resourcesBySubjectWithNames,
      },
      documents: {
        total: totalDocuments,
      },
      tramitations: {
        total: totalTramitations,
        thisMonth: tramitationsThisMonth,
      },
      notifications: {
        total: totalNotifications,
        pending: pendingNotifications,
        byStatus: notificationsByStatus,
      },
    });
  } catch (error) {
    console.log('[DASHBOARD_STATS_GET]', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}
