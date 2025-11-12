// node prisma/scripts/0-clear-ccr-tables.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function clearCCRTables() {
  try {
    console.log('🧹 Iniciando limpeza das tabelas CCR...\n');

    // Ordem de deleção respeitando as foreign keys (de baixo para cima na hierarquia)

    // 1. Notificações
    console.log('📧 Deletando NotificationContact...');
    const notificationContactCount = await prisma.notificationContact.deleteMany({});
    console.log(`   ✓ ${notificationContactCount.count} registros deletados\n`);

    console.log('📧 Deletando Notification...');
    const notificationCount = await prisma.notification.deleteMany({});
    console.log(`   ✓ ${notificationCount.count} registros deletados\n`);

    // 2. Documentos e Publicações
    console.log('📄 Deletando Document...');
    const documentCount = await prisma.document.deleteMany({});
    console.log(`   ✓ ${documentCount.count} registros deletados\n`);

    console.log('📰 Deletando Publication...');
    const publicationCount = await prisma.publication.deleteMany({});
    console.log(`   ✓ ${publicationCount.count} registros deletados\n`);

    // 3. Histórico
    console.log('📜 Deletando ResourceHistory...');
    const historyCount = await prisma.resourceHistory.deleteMany({});
    console.log(`   ✓ ${historyCount.count} registros deletados\n`);

    // 4. Atas (SessionMinutes) e relacionados
    console.log('📝 Deletando SessionMinutesAbsence...');
    const minutesAbsenceCount = await prisma.sessionMinutesAbsence.deleteMany({});
    console.log(`   ✓ ${minutesAbsenceCount.count} registros deletados\n`);

    console.log('📝 Deletando SessionMinutesMember...');
    const minutesMemberCount = await prisma.sessionMinutesMember.deleteMany({});
    console.log(`   ✓ ${minutesMemberCount.count} registros deletados\n`);

    console.log('📝 Deletando SessionMinutesDistribution...');
    const minutesDistributionCount = await prisma.sessionMinutesDistribution.deleteMany({});
    console.log(`   ✓ ${minutesDistributionCount.count} registros deletados\n`);

    console.log('📝 Deletando SessionMinutes...');
    const minutesCount = await prisma.sessionMinutes.deleteMany({});
    console.log(`   ✓ ${minutesCount.count} registros deletados\n`);

    // 5. Votos e Julgamentos
    console.log('🗳️  Deletando SessionMemberVote...');
    const memberVoteCount = await prisma.sessionMemberVote.deleteMany({});
    console.log(`   ✓ ${memberVoteCount.count} registros deletados\n`);

    console.log('🗳️  Deletando SessionJudgment...');
    const judgmentCount = await prisma.sessionJudgment.deleteMany({});
    console.log(`   ✓ ${judgmentCount.count} registros deletados\n`);

    console.log('🗳️  Deletando SessionVotingResult...');
    const votingResultCount = await prisma.sessionVotingResult.deleteMany({});
    console.log(`   ✓ ${votingResultCount.count} registros deletados\n`);

    // 6. Membros das Sessões
    console.log('👥 Deletando SessionMember...');
    const sessionMemberCount = await prisma.sessionMember.deleteMany({});
    console.log(`   ✓ ${sessionMemberCount.count} registros deletados\n`);

    // 7. Distribuições e Recursos de Sessão
    console.log('📋 Deletando SessionDistribution...');
    const distributionCount = await prisma.sessionDistribution.deleteMany({});
    console.log(`   ✓ ${distributionCount.count} registros deletados\n`);

    console.log('📋 Deletando SessionResource...');
    const sessionResourceCount = await prisma.sessionResource.deleteMany({});
    console.log(`   ✓ ${sessionResourceCount.count} registros deletados\n`);

    // 8. Sessões
    console.log('🏛️  Deletando Session...');
    const sessionCount = await prisma.session.deleteMany({});
    console.log(`   ✓ ${sessionCount.count} registros deletados\n`);

    // 9. Decisões de Voto
    console.log('⚖️  Deletando SessionVoteDecision...');
    const voteDecisionCount = await prisma.sessionVoteDecision.deleteMany({});
    console.log(`   ✓ ${voteDecisionCount.count} registros deletados\n`);

    // 10. Autoridades e Valores de Registro
    console.log('👤 Deletando Authority...');
    const authorityCount = await prisma.authority.deleteMany({});
    console.log(`   ✓ ${authorityCount.count} registros deletados\n`);

    console.log('💰 Deletando RegistrationValue...');
    const registrationValueCount = await prisma.registrationValue.deleteMany({});
    console.log(`   ✓ ${registrationValueCount.count} registros deletados\n`);

    console.log('📋 Deletando Registration...');
    const registrationCount = await prisma.registration.deleteMany({});
    console.log(`   ✓ ${registrationCount.count} registros deletados\n`);

    // 11. Assuntos
    console.log('📚 Deletando SubjectChildren...');
    const subjectChildrenCount = await prisma.subjectChildren.deleteMany({});
    console.log(`   ✓ ${subjectChildrenCount.count} registros deletados\n`);

    console.log('📚 Deletando Subject...');
    const subjectCount = await prisma.subject.deleteMany({});
    console.log(`   ✓ ${subjectCount.count} registros deletados\n`);

    // 12. Recursos
    console.log('📁 Deletando Resource...');
    const resourceCount = await prisma.resource.deleteMany({});
    console.log(`   ✓ ${resourceCount.count} registros deletados\n`);

    // 13. Tramitações
    console.log('🔄 Deletando Tramitation...');
    const tramitationCount = await prisma.tramitation.deleteMany({});
    console.log(`   ✓ ${tramitationCount.count} registros deletados\n`);

    // 14. Contatos e Partes dos Protocolos
    console.log('📞 Deletando Contact...');
    const contactCount = await prisma.contact.deleteMany({});
    console.log(`   ✓ ${contactCount.count} registros deletados\n`);

    console.log('🔗 Deletando ProtocolPart...');
    const protocolPartCount = await prisma.protocolPart.deleteMany({});
    console.log(`   ✓ ${protocolPartCount.count} registros deletados\n`);

    // 15. Protocolos
    console.log('📝 Deletando Protocol...');
    const protocolCount = await prisma.protocol.deleteMany({});
    console.log(`   ✓ ${protocolCount.count} registros deletados\n`);

    // 16. Partes
    console.log('👤 Deletando Part...');
    const partCount = await prisma.part.deleteMany({});
    console.log(`   ✓ ${partCount.count} registros deletados\n`);

    // 17. Setores e Membros (sem dependências)
    console.log('🏢 Deletando Sector...');
    const sectorCount = await prisma.sector.deleteMany({});
    console.log(`   ✓ ${sectorCount.count} registros deletados\n`);

    console.log('👥 Deletando Member...');
    const memberCount = await prisma.member.deleteMany({});
    console.log(`   ✓ ${memberCount.count} registros deletados\n`);

    console.log('👤 Deletando AuthorityRegistered...');
    const authorityRegisteredCount = await prisma.authorityRegistered.deleteMany({});
    console.log(`   ✓ ${authorityRegisteredCount.count} registros deletados\n`);

    // Resumo
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ LIMPEZA CONCLUÍDA COM SUCESSO!\n');
    console.log('📊 RESUMO:');
    console.log(`   • NotificationContact: ${notificationContactCount.count}`);
    console.log(`   • Notification: ${notificationCount.count}`);
    console.log(`   • Document: ${documentCount.count}`);
    console.log(`   • Publication: ${publicationCount.count}`);
    console.log(`   • ResourceHistory: ${historyCount.count}`);
    console.log(`   • SessionMinutesAbsence: ${minutesAbsenceCount.count}`);
    console.log(`   • SessionMinutesMember: ${minutesMemberCount.count}`);
    console.log(`   • SessionMinutesDistribution: ${minutesDistributionCount.count}`);
    console.log(`   • SessionMinutes: ${minutesCount.count}`);
    console.log(`   • SessionMemberVote: ${memberVoteCount.count}`);
    console.log(`   • SessionJudgment: ${judgmentCount.count}`);
    console.log(`   • SessionVotingResult: ${votingResultCount.count}`);
    console.log(`   • SessionMember: ${sessionMemberCount.count}`);
    console.log(`   • SessionDistribution: ${distributionCount.count}`);
    console.log(`   • SessionResource: ${sessionResourceCount.count}`);
    console.log(`   • Session: ${sessionCount.count}`);
    console.log(`   • SessionVoteDecision: ${voteDecisionCount.count}`);
    console.log(`   • Authority: ${authorityCount.count}`);
    console.log(`   • RegistrationValue: ${registrationValueCount.count}`);
    console.log(`   • Registration: ${registrationCount.count}`);
    console.log(`   • SubjectChildren: ${subjectChildrenCount.count}`);
    console.log(`   • Subject: ${subjectCount.count}`);
    console.log(`   • Resource: ${resourceCount.count}`);
    console.log(`   • Tramitation: ${tramitationCount.count}`);
    console.log(`   • Contact: ${contactCount.count}`);
    console.log(`   • ProtocolPart: ${protocolPartCount.count}`);
    console.log(`   • Protocol: ${protocolCount.count}`);
    console.log(`   • Part: ${partCount.count}`);
    console.log(`   • Sector: ${sectorCount.count}`);
    console.log(`   • Member: ${memberCount.count}`);
    console.log(`   • AuthorityRegistered: ${authorityRegisteredCount.count}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const totalDeleted =
      notificationContactCount.count +
      notificationCount.count +
      documentCount.count +
      publicationCount.count +
      historyCount.count +
      minutesAbsenceCount.count +
      minutesMemberCount.count +
      minutesDistributionCount.count +
      minutesCount.count +
      memberVoteCount.count +
      judgmentCount.count +
      votingResultCount.count +
      sessionMemberCount.count +
      distributionCount.count +
      sessionResourceCount.count +
      sessionCount.count +
      voteDecisionCount.count +
      authorityCount.count +
      registrationValueCount.count +
      registrationCount.count +
      subjectChildrenCount.count +
      subjectCount.count +
      resourceCount.count +
      tramitationCount.count +
      contactCount.count +
      protocolPartCount.count +
      protocolCount.count +
      partCount.count +
      sectorCount.count +
      memberCount.count +
      authorityRegisteredCount.count;

    console.log(`\n🎯 TOTAL DE REGISTROS DELETADOS: ${totalDeleted}\n`);

  } catch (error) {
    console.error('❌ ERRO ao limpar tabelas CCR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Conexão com o banco de dados encerrada.');
  }
}

// Executar o script
clearCCRTables()
  .catch((error) => {
    console.error('❌ ERRO FATAL:', error);
    process.exit(1);
  });
