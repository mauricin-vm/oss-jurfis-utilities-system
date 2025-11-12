// node prisma/scripts/1-seed-ccr-defaults.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedCCRDefaults() {
  try {
    console.log('🌱 Iniciando seed das tabelas CCR...\n');

    // ============================================
    // 1. SETORES
    // ============================================
    console.log('🏢 Criando Setores...');
    const sectors = await Promise.all([
      prisma.sector.create({
        data: {
          name: 'Coordenadoria de Julgamento e Consultas (CJC/SEFAZ)',
          abbreviation: 'CJC/SEFAZ',
          dispatchCode: '0380140400',
          description: 'Setor responsável pelo julgamento e consultas de primeira instância da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - 4º andar - Sala 07, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Divisão de Lançamento de Tributos (DILT/SEFAZ)',
          abbreviation: 'DILT/SEFAZ',
          dispatchCode: '0380210210',
          description: 'Setor responsável pelo lançamento de tributos da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - 4º andar - Sala 08, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Divisão de Arrecadação (DIAR/SEFAZ)',
          abbreviation: 'DIAR/SEFAZ',
          dispatchCode: '0380210250',
          description: 'Setor responsável pela arrecadação de tributos da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - térreo, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Gerência de Cadastro Econômico (GCE/SEFAZ)',
          abbreviation: 'GCE/SEFAZ',
          dispatchCode: '0380210110',
          description: 'Setor responsável pelo cadastro econômico da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - 4º andar - Sala 16, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Gabinete da SEFAZ',
          abbreviation: 'GAB/SEFAZ',
          dispatchCode: '0380140100',
          description: 'Setor responsável pelo gerenciamento da Secretaria Municipal da Fazenda na Central de Atendimento ao Cidadão.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - 4º andar - Sala 11, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Habite-se (SEFAZ)',
          abbreviation: 'HAB/SEFAZ',
          dispatchCode: '0210101000',
          description: 'Setor responsável pelo habite-se da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - 4º andar - Sala 19, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Divisão de Dívida Ativa (DDA/SEFAZ)',
          abbreviation: 'DDA/SEFAZ',
          dispatchCode: '0380210260',
          description: 'Setor responsável pela dívida ativa da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - 4º andar - Sala 01, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Gerência de Gestão de Pessoas (GGP/SEFAZ)',
          abbreviation: 'GGP/SEFAZ',
          dispatchCode: '0380210270',
          description: 'Setor responsável pela gestão de pessoal da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: '',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Gerência de Gestão Administrativa (GGA/SEFAZ)',
          abbreviation: 'GGA/SEFAZ',
          dispatchCode: '',
          description: 'Setor responsável pela gestão administrativa da Secretaria Municipal da Fazenda.',
          phone: '',
          email: '',
          address: '',
          isActive: true,
        },
      }),
      prisma.sector.create({
        data: {
          name: 'Coordenadoria de Julgamento e Consultas (CJC/SEMADES)',
          abbreviation: 'CJC/SEMADES',
          dispatchCode: '0400100102',
          description: 'Setor responsável pelo julgamento e consultas de primeira instância da Secretaria Municipal de Meio Ambiente, Gestão Urbana e Desenvolvimento Econômico, Turístico e Sustentável.',
          phone: '',
          email: '',
          address: 'Rua Cândido Mariano, n. 2655 - 3º andar - Sala 308, Central de Atendimento ao Cidadão',
          isActive: true,
        },
      }),
    ]);
    console.log(`   ✓ ${sectors.length} setores criados\n`);

    // ============================================
    // 2. MEMBROS (CONSELHEIROS)
    // ============================================
    console.log('👥 Criando Membros...');
    const members = await Promise.all([
      // Presidente
      prisma.member.create({
        data: {
          name: 'Cíntia Satomi Schmidlin de Andrade',
          role: 'Presidente',
          cpf: '',
          registration: '416673',
          agency: 'SEFAZ',
          phone: '',
          email: '',
          gender: 'FEMININO',
          isActive: true,
        },
      }),
      // Vice-Presidente
      prisma.member.create({
        data: {
          name: 'Renata Martins Macedo',
          role: 'Vice-Presidente',
          cpf: '',
          registration: '416700',
          agency: 'SEFAZ',
          phone: '',
          email: '',
          gender: 'FEMININO',
          isActive: true,
        },
      }),
      // Conselheiros Titulares
      prisma.member.create({
        data: {
          name: 'Sergio Antonio Parron Padovan',
          role: 'Representante do Município',
          cpf: '',
          registration: '99457',
          agency: 'SEFAZ',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Marcelino Pereira dos Santos',
          role: 'Representante do Município',
          cpf: '',
          registration: '268062',
          agency: 'PGM',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Gustavo di Luca Fiche',
          role: 'Representante do Município',
          cpf: '',
          registration: '417977',
          agency: 'PGM',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Fernando Augusto de Salles',
          role: 'Representante da ACICG',
          cpf: '',
          registration: '',
          agency: 'ACICG',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'João Sebastião da Silva',
          role: 'Representante do CRC/MS',
          cpf: '',
          registration: '',
          agency: 'CRC/MS',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Felipe Barros Corrêa',
          role: 'Representante da FIEMS',
          cpf: '',
          registration: '',
          agency: 'FIEMS',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Heitor Canton de Matos',
          role: 'Representante da OAB/MS',
          cpf: '',
          registration: '',
          agency: 'OAB/MS',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      // Conselheiros Suplentes
      prisma.member.create({
        data: {
          name: 'Dalton Haick Pierdoná',
          role: 'Representante do Município',
          cpf: '',
          registration: '432446',
          agency: 'SEFAZ',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Eduardo Parra Pascolat',
          role: 'Representante do Município',
          cpf: '',
          registration: '424414',
          agency: 'SEFAZ',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Igor Leles Alevato',
          role: 'Representante do Município',
          cpf: '',
          registration: '432886',
          agency: 'SEFAZ',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Célia Regina Coutinho de Lima',
          role: 'Representante do Município',
          cpf: '',
          registration: '',
          agency: 'PGM',
          phone: '',
          email: '',
          gender: 'FEMININO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Maysa Kozloski Mariozi',
          role: 'Representante do Município',
          cpf: '',
          registration: '426201',
          agency: 'PGM',
          phone: '',
          email: '',
          gender: 'FEMININO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Roberto Tarashigue Oshiro Júnior',
          role: 'Representante da ACICG',
          cpf: '',
          registration: '',
          agency: 'ACICG',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Lucélia da Costa Nogueira Tashima',
          role: 'Representante do CRC/MS',
          cpf: '',
          registration: '',
          agency: 'CRC/MS',
          phone: '',
          email: '',
          gender: 'FEMININO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Jânio Heder Secco',
          role: 'Representante da FIEMS',
          cpf: '',
          registration: '',
          agency: 'FIEMS',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
      prisma.member.create({
        data: {
          name: 'Daniel Henriques de Menezes',
          role: 'Representante da OAB/MS',
          cpf: '',
          registration: '',
          agency: 'OAB/MS',
          phone: '',
          email: '',
          gender: 'MASCULINO',
          isActive: true,
        },
      }),
    ]);
    console.log(`   ✓ ${members.length} membros criados\n`);

    // ============================================
    // 3. AUTORIDADES CADASTRADAS
    // ============================================
    console.log('👤 Criando Autoridades Cadastradas...');
    const authorities = await Promise.all([
      prisma.authorityRegistered.create({
        data: {
          name: 'Caio César da Costa Felix Kromberg',
          phone: '',
          email: '',
          isActive: true,
        },
      }),
      prisma.authorityRegistered.create({
        data: {
          name: 'Danilo Isaias Boaventura',
          phone: '',
          email: '',
          isActive: true,
        },
      }),
      prisma.authorityRegistered.create({
        data: {
          name: 'Deborah Gomes de Miranda Vargas',
          phone: '',
          email: '',
          isActive: true,
        },
      }),
      prisma.authorityRegistered.create({
        data: {
          name: 'Edgard Reis',
          phone: '',
          email: '',
          isActive: true,
        },
      }),
      prisma.authorityRegistered.create({
        data: {
          name: 'Érica Lilian Aguena de Souza',
          phone: '',
          email: '',
          isActive: true,
        },
      }),
      prisma.authorityRegistered.create({
        data: {
          name: 'Felipe Paniago Lordelo Neves',
          phone: '',
          email: '',
          isActive: true,
        },
      }),
      prisma.authorityRegistered.create({
        data: {
          name: 'Gustavo de Oliveira Ferreira',
          phone: '',
          email: '',
          isActive: true,
        },
      }),
    ]);
    console.log(`   ✓ ${authorities.length} autoridades criadas\n`);

    // ============================================
    // 4. ASSUNTOS (COM HIERARQUIA)
    // ============================================
    console.log('📚 Criando Assuntos...');

    // Assuntos Principais (sem parentId)
    const iptuMain = await prisma.subject.create({
      data: {
        name: 'IPTU - Imposto Predial e Territorial Urbano',
        description: 'Assuntos relacionados ao IPTU',
        isActive: true,
      },
    });

    const issMain = await prisma.subject.create({
      data: {
        name: 'ISS - Imposto Sobre Serviços',
        description: 'Assuntos relacionados ao ISS',
        isActive: true,
      },
    });

    const itbiMain = await prisma.subject.create({
      data: {
        name: 'ITBI - Imposto de Transmissão de Bens Imóveis',
        description: 'Assuntos relacionados ao ITBI',
        isActive: true,
      },
    });

    const taxasMain = await prisma.subject.create({
      data: {
        name: 'Taxas Municipais',
        description: 'Taxas diversas do município',
        isActive: true,
      },
    });

    const multasMain = await prisma.subject.create({
      data: {
        name: 'Multas e Penalidades',
        description: 'Multas e penalidades fiscais',
        isActive: true,
      },
    });

    // Subitens do IPTU
    const iptuChildren = await Promise.all([
      prisma.subject.create({
        data: {
          name: 'Isenção de IPTU - Renda',
          description: 'Pedido de isenção por critério de renda',
          parentId: iptuMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Isenção de IPTU - Aposentado/Pensionista',
          description: 'Pedido de isenção para aposentados e pensionistas',
          parentId: iptuMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Revisão de Lançamento - Metragem',
          description: 'Contestação da área do imóvel',
          parentId: iptuMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Revisão de Lançamento - Valor Venal',
          description: 'Contestação do valor venal do imóvel',
          parentId: iptuMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Impugnação de Débito',
          description: 'Contestação de débitos de IPTU',
          parentId: iptuMain.id,
          isActive: true,
        },
      }),
    ]);

    // Subitens do ISS
    const issChildren = await Promise.all([
      prisma.subject.create({
        data: {
          name: 'Revisão de Alíquota',
          description: 'Contestação da alíquota aplicada',
          parentId: issMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Base de Cálculo - Prestação de Serviços',
          description: 'Contestação da base de cálculo',
          parentId: issMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Local de Incidência do Imposto',
          description: 'Discussão sobre competência territorial',
          parentId: issMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Imunidade/Isenção de ISS',
          description: 'Pedidos de imunidade ou isenção',
          parentId: issMain.id,
          isActive: true,
        },
      }),
    ]);

    // Subitens do ITBI
    const itbiChildren = await Promise.all([
      prisma.subject.create({
        data: {
          name: 'Base de Cálculo - Valor da Transação',
          description: 'Contestação do valor da transação',
          parentId: itbiMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Imunidade - Incorporação de Bens',
          description: 'Imunidade na incorporação de bens ao patrimônio',
          parentId: itbiMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Não Incidência - Integralização de Capital',
          description: 'Não incidência na integralização de capital social',
          parentId: itbiMain.id,
          isActive: true,
        },
      }),
    ]);

    // Subitens de Taxas
    const taxasChildren = await Promise.all([
      prisma.subject.create({
        data: {
          name: 'Taxa de Licença para Funcionamento',
          description: 'Contestação de taxa de licença',
          parentId: taxasMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Taxa de Fiscalização e Funcionamento',
          description: 'Contestação de taxa de fiscalização',
          parentId: taxasMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Taxa de Coleta de Lixo',
          description: 'Contestação de taxa de coleta de lixo',
          parentId: taxasMain.id,
          isActive: true,
        },
      }),
    ]);

    // Subitens de Multas
    const multasChildren = await Promise.all([
      prisma.subject.create({
        data: {
          name: 'Multa por Atraso no Pagamento',
          description: 'Contestação de multa moratória',
          parentId: multasMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Multa por Infração - Falta de Registro',
          description: 'Multa por ausência de registro cadastral',
          parentId: multasMain.id,
          isActive: true,
        },
      }),
      prisma.subject.create({
        data: {
          name: 'Multa Punitiva - Sonegação',
          description: 'Multa por sonegação fiscal',
          parentId: multasMain.id,
          isActive: true,
        },
      }),
    ]);

    const totalSubjects = 5 + iptuChildren.length + issChildren.length + itbiChildren.length + taxasChildren.length + multasChildren.length;
    console.log(`   ✓ ${totalSubjects} assuntos criados (5 principais + ${totalSubjects - 5} subitens)\n`);

    // Resumo
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ SEED CONCLUÍDO COM SUCESSO!\n');
    console.log('📊 RESUMO:');
    console.log(`   • Setores: ${sectors.length}`);
    console.log(`   • Membros: ${members.length}`);
    console.log(`   • Autoridades: ${authorities.length}`);
    console.log(`   • Assuntos: ${totalSubjects}`);
    console.log(`     - Principais: 5`);
    console.log(`     - IPTU: ${iptuChildren.length} subitens`);
    console.log(`     - ISS: ${issChildren.length} subitens`);
    console.log(`     - ITBI: ${itbiChildren.length} subitens`);
    console.log(`     - Taxas: ${taxasChildren.length} subitens`);
    console.log(`     - Multas: ${multasChildren.length} subitens`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n🎯 TOTAL DE REGISTROS CRIADOS: ${sectors.length + members.length + authorities.length + totalSubjects}\n`);

  } catch (error) {
    console.error('❌ ERRO ao executar seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Conexão com o banco de dados encerrada.');
  }
}

// Executar o script
seedCCRDefaults()
  .catch((error) => {
    console.error('❌ ERRO FATAL:', error);
    process.exit(1);
  });
