# Sistema de Controle de Recursos (CCR) - Planejamento

## Visão Geral

Sistema complexo para substituir o sistema atual em Access, composto por 5 módulos principais:
1. Protocolos
2. Tramitações
3. Recursos
4. Sessões
5. Notificações

---

## 1. ESTRUTURA DE BANCO DE DADOS (Prisma Schema)

### Novas tabelas no schema `jurfis`:

```prisma
// ============================================
// TABELA DE PARTES (PARTES DO PROCESSO)
// ============================================
// Representa as partes envolvidas (requerente, patrono, representante, etc)
model Part {
  id          String   @id @default(uuid())

  // Informações da parte
  name        String   // Nome completo da parte
  role        PartRole // Papel no processo (REQUERENTE, PATRONO, etc)
  document    String?  // CPF/CNPJ (opcional)
  notes       String?  @db.Text

  // Vinculações opcionais (FK nullable)
  protocolId  String?
  protocol    Protocol? @relation(fields: [protocolId], references: [id], onDelete: Cascade)

  resourceId  String?
  resource    Resource? @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  // Relacionamentos
  contacts    Contact[] // Contatos da parte (telefones/emails)

  // Auditoria
  createdBy   String
  createdByUser User @relation("PartCreatedBy", fields: [createdBy], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([protocolId])
  @@index([resourceId])
  @@index([role])
  @@map("CCR_Part")
  @@schema("jurfis")
}

// ============================================
// TABELA DE CONTATOS
// ============================================
// Contatos (telefones/emails) vinculados a uma parte
model Contact {
  id            String   @id @default(uuid())

  // Vinculação obrigatória à parte
  partId String
  part          Part @relation(fields: [partId], references: [id], onDelete: Cascade)

  // Informações do contato
  type        ContactType // TELEFONE ou EMAIL
  value       String   // Número do telefone ou endereço de email

  // Marcadores
  isPrimary   Boolean  @default(false) // Contato principal da parte
  isVerified  Boolean  @default(false) // Contato verificado

  // Observações
  notes       String?  @db.Text

  // Auditoria
  createdBy   String?
  createdByUser User? @relation("ContactCreatedBy", fields: [createdBy], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([partId])
  @@index([type])
  @@index([value]) // Para busca rápida por email/telefone
  @@map("CCR_Contact")
  @@schema("jurfis")
}

// ============================================
// 1. MÓDULO DE PROTOCOLOS
// ============================================
model Protocol {
  id            String   @id @default(uuid())
  number        String   @unique // "XXX/MM-YYYY"
  sequenceNumber Int     // XXX
  month         Int      // MM (1-12)
  year          Int      // YYYY
  processNumber String   // Número do processo
  presenter     String   // Apresentante
  employeeId    String   // Quem fez o protocolo
  employee      User     @relation("ProtocolEmployee", fields: [employeeId], references: [id])
  status        ProtocolStatus @default(PENDENTE) // PENDENTE, CONCLUIDO, ARQUIVADO

  // Análise de Admissibilidade (feita no protocolo)
  analysisDate         DateTime? // Data da análise de admissibilidade
  isAdmittedAsResource Boolean?  // true = admitido como recurso, false = não admitido, null = não analisado ainda
  rejectionReason      String?   @db.Text // Motivo se não for admitido como recurso

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Relacionamentos
  parts         Part[] // Partes envolvidas no protocolo
  resource      Resource? // Só existe se isAdmittedAsResource = true
  tramitations  Tramitation[]

  @@index([year, month, sequenceNumber])
  @@map("CCR_Protocol")
  @@schema("jurfis")
}

// ============================================
// TABELA DE SETORES
// ============================================
model Sector {
  id            String   @id @default(uuid())
  name          String   @unique // Nome completo do setor (ex: "Fiscalização", "Contencioso")
  abbreviation  String?  @unique // Abreviação do setor (ex: "FISC", "CONT")
  dispatchCode  String?  // Código identificador para despacho
  description   String?  @db.Text

  // Informações de contato
  phone         String?
  email         String?
  address       String?  @db.Text

  isActive      Boolean  @default(true)

  // Relacionamentos
  tramitations  Tramitation[]
  notifications Notification[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([isActive])
  @@map("CCR_Sector")
  @@schema("jurfis")
}

// ============================================
// TABELA DE MEMBROS (CONSELHEIROS)
// ============================================
model Member {
  id            String   @id @default(uuid())
  name          String   // Nome completo do membro
  role          String?  // Cargo (ex: "Presidente", "Conselheiro Titular", etc)
  cpf           String?  // CPF
  registration  String?  // Matrícula
  agency        String?  // Órgão
  phone         String?
  email         String?
  gender        Gender?  // MASCULINO ou FEMININO
  isActive      Boolean  @default(true)

  // Relacionamentos
  tramitations                  Tramitation[]
  sessionsAsPresident           Session[] @relation("SessionPresident")
  sessionsPresent               SessionMember[] @relation("SessionMembersPresent")
  sessionResourcesAsPresident   SessionResource[] @relation("SessionResourcePresident")
  distributions                 SessionDistribution[] @relation("SessionDistributions")
  votes                         SessionMemberVote[] @relation("MemberVotes")
  votesFollowed                 SessionMemberVote[] @relation("FollowedMembers")
  sessionVotingResultsWon       SessionVotingResult[] @relation("VotingResultWinners")
  minutesAsPresident            SessionMinutes[] @relation("MinutesPresident")
  minutesPresent                SessionMinutesMember[] @relation("MinutesMembersPresent")
  minutesAbsences               SessionMinutesAbsence[] @relation("MinutesAbsences")

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([isActive])
  @@map("CCR_Member")
  @@schema("jurfis")
}

// ============================================
// 2. MÓDULO DE TRAMITAÇÕES
// ============================================
model Tramitation {
  id            String   @id @default(uuid())
  protocolId    String?
  protocol      Protocol? @relation(fields: [protocolId], references: [id])
  resourceId    String?
  resource      Resource? @relation(fields: [resourceId], references: [id])

  purpose       TramitationPurpose // SOLICITAR_PROCESSO, CONTRARRAZAO, JULGAMENTO, etc

  // Destino da tramitação (3 opções, pelo menos uma obrigatória):

  // Opção 1: Setor (FK para tabela Sector)
  sectorId      String?
  sector        Sector? @relation(fields: [sectorId], references: [id])

  // Opção 2: Membro/Conselheiro (FK para tabela Member)
  memberId      String?
  member        Member? @relation(fields: [memberId], references: [id])

  // Opção 3: Destino (texto livre)
  destination   String? // Para quando não é setor nem membro específico

  requestDate   DateTime @default(now())
  deadline      DateTime? // Prazo limite
  returnDate    DateTime? // Data de retorno (quando voltar)
  status        TramitationStatus @default(PENDENTE)
  observations  String?  @db.Text

  createdBy     String
  createdByUser User @relation("TramitationCreatedBy", fields: [createdBy], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([deadline])
  @@index([status])
  @@index([sectorId])
  @@index([memberId])
  @@map("CCR_Tramitation")
  @@schema("jurfis")
}

// ============================================
// TABELA DE ASSUNTOS (PADRÕES COM HIERARQUIA)
// ============================================
model Subject {
  id            String   @id @default(uuid())
  name          String   // Nome do assunto (ex: "Isenção de IPTU", "Possui renda superior a 2 salários mínimos")
  description   String?  @db.Text
  isActive      Boolean  @default(true)

  // Hierarquia: Assunto principal → Subitens (motivos)
  parentId      String?  // Null = assunto principal, preenchido = subitem
  parent        Subject?  @relation("SubjectHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children      Subject[] @relation("SubjectHierarchy")

  // Relacionamentos com recursos
  resourceLinks SubjectChildren[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([isActive])
  @@index([parentId])
  @@map("CCR_Subject")
  @@schema("jurfis")
}

// ============================================
// 3. MÓDULO DE RECURSOS
// ============================================
// Recurso só é criado quando o protocolo é admitido como recurso
model Resource {
  id                String   @id @default(uuid())
  resourceNumber    String   @unique // "XXXX/YYYY"
  sequenceNumber    Int      // XXXX
  year              Int      // YYYY

  protocolId        String   @unique
  protocol          Protocol @relation(fields: [protocolId], references: [id])

  status            ResourceStatus @default(EM_ANALISE)
  type              ResourceType // VOLUNTARIO ou OFICIO

  // Informações do processo
  processNumber     String

  // Informações do acórdão (gerado após julgamento)
  decisionNumber         String?  @unique // "XXXX/YYYY"
  decisionSequenceNumber Int?     // XXXX
  decisionYear           Int?     // YYYY

  // Relacionamentos
  parts             Part[] // Partes envolvidas no recurso (incluindo contribuinte)
  subjects          SubjectChildren[] // Assuntos do recurso (many-to-many com hierarquia)
  registrations     Registration[] // Inscrições e valores do recurso
  authorities       Authority[] // Autoridades vinculadas ao recurso
  tramitations      Tramitation[]
  sessions          SessionResource[]
  distributions     SessionDistribution[]
  documents         Document[]
  publications      Publication[]
  history           ResourceHistory[]
  notifications     Notification[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([year, sequenceNumber])
  @@index([decisionYear, decisionSequenceNumber])
  @@index([status])
  @@index([type])
  @@map("CCR_Resource")
  @@schema("jurfis")
}

// ============================================
// TABELA DE RELACIONAMENTO: RECURSO <-> ASSUNTO (Many-to-Many com Hierarquia)
// ============================================
model SubjectChildren {
  id                String   @id @default(uuid())
  resourceId        String
  resource          Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  subjectId         String
  subject           Subject @relation(fields: [subjectId], references: [id])

  // Marcador de assunto principal
  isPrimary         Boolean  @default(false) // True = assunto principal do recurso, False = subitem/motivo

  createdAt         DateTime @default(now())

  @@unique([resourceId, subjectId])
  @@index([resourceId])
  @@index([subjectId])
  @@index([isPrimary])
  @@map("CCR_SubjectChildren")
  @@schema("jurfis")
}

// ============================================
// TABELA DE INSCRIÇÕES
// ============================================
model Registration {
  id                String   @id @default(uuid())
  resourceId        String
  resource          Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  type              RegistrationType // IMOBILIARIA, ECONOMICA, CPF, CNPJ
  registrationNumber String   // Número da inscrição

  // Endereço da inscrição
  cep               String?
  street            String?  // Rua
  number            String?  // Número
  complement        String?  // Complemento
  neighborhood      String?  // Bairro
  city              String?  // Cidade
  state             String?  // Estado (UF)

  // Relacionamentos
  values            RegistrationValue[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([resourceId])
  @@map("CCR_Registration")
  @@schema("jurfis")
}

// ============================================
// TABELA DE VALORES DAS INSCRIÇÕES
// ============================================
model RegistrationValue {
  id             String   @id @default(uuid())
  registrationId String
  registration   Registration @relation(fields: [registrationId], references: [id], onDelete: Cascade)

  description    String?  // Descrição do valor (ex: "Principal", "Multa", "Juros")
  amount         Decimal  @db.Decimal(15, 2)
  dueDate        DateTime? // Data de vencimento

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([registrationId])
  @@map("CCR_RegistrationValue")
  @@schema("jurfis")
}

// ============================================
// AUTORIDADES VINCULADAS AO RECURSO
// ============================================
// Tabela para registrar autoridades envolvidas no processo de recurso.
// Cada recurso pode ter múltiplas autoridades dos mesmos tipos ou diferentes.
//
// Exemplos de uso:
// - Autor do Procedimento Fiscal: "João Silva" (quem criou o procedimento fiscal original)
// - Julgador Singular: "Maria Santos" (responsável por julgar o recurso)
// - Coordenador: "Pedro Oliveira" (coordenador do setor)
// - Outros: "Ana Costa - Assessora Jurídica"
//
// Um recurso pode ter:
// - Vários autores de procedimento fiscal (se houver múltiplos processos relacionados)
// - Um ou mais julgadores
// - Um ou mais coordenadores
// - Outras autoridades conforme necessário
model Authority {
  id             String   @id @default(uuid())
  resourceId     String
  resource       Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  type           AuthorityType // Tipo de autoridade
  name           String   // Nome da autoridade
  phone          String?  // Telefone (opcional)
  email          String?  // Email (opcional)
  observations   String?  @db.Text // Ex: "Responsável pela análise técnica", "Substituindo titular"

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([resourceId])
  @@index([type])
  @@map("CCR_Authority")
  @@schema("jurfis")
}

// ============================================
// 4. MÓDULO DE SESSÕES
// ============================================
model Session {
  id            String   @id @default(uuid())
  sessionNumber String   @unique // Número da sessão
  date          DateTime
  startTime     String   // Formato: "14:00"
  endTime       String?  // Formato: "17:00"
  type          SessionType // ORDINARIA, EXTRAORDINARIA
  status        SessionStatus @default(PENDENTE)

  // Presidente da sessão (membro conselheiro)
  presidentId   String
  president     Member @relation("SessionPresident", fields: [presidentId], references: [id])

  observations  String?  @db.Text

  resources     SessionResource[]
  members       SessionMember[] // Membros presentes na sessão
  distributions SessionDistribution[] @relation("DistributionsSessions")
  minutes       SessionMinutes? // Ata da sessão (gerada após a sessão)

  createdBy     String
  createdByUser User @relation("SessionCreatedBy", fields: [createdBy], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([date])
  @@index([status])
  @@index([presidentId])
  @@map("CCR_Session")
  @@schema("jurfis")
}

// ============================================
// RECURSO EM PAUTA DA SESSÃO
// ============================================
model SessionResource {
  id            String   @id @default(uuid())
  resourceId    String
  resource      Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  sessionId     String
  session       Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  order         Int      // Ordem na pauta
  status        SessionResourceStatus // EM_PAUTA, SUSPENSO, DILIGENCIA, PEDIDO_VISTA, JULGADO

  // Presidente específico para este julgamento (opcional)
  // Se null, usa o presidente da sessão
  specificPresidentId String?
  specificPresident   Member? @relation("SessionResourcePresident", fields: [specificPresidentId], references: [id])

  observations  String?  @db.Text

  // Relacionamentos
  judgment             SessionJudgment? // Resultado FINAL do julgamento (se status = JULGADO)
  sessionVotingResults SessionVotingResult[] // Resultados das votações (preliminar/mérito) ocorridas nesta sessão
  // Obs: SessionVotingResults de TODAS as sessões do recurso formam o histórico completo de votações
  // Votos individuais dos membros estão em SessionMemberVote (através de SessionVotingResult)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([resourceId, sessionId])
  @@index([sessionId])
  @@index([status])
  @@index([specificPresidentId])
  @@map("CCR_SessionResource")
  @@schema("jurfis")
}

// ============================================
// RESULTADO DE CADA VOTAÇÃO (PRELIMINAR OU MÉRITO)
// ============================================
// Registra CADA votação que ocorre em uma sessão
// Forma um HISTÓRICO COMPLETO de todas as votações do recurso
// - Pode haver MÚLTIPLAS votações preliminares (em diferentes sessões)
// - Pode haver apenas UMA votação de mérito (quando preliminar = CONHECIDO)
// - Todas as votações são mantidas para histórico e análise futura
model SessionVotingResult {
  id                    String   @id @default(uuid())
  sessionResourceId     String
  sessionResource       SessionResource @relation(fields: [sessionResourceId], references: [id], onDelete: Cascade)

  type                  VotingType // PRELIMINAR ou MERITO

  // Decisão desta votação
  decisionId            String
  decision              SessionVoteDecision @relation("VotingResultDecisions", fields: [decisionId], references: [id])

  // Membro cujo voto venceu NESTA votação
  winningMemberId       String
  winningMember         Member @relation("VotingResultWinners", fields: [winningMemberId], references: [id])

  // Resumo dos votos (calculado)
  totalVotes            Int      // Total de votos computados
  votesInFavor          Int      // Votos a favor da decisão vencedora
  votesAgainst          Int      // Votos contra
  abstentions           Int      // Abstenções
  qualityVoteUsed       Boolean  @default(false) // Se presidente usou voto de qualidade

  justification         String?  @db.Text // Justificativa consolidada
  officeComplement      String?  @db.Text // Complemento de ofício (se houver)

  // Relacionamentos inversos
  judgmentAsWinner SessionJudgment[] @relation("WinningVotingResult") // Quando este resultado é o vencedor final
  memberVotes      SessionMemberVote[] // Votos dos membros nesta votação

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([sessionResourceId])
  @@index([type])
  @@index([decisionId])
  @@index([winningMemberId])
  @@map("CCR_SessionVotingResult")
  @@schema("jurfis")
}

// ============================================
// DISTRIBUIÇÃO DO RECURSO (RELATOR/REVISORES)
// ============================================
model SessionDistribution {
  id                String   @id @default(uuid())
  resourceId        String
  resource          Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  type              DistributionType // RELATOR, REVISOR
  memberId          String
  member            Member @relation("SessionDistributions", fields: [memberId], references: [id])

  // Informações da distribuição
  sessionId         String   // Sessão em que foi distribuído
  session           Session  @relation("DistributionsSessions", fields: [sessionId], references: [id])
  distributionOrder Int      // 1 = Relator, 2+ = Revisores (ordem de pedido de vista)
  reason            String?  @db.Text // Motivo (para revisores: "Pedido de vista")

  isActive          Boolean  @default(true) // False quando substituído

  // Relacionamento com atas
  minutesDistributions SessionMinutesDistribution[] @relation("MinutesDistributions")

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([resourceId])
  @@index([memberId])
  @@index([sessionId])
  @@index([isActive])
  @@map("CCR_SessionDistribution")
  @@schema("jurfis")
}

// ============================================
// JULGAMENTO FINAL CONSOLIDADO
// ============================================
// Criado apenas quando o recurso é finalmente JULGADO (status = JULGADO)
// Referencia os SessionVotingResults que formaram a decisão final
model SessionJudgment {
  id                        String   @id @default(uuid())
  sessionResourceId         String   @unique
  sessionResource           SessionResource @relation(fields: [sessionResourceId], references: [id], onDelete: Cascade)

  // Resultado FINAL vencedor do julgamento
  // Pode ser uma votação preliminar (ex: "Não Conhecido") OU
  // uma votação de mérito (ex: "Provimento Parcial")
  // Apenas UMA decisão vence no final
  winningVotingResultId     String
  winningVotingResult       SessionVotingResult @relation("WinningVotingResult", fields: [winningVotingResultId], references: [id])

  // Observações gerais do julgamento
  observations              String?  @db.Text

  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  @@index([sessionResourceId])
  @@index([winningVotingResultId])
  @@map("CCR_SessionJudgment")
  @@schema("jurfis")
}

// ============================================
// VOTOS DOS MEMBROS NA SESSÃO
// ============================================
model SessionMemberVote {
  id                    String   @id @default(uuid())

  // Votação específica em que está participando
  sessionVotingResultId String
  sessionVotingResult   SessionVotingResult @relation(fields: [sessionVotingResultId], references: [id], onDelete: Cascade)

  memberId              String
  member                Member @relation("MemberVotes", fields: [memberId], references: [id])

  // Tipo de participação
  voteType              VoteType // RELATOR, REVISOR, PRESIDENTE, VOTANTE

  // Status de participação
  participationStatus   ParticipationStatus // PRESENTE, AUSENTE, IMPEDIDO, SUSPEITO

  // Voto (apenas se PRESENTE)
  votePosition          VotePosition? // ACOMPANHA_RELATOR, ACOMPANHA_REVISOR, VOTO_PROPRIO, ABSTENCAO
  followsMemberId       String? // ID do membro que está seguindo (relator ou revisor específico)
  followsMember         Member? @relation("FollowedMembers", fields: [followsMemberId], references: [id])

  // Voto de qualidade (voto de desempate do presidente)
  isQualityVote         Boolean  @default(false) // True quando presidente vota para desempatar

  // Decisão que esse membro votou nesta votação
  // Obrigatório se votePosition = VOTO_PROPRIO ou se voteType = RELATOR/REVISOR
  // Pode ser diferente da decisão vencedora
  voteDecisionId        String?
  voteDecision          SessionVoteDecision? @relation("MemberVoteDecisions", fields: [voteDecisionId], references: [id])

  justification         String?  @db.Text // Justificativa do voto
  observations          String?  @db.Text

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@unique([sessionVotingResultId, memberId])
  @@index([sessionVotingResultId])
  @@index([memberId])
  @@index([followsMemberId])
  @@index([voteDecisionId])
  @@map("CCR_SessionMemberVote")
  @@schema("jurfis")
}

// ============================================
// MEMBROS PRESENTES NA SESSÃO
// ============================================
model SessionMember {
  id        String   @id @default(uuid())
  sessionId String
  session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  memberId  String
  member    Member   @relation("SessionMembersPresent", fields: [memberId], references: [id])

  createdAt DateTime @default(now())

  @@unique([sessionId, memberId])
  @@index([sessionId])
  @@index([memberId])
  @@map("CCR_SessionMember")
  @@schema("jurfis")
}

// ============================================
// ATAS (MINUTES)
// ============================================
model SessionMinutes {
  id                    String   @id @default(uuid())

  // Vinculo com sessão (opcional - ata pode ser gerada fora de sessão)
  sessionId             String?  @unique
  session               Session? @relation(fields: [sessionId], references: [id])

  // Números sequenciais
  minutesNumber         String   @unique // "XXXX/YYYY"
  sequenceNumber        Int      // XXXX
  year                  Int      // YYYY

  // Número ordinal (contado desde a primeira sessão do CCR)
  // Separado por tipo: ordinárias têm uma sequência, extraordinárias outra
  ordinalNumber         Int      // Ex: 123ª Sessão Ordinária
  ordinalType           SessionType // ORDINARIA ou EXTRAORDINARIA

  // Presidente (obrigatório se não vinculado a sessão)
  // Se vinculado a sessão, pode usar o presidente da sessão
  presidentId           String?
  president             Member? @relation("MinutesPresident", fields: [presidentId], references: [id])

  // Horários
  endTime               String   // Formato: "17:00" - se vinculado a sessão, usa Session.endTime

  // Assuntos administrativos discutidos na sessão
  administrativeMatters String?  @db.Text

  // Relacionamentos
  distributions         SessionMinutesDistribution[] // Recursos distribuídos nesta ata
  presentMembers        SessionMinutesMember[] // Membros presentes (se não vinculado a sessão)
  absentMembers         SessionMinutesAbsence[] // Membros ausentes (justificados ou não)

  createdBy             String
  createdByUser         User @relation("MinutesCreatedBy", fields: [createdBy], references: [id])
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([year, sequenceNumber])
  @@index([ordinalType, ordinalNumber])
  @@index([sessionId])
  @@index([presidentId])
  @@map("CCR_SessionMinutes")
  @@schema("jurfis")
}

// ============================================
// DECISÕES PADRONIZADAS (VOTOS)
// ============================================
model SessionVoteDecision {
  id          String   @id @default(uuid())
  type        DecisionType // PRELIMINAR ou MERITO
  code        String   // Código único (ex: "CONHECIDO", "PROVIMENTO")
  name        String   // Nome completo (ex: "Recurso Conhecido")
  description String?  @db.Text // Descrição detalhada
  isActive    Boolean  @default(true)

  // Relacionamentos
  sessionVotingResults SessionVotingResult[] @relation("VotingResultDecisions")
  memberVoteDecisions  SessionMemberVote[] @relation("MemberVoteDecisions")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([type, code])
  @@index([type])
  @@index([isActive])
  @@map("CCR_SessionVoteDecision")
  @@schema("jurfis")
}

// ============================================
// RECURSOS DISTRIBUÍDOS NA ATA
// ============================================
model SessionMinutesDistribution {
  id              String   @id @default(uuid())
  minutesId       String
  minutes         SessionMinutes @relation(fields: [minutesId], references: [id], onDelete: Cascade)
  distributionId  String
  distribution    SessionDistribution @relation("MinutesDistributions", fields: [distributionId], references: [id])

  createdAt       DateTime @default(now())

  @@unique([minutesId, distributionId])
  @@index([minutesId])
  @@index([distributionId])
  @@map("CCR_SessionMinutesDistribution")
  @@schema("jurfis")
}

// ============================================
// MEMBROS PRESENTES NA ATA (quando não vinculado a sessão)
// ============================================
model SessionMinutesMember {
  id        String   @id @default(uuid())
  minutesId String
  minutes   SessionMinutes @relation(fields: [minutesId], references: [id], onDelete: Cascade)
  memberId  String
  member    Member @relation("MinutesMembersPresent", fields: [memberId], references: [id])

  createdAt DateTime @default(now())

  @@unique([minutesId, memberId])
  @@index([minutesId])
  @@index([memberId])
  @@map("CCR_SessionMinutesMember")
  @@schema("jurfis")
}

// ============================================
// MEMBROS AUSENTES NA ATA
// ============================================
model SessionMinutesAbsence {
  id            String   @id @default(uuid())
  minutesId     String
  minutes       SessionMinutes @relation(fields: [minutesId], references: [id], onDelete: Cascade)
  memberId      String
  member        Member @relation("MinutesAbsences", fields: [memberId], references: [id])

  isJustified   Boolean  @default(false) // True = ausência justificada, False = não justificada
  justification String?  @db.Text // Motivo da justificativa (se justificado)

  createdAt     DateTime @default(now())

  @@unique([minutesId, memberId])
  @@index([minutesId])
  @@index([memberId])
  @@index([isJustified])
  @@map("CCR_SessionMinutesAbsence")
  @@schema("jurfis")
}

// ============================================
// 5. MÓDULO DE NOTIFICAÇÕES
// ============================================
model Notification {
  id            String   @id @default(uuid())
  resourceId    String?
  resource      Resource? @relation(fields: [resourceId], references: [id])

  type          NotificationType // ADMISSIBILIDADE, SESSAO, DILIGENCIA, DECISAO, OUTRO

  // Destinatário da notificação (2 opções, pelo menos uma obrigatória):

  // Opção 1: Setor (FK para tabela Sector)
  sectorId      String?
  sector        Sector? @relation(fields: [sectorId], references: [id])

  // Opção 2: Destino personalizado (texto livre)
  destination   String? // Para quando não é setor específico (ex: "Conselheiros", "Partes envolvidas")

  subject       String
  message       String   @db.Text

  scheduledFor  DateTime? // Para envios agendados
  status        NotificationStatus @default(PENDENTE)

  // Relacionamentos
  contacts      NotificationContact[] // Rastreamento de envio por canal/destinatário

  createdBy     String
  createdByUser User @relation("NotificationCreatedBy", fields: [createdBy], references: [id])
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([status])
  @@index([scheduledFor])
  @@index([resourceId])
  @@index([sectorId])
  @@map("CCR_Notification")
  @@schema("jurfis")
}

// ============================================
// CONTATOS/CANAIS DE NOTIFICAÇÃO
// ============================================
// Tabela para rastrear cada tentativa de envio por canal/destinatário
model NotificationContact {
  id             String   @id @default(uuid())
  notificationId String
  notification   Notification @relation(fields: [notificationId], references: [id], onDelete: Cascade)

  channel        NotificationChannel // EMAIL, WHATSAPP, CORREIOS, EDITAL
  contact        String?  // Email, telefone, endereço (null para EDITAL)

  // Rastreamento de tentativas
  attemptCount   Int      @default(0) // Número de tentativas de envio
  lastAttemptAt  DateTime? // Data/hora da última tentativa

  // Status de envio
  status         NotificationContactStatus @default(PENDENTE)
  sentAt         DateTime? // Quando foi enviado com sucesso
  deliveredAt    DateTime? // Quando houve confirmação de recebimento
  confirmedAt    DateTime? // Para correios: quando houve confirmação de recebimento (AR)

  // Erros e observações
  error          String?  @db.Text // Mensagem de erro se houver falha
  observations   String?  @db.Text // Observações gerais

  // Metadados específicos do canal (JSON flexível)
  metadata       Json?    // Ex: { trackingCode: "ABC123", editalUrl: "...", arNumber: "..." }

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([notificationId])
  @@index([channel])
  @@index([status])
  @@map("CCR_NotificationContact")
  @@schema("jurfis")
}

// ============================================
// DOCUMENTOS
// ============================================
model Document {
  id            String   @id @default(uuid())
  resourceId    String
  resource      Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  type          DocumentType // RECURSO, CONTRARRAZAO, PARECER, VOTO, OUTROS
  title         String
  description   String?  @db.Text
  fileName      String   // Nome original do arquivo
  storedFileName String  // Nome do arquivo salvo (com UUID)
  filePath      String   // Caminho relativo: ccr/resources/{resourceId}/
  fileSize      Int      // Tamanho em bytes
  mimeType      String   // application/pdf, etc

  uploadedBy    String
  uploadedByUser User @relation("DocumentUploadedBy", fields: [uploadedBy], references: [id])
  uploadedAt    DateTime @default(now())

  @@index([resourceId])
  @@index([type])
  @@map("CCR_Document")
  @@schema("jurfis")
}

// ============================================
// PUBLICAÇÕES
// ============================================
model Publication {
  id                 String   @id @default(uuid())
  resourceId         String
  resource           Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  type               PublicationType // SESSAO, CIENCIA, OUTRO
  publicationNumber  String   // Número da publicação
  publicationDate    DateTime // Data da publicação

  observations       String?  @db.Text

  createdBy          String
  createdByUser      User @relation("PublicationCreatedBy", fields: [createdBy], references: [id])
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([resourceId])
  @@index([type])
  @@index([publicationDate])
  @@map("CCR_Publication")
  @@schema("jurfis")
}

// ============================================
// HISTÓRICO
// ============================================
model ResourceHistory {
  id            String   @id @default(uuid())
  resourceId    String
  resource      Resource @relation(fields: [resourceId], references: [id], onDelete: Cascade)

  action        HistoryAction
  description   String   @db.Text
  metadata      Json?    // Dados adicionais (ex: valores anteriores)
  isManual      Boolean  @default(false) // true = criado manualmente pelo usuário, false = criado automaticamente pelo sistema

  createdBy     String
  createdByUser User @relation("HistoryCreatedBy", fields: [createdBy], references: [id])
  createdAt     DateTime @default(now())

  @@index([resourceId])
  @@index([createdAt])
  @@index([isManual])
  @@map("CCR_ResourceHistory")
  @@schema("jurfis")
}

// ============================================
// ENUMS
// ============================================
enum ProtocolStatus {
  PENDENTE   // Protocolo criado, aguardando análise/decisão
  CONCLUIDO  // Recurso foi gerado a partir deste protocolo
  ARQUIVADO  // Protocolo arquivado sem gerar recurso
  @@schema("jurfis")
}

enum PartRole {
  REQUERENTE
  PATRONO
  REPRESENTANTE
  OUTRO
  @@schema("jurfis")
}

enum ContactType {
  TELEFONE
  EMAIL
  @@schema("jurfis")
}

enum TramitationPurpose {
  SOLICITAR_PROCESSO
  CONTRARRAZAO
  JULGAMENTO
  DILIGENCIA
  OUTRO
  @@schema("jurfis")
}

enum TramitationStatus {
  PENDENTE   // Tramitação pendente (ainda não foi entregue/devolvida)
  ENTREGUE   // Tramitação entregue/devolvida
  @@schema("jurfis")
}

enum ResourceStatus {
  EM_ANALISE              // Recurso criado, em análise inicial
  TEMPESTIVIDADE          // Análise de prazo para encaminhar/suspender débitos
  CONTRARRAZAO            // Aguardando parecer do autor do procedimento fiscal
  PARECER_PGM             // Aguardando parecer jurídico do Procurador Municipal
  DISTRIBUICAO            // Processos aptos a serem pautados (apenas novos)
  NOTIFICACAO_JULGAMENTO  // Partes sendo notificadas sobre julgamento marcado
  JULGAMENTO              // Aguardando data do julgamento
  DILIGENCIA              // Conselheiro pediu novas informações
  PEDIDO_VISTA            // Outro conselheiro pediu para analisar
  SUSPENSO                // Retirado de pauta, aguarda novo julgamento
  PUBLICACAO_ACORDAO      // Julgado, pendente publicação do acórdão
  ASSINATURA_ACORDAO      // Acórdão publicado, pendente assinatura do conselheiro
  NOTIFICACAO_DECISAO     // Pendente ciência do contribuinte sobre decisão
  CONCLUIDO               // Processo concluído no setor
  @@schema("jurfis")
}

enum ResourceType {
  VOLUNTARIO  // Recurso voluntário (apresentado pela parte)
  OFICIO      // Recurso de ofício (apresentado pela administração)
  @@schema("jurfis")
}

enum RegistrationType {
  IMOBILIARIA  // Inscrição Imobiliária
  ECONOMICA    // Inscrição Econômica
  CPF          // CPF
  CNPJ         // CNPJ
  @@schema("jurfis")
}

enum AuthorityType {
  AUTOR_PROCEDIMENTO_FISCAL  // Autor do procedimento fiscal
  JULGADOR_SINGULAR          // Julgador singular
  COORDENADOR                // Coordenador
  OUTROS                     // Outras autoridades
  @@schema("jurfis")
}

enum SessionType {
  ORDINARIA
  EXTRAORDINARIA
  @@schema("jurfis")
}

enum SessionStatus {
  PENDENTE      // Sessão agendada, ainda não iniciada
  EM_PROGRESSO  // Sessão em andamento
  CONCLUIDA     // Sessão finalizada
  CANCELADA     // Sessão cancelada
  @@schema("jurfis")
}

enum SessionResourceStatus {
  EM_PAUTA      // Recurso incluído na pauta, aguardando julgamento
  SUSPENSO      // Tirado de pauta (volta para relator/revisor na próxima sessão)
  DILIGENCIA    // Tirado de pauta para obter mais informações (volta para relator/revisor)
  PEDIDO_VISTA  // Pedido de vista por outro conselheiro (cria revisor)
  JULGADO       // Recurso foi julgado
  @@schema("jurfis")
}

enum DistributionType {
  RELATOR   // Primeira distribuição do recurso
  REVISOR   // Distribuição após pedido de vista
  @@schema("jurfis")
}

enum DecisionType {
  PRELIMINAR  // Decisão preliminar (conhecimento do recurso)
  MERITO      // Decisão de mérito (provimento, não provimento, etc)
  @@schema("jurfis")
}

enum VotingType {
  PRELIMINAR  // Votação de análise preliminar (conhecimento)
  MERITO      // Votação de análise de mérito
  @@schema("jurfis")
}

enum VoteType {
  RELATOR     // Membro é o relator do recurso
  REVISOR     // Membro é revisor do recurso (pediu vista)
  PRESIDENTE  // Presidente da sessão/julgamento votando
  VOTANTE     // Membro está apenas votando (não é relator, revisor ou presidente)
  @@schema("jurfis")
}

enum ParticipationStatus {
  PRESENTE   // Membro presente e votando
  AUSENTE    // Membro ausente na sessão
  IMPEDIDO   // Membro declarou impedimento
  SUSPEITO   // Membro declarou suspeição
  @@schema("jurfis")
}

enum VotePosition {
  ACOMPANHA_RELATOR   // Segue o voto do relator
  ACOMPANHA_REVISOR   // Segue o voto de um revisor específico
  VOTO_PROPRIO        // Tem voto próprio divergente
  ABSTENCAO           // Abstém-se de votar
  @@schema("jurfis")
}

enum Gender {
  MASCULINO
  FEMININO
  @@schema("jurfis")
}

enum NotificationType {
  ADMISSIBILIDADE  // Notificação sobre análise de admissibilidade
  SESSAO           // Notificação sobre sessão de julgamento
  DILIGENCIA       // Notificação sobre pedido de diligência
  DECISAO          // Notificação sobre decisão do recurso
  OUTRO            // Outras notificações
  @@schema("jurfis")
}

enum NotificationStatus {
  PENDENTE
  ENVIADO
  ERRO
  AGENDADO
  @@schema("jurfis")
}

enum NotificationContactStatus {
  PENDENTE   // Aguardando envio
  ENVIADO    // Enviado com sucesso
  ENTREGUE   // Confirmação de entrega
  CONFIRMADO // Confirmação de recebimento (ex: AR dos Correios)
  ERRO       // Falha no envio
  @@schema("jurfis")
}

enum NotificationChannel {
  EMAIL     // Envio por email
  WHATSAPP  // Envio por WhatsApp
  CORREIOS  // Envio por Correios (AR)
  EDITAL    // Publicação em edital
  @@schema("jurfis")
}

enum DocumentType {
  RECURSO
  CONTRARRAZAO
  PARECER
  VOTO
  OUTROS
  @@schema("jurfis")
}

enum PublicationType {
  SESSAO   // Publicação de sessão de julgamento
  CIENCIA  // Publicação de ciência ao interessado
  OUTRO    // Outras publicações
  @@schema("jurfis")
}

enum HistoryAction {
  CREATED
  UPDATED
  STATUS_CHANGED
  DOCUMENT_ADDED
  SESSION_ADDED
  NOTIFICATION_SENT
  TRAMITATION_ADDED
  @@schema("jurfis")
}
```

---

## 2. ESTRUTURA DE PASTAS E ARQUIVOS

```
src/app/
├── (routes)/
│   └── ccr/                               # /ccr (rota principal)
│       ├── layout.tsx                     # Layout com sidebar customizada
│       ├── page.tsx                       # Dashboard CCR
│       ├── components/
│       │   ├── dashboard/
│       │   │   ├── StatsCards.tsx         # Cards de estatísticas
│       │   │   ├── DeadlinesWidget.tsx    # Prazos próximos
│       │   │   └── RecentActivity.tsx     # Atividades recentes
│       │   └── shared/
│       │       ├── ResourceCard.tsx       # Card de recurso
│       │       └── StatusBadge.tsx        # Badge de status
│       │
│       ├── protocolos/                    # /ccr/protocolos
│       │   ├── page.tsx                   # Lista de protocolos
│       │   ├── novo/page.tsx              # Criar protocolo
│       │   ├── [id]/page.tsx              # Detalhes do protocolo
│       │   └── components/
│       │       ├── ProtocolForm.tsx       # Formulário de protocolo
│       │       ├── ProtocolsTable.tsx     # Tabela de protocolos
│       │       ├── PartManager.tsx # Gerenciar partes e contatos
│       │       ├── PartCard.tsx    # Card de parte com contatos
│       │       ├── ContactList.tsx        # Lista de contatos de uma parte
│       │       ├── ArchiveProtocolModal.tsx
│       │       └── DeleteProtocolModal.tsx
│       │
│       ├── setores/                       # /ccr/setores
│       │   ├── page.tsx                   # Lista de setores
│       │   ├── novo/page.tsx              # Criar setor
│       │   ├── [id]/page.tsx              # Editar setor
│       │   └── components/
│       │       ├── SectorForm.tsx
│       │       ├── SectorsTable.tsx
│       │       └── DeleteSectorModal.tsx
│       │
│       ├── membros/                       # /ccr/membros
│       │   ├── page.tsx                   # Lista de membros
│       │   ├── novo/page.tsx              # Criar membro
│       │   ├── [id]/page.tsx              # Editar membro
│       │   └── components/
│       │       ├── MemberForm.tsx
│       │       ├── MembersTable.tsx
│       │       └── DeleteMemberModal.tsx
│       │
│       ├── assuntos/                      # /ccr/assuntos
│       │   ├── page.tsx                   # Lista de assuntos (hierárquica)
│       │   ├── novo/page.tsx              # Criar assunto (principal ou subitem)
│       │   ├── [id]/page.tsx              # Editar assunto
│       │   └── components/
│       │       ├── SubjectForm.tsx   # Formulário com campo parentId
│       │       ├── SubjectsTree.tsx  # Árvore hierárquica de assuntos
│       │       ├── SubjectsTable.tsx # Tabela com hierarquia
│       │       └── DeleteSubjectModal.tsx
│       │
│       ├── tramitacoes/                   # /ccr/tramitacoes
│       │   ├── page.tsx                   # Lista de tramitações
│       │   ├── nova/page.tsx              # Criar tramitação
│       │   ├── [id]/page.tsx              # Detalhes da tramitação
│       │   └── components/
│       │       ├── TramitationForm.tsx
│       │       ├── TramitationsTable.tsx
│       │       ├── DeadlineCalendar.tsx   # Calendário de prazos
│       │       └── ReturnTramitationModal.tsx
│       │
│       ├── recursos/                      # /ccr/recursos
│       │   ├── page.tsx                   # Lista de recursos
│       │   ├── novo/page.tsx              # Criar recurso (análise de admissibilidade)
│       │   ├── [id]/
│       │   │   ├── page.tsx               # Página de detalhes do recurso
│       │   │   └── components/
│       │   │       ├── ResourceHeader.tsx
│       │   │       ├── GeneralInfo.tsx
│       │   │       ├── RegistrationsTab.tsx  # Aba de Inscrições e Valores
│       │   │       ├── RegistrationCard.tsx  # Card de inscrição com valores
│       │   │       ├── RegistrationManager.tsx  # Gerenciar inscrições
│       │   │       ├── TramitationsTab.tsx
│       │   │       ├── SessionsTab.tsx
│       │   │       ├── DocumentsTab.tsx
│       │   │       ├── HistoryTab.tsx
│       │   │       └── DocumentUpload.tsx
│       │   └── components/
│       │       ├── ResourceForm.tsx
│       │       ├── ResourcesTable.tsx
│       │       ├── SubjectSelector.tsx  # Seletor hierárquico (1 principal + múltiplos subitens)
│       │       ├── AdmissibilityModal.tsx
│       │       └── ResourceFilters.tsx
│       │
│       ├── sessoes/                       # /ccr/sessoes
│       │   ├── page.tsx                   # Lista/Consulta de sessões
│       │   ├── nova/page.tsx              # Criar sessão
│       │   ├── [id]/
│       │   │   ├── page.tsx               # Detalhes da sessão
│       │   │   └── components/
│       │   │       ├── SessionHeader.tsx
│       │   │       ├── AgendaManager.tsx  # Gerenciar pauta
│       │   │       ├── ResourceListItem.tsx
│       │   │       ├── VotingPanel.tsx    # Painel de votação
│       │   │       └── DecisionForm.tsx
│       │   ├── atas/                      # /ccr/sessoes/atas
│       │   │   ├── page.tsx               # Lista de atas
│       │   │   ├── nova/page.tsx          # Criar ata
│       │   │   ├── [id]/page.tsx          # Detalhes/editar ata
│       │   │   └── components/
│       │   │       ├── MinutesForm.tsx
│       │   │       ├── MinutesTable.tsx
│       │   │       └── MinutesPreview.tsx # Preview/impressão da ata
│       │   ├── acordaos/                  # /ccr/sessoes/acordaos
│       │   │   ├── page.tsx               # Lista de acórdãos
│       │   │   ├── [id]/page.tsx          # Detalhes/visualizar acórdão
│       │   │   └── components/
│       │   │       ├── AcordaoTable.tsx
│       │   │       ├── AcordaoPreview.tsx # Preview/impressão do acórdão
│       │   │       └── AcordaoFilters.tsx
│       │   └── components/
│       │       ├── SessionForm.tsx
│       │       ├── SessionsTable.tsx
│       │       ├── SessionCalendar.tsx
│       │       └── AddResourceToSessionModal.tsx
│       │
│       ├── notificacoes/                  # /ccr/notificacoes
│       │   ├── page.tsx                   # Lista de notificações
│       │   ├── nova/page.tsx              # Criar notificação
│       │   ├── [id]/page.tsx              # Detalhes da notificação
│       │   └── components/
│       │       ├── NotificationForm.tsx
│       │       ├── NotificationsTable.tsx
│       │       ├── SendNotificationModal.tsx
│       │       ├── TemplateSelector.tsx   # Templates predefinidos
│       │       └── RecipientManager.tsx
│       │
│       └── types.ts                       # Tipos TypeScript compartilhados
│
├── api/
│   └── ccr/
│       ├── parts/                             # API de Partes (suporte)
│       │   ├── route.ts                       # GET (listar), POST (criar)
│       │   └── [id]/
│       │       └── route.ts                   # GET, PUT, DELETE
│       │
│       ├── protocols/
│       │   ├── route.ts                   # GET (listar), POST (criar)
│       │   ├── [id]/route.ts              # GET (detalhes), PUT (editar), DELETE (excluir)
│       │   ├── [id]/archive/route.ts      # POST (arquivar)
│       │   ├── [id]/admissibility/route.ts # POST (análise de admissibilidade)
│       │   └── sequence/route.ts          # GET (próximo número da sequência)
│       │
│       ├── sectors/
│       │   ├── route.ts                   # GET (listar), POST (criar)
│       │   └── [id]/route.ts              # GET (detalhes), PUT (editar), DELETE (desativar/excluir)
│       │
│       ├── members/
│       │   ├── route.ts                   # GET (listar), POST (criar)
│       │   └── [id]/route.ts              # GET (detalhes), PUT (editar), DELETE (desativar/excluir)
│       │
│       ├── resource-subjects/
│       │   ├── route.ts                   # GET (listar com hierarquia), POST (criar)
│       │   ├── tree/route.ts              # GET (árvore completa)
│       │   └── [id]/route.ts              # GET (detalhes com parent/children), PUT (editar), DELETE (desativar/excluir)
│       │
│       ├── resource-registrations/
│       │   ├── route.ts                   # GET (listar), POST (criar)
│       │   ├── [id]/route.ts              # GET (detalhes), PUT (editar), DELETE (excluir)
│       │   └── [id]/values/
│       │       ├── route.ts               # POST (adicionar valor)
│       │       └── [valueId]/route.ts     # PUT (editar valor), DELETE (excluir valor)
│       │
│       ├── tramitations/
│       │   ├── route.ts                   # GET, POST
│       │   ├── [id]/route.ts              # GET, PUT, DELETE
│       │   ├── [id]/return/route.ts       # POST (registrar retorno)
│       │   └── overdue/route.ts           # GET (tramitações vencidas)
│       │
│       ├── resources/
│       │   ├── route.ts                   # GET, POST
│       │   ├── [id]/route.ts              # GET, PUT, DELETE
│       │   ├── [id]/documents/route.ts    # GET (listar), POST (upload)
│       │   ├── [id]/documents/[docId]/route.ts # GET (download), DELETE
│       │   ├── [id]/history/route.ts      # GET (listar), POST (adicionar)
│       │   └── sequence/route.ts          # GET (próximo número da sequência)
│       │
│       ├── sessions/
│       │   ├── route.ts                   # GET, POST
│       │   ├── [id]/route.ts              # GET, PUT, DELETE
│       │   ├── [id]/resources/route.ts    # GET (recursos da pauta), POST (adicionar à pauta)
│       │   ├── [id]/resources/[resourceId]/route.ts # PUT (definir decisão), DELETE (remover da pauta)
│       │   ├── [id]/resources/[resourceId]/decision/route.ts # POST (registrar decisão)
│       │   ├── minutes/
│       │   │   ├── route.ts               # GET (listar atas), POST (criar ata)
│       │   │   ├── [id]/route.ts          # GET (detalhes), PUT (editar), DELETE
│       │   │   └── [id]/pdf/route.ts      # GET (gerar PDF da ata)
│       │   └── acordaos/
│       │       ├── route.ts               # GET (listar acórdãos)
│       │       ├── [id]/route.ts          # GET (detalhes do acórdão)
│       │       └── [id]/pdf/route.ts      # GET (gerar PDF do acórdão)
│       │
│       ├── notifications/
│       │   ├── route.ts                   # GET, POST
│       │   ├── [id]/route.ts              # GET, PUT, DELETE
│       │   ├── [id]/send/route.ts         # POST (enviar imediatamente)
│       │   └── templates/route.ts         # GET (templates disponíveis)
│       │
│       └── cron/
│           ├── check-deadlines/route.ts   # Cron job - verificar prazos
│           └── send-notifications/route.ts # Cron job - enviar notificações agendadas

src/lib/
└── ccr/
    ├── file-storage.ts                    # Gerenciamento de arquivos locais
    │   # - uploadFile({ documentType, protocolYear, resourceNumber, file, judgmentYear? })
    │   # - deleteFile(filePath)
    │   # - getFullPath(relativePath)
    │   # - ensureDirectory(path)
    │   # - fileExists(relativePath)
    │   # - getFileSize(relativePath)
    │   # - isValidFileType(mimeType)
    │   # - formatFileSize(bytes)
    │   # Estrutura: [CCR_UPLOAD_DIR]/[Tipo]/[Ano]/RV XXXX-YYYY.pdf
    │   # IMPORTANTE: Tipo VOTO usa ano do julgamento (judgmentYear)
    │
    ├── notifications/
    │   ├── email.ts                       # Envio de emails
    │   │   # - sendNotificationEmail(to, subject, message)
    │   │   # - sendBulkNotificationEmail(recipients[])
    │   │
    │   ├── whatsapp.ts                    # Integração WhatsApp API externa
    │   │   # - sendWhatsAppMessage(phone, message)
    │   │   # - sendBulkWhatsAppMessage(recipients[])
    │   │
    │   └── templates/                     # Templates de notificações
    │       ├── diligencia.ts              # Template para notificação de diligência
    │       ├── pauta.ts                   # Template para inclusão em pauta
    │       ├── decisao.ts                 # Template para decisão proferida
    │       ├── prazo.ts                   # Template para alerta de prazo
    │       └── index.ts                   # Exportações e tipos
    │
    └── utils/
        ├── protocol-number.ts             # Geração de números XXX/MM-YYYY
        │   # - getNextProtocolNumber(year, month)
        │   # - formatProtocolNumber(seq, month, year)
        │   # - parseProtocolNumber(number)
        │
        ├── resource-number.ts             # Geração de números XXXX/YYYY
        │   # - getNextResourceNumber(year)
        │   # - formatResourceNumber(seq, year)
        │   # - parseResourceNumber(number)
        │
        └── deadline-calculator.ts         # Cálculo de prazos
            # - calculateDeadline(startDate, days)
            # - isOverdue(deadline)
            # - getDaysUntilDeadline(deadline)
            # - getWorkingDays(startDate, endDate)

[process.env.CCR_UPLOAD_DIR]/                # Pasta base definida no .env
├── Recurso/                               # Documentos do tipo RECURSO
│   └── [ano_protocolo]/                   # Ano do protocolo (YYYY)
│       └── RV XXXX-YYYY.pdf               # Formato: RV [número]-[ano].pdf
├── Contrarrazão/                          # Documentos do tipo CONTRARRAZAO
│   └── [ano_protocolo]/
│       └── RV XXXX-YYYY.pdf
├── Parecer/                               # Documentos do tipo PARECER
│   └── [ano_protocolo]/
│       └── RV XXXX-YYYY.pdf
├── Voto/                                  # Documentos do tipo VOTO
│   └── [ano_julgamento]/                  # ⚠️ Ano em que foi JULGADO, não do protocolo
│       └── RV XXXX-YYYY.pdf
└── Outros/                                # Documentos do tipo OUTROS
    └── [ano_protocolo]/
        └── RV XXXX-YYYY.pdf

# Exemplos práticos:
# .env: CCR_UPLOAD_DIR=/var/uploads/ccr
#
# Recurso criado em 2024:
# /var/uploads/ccr/Recurso/2024/RV 0001-2024.pdf
#
# Voto do mesmo recurso, mas julgado em 2025:
# /var/uploads/ccr/Voto/2025/RV 0001-2024.pdf  ← Ano da pasta é 2025 (julgamento)
```

---

## 3. FUNCIONALIDADES DETALHADAS POR MÓDULO

### 3.1 Dashboard CCR (/ccr)

**Objetivo**: Visão geral do sistema com métricas e atalhos rápidos.

**Componentes**:
- **StatsCards.tsx**: Cards com estatísticas
  - Total de protocolos ativos
  - Recursos em andamento
  - Sessões agendadas (próximos 30 dias)
  - Tramitações com prazo vencido

- **DeadlinesWidget.tsx**: Lista de prazos próximos
  - Tramitações vencendo hoje (vermelho)
  - Tramitações vencendo em 1 dia (laranja)
  - Tramitações vencendo em 3 dias (amarelo)
  - Link para página de tramitações

- **RecentActivity.tsx**: Últimas 10 atividades
  - Timeline de ações recentes no sistema
  - Baseado na tabela ResourceHistory
  - Filtro por tipo de ação
  - Badge visual para entradas manuais vs automáticas

**Sidebar Actions**:
_Os botões de ações serão adicionados conforme necessário durante o desenvolvimento._

---

### 3.2 Módulo de Protocolos

**Objetivo**: Gerenciar protocolos de documentos/recursos com numeração sequencial XXX/MM-YYYY.

#### Funcionalidades:

**Criar Protocolo** (/ccr/protocolos/novo):
- Formulário com campos:
  - Número do Processo (input text)
  - Apresentante (input text)
  - **Partes** (componente PartManager):
    - Adicionar Parte (botão)
    - Para cada parte:
      - Nome da Parte (input text)
      - Papel/Role (select: Requerente, Patrono, Representante, Outro)
      - CPF/CNPJ (input text com máscara, opcional)
      - Observações (textarea, opcional)
      - **Contatos da Parte** (componente ContactList):
        - Adicionar Telefone (input com validação + botão)
        - Adicionar Email (input com validação + botão)
        - Lista de contatos com:
          - Badge de tipo (Telefone/Email)
          - Badge "Principal" se isPrimary
          - Botão marcar como principal
          - Botão remover
          - Campo observações
    - Botão "Remover Parte" (remove parte e todos seus contatos)
  - Funcionário responsável (auto-preenchido com usuário logado)
- Geração automática do número de protocolo:
  - Buscar último número do mês/ano atual
  - Incrementar sequência
  - Formato: XXX/MM-YYYY (ex: 001/01-2025)
- Validações:
  - Campos obrigatórios
  - Formato de email e telefone
  - Pelo menos uma parte deve ser adicionada
  - Cada parte deve ter pelo menos um contato
- Ao salvar:
  - Transaction para garantir atomicidade:
    - Cria o protocolo
    - Para cada parte:
      - Cria registro em `Part` com FK `protocolId`
      - Para cada contato da parte:
        - Cria registro em `Contact` com FK `partId`
  - Se protocolo for deletado:
    - Partes são excluídas (onDelete: Cascade)
    - Contatos das partes são excluídos (onDelete: Cascade)

**Listar Protocolos** (/ccr/protocolos):
- Tabela com colunas:
  - Número do Protocolo
  - Número do Processo
  - Apresentante
  - Data de Criação
  - Status (Pendente/Concluído/Arquivado)
  - Ações (Ver, Editar, Excluir/Arquivar)
- Filtros:
  - Por ano
  - Por mês
  - Por status
  - Busca por número de processo ou apresentante
- Paginação

**Editar Protocolo** (/ccr/protocolos/[id]):
- Mesmos campos do formulário de criação
- Regra: Só pode editar se não houver outro protocolo posterior na sequência
- Exemplo: Se existe 003/01-2025, não pode editar 001/01-2025 ou 002/01-2025

**Excluir Protocolo**:
- Regra: Só pode excluir se for o último da sequência do mês/ano
- Modal de confirmação
- Verificação se há recurso associado (não pode excluir se houver)

**Arquivar Protocolo**:
- Regra: Usar quando não será gerado recurso a partir deste protocolo
- Muda status de PENDENTE para ARQUIVADO
- Protocolos arquivados aparecem com badge cinza

**Analisar Admissibilidade** (/ccr/protocolos/[id]/admissibilidade):
- Funcionalidade para decidir se o protocolo será admitido como recurso
- Modal ou página com:
  - **Se ADMITIDO como recurso**:
    - Gera número de recurso automático (XXXX/YYYY)
    - Redireciona para criação do Resource
    - Define `isAdmittedAsResource = true` e `analysisDate = now()`
  - **Se NÃO ADMITIDO**:
    - Campo: Motivo da não admissão (textarea obrigatório)
    - Salva `isAdmittedAsResource = false`, `analysisDate = now()`, `rejectionReason`
    - Arquiva automaticamente o protocolo (status = ARQUIVADO)
- Só pode fazer análise se protocolo ainda não foi analisado (`isAdmittedAsResource = null`)

**Detalhes do Protocolo** (/ccr/protocolos/[id]):
- Visualizar todas as informações
- **Análise de Admissibilidade**:
  - Se `isAdmittedAsResource = null`: Badge "Aguardando Análise" + Botão "Analisar Admissibilidade"
  - Se `isAdmittedAsResource = true`: Badge verde "Admitido como Recurso" + Link para o recurso + Data da análise
  - Se `isAdmittedAsResource = false`: Badge vermelho "Não Admitido" + Motivo da rejeição + Data da análise
- Ver lista de partes com seus contatos
  - Nome da parte
  - Papel (badge)
  - CPF/CNPJ (se houver)
  - Lista de contatos (telefones e emails) com indicação do principal
- Ver recurso associado (se houver e foi admitido)
- Ver tramitações associadas
- Timeline de histórico

**Componente PartManager** (PartManager.tsx):
- Componente reutilizável para gerenciar partes e seus contatos
- Usado em Protocolos e Recursos
- Funcionalidades:

  **1. Adicionar Parte**:
  - Botão "Adicionar Parte"
  - Formulário para nova parte:
    - Nome (input text, obrigatório)
    - Papel (select: Contribuinte, Advogado, etc.)
    - CPF/CNPJ (input com máscara, opcional)
    - Observações (textarea, opcional)

  **2. Gerenciar Contatos da Parte** (componente aninhado ContactList):
  - Para cada parte, permite adicionar múltiplos contatos:
    - Input para telefone com validação
    - Input para email com validação
    - Botão "Adicionar Contato"
  - Lista de contatos da parte:
    - Tipo (badge: Telefone/Email)
    - Valor
    - Badge "Principal" (se isPrimary)
    - Observações
    - Botões: Marcar como principal, Editar, Remover

  **3. Lista de Partes**:
  - Cards ou Accordion mostrando cada parte:
    - Header: Nome + Papel (badge)
    - CPF/CNPJ (se houver)
    - Lista de contatos da parte
    - Botões: Editar Parte, Remover Parte

  **4. Validações**:
  - Nome da parte obrigatório
  - Telefone: formato brasileiro (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
  - Email: formato válido (regex padrão)
  - Cada parte deve ter pelo menos um contato
  - Apenas um contato pode ser principal por parte
  - Pelo menos uma parte deve ser adicionada (opcional via prop)

  **5. Props**:
  ```tsx
  interface PartManagerProps {
    value: Part[]; // Array de partes com contatos
    onChange: (parts: Part[]) => void;
    context: 'protocol' | 'resource'; // Contexto de uso
    contextId?: string; // ID do protocolo/recurso (para edição)
    disabled?: boolean;
    required?: boolean; // Se pelo menos 1 parte é obrigatória
  }

  interface Part {
    id?: string;
    name: string;
    role: PartRole;
    document?: string;
    notes?: string;
    contacts: Contact[];
  }

  interface Contact {
    id?: string;
    type: 'TELEFONE' | 'EMAIL';
    value: string;
    isPrimary: boolean;
    notes?: string;
  }
  ```

  **6. Uso no ProtocolForm**:
  ```tsx
  <PartManager
    value={parts}
    onChange={setParts}
    context="protocol"
    contextId={protocolId}
    required={true}
  />
  ```

**API de Suporte para Partes**:
- `GET /api/ccr/parts?protocolId={id}` ou `?resourceId={id}` - Listar partes
- `POST /api/ccr/parts` - Criar parte com contatos
- `PUT /api/ccr/parts/[id]` - Atualizar parte e contatos
- `DELETE /api/ccr/parts/[id]` - Excluir parte (cascata para contatos)

---

### 3.3 Módulo de Setores

**Objetivo**: Gerenciar os setores da organização que podem receber tramitações.

#### Funcionalidades:

**Listar Setores** (/ccr/setores):
- Tabela com colunas:
  - Nome
  - Abreviação
  - Código de Despacho
  - Telefone
  - Email
  - Status (Ativo/Inativo)
  - Ações
- Filtros:
  - Por status (ativo/inativo)
  - Busca por nome ou abreviação
- Badge visual para setores inativos
- Botão "Novo Setor"

**Criar Setor** (/ccr/setores/novo):
- Formulário com campos:
  - **Informações Básicas**:
    - Nome (obrigatório) - ex: "Fiscalização"
    - Abreviação (opcional) - ex: "FISC"
    - Código de Despacho (opcional) - identificador para despacho
    - Descrição (opcional)
  - **Informações de Contato**:
    - Telefone (opcional)
    - Email (opcional)
    - Endereço (opcional)
  - Status (Ativo por padrão)
- Validações:
  - Nome único (não pode duplicar)
  - Abreviação única se informada
  - Email válido se informado

**Editar Setor** (/ccr/setores/[id]):
- Mesmo formulário do criar
- Permite ativar/desativar setor
- Mostra quantas tramitações estão vinculadas

**Excluir Setor**:
- Se o setor possui tramitações vinculadas:
  - Apenas permite desativar (isActive = false)
  - Mostra aviso explicativo
- Se não possui tramitações:
  - Permite exclusão definitiva
  - Modal de confirmação

---

### 3.4 Módulo de Assuntos

**Objetivo**: Gerenciar os assuntos padrão que podem ser vinculados aos recursos.

#### Funcionalidades:

**Listar Assuntos** (/ccr/assuntos):
- Tabela com colunas:
  - Nome
  - Descrição
  - Status (Ativo/Inativo)
  - Ações
- **Visualização hierárquica** (árvore ou tabela indentada):
  - Assuntos principais (ex: "Isenção de IPTU")
    - Subitens/motivos (ex: "Possui renda superior a 2 salários mínimos")
- Filtros:
  - Por status (ativo/inativo)
  - Apenas principais / Apenas subitens / Todos
  - Busca por nome
- Badge visual para assuntos inativos
- Botões:
  - "Novo Assunto Principal"
  - "Adicionar Subitem" (ao lado de cada assunto principal)

**Criar Assunto** (/ccr/assuntos/novo):
- Formulário com campos:
  - Assunto Pai (select, opcional):
    - Se null: cria assunto principal (ex: "Isenção de IPTU")
    - Se preenchido: cria subitem do pai (ex: "Possui renda superior a 2 salários mínimos")
  - Nome (obrigatório)
  - Descrição (opcional)
  - Status (Ativo por padrão)
- Validações:
  - Nome obrigatório
  - Se parentId fornecido: validar que o pai existe e está ativo

**Editar Assunto** (/ccr/assuntos/[id]):
- Mesmo formulário do criar
- Permite alterar parentId (mover entre hierarquias)
  - Validação: não pode criar ciclo (filho virar pai de si mesmo)
- Permite ativar/desativar assunto
- Mostra:
  - Quantos recursos estão vinculados
  - Quantos subitens possui (se for assunto principal)

**Excluir Assunto**:
- Se o assunto possui recursos vinculados OU subitens:
  - Apenas permite desativar (isActive = false)
  - Mostra aviso explicativo
- Se não possui recursos nem subitens:
  - Permite exclusão definitiva
  - Modal de confirmação

---

### 3.5 Módulo de Membros

**Objetivo**: Gerenciar os membros (conselheiros) que participam dos julgamentos e podem ter prazos em tramitações.

#### Funcionalidades:

**Listar Membros** (/ccr/membros):
- Tabela com colunas:
  - Nome
  - Cargo
  - CPF
  - Matrícula
  - Órgão
  - Telefone
  - Email
  - Status (Ativo/Inativo)
  - Ações
- Filtros:
  - Por status (ativo/inativo)
  - Busca por nome
- Badge visual para membros inativos
- Botão "Novo Membro"

**Criar Membro** (/ccr/membros/novo):
- Formulário com campos:
  - Nome (obrigatório) - ex: "João Silva"
  - Cargo (opcional) - ex: "Presidente", "Conselheiro Titular"
  - CPF (opcional)
  - Matrícula (opcional)
  - Órgão (opcional)
  - Telefone (opcional)
  - Email (opcional)
  - Status (Ativo por padrão)
- Validações:
  - Nome obrigatório
  - Email válido se informado
  - CPF válido se informado

**Editar Membro** (/ccr/membros/[id]):
- Mesmo formulário do criar
- Permite ativar/desativar membro
- Mostra quantas tramitações estão vinculadas

**Excluir Membro**:
- Se o membro possui tramitações vinculadas:
  - Apenas permite desativar (isActive = false)
  - Mostra aviso explicativo
- Se não possui tramitações:
  - Permite exclusão definitiva
  - Modal de confirmação

---

### 3.6 Módulo de Tramitações

**Objetivo**: Controlar solicitações de processos para setores, membros ou destinos livres com controle de prazos.

#### Funcionalidades:

**Criar Tramitação** (/ccr/tramitacoes/nova):
- Formulário com campos:
  - Associar a: Protocolo ou Recurso (select com busca)
  - Finalidade (select):
    - Solicitar Processo
    - Contrarrazão do Fiscal
    - Julgamento
    - Diligência
    - Outro
  - Destino (escolher uma das três opções):
    - **Opção 1**: Setor (select buscando da tabela Sector - apenas setores ativos)
    - **Opção 2**: Membro (select buscando da tabela Member - apenas ativos)
    - **Opção 3**: Destino Livre (campo de texto livre para digitar para onde foi)
  - Prazo (date picker) - opcional
  - Observações (textarea)
- Validações:
  - Deve estar associada a protocolo OU recurso
  - Finalidade obrigatória
  - Deve ter setor, membro OU destino livre (pelo menos um)

**Listar Tramitações** (/ccr/tramitacoes):
- Tabela com colunas:
  - Protocolo/Recurso
  - Finalidade
  - Destino (Setor, Membro ou Texto Livre)
  - Data de Solicitação
  - Prazo
  - Status
  - Ações
- Cores de status:
  - Pendente (azul)
  - Em Andamento (amarelo)
  - Retornado (verde)
  - Vencido (vermelho)
- Filtros:
  - Por finalidade
  - Por setor
  - Por membro
  - Por status
  - Por intervalo de prazo
- Badge de alerta para prazos vencidos

**Calendário de Prazos** (componente DeadlineCalendar.tsx):
- Visualização mensal
- Marcar dias com prazos
- Cores:
  - Verde: prazos cumpridos
  - Amarelo: prazos próximos (3 dias)
  - Vermelho: prazos vencidos
- Clicar em dia mostra tramitações daquele dia

**Registrar Retorno**:
- Modal para registrar que o processo retornou
- Campos:
  - Data de retorno (date picker, padrão: hoje)
  - Observações
- Atualiza status para ENTREGUE

**Detalhes da Tramitação** (/ccr/tramitacoes/[id]):
- Ver todas as informações
- Timeline de eventos
- Botão "Registrar Retorno"
- Editar (se ainda não retornado)

---

### 3.7 Módulo de Recursos

**Objetivo**: Gerenciar recursos fiscais após análise de admissibilidade, com página de detalhes completa.

#### Fluxo de Status do Recurso:

1. **EM_ANALISE** → Recurso criado, aguardando análise inicial
2. **TEMPESTIVIDADE** → Análise de prazo para decidir se encaminha para suspender débitos
3. **CONTRARRAZAO** → Processo encaminhado ao autor do procedimento fiscal para elaborar parecer
4. **PARECER_PGM** → Procurador Municipal deve fazer parecer jurídico
5. **DISTRIBUICAO** → Processos aptos a serem pautados para julgamento (apenas novos)
6. **NOTIFICACAO_JULGAMENTO** → Partes sendo notificadas sobre o julgamento marcado
7. **JULGAMENTO** → Aguardando a data do julgamento
8. **DILIGENCIA** → Conselheiro pediu novas informações a serem anexadas
9. **PEDIDO_VISTA** → Outro conselheiro pediu para analisar o processo, aguardando novo julgamento
10. **SUSPENSO** → Retirado de pauta, aguardando novo julgamento
11. **PUBLICACAO_ACORDAO** → Julgado na sessão, pendente publicação do acórdão
12. **ASSINATURA_ACORDAO** → Acórdão publicado, faltam assinaturas do conselheiro
13. **NOTIFICACAO_DECISAO** → Após assinatura, pendente ciência do contribuinte sobre decisão
14. **CONCLUIDO** → Processo finalizado no setor

**Observações sobre o fluxo:**
- Alguns status podem ser pulados dependendo da situação
- Recursos podem retornar a status anteriores (ex: JULGAMENTO → DILIGENCIA → JULGAMENTO)
- O status DISTRIBUICAO é específico para recursos que ainda não foram pautados

#### Funcionalidades:

**Criar Recurso** (/ccr/recursos/novo):
- **Pré-requisito**: Protocolo já deve ter sido analisado e admitido como recurso (`isAdmittedAsResource = true`)
- Geralmente acessado automaticamente ao analisar o protocolo como admitido
- Formulário com campos:
  - Protocolo (pré-selecionado ou select de protocolos admitidos sem recurso ainda)
  - Número do recurso (gerado automaticamente: XXXX/YYYY)
  - Número do Processo (do protocolo)
  - **Assuntos Hierárquicos** (componente SubjectSelector):
    - **Passo 1**: Selecionar **1 Assunto Principal** (obrigatório)
      - Ex: "Isenção de IPTU"
    - **Passo 2**: Selecionar **Subitens/Motivos** (múltiplos, opcional)
      - Apenas subitens do assunto principal selecionado
      - Ex: "Possui renda superior a 2 salários mínimos", "Não apresentou documentação"
  - **Inscrições** (gerenciador de inscrições - pode adicionar múltiplas):
    - Para cada inscrição:
      - Tipo (select: Imobiliária, Econômica, CPF, CNPJ)
      - Número da inscrição (input text)
      - **Endereço da Inscrição** (opcional):
        - CEP (input text com máscara)
        - Rua (input text)
        - Número (input text)
        - Complemento (input text)
        - Bairro (input text)
        - Cidade (input text)
        - Estado/UF (select)
      - **Valores** (pode adicionar múltiplos valores):
        - Descrição (ex: "Principal", "Multa", "Juros")
        - Valor (input number com máscara de moeda)
        - Data de Vencimento (date picker, opcional)
  - **Autoridades** (gerenciador de autoridades - opcional):
    - Para cada autoridade:
      - Tipo (select: Autor do Procedimento Fiscal, Julgador Singular, Coordenador, Outros)
      - Nome (input text, obrigatório)
      - Telefone (input text com máscara, opcional)
      - Email (input email, opcional)
      - Observações (textarea, opcional)
- Criar histórico automático: "Recurso criado"
- Status inicial: EM_ANALISE

**Listar Recursos** (/ccr/recursos):
- Tabela com colunas:
  - Número do Recurso
  - Número do Processo
  - Assuntos (badges dos assuntos vinculados)
  - Contribuinte (da tabela Part com role adequado)
  - Status
  - Data de Criação
  - Ações
- Filtros avançados:
  - Por status (todos os status do enum ResourceStatus)
  - Por ano
  - Por assunto principal
  - Por tipo de inscrição
  - Busca por número de recurso ou processo
- Badges de status com cores

**Página de Detalhes do Recurso** (/ccr/recursos/[id]):

Layout em abas (Tabs):

**Aba 1: Informações Gerais** (GeneralInfo.tsx)
- Card com informações principais:
  - Número do Recurso
  - Número do Processo
  - Status (com badge)
  - Data de Criação
  - **Assuntos** (lista de badges com os assuntos vinculados)
  - **Partes** (lista das partes vinculadas com seus papéis e contatos)
  - Link para protocolo associado
- Botão "Editar Informações"

**Aba 1.1: Inscrições e Valores** (RegistrationsTab.tsx)
- Lista de inscrições do recurso
- Cards/Tabela expandível:
  - **Cabeçalho da Inscrição**:
    - Tipo (badge: Imobiliária, Econômica, CPF, CNPJ)
    - Número da Inscrição
    - Endereço (se cadastrado): Rua, Número - Bairro, Cidade/UF
    - Valor Total (soma de todos os valores)
  - **Detalhes expandidos**:
    - **Endereço Completo** (se cadastrado):
      - CEP, Rua, Número, Complemento
      - Bairro, Cidade, Estado
    - **Lista de valores da inscrição**:
      - Descrição
      - Valor
      - Data de Vencimento (se cadastrado)
    - Ações: Editar, Excluir
- Botão "Adicionar Inscrição"
- Modal para adicionar/editar inscrição com endereço e seus valores

**Aba 1.2: Autoridades** (AuthoritiesTab.tsx)
- Lista de autoridades vinculadas ao recurso
- Cards/Tabela com:
  - **Tipo de Autoridade** (badge: Autor do Procedimento Fiscal, Julgador Singular, Coordenador, Outros)
  - **Nome da Autoridade**
  - **Telefone** (se cadastrado)
  - **Email** (se cadastrado)
  - **Observações** (se cadastrado)
  - Ações: Editar, Excluir
- Botão "Adicionar Autoridade"
- Modal para adicionar/editar autoridade:
  - Tipo (select: Autor do Procedimento Fiscal, Julgador Singular, Coordenador, Outros)
  - Nome (input text, obrigatório)
  - Telefone (input text com máscara, opcional)
  - Email (input email, opcional)
  - Observações (textarea, opcional)
- Validações:
  - Nome é obrigatório
  - Telefone deve ter formato válido se preenchido
  - Email deve ter formato válido se preenchido
  - Pode haver múltiplas autoridades do mesmo tipo

**Aba 2: Tramitações** (TramitationsTab.tsx)
- Lista de todas as tramitações do recurso
- Tabela simplificada:
  - Finalidade
  - Setor
  - Data de Solicitação
  - Prazo
  - Status
- Botão "Nova Tramitação"
- Destaque para tramitações vencidas

**Aba 3: Sessões** (SessionsTab.tsx)
- Lista de sessões onde o recurso foi incluído
- Cards/Timeline mostrando:
  - Data da sessão
  - Resultado (aprovado, rejeitado, diligência, adiado)
  - Decisão
  - Votos
  - Observações
- Botão "Adicionar a Sessão"

**Aba 4: Documentos** (DocumentsTab.tsx)
- Lista de documentos anexados
- Cards/Tabela com:
  - Tipo de documento
  - Título
  - Data de upload
  - Tamanho do arquivo
  - Uploader
  - Ações: Baixar, Excluir
- Componente DocumentUpload.tsx:
  - Drag & drop ou seleção de arquivo
  - Campos:
    - Tipo (select: Recurso, Contrarrazão, Parecer, Voto, Outros)
    - Título
    - Descrição (opcional)
  - Validação: apenas PDFs e DOCX
  - Upload com progress bar
- Preview de documentos PDF (modal)

**Aba 5: Histórico** (HistoryTab.tsx)
- Timeline com todas as ações no recurso
- Ordenação: mais recente primeiro
- Itens incluem:
  - Ação (criado, atualizado, documento adicionado, etc)
  - Descrição
  - Usuário que executou
  - Data e hora
  - Metadata (se houver)
- Tipos de ações:
  - CREATED: Recurso criado
  - UPDATED: Informações atualizadas
  - STATUS_CHANGED: Mudança de status
  - DOCUMENT_ADDED: Documento anexado
  - SESSION_ADDED: Incluído em sessão
  - NOTIFICATION_SENT: Notificação enviada
  - TRAMITATION_ADDED: Nova tramitação

**Header do Recurso** (ResourceHeader.tsx):
- Breadcrumb: CCR > Recursos > [Número]
- Título grande: Número do Recurso
- Status badge
- Ações rápidas:
  - Enviar Notificação
  - Adicionar Documento
  - Nova Tramitação
  - Incluir em Sessão

---

### 3.7 Módulo de Sessões

**Objetivo**: Gerenciar sessões de julgamento e suas pautas.

#### Funcionalidades:

**Criar Sessão** (/ccr/sessoes/nova):
- Formulário com campos:
  - Número da Sessão (input text, ex: "001/2025")
  - Data (date picker)
  - Hora de Início (time picker)
  - Hora de Término (time picker, opcional)
  - Tipo (select: Ordinária, Extraordinária)
  - Local (input text, opcional)
  - Observações (textarea, opcional)
- Validações:
  - Data não pode ser no passado
  - Número da sessão único

**Listar Sessões** (/ccr/sessoes):
- Visualização em calendário (SessionCalendar.tsx):
  - Calendário mensal
  - Sessões marcadas por data
  - Cores por tipo (ordinária/extraordinária)
  - Clicar em dia mostra sessões
- Visualização em tabela (SessionsTable.tsx):
  - Número da Sessão
  - Data e Hora
  - Tipo
  - Status
  - Qtd de Recursos
  - Ações
- Filtros:
  - Por tipo
  - Por status
  - Por intervalo de datas
- Botão "Nova Sessão"

**Detalhes da Sessão** (/ccr/sessoes/[id]):

Layout:

**Header da Sessão** (SessionHeader.tsx):
- Breadcrumb
- Título: Sessão [Número]
- Data e hora
- Status badge
- Botões de ação:
  - Editar Sessão
  - Iniciar Sessão (se status = SCHEDULED)
  - Finalizar Sessão (se status = IN_PROGRESS)
  - Cancelar Sessão

**Gerenciar Pauta** (AgendaManager.tsx):
- Lista de recursos incluídos na sessão
- Ordenação drag & drop (definir ordem)
- Para cada recurso (ResourceListItem.tsx):
  - Ordem na pauta
  - Número do recurso
  - Contribuinte
  - Assunto
  - Botões:
    - Definir Decisão (se sessão em andamento)
    - Remover da Pauta
- Botão "Adicionar Recurso à Pauta" (modal AddResourceToSessionModal.tsx):
  - Busca de recursos (status = DISTRIBUICAO - processos aptos a serem pautados)
  - Filtros
  - Adicionar múltiplos

**Painel de Votação** (VotingPanel.tsx):
- Usado durante a sessão (status = IN_PROGRESS)
- Para cada recurso da pauta:
  - Campos:
    - Resultado (select: Aprovado, Rejeitado, Diligência, Adiado)
    - Decisão (rich text editor ou textarea)
    - Votos:
      - A favor (number input)
      - Contra (number input)
      - Abstenção (number input)
    - Observações (textarea)
  - Botão "Salvar Decisão"
  - Status: "Pendente" ou "Julgado" (badge)

**Formulário de Decisão** (DecisionForm.tsx - modal):
- Modal que abre ao clicar "Definir Decisão"
- Mesmos campos do VotingPanel
- Botão "Salvar"
- Atualiza SessionResource com resultado e decisão
- Cria histórico automático no recurso

---

### 3.8 Módulo de Notificações

**Objetivo**: Gerenciar envio de notificações para contribuintes por email e WhatsApp.

#### Funcionalidades:

**Criar Notificação** (/ccr/notificacoes/nova):
- Formulário com campos:
  - Recurso Associado (select, opcional)
  - Tipo de Notificação (select):
    - Admissibilidade
    - Sessão
    - Diligência
    - Decisão
    - Outro
  - **Destinatário** (2 opções, pelo menos uma obrigatória):
    - Setor (select de setores ativos) OU
    - Destino Personalizado (input text, ex: "Conselheiros", "Partes envolvidas")
  - Emails (array - adicionar múltiplos)
  - Telefones (array - adicionar múltiplos, formato WhatsApp)
  - Assunto (input text)
  - Mensagem (textarea ou rich text editor)
  - Template (select de templates predefinidos):
    - Carrega assunto e mensagem pré-formatados
    - Variáveis dinâmicas: {{numero_recurso}}, {{contribuinte}}, {{data_sessao}}
  - Agendar Envio:
    - Enviar Imediatamente (checkbox)
    - Agendar para (date + time picker)
- Validações:
  - Pelo menos um destinatário deve ser fornecido (setor OU destino personalizado)
  - Pelo menos um email ou telefone deve ser fornecido
  - Se setor fornecido, validar que está ativo
- Botão "Salvar e Enviar" / "Salvar como Rascunho"

**Listar Notificações** (/ccr/notificacoes):
- Tabela com colunas:
  - Tipo
  - Destinatário (nome do setor ou destino personalizado)
  - Assunto
  - Status (Pendente, Enviado, Falhou, Agendado)
  - Email Enviado? (✓ ou ✗)
  - WhatsApp Enviado? (✓ ou ✗)
  - Data de Envio / Agendamento
  - Ações
- Filtros:
  - Por tipo
  - Por status
  - Por setor
  - Por intervalo de datas
- Badges de status

**Detalhes da Notificação** (/ccr/notificacoes/[id]):
- Ver todas as informações
- Status de envio:
  - Email: Enviado em [data/hora] ou Erro: [mensagem]
  - WhatsApp: Enviado em [data/hora] ou Erro: [mensagem]
- Botão "Reenviar" (se falhou)
- Botão "Editar" (se status = PENDING ou SCHEDULED)
- Visualização da mensagem formatada

**Templates de Notificação** (TemplateSelector.tsx):

Templates predefinidos em `lib/ccr/notifications/templates/`:

1. **Diligência**:
```
Assunto: Notificação de Diligência - Recurso {{numero_recurso}}
Mensagem: Prezado(a) {{destinatario}},

Informamos que foi solicitada diligência no recurso {{numero_recurso}},
processo nº {{numero_processo}}.

Solicitação: {{descricao_diligencia}}
Prazo: {{prazo}}

Atenciosamente,
Junta de Recursos Fiscais - SEFAZ
```

2. **Pauta**:
```
Assunto: Inclusão em Pauta - Sessão {{numero_sessao}}
Mensagem: Prezado(a) {{destinatario}},

Informamos que o recurso {{numero_recurso}} foi incluído na pauta
da {{tipo_sessao}} nº {{numero_sessao}}.

Data da Sessão: {{data_sessao}}
Horário: {{hora_inicio}}
Local: {{local}}

Atenciosamente,
Junta de Recursos Fiscais - SEFAZ
```

3. **Decisão**:
```
Assunto: Decisão Proferida - Recurso {{numero_recurso}}
Mensagem: Prezado(a) {{destinatario}},

Informamos que foi proferida decisão no recurso {{numero_recurso}}.

Resultado: {{resultado}}
Data da Sessão: {{data_sessao}}

A decisão completa está disponível para consulta.

Atenciosamente,
Junta de Recursos Fiscais - SEFAZ
```

4. **Prazo**:
```
Assunto: Alerta de Prazo - {{finalidade}}
Mensagem: Prezado(a) {{destinatario}},

Este é um alerta sobre o prazo referente ao recurso {{numero_recurso}}.

Finalidade: {{finalidade}}
Prazo: {{prazo}}
Dias restantes: {{dias_restantes}}

Atenciosamente,
Junta de Recursos Fiscais - SEFAZ
```

**RecipientManager.tsx**:
- Componente para gerenciar destinatários
- Adicionar/remover emails
- Adicionar/remover telefones
- Validação de formato
- Buscar destinatários de protocolos/recursos

---

## 4. API ROUTES - ESPECIFICAÇÕES

### 4.1 Protocolos

**GET /api/ccr/protocols**
- Query params: `year`, `month`, `status`, `search`, `page`, `limit`
- Include: `parts` (com `contacts` aninhados)
- Response: `{ success: true, data: { protocols: [], total, page, totalPages } }`

**POST /api/ccr/protocols**
- Body: `{ processNumber, presenter, parts: [{ name, role, document?, notes?, contacts: [{ type, value, isPrimary?, notes? }] }] }`
- Gera número automático
- Transaction:
  - Cria protocolo
  - Para cada parte:
    - Cria registro em `Part` com `protocolId`
    - Para cada contato da parte:
      - Cria registro em `Contact` com `partId`
- Response: `{ success: true, data: protocol (com parts e contacts) }`

**GET /api/ccr/protocols/[id]**
- Include: `parts` (com `contacts`), `resource`, `tramitations`
- Response: `{ success: true, data: protocol (com relacionamentos) }`

**PUT /api/ccr/protocols/[id]**
- Verifica se pode editar (não tem posterior na sequência)
- Body: `{ processNumber?, presenter?, parts?: [{ id?, name, role, document?, notes?, contacts: [{ id?, type, value, isPrimary?, notes? }] }] }`
- Se parts fornecido:
  - Transaction:
    - Remove partes antigas não incluídas (DELETE cascata para contatos)
    - Atualiza partes existentes (se `id` fornecido)
    - Cria novas partes (se `id` não fornecido)
    - Para cada parte, gerencia contatos (criar/atualizar/remover)
- Response: `{ success: true, data: protocol (com parts e contacts) }`

**DELETE /api/ccr/protocols/[id]**
- Verifica se pode excluir (é o último, não tem recurso)
- Partes são excluídas (onDelete: Cascade)
- Contatos das partes são excluídos (onDelete: Cascade)
- Response: `{ success: true }`

**POST /api/ccr/protocols/[id]/archive**
- Muda status para ARQUIVADO
- Response: `{ success: true, data: protocol }`

**POST /api/ccr/protocols/[id]/admissibility**
- Define resultado da análise de admissibilidade
- Body: `{ isAdmitted: boolean, rejectionReason?: string }`
- Se `isAdmitted = true`:
  - Define `isAdmittedAsResource = true`, `analysisDate = now()`
  - Muda status para CONCLUIDO
  - Retorna também número de recurso gerado
- Se `isAdmitted = false`:
  - Define `isAdmittedAsResource = false`, `analysisDate = now()`, `rejectionReason`
  - Arquiva automaticamente o protocolo (`status = ARQUIVADO`)
- Response: `{ success: true, data: { protocol, resourceNumber? } }`

**GET /api/ccr/protocols/sequence**
- Query params: `year`, `month`
- Response: `{ success: true, data: { nextNumber: "XXX/MM-YYYY", sequence: XXX } }`

---

### 4.2 Partes (API de Suporte)

**GET /api/ccr/parts**
- Query params: `protocolId?`, `resourceId?`, `role?`
- Busca partes vinculadas a protocolo ou recurso
- Include: `contacts`
- Response: `{ success: true, data: parts[] }`

**POST /api/ccr/parts**
- Body: `{ name, role, document?, notes?, protocolId?, resourceId?, contacts: [{ type, value, isPrimary?, notes? }] }`
- Cria parte e seus contatos em uma transaction
- Response: `{ success: true, data: part (com contacts) }`

**GET /api/ccr/parts/[id]**
- Include: `contacts`, `protocol`, `resource`
- Response: `{ success: true, data: part }`

**PUT /api/ccr/parts/[id]**
- Body: `{ name?, role?, document?, notes?, contacts?: [{ id?, type, value, isPrimary?, notes? }] }`
- Transaction para atualizar parte e gerenciar contatos
- Response: `{ success: true, data: part (com contacts) }`

**DELETE /api/ccr/parts/[id]**
- Exclui parte (cascata para contatos)
- Response: `{ success: true }`

---

### 4.3 Setores

**GET /api/ccr/sectors**
- Query params: `isActive?` (default: true), `search?`
- Response: `{ success: true, data: sectors[] }`

**POST /api/ccr/sectors**
- Body: `{ name, abbreviation?, dispatchCode?, description?, phone?, email?, address? }`
- Valida nome único e abreviação única (se fornecida)
- Response: `{ success: true, data: sector }`

**GET /api/ccr/sectors/[id]**
- Response: `{ success: true, data: sector }`

**PUT /api/ccr/sectors/[id]**
- Body: `{ name?, abbreviation?, dispatchCode?, description?, phone?, email?, address?, isActive? }`
- Response: `{ success: true, data: sector }`

**DELETE /api/ccr/sectors/[id]**
- Verifica se o setor possui tramitações associadas
- Se possuir, apenas desativa (isActive = false)
- Se não possuir, pode excluir
- Response: `{ success: true }`

---

### 4.4 Membros

**GET /api/ccr/members**
- Query params: `isActive?` (default: true), `search?`
- Response: `{ success: true, data: members[] }`

**POST /api/ccr/members**
- Body: `{ name, role?, cpf?, registration?, agency?, phone?, email? }`
- Valida nome obrigatório
- Response: `{ success: true, data: member }`

**GET /api/ccr/members/[id]**
- Response: `{ success: true, data: member }`

**PUT /api/ccr/members/[id]**
- Body: `{ name?, role?, cpf?, registration?, agency?, phone?, email?, isActive? }`
- Response: `{ success: true, data: member }`

**DELETE /api/ccr/members/[id]**
- Verifica se o membro possui tramitações associadas
- Se possuir, apenas desativa (isActive = false)
- Se não possuir, pode excluir
- Response: `{ success: true }`

---

### 4.5 Tramitações

**GET /api/ccr/tramitations**
- Query params: `purpose`, `sectorId`, `memberId`, `status`, `protocolId`, `resourceId`, `page`, `limit`
- Include: `sector`, `member`, `protocol`, `resource`
- Response: `{ success: true, data: { tramitations: [], total } }`

**POST /api/ccr/tramitations**
- Body: `{ protocolId?, resourceId?, purpose, sectorId?, memberId?, destination?, deadline?, observations? }`
- Valida se sector, member OU destination foi fornecido (pelo menos um)
- Valida se sector existe e está ativo (se fornecido)
- Valida se member existe e está ativo (se fornecido)
- Response: `{ success: true, data: tramitation }`

**GET /api/ccr/tramitations/[id]**
- Response: `{ success: true, data: tramitation }`

**PUT /api/ccr/tramitations/[id]**
- Body: campos editáveis
- Response: `{ success: true, data: tramitation }`

**POST /api/ccr/tramitations/[id]/return**
- Body: `{ returnDate, observations? }`
- Atualiza status para ENTREGUE
- Response: `{ success: true, data: tramitation }`

**GET /api/ccr/tramitations/overdue**
- Retorna tramitações com deadline < hoje e status = PENDENTE
- Response: `{ success: true, data: tramitations[] }`

---

### 4.6 Recursos

**GET /api/ccr/resources**
- Query params: `status`, `year`, `resourceSubjectId`, `registrationType`, `search`, `page`, `limit`
- Include: subjects (via SubjectChildren → Subject com hierarquia), parts, registrations (com values)
- Response: `{ success: true, data: { resources: [], total } }`

**POST /api/ccr/resources**
- Body: `{ protocolId, processNumber, subjects?: [{ resourceSubjectId, isPrimary }], parts?: [{ name, role, document?, notes?, contacts: [{ type, value, isPrimary?, notes? }] }], registrations?: [{ type, registrationNumber, cep?, street?, number?, complement?, neighborhood?, city?, state?, values: [{ description?, amount, dueDate? }] }], authorities?: [{ type, name, phone?, email?, observations? }] }`
- Valida se protocolo foi admitido como recurso (`isAdmittedAsResource = true`)
- Gera número automático XXXX/YYYY
- Transaction:
  - Cria recurso
  - Se subjects fornecido:
    - Para cada subject:
      - Cria registro em `SubjectChildren` com `isPrimary`
      - Valida que existe apenas 1 assunto principal (isPrimary = true)
      - Valida que subitens pertencem ao assunto principal (via parentId)
  - Se parts fornecido:
    - Para cada parte:
      - Cria registro em `Part` com `resourceId`
      - Para cada contato da parte:
        - Cria registro em `Contact` com `partId`
  - Se registrations fornecido:
    - Para cada inscrição:
      - Cria registro em `Registration` com `resourceId`
      - Para cada valor da inscrição:
        - Cria registro em `RegistrationValue` com `registrationId`
  - Se authorities fornecido:
    - Para cada autoridade:
      - Cria registro em `Authority` com `resourceId`
      - Valida tipo (enum AuthorityType)
- Cria histórico
- Status inicial: EM_ANALISE
- Response: `{ success: true, data: resource (com subjects, parts, registrations e authorities) }`

**GET /api/ccr/resources/[id]**
- Include: protocol, parts (com contacts), subjects (via SubjectChildren → Subject com parent/children), registrations (com values), authorities, tramitations, sessions, documents, history
- Response: `{ success: true, data: resource }`

**PUT /api/ccr/resources/[id]**
- Body: `{ processNumber?, status?, subjects?, parts?, registrations?, authorities? }`
- Se subjects fornecido:
  - Transaction:
    - Remove associações antigas em `SubjectChildren`
    - Cria novas associações
    - Valida hierarquia (1 principal + subitens válidos)
- Se parts fornecido:
  - Transaction para atualizar/criar/remover partes e contatos
- Se registrations fornecido:
  - Transaction para atualizar/criar/remover inscrições e valores
- Se authorities fornecido:
  - Transaction para atualizar/criar/remover autoridades
- Cria histórico de atualização
- Response: `{ success: true, data: resource (com relacionamentos atualizados) }`

**GET /api/ccr/resources/[id]/documents**
- Response: `{ success: true, data: documents[] }`

**POST /api/ccr/resources/[id]/documents**
- Multipart/form-data
- Body: `{ type, title, description?, file }`
- Busca informações do recurso (year, resourceNumber)
- Para tipo VOTO: Busca ano do julgamento (SessionJudgment.createdAt)
- Salva arquivo em `[CCR_UPLOAD_DIR]/{DocumentType}/{Year}/RV {resourceNumber}.pdf`
  - Exemplos:
    - Recurso: `/var/uploads/ccr/Recurso/2024/RV 0001-2024.pdf` (ano do protocolo)
    - Voto: `/var/uploads/ccr/Voto/2025/RV 0001-2024.pdf` (ano do julgamento, não do protocolo)
- Cria registro no banco
- Cria histórico
- Response: `{ success: true, data: document }`

**GET /api/ccr/resources/[id]/documents/[docId]**
- Download do arquivo
- Response: arquivo (stream)

**DELETE /api/ccr/resources/[id]/documents/[docId]**
- Exclui arquivo físico e registro
- Response: `{ success: true }`

**GET /api/ccr/resources/[id]/history**
- Response: `{ success: true, data: history[] }`

**GET /api/ccr/resources/sequence**
- Query params: `year`
- Response: `{ success: true, data: { nextNumber: "XXXX/YYYY", sequence: XXXX } }`

---

### 4.7 Sessões

**GET /api/ccr/sessions**
- Query params: `type`, `status`, `startDate`, `endDate`, `page`, `limit`
- Response: `{ success: true, data: { sessions: [], total } }`

**POST /api/ccr/sessions**
- Body: `{ sessionNumber, date, startTime, endTime?, type, location?, observations? }`
- Response: `{ success: true, data: session }`

**GET /api/ccr/sessions/[id]**
- Include: resources (com detalhes)
- Response: `{ success: true, data: session }`

**PUT /api/ccr/sessions/[id]**
- Body: campos editáveis
- Response: `{ success: true, data: session }`

**DELETE /api/ccr/sessions/[id]**
- Só pode excluir se status = SCHEDULED
- Response: `{ success: true }`

**GET /api/ccr/sessions/[id]/resources**
- Lista recursos na pauta
- Response: `{ success: true, data: sessionResources[] }`

**POST /api/ccr/sessions/[id]/resources**
- Body: `{ resourceId, order? }`
- Adiciona recurso à pauta
- Cria histórico no recurso
- Response: `{ success: true, data: sessionResource }`

**PUT /api/ccr/sessions/[id]/resources/[resourceId]**
- Body: `{ order? }`
- Atualiza ordem na pauta
- Response: `{ success: true, data: sessionResource }`

**DELETE /api/ccr/sessions/[id]/resources/[resourceId]**
- Remove da pauta
- Response: `{ success: true }`

**POST /api/ccr/sessions/[id]/resources/[resourceId]/decision**
- Body: `{ result, decision?, votes?, observations? }`
- Registra decisão
- Atualiza status do recurso
- Cria histórico
- Response: `{ success: true, data: sessionResource }`

---

### 4.8 Assuntos (com Hierarquia)

**GET /api/ccr/resource-subjects**
- Query params: `isActive?` (default: true), `search?`, `parentId?` (null = apenas principais, id = subitens de um pai)
- Include: `children` (se for assunto principal), `parent` (se for subitem)
- Response: `{ success: true, data: resourceSubjects[] }`

**GET /api/ccr/resource-subjects/tree**
- Retorna árvore completa (assuntos principais com seus subitens)
- Response: `{ success: true, data: tree[] }` onde cada item tem `{ id, name, description, children: [...] }`

**POST /api/ccr/resource-subjects**
- Body: `{ name, description?, parentId? }`
- Se `parentId` = null: cria assunto principal
- Se `parentId` preenchido: cria subitem do assunto pai
- Valida se parentId existe e está ativo (se fornecido)
- Response: `{ success: true, data: resourceSubject }`

**GET /api/ccr/resource-subjects/[id]**
- Include: `children`, `parent`, `resourceLinks`
- Response: `{ success: true, data: resourceSubject }`

**PUT /api/ccr/resource-subjects/[id]**
- Body: `{ name?, description?, isActive?, parentId? }`
- Se alterar parentId: valida que não cria ciclo (filho não pode virar pai de si mesmo)
- Response: `{ success: true, data: resourceSubject }`

**DELETE /api/ccr/resource-subjects/[id]**
- Verifica se o assunto possui:
  - Recursos associados (via SubjectChildren)
  - Subitens (children)
- Se possuir recursos ou subitens, apenas desativa (isActive = false)
- Se não possuir, pode excluir
- Response: `{ success: true }`

---

### 4.9 Inscrições e Valores

**GET /api/ccr/resource-registrations**
- Query params: `resourceId?`, `type?`
- Include: `values` (valores associados)
- Response: `{ success: true, data: resourceRegistrations[] }`

**POST /api/ccr/resource-registrations**
- Body: `{ resourceId, type, registrationNumber, cep?, street?, number?, complement?, neighborhood?, city?, state?, values?: [{ description?, amount, dueDate? }] }`
- Valida tipo (enum RegistrationType)
- Transaction:
  - Cria registro de inscrição com dados de endereço
  - Para cada valor fornecido:
    - Cria registro em `RegistrationValue` com `registrationId`
- Response: `{ success: true, data: resourceRegistration (com values) }`

**GET /api/ccr/resource-registrations/[id]**
- Include: `values`, `resource`
- Response: `{ success: true, data: resourceRegistration }`

**PUT /api/ccr/resource-registrations/[id]**
- Body: `{ type?, registrationNumber?, cep?, street?, number?, complement?, neighborhood?, city?, state?, values?: [{ id?, description?, amount?, dueDate? }] }`
- Se values fornecido:
  - Transaction:
    - Remove valores antigos não incluídos
    - Atualiza valores existentes (se `id` fornecido)
    - Cria novos valores (se `id` não fornecido)
- Response: `{ success: true, data: resourceRegistration (com values) }`

**DELETE /api/ccr/resource-registrations/[id]**
- Exclui inscrição (cascata para valores)
- Response: `{ success: true }`

**POST /api/ccr/resource-registrations/[id]/values**
- Body: `{ description?, amount, dueDate? }`
- Adiciona um valor à inscrição
- Response: `{ success: true, data: value }`

**PUT /api/ccr/resource-registrations/[regId]/values/[valueId]**
- Body: `{ description?, amount?, dueDate? }`
- Atualiza um valor específico
- Response: `{ success: true, data: value }`

**DELETE /api/ccr/resource-registrations/[regId]/values/[valueId]**
- Exclui um valor específico
- Response: `{ success: true }`

---

### 4.10 Autoridades Vinculadas

**GET /api/ccr/resource-authorities**
- Query params: `resourceId?`, `type?`
- Include: `resource`
- Response: `{ success: true, data: resourceAuthorities[] }`

**POST /api/ccr/resource-authorities**
- Body: `{ resourceId, type, name, phone?, email?, observations? }`
- Valida tipo (enum AuthorityType)
- Cria registro de autoridade vinculada ao recurso
- Response: `{ success: true, data: resourceAuthority }`

**GET /api/ccr/resource-authorities/[id]**
- Include: `resource`
- Response: `{ success: true, data: resourceAuthority }`

**PUT /api/ccr/resource-authorities/[id]**
- Body: `{ type?, name?, phone?, email?, observations? }`
- Atualiza dados da autoridade
- Response: `{ success: true, data: resourceAuthority }`

**DELETE /api/ccr/resource-authorities/[id]**
- Exclui autoridade vinculada
- Response: `{ success: true }`

---

### 4.11 Notificações

**GET /api/ccr/notifications**
- Query params: `type`, `status`, `resourceId`, `sectorId`, `page`, `limit`
- Include: `sector`, `resource`
- Response: `{ success: true, data: { notifications: [], total } }`

**POST /api/ccr/notifications**
- Body: `{ resourceId?, type, sectorId?, destination?, emails[], phones[], subject, message, scheduledFor? }`
- Valida que pelo menos um destinatário foi fornecido (sectorId OU destination)
- Se sectorId fornecido: valida que setor existe e está ativo
- Se scheduledFor: status = SCHEDULED
- Se não: status = PENDING
- Response: `{ success: true, data: notification }`

**GET /api/ccr/notifications/[id]**
- Include: `sector`, `resource`
- Response: `{ success: true, data: notification }`

**PUT /api/ccr/notifications/[id]**
- Só pode editar se status = PENDING ou SCHEDULED
- Body: `{ type?, sectorId?, destination?, emails?, phones?, subject?, message?, scheduledFor? }`
- Valida que pelo menos um destinatário permanece (sectorId OU destination)
- Response: `{ success: true, data: notification }`

**DELETE /api/ccr/notifications/[id]**
- Response: `{ success: true }`

**POST /api/ccr/notifications/[id]/send**
- Envia imediatamente (email + WhatsApp)
- Atualiza status e timestamps
- Captura erros
- Cria histórico se associado a recurso
- Response: `{ success: true, data: { emailSent, whatsappSent, errors? } }`

**GET /api/ccr/notifications/templates**
- Response: `{ success: true, data: templates[] }`
- Lista templates disponíveis com variáveis

---

### 4.12 Cron Jobs

**POST /api/ccr/cron/check-deadlines**
- Verifica tramitações com deadline próximo:
  - Hoje
  - Amanhã (1 dia)
  - Daqui a 3 dias
- Cria notificações automáticas
- Response: `{ success: true, data: { created: number } }`

**POST /api/ccr/cron/send-notifications**
- Busca notificações com:
  - status = SCHEDULED
  - scheduledFor <= agora
- Envia email e WhatsApp
- Atualiza status
- Response: `{ success: true, data: { sent: number, failed: number } }`

**Configuração de Cron** (vercel.json ou node-cron):

```json
{
  "crons": [
    {
      "path": "/api/ccr/cron/check-deadlines",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/ccr/cron/send-notifications",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

Alternativa com node-cron (src/lib/ccr/cron.ts):
```typescript
import cron from 'node-cron';

// Executar diariamente às 8h
cron.schedule('0 8 * * *', async () => {
  await fetch('http://localhost:3000/api/ccr/cron/check-deadlines', { method: 'POST' });
});

// Executar a cada 15 minutos
cron.schedule('*/15 * * * *', async () => {
  await fetch('http://localhost:3000/api/ccr/cron/send-notifications', { method: 'POST' });
});
```

---

## 5. SIDEBAR CUSTOMIZADA DO CCR

### Configuração no Layout (ccr/layout.tsx)

```typescript
'use client'

import { useEffect } from 'react';
import { useSidebarConfig } from '@/contexts/sidebar-context';
import {
  LayoutDashboard,
  FileText,
  ArrowRightLeft,
  Scale,
  Calendar,
  Bell,
  Settings,
  FileStack,
  Search,
  Users,
  Building2,
  BookOpen,
  Gavel
} from 'lucide-react';

export default function CCRLayout({ children }: { children: React.ReactNode }) {
  const { setConfig } = useSidebarConfig();

  useEffect(() => {
    setConfig({
      showAppSwitcher: true,
      showUserAuth: true,
      customSections: [
        {
          title: 'Dashboard',
          items: [
            {
              label: 'Dashboard',
              icon: LayoutDashboard,
              href: '/ccr',
            },
          ],
        },
        {
          title: 'Recurso',
          items: [
            {
              label: 'Protocolos',
              icon: FileText,
              href: '/ccr/protocolos',
            },
            {
              label: 'Consultar',
              icon: Search,
              href: '/ccr/recursos',
            },
            {
              label: 'Tramitações',
              icon: ArrowRightLeft,
              href: '/ccr/tramitacoes',
            },
          ],
        },
        {
          title: 'Sessões',
          items: [
            {
              label: 'Consultar',
              icon: Calendar,
              href: '/ccr/sessoes',
            },
            {
              label: 'Atas',
              icon: FileStack,
              href: '/ccr/sessoes/atas',
            },
            {
              label: 'Acórdãos',
              icon: Gavel,
              href: '/ccr/sessoes/acordaos',
            },
          ],
        },
        {
          title: 'Comunicação',
          items: [
            {
              label: 'Notificações',
              icon: Bell,
              href: '/ccr/notificacoes',
            },
          ],
        },
        {
          title: 'Configurações',
          items: [
            {
              label: 'Assuntos',
              icon: BookOpen,
              href: '/ccr/assuntos',
            },
            {
              label: 'Membros',
              icon: Users,
              href: '/ccr/membros',
            },
            {
              label: 'Setores',
              icon: Building2,
              href: '/ccr/setores',
            },
          ],
        },
      ],
      customActions: [], // Ações serão adicionadas conforme necessário
    });
  }, [setConfig]);

  return <>{children}</>;
}
```

---

## 6. INTEGRAÇÕES

### 6.1 Sistema de Email (Já Configurado)

Usar o sistema existente em `lib/email/`.

**Criar template específico do CCR**:

```typescript
// lib/email/templates/ccr-notification.ts
export function getCCRNotificationTemplate(data: {
  subject: string;
  message: string;
  recipientName: string;
}) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #1e40af; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9fafb; }
          .footer { text-align: center; padding: 10px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Junta de Recursos Fiscais - SEFAZ</h1>
          </div>
          <div class="content">
            <p>Prezado(a) ${data.recipientName},</p>
            ${data.message}
            <p>Atenciosamente,<br>Junta de Recursos Fiscais - SEFAZ</p>
          </div>
          <div class="footer">
            <p>Este é um email automático. Por favor, não responda.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
```

**Usar no serviço de notificações**:

```typescript
// lib/ccr/notifications/email.ts
import { sendEmail } from '@/lib/email/sender';
import { getCCRNotificationTemplate } from '@/lib/email/templates/ccr-notification';

export async function sendNotificationEmail(
  to: string,
  subject: string,
  message: string,
  recipientName: string
) {
  const html = getCCRNotificationTemplate({ subject, message, recipientName });

  return await sendEmail({
    to,
    subject,
    html,
  });
}

export async function sendBulkNotificationEmail(
  recipients: Array<{ email: string; name: string }>,
  subject: string,
  message: string
) {
  const results = [];

  for (const recipient of recipients) {
    try {
      const result = await sendNotificationEmail(
        recipient.email,
        subject,
        message,
        recipient.name
      );
      results.push({ email: recipient.email, success: result.success });
    } catch (error) {
      results.push({ email: recipient.email, success: false, error });
    }
  }

  return results;
}
```

---

### 6.2 Integração WhatsApp API Externa

**Configurar variáveis de ambiente (.env)**:

```env
# Upload de documentos CCR
CCR_UPLOAD_DIR=/var/uploads/ccr  # Caminho absoluto para pasta de uploads (padrão: ./uploads/ccr)

# WhatsApp API (opcional)
WHATSAPP_API_URL=https://api.whatsapp-provider.com
WHATSAPP_API_KEY=your_api_key_here
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

**Criar serviço**:

```typescript
// lib/ccr/notifications/whatsapp.ts

interface WhatsAppConfig {
  apiUrl: string;
  apiKey: string;
  phoneNumberId: string;
}

const config: WhatsAppConfig = {
  apiUrl: process.env.WHATSAPP_API_URL || '',
  apiKey: process.env.WHATSAPP_API_KEY || '',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
};

export async function sendWhatsAppMessage(
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Formatar telefone para padrão internacional (remover caracteres especiais)
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

    // Fazer requisição para API externa
    const response = await fetch(`${config.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Erro ao enviar mensagem',
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

export async function sendBulkWhatsAppMessage(
  recipients: Array<{ phone: string; message?: string }>,
  defaultMessage: string
): Promise<Array<{ phone: string; success: boolean; error?: string }>> {
  const results = [];

  for (const recipient of recipients) {
    const message = recipient.message || defaultMessage;
    const result = await sendWhatsAppMessage(recipient.phone, message);
    results.push({
      phone: recipient.phone,
      ...result,
    });

    // Delay entre mensagens para evitar rate limiting (ajustar conforme API)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}

export function formatWhatsAppPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `+55 (${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}
```

**Usar no endpoint de notificações**:

```typescript
// app/api/ccr/notifications/[id]/send/route.ts
import { sendNotificationEmail } from '@/lib/ccr/notifications/email';
import { sendWhatsAppMessage } from '@/lib/ccr/notifications/whatsapp';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // ... buscar notificação

  const results = {
    emailSent: false,
    whatsappSent: false,
    emailError: null,
    whatsappError: null,
  };

  // Enviar emails
  if (notification.emails.length > 0) {
    for (const email of notification.emails) {
      const result = await sendNotificationEmail(
        email,
        notification.subject,
        notification.message,
        notification.recipient
      );
      if (result.success) {
        results.emailSent = true;
      } else {
        results.emailError = result.error;
      }
    }
  }

  // Enviar WhatsApp
  if (notification.phones.length > 0) {
    for (const phone of notification.phones) {
      const result = await sendWhatsAppMessage(phone, notification.message);
      if (result.success) {
        results.whatsappSent = true;
      } else {
        results.whatsappError = result.error;
      }
    }
  }

  // Atualizar notificação
  await prisma.notification.update({
    where: { id: params.id },
    data: {
      emailSent: results.emailSent,
      emailSentAt: results.emailSent ? new Date() : null,
      emailError: results.emailError,
      whatsappSent: results.whatsappSent,
      whatsappSentAt: results.whatsappSent ? new Date() : null,
      whatsappError: results.whatsappError,
      status: (results.emailSent || results.whatsappSent) ? 'SENT' : 'FAILED',
    },
  });

  return NextResponse.json({ success: true, data: results });
}
```

---

### 6.3 File Storage Local

**Criar serviço de gerenciamento de arquivos**:

```typescript
// lib/ccr/file-storage.ts
import fs from 'fs/promises';
import path from 'path';

// Pasta base configurável via variável de ambiente
const UPLOAD_BASE_DIR = process.env.CCR_UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'ccr');

// Mapeamento de tipos de documento para nomes de pasta
const DOCUMENT_TYPE_FOLDERS: Record<string, string> = {
  RECURSO: 'Recurso',
  CONTRARRAZAO: 'Contrarrazão',
  PARECER: 'Parecer',
  VOTO: 'Voto',
  OUTROS: 'Outros',
};

export interface UploadParams {
  documentType: 'RECURSO' | 'CONTRARRAZAO' | 'PARECER' | 'VOTO' | 'OUTROS';
  protocolYear: number;        // Ano do protocolo (ex: 2024)
  resourceNumber: string;       // Número do recurso (ex: "0001/2024")
  file: File;
  judgmentYear?: number;       // Ano do julgamento (obrigatório apenas para tipo VOTO)
}

export interface UploadResult {
  success: boolean;
  filePath?: string;            // Caminho relativo (ex: "Recurso/2024/RV 0001-2024.pdf")
  storedFileName?: string;      // Nome final do arquivo (ex: "RV 0001-2024.pdf")
  error?: string;
}

/**
 * Garante que o diretório existe
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Gera nome do arquivo baseado no número do recurso
 * Formato: "RV XXXX-YYYY.pdf"
 */
function generateFileName(resourceNumber: string, fileExtension: string): string {
  // resourceNumber vem como "XXXX/YYYY", precisa transformar em "RV XXXX-YYYY"
  const formattedNumber = resourceNumber.replace('/', '-');
  return `RV ${formattedNumber}${fileExtension}`;
}

/**
 * Salva arquivo no sistema de arquivos seguindo a estrutura:
 * [BASE_DIR]/[TipoDocumento]/[Ano]/RV XXXX-YYYY.pdf
 *
 * IMPORTANTE: Para tipo VOTO, o ano da pasta será o ano do julgamento (judgmentYear),
 * não o ano do protocolo. Para outros tipos, usa protocolYear.
 */
export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  try {
    const { documentType, protocolYear, resourceNumber, file, judgmentYear } = params;

    // Obter nome da pasta do tipo de documento
    const typeFolder = DOCUMENT_TYPE_FOLDERS[documentType];
    if (!typeFolder) {
      throw new Error(`Tipo de documento inválido: ${documentType}`);
    }

    // Validar que judgmentYear foi fornecido para tipo VOTO
    if (documentType === 'VOTO' && !judgmentYear) {
      throw new Error('judgmentYear é obrigatório para documentos do tipo VOTO');
    }

    // Determinar qual ano usar para a pasta
    // VOTO: usa ano do julgamento
    // Outros tipos: usa ano do protocolo
    const yearForFolder = documentType === 'VOTO' ? judgmentYear! : protocolYear;

    // Criar estrutura de diretórios: [BASE]/[Tipo]/[Ano]
    const yearFolder = yearForFolder.toString();
    const targetDir = path.join(UPLOAD_BASE_DIR, typeFolder, yearFolder);
    await ensureDirectory(targetDir);

    // Gerar nome do arquivo
    const fileExtension = path.extname(file.name);
    const storedFileName = generateFileName(resourceNumber, fileExtension);
    const fullPath = path.join(targetDir, storedFileName);

    // Salvar arquivo
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

    // Retornar caminho relativo: Tipo/Ano/RV XXXX-YYYY.pdf
    const relativePath = path.join(typeFolder, yearFolder, storedFileName);

    return {
      success: true,
      filePath: relativePath,
      storedFileName,
    };
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Exclui arquivo do sistema de arquivos
 * @param filePath - Caminho relativo (ex: "Recurso/2024/RV 0001-2024.pdf")
 */
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, filePath);
    await fs.unlink(fullPath);
    return { success: true };
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Obtém caminho completo do arquivo
 * @param relativePath - Caminho relativo (ex: "Recurso/2024/RV 0001-2024.pdf")
 */
export function getFullPath(relativePath: string): string {
  return path.join(UPLOAD_BASE_DIR, relativePath);
}

/**
 * Verifica se arquivo existe
 */
export async function fileExists(relativePath: string): Promise<boolean> {
  try {
    const fullPath = getFullPath(relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Obtém tamanho do arquivo em bytes
 */
export async function getFileSize(relativePath: string): Promise<number> {
  const fullPath = getFullPath(relativePath);
  const stats = await fs.stat(fullPath);
  return stats.size;
}

/**
 * Valida tipo de arquivo permitido
 */
export function isValidFileType(mimeType: string): boolean {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];
  return allowedTypes.includes(mimeType);
}

/**
 * Formata tamanho de arquivo para leitura humana
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
```

**Usar no endpoint de upload**:

```typescript
// app/api/ccr/resources/[id]/documents/route.ts
import { uploadFile, isValidFileType } from '@/lib/ccr/file-storage';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import prismadb from '@/lib/prismadb';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as string;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string | null;

  // Validações
  if (!file || !type || !title) {
    return NextResponse.json(
      { success: false, error: 'Campos obrigatórios faltando' },
      { status: 400 }
    );
  }

  if (!isValidFileType(file.type)) {
    return NextResponse.json(
      { success: false, error: 'Tipo de arquivo não permitido' },
      { status: 400 }
    );
  }

  // Buscar informações do recurso (necessário para upload)
  const resource = await prismadb.resource.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        include: {
          judgment: true, // Necessário para obter ano do julgamento (tipo VOTO)
        },
      },
    },
  });

  if (!resource) {
    return NextResponse.json(
      { success: false, error: 'Recurso não encontrado' },
      { status: 404 }
    );
  }

  // Determinar o ano do julgamento (necessário para tipo VOTO)
  let judgmentYear: number | undefined;
  if (type === 'VOTO') {
    // Buscar o julgamento do recurso
    const sessionWithJudgment = resource.sessions.find(s => s.judgment);

    if (!sessionWithJudgment?.judgment) {
      return NextResponse.json(
        { success: false, error: 'Recurso não foi julgado ainda. Tipo VOTO requer julgamento concluído.' },
        { status: 400 }
      );
    }

    // Extrair ano da data do julgamento
    judgmentYear = new Date(sessionWithJudgment.judgment.createdAt).getFullYear();
  }

  // Upload do arquivo com nova estrutura
  const uploadResult = await uploadFile({
    documentType: type as 'RECURSO' | 'CONTRARRAZAO' | 'PARECER' | 'VOTO' | 'OUTROS',
    protocolYear: resource.year, // Ano do recurso
    resourceNumber: resource.resourceNumber, // Ex: "0001/2024"
    file,
    judgmentYear, // Ano do julgamento (obrigatório para VOTO)
  });

  if (!uploadResult.success) {
    return NextResponse.json(
      { success: false, error: uploadResult.error },
      { status: 500 }
    );
  }

  // Criar registro no banco
  const document = await prismadb.document.create({
    data: {
      resourceId: params.id,
      type,
      title,
      description,
      fileName: file.name,
      storedFileName: uploadResult.storedFileName!,
      filePath: uploadResult.filePath!, // Ex: "Recurso/2024/RV 0001-2024.pdf"
      fileSize: file.size,
      mimeType: file.type,
      uploadedBy: session.user.id,
    },
  });

  // Criar histórico automático
  await prismadb.resourceHistory.create({
    data: {
      resourceId: params.id,
      action: 'DOCUMENT_ADDED',
      description: `Documento "${title}" adicionado`,
      isManual: false, // Histórico automático
      createdBy: session.user.id,
    },
  });

  return NextResponse.json({ success: true, data: document });
}
```

---

## 7. UTILITÁRIOS

### 7.1 Geração de Números de Protocolo

```typescript
// lib/ccr/utils/protocol-number.ts
import prismadb from '@/lib/prismadb';

/**
 * Obtém próximo número de protocolo para o mês/ano
 */
export async function getNextProtocolNumber(
  year: number,
  month: number
): Promise<{ number: string; sequence: number }> {
  // Buscar último protocolo do mês/ano
  const lastProtocol = await prismadb.protocol.findFirst({
    where: { year, month },
    orderBy: { sequenceNumber: 'desc' },
  });

  const nextSequence = lastProtocol ? lastProtocol.sequenceNumber + 1 : 1;
  const number = formatProtocolNumber(nextSequence, month, year);

  return { number, sequence: nextSequence };
}

/**
 * Formata número de protocolo: XXX/MM-YYYY
 */
export function formatProtocolNumber(
  sequence: number,
  month: number,
  year: number
): string {
  const seqStr = String(sequence).padStart(3, '0');
  const monthStr = String(month).padStart(2, '0');
  return `${seqStr}/${monthStr}-${year}`;
}

/**
 * Parse número de protocolo
 */
export function parseProtocolNumber(number: string): {
  sequence: number;
  month: number;
  year: number;
} | null {
  const match = number.match(/^(\d{3})\/(\d{2})-(\d{4})$/);
  if (!match) return null;

  return {
    sequence: parseInt(match[1]),
    month: parseInt(match[2]),
    year: parseInt(match[3]),
  };
}

/**
 * Verifica se protocolo pode ser editado
 */
export async function canEditProtocol(protocolId: string): Promise<boolean> {
  const protocol = await prismadb.protocol.findUnique({
    where: { id: protocolId },
  });

  if (!protocol) return false;

  // Verificar se há protocolo posterior na sequência
  const laterProtocol = await prismadb.protocol.findFirst({
    where: {
      year: protocol.year,
      month: protocol.month,
      sequenceNumber: { gt: protocol.sequenceNumber },
    },
  });

  return !laterProtocol;
}

/**
 * Verifica se protocolo pode ser excluído
 */
export async function canDeleteProtocol(protocolId: string): Promise<{
  canDelete: boolean;
  reason?: string;
}> {
  const protocol = await prismadb.protocol.findUnique({
    where: { id: protocolId },
    include: { resource: true },
  });

  if (!protocol) return { canDelete: false, reason: 'Protocolo não encontrado' };

  // Não pode excluir se tem recurso associado
  if (protocol.resource) {
    return { canDelete: false, reason: 'Protocolo possui recurso associado' };
  }

  // Verificar se é o último da sequência
  const canEdit = await canEditProtocol(protocolId);
  if (!canEdit) {
    return { canDelete: false, reason: 'Só é possível excluir o último protocolo da sequência' };
  }

  return { canDelete: true };
}
```

---

### 7.2 Geração de Números de Recurso

```typescript
// lib/ccr/utils/resource-number.ts
import prismadb from '@/lib/prismadb';

/**
 * Obtém próximo número de recurso para o ano
 */
export async function getNextResourceNumber(
  year: number
): Promise<{ number: string; sequence: number }> {
  // Buscar último recurso do ano
  const lastResource = await prismadb.resource.findFirst({
    where: { year },
    orderBy: { sequenceNumber: 'desc' },
  });

  const nextSequence = lastResource ? lastResource.sequenceNumber + 1 : 1;
  const number = formatResourceNumber(nextSequence, year);

  return { number, sequence: nextSequence };
}

/**
 * Formata número de recurso: XXXX/YYYY
 */
export function formatResourceNumber(sequence: number, year: number): string {
  const seqStr = String(sequence).padStart(4, '0');
  return `${seqStr}/${year}`;
}

/**
 * Parse número de recurso
 */
export function parseResourceNumber(number: string): {
  sequence: number;
  year: number;
} | null {
  const match = number.match(/^(\d{4})\/(\d{4})$/);
  if (!match) return null;

  return {
    sequence: parseInt(match[1]),
    year: parseInt(match[2]),
  };
}
```

---

### 7.3 Cálculo de Prazos

```typescript
// lib/ccr/utils/deadline-calculator.ts

/**
 * Calcula prazo adicionando dias úteis
 */
export function calculateDeadline(startDate: Date, workingDays: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < workingDays) {
    result.setDate(result.getDate() + 1);

    // Pular fins de semana (0 = domingo, 6 = sábado)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }

  return result;
}

/**
 * Verifica se prazo está vencido
 */
export function isOverdue(deadline: Date): boolean {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return deadline < now;
}

/**
 * Obtém dias até o prazo (pode ser negativo se vencido)
 */
export function getDaysUntilDeadline(deadline: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Conta dias úteis entre duas datas
 */
export function getWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Formata prazo para exibição
 */
export function formatDeadline(deadline: Date): string {
  const days = getDaysUntilDeadline(deadline);

  if (days < 0) {
    return `Vencido há ${Math.abs(days)} dia(s)`;
  } else if (days === 0) {
    return 'Vence hoje';
  } else if (days === 1) {
    return 'Vence amanhã';
  } else {
    return `Vence em ${days} dia(s)`;
  }
}

/**
 * Obtém cor do badge baseado no prazo
 */
export function getDeadlineColor(deadline: Date): 'default' | 'warning' | 'danger' {
  const days = getDaysUntilDeadline(deadline);

  if (days < 0) return 'danger';
  if (days <= 3) return 'warning';
  return 'default';
}
```

---

## 8. FASES DE IMPLEMENTAÇÃO

### Fase 1: Configuração Inicial (Prioridade: ALTA)
- [ ] Adicionar schema Prisma completo
- [ ] Executar migrations
- [ ] Criar estrutura de pastas base
- [ ] Criar arquivo types.ts com tipos compartilhados
- [ ] Configurar variáveis de ambiente (.env)

### Fase 2: Sistema de Partes e Contatos (Prioridade: ALTA)
**Implementar primeiro pois será usado por Protocolos e Recursos**
- [ ] Criar API routes de partes (/api/ccr/parts):
  - [ ] GET /api/ccr/parts (listar partes)
  - [ ] POST /api/ccr/parts (criar parte com contatos)
  - [ ] GET /api/ccr/parts/[id] (detalhes)
  - [ ] PUT /api/ccr/parts/[id] (editar parte e contatos)
  - [ ] DELETE /api/ccr/parts/[id] (excluir parte - cascata para contatos)
- [ ] Criar componentes:
  - [ ] PartManager (gerenciar partes e contatos)
  - [ ] PartCard (card de parte com lista de contatos)
  - [ ] ContactList (lista de contatos de uma parte)
  - [ ] Formulário de adicionar parte
  - [ ] Formulário de adicionar contato
- [ ] Criar utils de validação:
  - [ ] Validar formato de telefone brasileiro
  - [ ] Validar formato de email
  - [ ] Validar CPF/CNPJ
  - [ ] Formatar telefone/email/documento

### Fase 3: Módulo de Protocolos (Prioridade: ALTA)
**Depende da Fase 2 (Sistema de Partes e Contatos)**
- [ ] Criar utils de geração de números
- [ ] Criar API routes (GET, POST, PUT, DELETE, archive, admissibility, sequence)
  - [ ] Implementar transactions para criar protocolo + partes + contatos atomicamente
  - [ ] Integrar com API de partes
  - [ ] Implementar análise de admissibilidade (POST /api/ccr/protocols/[id]/admissibility)
- [ ] Criar página de listagem (/ccr/protocolos)
- [ ] Criar página de novo protocolo (/ccr/protocolos/novo)
- [ ] Criar página de detalhes (/ccr/protocolos/[id])
  - [ ] Mostrar status de análise de admissibilidade
- [ ] Criar página/modal de análise de admissibilidade (/ccr/protocolos/[id]/admissibilidade)
- [ ] Criar componentes:
  - [ ] ProtocolForm (com PartManager integrado)
  - [ ] ProtocolsTable
  - [ ] ArchiveProtocolModal
  - [ ] DeleteProtocolModal
  - [ ] AdmissibilityAnalysisModal (análise de admissibilidade)

### Fase 4: Módulo de Setores (Prioridade: ALTA)
- [ ] Criar API routes (GET, POST, PUT, DELETE)
  - [ ] Validação de nome e código únicos
  - [ ] Lógica de soft delete (desativar quando tem tramitações)
- [ ] Criar página de listagem (/ccr/setores)
- [ ] Criar página de novo setor (/ccr/setores/novo)
- [ ] Criar página de editar setor (/ccr/setores/[id])
- [ ] Criar componentes:
  - [ ] SectorForm
  - [ ] SectorsTable (com filtros e busca)
  - [ ] DeleteSectorModal (com verificação de tramitações)

### Fase 5: Módulo de Membros (Prioridade: ALTA)
- [ ] Criar API routes (GET, POST, PUT, DELETE)
  - [ ] Validação de nome obrigatório
  - [ ] Lógica de soft delete (desativar quando tem tramitações)
- [ ] Criar página de listagem (/ccr/membros)
- [ ] Criar página de novo membro (/ccr/membros/novo)
- [ ] Criar página de editar membro (/ccr/membros/[id])
- [ ] Criar componentes:
  - [ ] MemberForm
  - [ ] MembersTable (com filtros e busca)
  - [ ] DeleteMemberModal (com verificação de tramitações)

### Fase 6: Módulo de Assuntos com Hierarquia (Prioridade: ALTA)
**Implementar antes de Recursos pois será usado para categorizar recursos**
- [ ] Criar API routes (GET, POST, PUT, DELETE, tree)
  - [ ] Validação de hierarquia (parentId válido, não criar ciclos)
  - [ ] Lógica de soft delete (desativar quando tem recursos associados OU subitens)
  - [ ] Endpoint /tree para retornar árvore completa
- [ ] Criar página de listagem (/ccr/assuntos)
  - [ ] Visualização hierárquica (árvore ou tabela indentada)
  - [ ] Filtros: apenas principais / apenas subitens / todos
- [ ] Criar página de novo assunto (/ccr/assuntos/novo)
  - [ ] Campo parentId (select de assuntos principais)
- [ ] Criar página de editar assunto (/ccr/assuntos/[id])
  - [ ] Permitir alterar parentId com validação de ciclos
- [ ] Criar componentes:
  - [ ] SubjectForm (com campo parentId)
  - [ ] SubjectsTree (visualização em árvore)
  - [ ] SubjectsTable (tabela com hierarquia indentada)
  - [ ] DeleteSubjectModal (com verificação de recursos E subitens)
  - [ ] SubjectSelector (seletor hierárquico: 1 principal + múltiplos subitens)

### Fase 7: Módulo de Tramitações (Prioridade: ALTA)
- [ ] Criar utils de cálculo de prazos
- [ ] Criar API routes (GET, POST, PUT, return, overdue)
- [ ] Criar página de listagem (/ccr/tramitacoes)
- [ ] Criar página de nova tramitação (/ccr/tramitacoes/nova)
- [ ] Criar página de detalhes (/ccr/tramitacoes/[id])
- [ ] Criar componentes (TramitationForm, TramitationsTable, DeadlineCalendar)

### Fase 8: Módulo de Inscrições e Valores (Prioridade: ALTA)
**Implementar junto com Recursos - dependência direta**
- [ ] Criar API routes de inscrições (GET, POST, PUT, DELETE)
  - [ ] Incluir campos de endereço (CEP, rua, número, complemento, bairro, cidade, estado)
- [ ] Criar API routes de valores (POST, PUT, DELETE)
  - [ ] Incluir campo de data de vencimento (dueDate)
  - [ ] Transaction para criar inscrição + valores atomicamente
  - [ ] Validação de tipo de inscrição (enum)
- [ ] Criar componentes:
  - [ ] RegistrationManager (gerenciar inscrições em recursos com endereço)
  - [ ] RegistrationCard (card de inscrição com endereço e lista de valores com vencimento)
  - [ ] Formulário de adicionar inscrição (com campos de endereço)
  - [ ] Formulário de adicionar valor (com data de vencimento)

### Fase 9: Módulo de Recursos - Parte 1 (Prioridade: ALTA)
**Depende das Fases 2 (Partes), 6 (Assuntos Hierárquicos) e 8 (Inscrições)**
- [ ] Criar utils de geração de números de recurso
- [ ] Criar API routes básicas (GET, POST, PUT, sequence)
  - [ ] Implementar transaction para criar recurso + assuntos + partes + inscrições atomicamente
  - [ ] Integrar com API de assuntos (many-to-many via SubjectChildren)
    - [ ] Validar: 1 assunto principal (isPrimary = true)
    - [ ] Validar: subitens pertencem ao assunto principal (via parentId)
  - [ ] Integrar com API de partes (copiar do protocolo ou adicionar novos)
  - [ ] Integrar com API de inscrições (adicionar múltiplas com valores)
- [ ] Criar página de listagem (/ccr/recursos)
  - [ ] Filtros por assunto principal, tipo de inscrição, status
  - [ ] Exibir assunto principal + badges de subitens
- [ ] Criar página de novo recurso (/ccr/recursos/novo)
- [ ] Criar componentes:
  - [ ] ResourceForm (com SubjectSelector, PartManager e RegistrationManager integrados)
  - [ ] ResourcesTable
  - [ ] SubjectSelector (seletor hierárquico: 1 principal + múltiplos subitens)

### Fase 10: Módulo de Recursos - Parte 2 (Prioridade: ALTA)
- [ ] Criar file-storage utils
- [ ] Criar API routes de documentos (GET, POST, DELETE, download)
- [ ] Criar API routes de histórico
- [ ] Criar página de detalhes (/ccr/recursos/[id])
- [ ] Criar componentes da página de detalhes:
  - [ ] ResourceHeader
  - [ ] GeneralInfo (aba) - exibir assuntos e partes
  - [ ] RegistrationsTab (aba) - exibir inscrições e valores
  - [ ] TramitationsTab
  - [ ] SessionsTab
  - [ ] DocumentsTab
  - [ ] HistoryTab
  - [ ] DocumentUpload

### Fase 11: Dashboard CCR (Prioridade: MÉDIA)
- [ ] Criar página dashboard (/ccr/page.tsx)
- [ ] Criar componentes:
  - [ ] StatsCards (cards de estatísticas)
  - [ ] DeadlinesWidget (prazos próximos)
  - [ ] RecentActivity (atividades recentes)
- [ ] Criar componentes compartilhados:
  - [ ] ResourceCard
  - [ ] StatusBadge

### Fase 12: Módulo de Sessões (Prioridade: MÉDIA)
- [ ] Criar API routes (GET, POST, PUT, DELETE)
- [ ] Criar API routes de recursos da sessão (GET, POST, PUT, DELETE, decision)
- [ ] Criar página de listagem (/ccr/sessoes)
- [ ] Criar página de nova sessão (/ccr/sessoes/nova)
- [ ] Criar página de detalhes (/ccr/sessoes/[id])
- [ ] Criar componentes:
  - [ ] SessionForm
  - [ ] SessionsTable
  - [ ] SessionCalendar
  - [ ] SessionHeader
  - [ ] AgendaManager
  - [ ] ResourceListItem
  - [ ] VotingPanel
  - [ ] DecisionForm
  - [ ] AddResourceToSessionModal

### Fase 13: Módulo de Notificações - Parte 1 (Prioridade: MÉDIA)
- [ ] Criar templates de notificações (diligencia, pauta, decisao, prazo)
- [ ] Criar serviço de email (lib/ccr/notifications/email.ts)
- [ ] Criar API routes (GET, POST, PUT, DELETE, templates)
- [ ] Criar página de listagem (/ccr/notificacoes)
- [ ] Criar página de nova notificação (/ccr/notificacoes/nova)
- [ ] Criar página de detalhes (/ccr/notificacoes/[id])

### Fase 14: Módulo de Notificações - Parte 2 (Prioridade: BAIXA)
- [ ] Configurar integração WhatsApp API
- [ ] Criar serviço de WhatsApp (lib/ccr/notifications/whatsapp.ts)
- [ ] Criar API route de envio (/api/ccr/notifications/[id]/send)
- [ ] Criar componentes:
  - [ ] NotificationForm
  - [ ] NotificationsTable
  - [ ] SendNotificationModal
  - [ ] TemplateSelector
  - [ ] RecipientManager

### Fase 13: Cron Jobs e Automação (Prioridade: BAIXA)
- [ ] Criar API route de verificação de prazos (/api/ccr/cron/check-deadlines)
- [ ] Criar API route de envio de notificações (/api/ccr/cron/send-notifications)
- [ ] Configurar cron jobs (vercel.json ou node-cron)
- [ ] Testar automação

### Fase 14: Layout e Sidebar (Prioridade: MÉDIA)
- [ ] Criar layout.tsx do CCR com sidebar customizada
- [ ] Configurar navegação entre módulos
- [ ] Adicionar breadcrumbs em todas as páginas
- [ ] Criar componentes compartilhados de layout

### Fase 15: Refinamentos e Testes (Prioridade: MÉDIA)
- [ ] Adicionar loading states e skeleton loaders
- [ ] Implementar tratamento de erros
- [ ] Adicionar validações de formulários
- [ ] Criar mensagens de toast/feedback
- [ ] Testar fluxos completos
- [ ] Ajustar responsividade
- [ ] Otimizar performance

---

## 9. PRÓXIMOS PASSOS IMEDIATOS

1. **Atualizar schema do Prisma**
   - Adicionar todos os models ao arquivo `prisma/schema.prisma`
   - Executar `npx prisma migrate dev --name add_ccr_system`
   - Executar `npx prisma generate`

2. **Criar estrutura de pastas**
   ```bash
   mkdir -p src/app/(routes)/ccr/{protocolos,setores,membros,assuntos,tramitacoes,recursos,notificacoes}
   mkdir -p src/app/(routes)/ccr/sessoes/{atas,acordaos}
   mkdir -p src/app/api/ccr/{parts,protocols,sectors,members,tramitations,resources,notifications,cron}
   mkdir -p src/app/api/ccr/sessions/{minutes,acordaos}
   mkdir -p src/lib/ccr/{notifications,utils}
   # Criar estrutura de pastas para uploads (ajustar CCR_UPLOAD_DIR conforme .env)
   mkdir -p uploads/ccr/{Recurso,Contrarrazão,Parecer,Voto,Outros}
   ```

3. **Criar arquivo de tipos compartilhados**
   - `src/app/(routes)/ccr/types.ts`
   - Definir interfaces e tipos TypeScript

4. **Implementar Fase 1 completa**
   - Seguir checklist da Fase 1
   - Validar migrations e estrutura

5. **Começar Fase 2 (Protocolos)**
   - Módulo mais simples para validar arquitetura
   - Base para os demais módulos

---

## 10. CONSIDERAÇÕES IMPORTANTES

### Segurança
- Validar permissões em todas as API routes (verificar role)
- Sanitizar inputs de usuário
- Validar tipos de arquivo no upload
- Implementar rate limiting nos endpoints de notificação
- Usar prepared statements (Prisma já faz isso)

### Performance
- Adicionar índices no banco (já incluídos no schema)
- Implementar paginação em todas as listagens
- Usar skeleton loaders para melhor UX
- Otimizar queries com includes seletivos
- Implementar cache quando apropriado

### UX/UI
- Feedback visual para todas as ações (toasts)
- Confirmações para ações destrutivas (modais)
- Loading states claros
- Mensagens de erro amigáveis
- Responsividade mobile
- Dark mode (já suportado pelo sistema)

### Manutenibilidade
- Documentar código complexo
- Manter consistência de nomenclatura
- Reutilizar componentes quando possível
- Separar lógica de negócio da apresentação
- Criar testes unitários (fase futura)

### Backup e Logs
- Implementar logs de ações críticas
- Backup automático do banco de dados
- Logs de erros (já usando console.error)
- Monitoramento de cron jobs

---

## 11. DÚVIDAS E DECISÕES PENDENTES

- [x] Definir exatamente quais setores podem receber tramitações (hardcoded ou dinâmico?) - **RESOLVIDO: Será dinâmico através da tabela Sector com campos name, code, description e isActive**
- [ ] Regras específicas de cálculo de prazos (dias corridos ou úteis? feriados?)
- [ ] Formato exato dos templates de notificação (confirmar com stakeholders)
- [ ] Qual API de WhatsApp será utilizada? (configurar credenciais)
- [ ] Permissões específicas por módulo/ação?
- [ ] Relatórios e exports de dados? (fase futura?)
- [ ] Integração com sistemas legados? (importação de dados?)

---

## 12. RECURSOS ADICIONAIS

### Documentação de Referência
- Next.js App Router: https://nextjs.org/docs/app
- Prisma: https://www.prisma.io/docs
- Shadcn/ui: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com/docs

### Ferramentas Úteis
- Prisma Studio: `npx prisma studio` (visualizar banco de dados)
- TypeScript Compiler: `npx tsc --noEmit` (verificar tipos)
- ESLint: `npm run lint` (verificar código)

---

## 12. 🗺️ ROADMAP DE IMPLEMENTAÇÃO

### Visão Geral
Este roadmap define a ordem recomendada de implementação do sistema CCR, respeitando dependências entre módulos e priorizando funcionalidades críticas.

---

### 📊 FASE 1: FUNDAÇÃO (CRÍTICO - 1-2 dias)
**Objetivo:** Preparar infraestrutura base do sistema

#### 1.1 Schema Prisma e Banco de Dados
- [ ] Copiar schema completo do planejamento para `prisma/schema.prisma`
- [ ] Configurar variável de ambiente `DATABASE_URL` no `.env`
- [ ] Configurar variável `CCR_UPLOAD_DIR` no `.env`
- [ ] Executar `npx prisma migrate dev --name init_ccr_module`
- [ ] Executar `npx prisma generate`
- [ ] Testar conexão: `npx prisma studio`

**Dependências:** Nenhuma
**Bloqueadores:** Sem isso, nada pode ser implementado

#### 1.2 Validação do Schema
- [ ] Verificar todas as relações no Prisma Studio
- [ ] Testar cascade deletes
- [ ] Validar enums criados

**Resultado esperado:** Banco de dados funcional com todas as 29 tabelas CCR_*

---

### 🏗️ FASE 2: ESTRUTURA BASE (1 dia)
**Objetivo:** Criar estrutura de pastas e layout do módulo

#### 2.1 Estrutura de Pastas
```bash
# Executar comandos para criar estrutura completa
mkdir -p src/app/(routes)/ccr/...
# (Ver seção "Comandos para criar estrutura" no planejamento)
```

#### 2.2 Layout e Navegação
- [ ] Implementar `src/app/(routes)/ccr/layout.tsx` com sidebar configurado
- [ ] Testar navegação entre todas as rotas
- [ ] Implementar página dashboard inicial (`src/app/(routes)/ccr/page.tsx`)

#### 2.3 Validação de Rotas
- [ ] Criar páginas placeholder para todas as rotas
- [ ] Testar que todas as rotas estão acessíveis
- [ ] Verificar sidebar funcionando corretamente

**Dependências:** Fase 1 completa
**Resultado esperado:** Estrutura navegável com todas as páginas vazias

---

### ⚙️ FASE 3: MÓDULOS DE CONFIGURAÇÃO (2-3 dias)
**Objetivo:** Implementar CRUDs das entidades base necessárias para outros módulos

**IMPORTANTE:** Estes módulos devem ser implementados PRIMEIRO, pois são dependências de Protocolos e Recursos.

#### 3.1 Módulo de Setores
**Prioridade:** ALTA (necessário para tramitações)

- [ ] API: `src/app/api/ccr/sectors/route.ts` (GET, POST)
- [ ] API: `src/app/api/ccr/sectors/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Page: `src/app/(routes)/ccr/setores/page.tsx` (listagem)
- [ ] Page: `src/app/(routes)/ccr/setores/novo/page.tsx` (criar)
- [ ] Page: `src/app/(routes)/ccr/setores/[id]/page.tsx` (editar)
- [ ] Components:
  - `SectorForm.tsx` (formulário com validação Zod)
  - `SectorTable.tsx` (DataTable com filtros)
  - `SectorActions.tsx` (ativar/desativar setor)
- [ ] Validações: isActive (soft delete), nome único

**Campos:** nome, abbreviation, dispatchCode, phone, email, address, isActive

#### 3.2 Módulo de Membros (Conselheiros)
**Prioridade:** ALTA (necessário para sessões e distribuições)

- [ ] API: `src/app/api/ccr/members/route.ts` (GET, POST)
- [ ] API: `src/app/api/ccr/members/[id]/route.ts` (GET, PUT, DELETE)
- [ ] Page: `src/app/(routes)/ccr/membros/page.tsx`
- [ ] Page: `src/app/(routes)/ccr/membros/novo/page.tsx`
- [ ] Page: `src/app/(routes)/ccr/membros/[id]/page.tsx`
- [ ] Components:
  - `MemberForm.tsx` (incluir campo gender)
  - `MemberTable.tsx`
  - `MemberCard.tsx` (card visual do membro)
- [ ] Validações: CPF único, isActive

**Campos:** name, role, cpf, registration, agency, phone, email, gender, isActive

#### 3.3 Módulo de Assuntos
**Prioridade:** ALTA (necessário para recursos)

- [ ] API: `src/app/api/ccr/subjects/route.ts` (GET, POST)
- [ ] API: `src/app/api/ccr/subjects/[id]/route.ts` (GET, PUT, DELETE)
- [ ] API: `src/app/api/ccr/subjects/tree/route.ts` (árvore hierárquica)
- [ ] Page: `src/app/(routes)/ccr/assuntos/page.tsx`
- [ ] Page: `src/app/(routes)/ccr/assuntos/novo/page.tsx`
- [ ] Page: `src/app/(routes)/ccr/assuntos/[id]/page.tsx`
- [ ] Components:
  - `SubjectForm.tsx` (com seleção de pai)
  - `SubjectTreeView.tsx` (visualização em árvore)
  - `SubjectBreadcrumb.tsx` (caminho hierárquico)
- [ ] Lógica especial:
  - Hierarquia pai-filho (parentId)
  - Impedir ciclos na hierarquia
  - Validar que pai existe antes de criar filho

**Campos:** name, description, parentId, isActive

**Dependências:** Nenhuma
**Resultado esperado:** 3 módulos de configuração funcionais e testados

---

### 📝 FASE 4: MÓDULO DE PROTOCOLOS (3-4 dias)
**Objetivo:** Implementar sistema de protocolo de documentos

**IMPORTANTE:** Este é o ponto de entrada do sistema. Todos os recursos começam como protocolos.

#### 4.1 API de Partes (Parts)
**Prioridade:** CRÍTICA (necessário para protocolo e recurso)

- [ ] API: `src/app/api/ccr/parts/route.ts`
- [ ] API: `src/app/api/ccr/parts/[id]/route.ts`
- [ ] Lógica: CRUD de partes com relacionamento opcional a protocol ou resource
- [ ] Validação: CPF/CNPJ quando fornecido

#### 4.2 Gestão de Contatos
- [ ] Component: `ContactManager.tsx` (gerenciar múltiplos contatos de uma parte)
- [ ] Funcionalidades:
  - Adicionar/remover telefone ou email
  - Marcar contato como principal (isPrimary)
  - Verificar contato (isVerified)

#### 4.3 CRUD de Protocolos
- [ ] API: `src/app/api/ccr/protocols/route.ts` (GET, POST)
- [ ] API: `src/app/api/ccr/protocols/[id]/route.ts` (GET, PUT)
- [ ] API: `src/app/api/ccr/protocols/[id]/parts/route.ts` (gerenciar partes)
- [ ] Page: `src/app/(routes)/ccr/protocolos/page.tsx` (listagem)
- [ ] Page: `src/app/(routes)/ccr/protocolos/novo/page.tsx` (criar)
- [ ] Page: `src/app/(routes)/ccr/protocolos/[id]/page.tsx` (visualizar/editar)
- [ ] Components:
  - `ProtocolForm.tsx`
  - `ProtocolTable.tsx`
  - `PartManager.tsx` (adicionar/editar partes do protocolo)
  - `ProtocolStatusBadge.tsx`

#### 4.4 Lógica de Numeração Automática
- [ ] Implementar geração de número sequencial: `XXX/MM-YYYY`
- [ ] Garantir que `sequenceNumber` é único por mês/ano
- [ ] Transação Prisma para evitar race condition

#### 4.5 Análise de Admissibilidade
- [ ] Component: `AdmissibilityAnalysis.tsx`
- [ ] Funcionalidades:
  - Aprovar como recurso (isAdmittedAsResource = true)
  - Rejeitar com motivo (isAdmittedAsResource = false + rejectionReason)
- [ ] Validação: Apenas protocolos PENDENTES podem ser analisados

#### 4.6 Conversão para Recurso
- [ ] API: `src/app/api/ccr/protocols/[id]/convert-to-resource/route.ts`
- [ ] Lógica:
  - Validar que protocolo foi admitido (isAdmittedAsResource = true)
  - Criar novo Resource com dados do protocolo
  - Copiar partes do protocolo para o recurso
  - Atualizar status do protocolo para CONCLUIDO

**Dependências:** Fase 3 completa
**Resultado esperado:** Sistema completo de protocolo com análise e conversão

---

### 📋 FASE 5: MÓDULO DE RECURSOS (4-5 dias)
**Objetivo:** Implementar gestão de recursos administrativos

#### 5.1 CRUD de Recursos
- [ ] API: `src/app/api/ccr/resources/route.ts` (GET, POST)
- [ ] API: `src/app/api/ccr/resources/[id]/route.ts` (GET, PUT)
- [ ] Page: `src/app/(routes)/ccr/recursos/page.tsx` (listagem com filtros avançados)
- [ ] Page: `src/app/(routes)/ccr/recursos/novo/page.tsx` (criar manual - raro)
- [ ] Page: `src/app/(routes)/ccr/recursos/[id]/page.tsx` (detalhes completos)
- [ ] Components:
  - `ResourceForm.tsx`
  - `ResourceTable.tsx` (com filtros por status, assunto, ano)
  - `ResourceTimeline.tsx` (linha do tempo do recurso)
  - `ResourceStatusBadge.tsx`

#### 5.2 Sistema de Tramitação
- [ ] API: `src/app/api/ccr/tramitations/route.ts`
- [ ] API: `src/app/api/ccr/tramitations/[id]/route.ts`
- [ ] Page: `src/app/(routes)/ccr/tramitacoes/page.tsx` (visão geral de todas)
- [ ] Component: `TramitationManager.tsx` (dentro de recurso)
- [ ] Component: `TramitationForm.tsx`
- [ ] Component: `TramitationTimeline.tsx`
- [ ] Lógica:
  - Registrar data de envio e recebimento
  - Vincular setor de origem e destino
  - Observações e despachos
  - Atualizar status do recurso conforme tramitação

#### 5.3 Upload e Gestão de Documentos
- [ ] API: `src/app/api/ccr/resources/[id]/documents/route.ts`
- [ ] API: `src/app/api/ccr/resources/[id]/documents/[docId]/route.ts`
- [ ] Utils: `src/lib/ccr/file-storage.ts` (conforme planejamento)
- [ ] Component: `DocumentUploader.tsx`
- [ ] Component: `DocumentList.tsx`
- [ ] Funcionalidades:
  - Upload com estrutura: [CCR_UPLOAD_DIR]/[tipo]/[ano]/RV XXXX-YYYY.pdf
  - Tipo VOTO usa ano do julgamento
  - Outros tipos usam ano do protocolo
  - Download de documentos
  - Visualização de PDFs

#### 5.4 Registro de Autoridades
- [ ] Component: `AuthorityManager.tsx` (dentro de recurso)
- [ ] CRUD inline de autoridades vinculadas
- [ ] Campos: entityType, name, period

#### 5.5 Registro de Inscrições/Autuações
- [ ] Component: `RegistrationManager.tsx`
- [ ] Component: `RegistrationValueTable.tsx`
- [ ] Lógica:
  - Adicionar inscrições com código
  - Adicionar valores (principal, multa, juros) por inscrição
  - Cálculo automático de totais

**Dependências:** Fase 4 completa, Fase 3 completa
**Resultado esperado:** Sistema completo de recursos com documentos e tramitações

---

### 📅 FASE 6: MÓDULO DE SESSÕES (5-6 dias)
**Objetivo:** Implementar agendamento e realização de sessões de julgamento

**COMPLEXIDADE:** Este é o módulo mais complexo do sistema, envolvendo votação, julgamento e distribuição.

#### 6.1 CRUD de Sessões
- [ ] API: `src/app/api/ccr/sessions/route.ts`
- [ ] API: `src/app/api/ccr/sessions/[id]/route.ts`
- [ ] Page: `src/app/(routes)/ccr/sessoes/page.tsx` (calendário + listagem)
- [ ] Page: `src/app/(routes)/ccr/sessoes/nova/page.tsx`
- [ ] Page: `src/app/(routes)/ccr/sessoes/[id]/page.tsx` (detalhes da sessão)
- [ ] Components:
  - `SessionForm.tsx` (data, hora, tipo, presidente)
  - `SessionCalendar.tsx` (visualização em calendário)
  - `SessionTable.tsx`
  - `SessionStatusBadge.tsx`

#### 6.2 Pauta da Sessão (Recursos)
- [ ] API: `src/app/api/ccr/sessions/[id]/resources/route.ts`
- [ ] Component: `SessionResourceManager.tsx`
- [ ] Component: `ResourceSelector.tsx` (selecionar recursos para pauta)
- [ ] Funcionalidades:
  - Adicionar recurso à pauta (ordem automática)
  - Remover recurso da pauta
  - Reordenar recursos (drag-and-drop)
  - Visualizar informações do recurso na pauta

#### 6.3 Membros Presentes
- [ ] API: `src/app/api/ccr/sessions/[id]/members/route.ts`
- [ ] Component: `SessionMemberManager.tsx`
- [ ] Funcionalidades:
  - Marcar membros presentes (isPresent)
  - Definir presidente (automático do form da sessão)
  - Registrar justificativas de ausência

#### 6.4 Distribuição de Processos
- [ ] API: `src/app/api/ccr/sessions/[id]/distributions/route.ts`
- [ ] Component: `DistributionManager.tsx`
- [ ] Lógica:
  - Distribuir recurso para relator (membro)
  - Um recurso pode ter múltiplas distribuições em sessões diferentes
  - Registrar se foi redistribuído

#### 6.5 Sistema de Votação e Julgamento
**COMPLEXIDADE ALTA - Seguir fluxo do planejamento**

##### 6.5.1 Votação Preliminar (Opcional, pode haver múltiplas)
- [ ] Component: `PreliminaryVotingForm.tsx`
- [ ] Lógica:
  - Votar questão preliminar (texto livre)
  - Registrar votos de cada membro (SIM/NAO)
  - Calcular resultado (aprovado se maioria SIM)
  - Múltiplas votações preliminares permitidas

##### 6.5.2 Votação de Mérito (Obrigatória, única)
- [ ] Component: `MetricVotingForm.tsx`
- [ ] Lógica:
  - Votar sobre o mérito do recurso
  - Opções: PROVIDO, NEGADO, PARCIALMENTE_PROVIDO, IMPROCEDENTE, etc.
  - Registrar relator (quem apresentou o voto)
  - Registrar voto de cada membro presente
  - Permitir voto de qualidade do presidente (em caso de empate)
  - Calcular decisão vencedora

##### 6.5.3 Registro de Julgamento
- [ ] Component: `JudgmentForm.tsx`
- [ ] Lógica:
  - Apenas UM julgamento por recurso em uma sessão
  - Registrar decisão final (baseado na votação vencedora)
  - Registrar fundamentação
  - Atualizar status do recurso para JULGADO
  - Data do julgamento (createdAt) → usada para ano da pasta VOTO

##### 6.5.4 Upload de Voto
- [ ] Integrar com sistema de documentos
- [ ] Lógica especial: Ano da pasta = ano do julgamento (SessionJudgment.createdAt)
- [ ] Validar que recurso foi julgado antes de permitir upload de voto

**Dependências:** Fase 5 completa, Fase 3 completa
**Resultado esperado:** Sistema completo de sessões com votação e julgamento

---

### 📄 FASE 7: ATAS E ACÓRDÃOS (3-4 dias)
**Objetivo:** Gerar documentos oficiais pós-sessão

#### 7.1 Módulo de Atas
- [ ] API: `src/app/api/ccr/sessions/[id]/minutes/route.ts`
- [ ] Page: `src/app/(routes)/ccr/sessoes/atas/page.tsx` (listagem)
- [ ] Page: `src/app/(routes)/ccr/sessoes/atas/[id]/page.tsx` (visualizar)
- [ ] Components:
  - `MinutesForm.tsx` (gerar ata da sessão)
  - `MinutesPreview.tsx` (preview antes de gerar)
  - `MinutesDocument.tsx` (template da ata)
- [ ] Lógica:
  - Gerar ata automática com dados da sessão
  - Incluir: membros presentes, recursos julgados, votações, decisões
  - Permitir edição de texto livre (additionalText)
  - Registrar ausências justificadas
  - Salvar como PDF (react-pdf ou similar)

#### 7.2 Geração de Acórdãos
- [ ] API: `src/app/api/ccr/resources/[id]/generate-acordao/route.ts`
- [ ] Page: `src/app/(routes)/ccr/sessoes/acordaos/page.tsx` (listagem)
- [ ] Page: `src/app/(routes)/ccr/sessoes/acordaos/[id]/page.tsx` (visualizar)
- [ ] Components:
  - `AcordaoGenerator.tsx`
  - `AcordaoTemplate.tsx` (template oficial)
  - `AcordaoPreview.tsx`
- [ ] Lógica:
  - Gerar acórdão para cada recurso julgado
  - Incluir: ementa, relatório, voto, decisão
  - Usar dados do julgamento e sessão
  - Respeitar concordância de gênero (usar Member.gender)
  - Salvar como PDF

**Dependências:** Fase 6 completa
**Resultado esperado:** Sistema de geração de atas e acórdãos

---

### 📢 FASE 8: COMUNICAÇÃO (2-3 dias)
**Objetivo:** Sistema de notificações e publicações

#### 8.1 Sistema de Notificações
- [ ] API: `src/app/api/ccr/notifications/route.ts`
- [ ] API: `src/app/api/ccr/notifications/[id]/route.ts`
- [ ] API: `src/app/api/ccr/notifications/[id]/send/route.ts`
- [ ] Page: `src/app/(routes)/ccr/notificacoes/page.tsx`
- [ ] Page: `src/app/(routes)/ccr/notificacoes/nova/page.tsx`
- [ ] Page: `src/app/(routes)/ccr/notificacoes/[id]/page.tsx`
- [ ] Components:
  - `NotificationForm.tsx`
  - `NotificationTable.tsx`
  - `NotificationContactsManager.tsx`
  - `NotificationTemplate.tsx`
- [ ] Lógica:
  - Vincular notificação a recurso
  - Vincular notificação a setor
  - Adicionar múltiplos destinatários (email/telefone)
  - Registrar data de envio
  - Marcar como enviado/entregue/lido

#### 8.2 Sistema de Publicações
- [ ] API: `src/app/api/ccr/publications/route.ts`
- [ ] Component: `PublicationManager.tsx` (dentro de recurso)
- [ ] Funcionalidades:
  - Registrar publicação em diário oficial
  - Campos: data, número do diário, páginas, link
  - Histórico de todas as publicações do recurso

**Dependências:** Fase 5 completa
**Resultado esperado:** Sistema de comunicação funcional

---

### 📊 FASE 9: HISTÓRICO E DASHBOARD (2 dias)
**Objetivo:** Rastreabilidade e visualização de dados

#### 9.1 Histórico de Recursos
- [ ] Implementar triggers automáticos para gravar histórico
- [ ] Component: `ResourceHistoryTimeline.tsx`
- [ ] Visualização completa de todas as mudanças

#### 9.2 Dashboard do CCR
- [ ] Page: `src/app/(routes)/ccr/page.tsx` (dashboard principal)
- [ ] Components:
  - `ProtocolsChart.tsx` (protocolos por mês)
  - `ResourcesStatusChart.tsx` (recursos por status)
  - `SessionsCalendar.tsx` (próximas sessões)
  - `TramitationsQueue.tsx` (tramitações pendentes)
  - `RecentActivities.tsx` (atividades recentes)
- [ ] APIs de estatísticas:
  - `/api/ccr/dashboard/stats` (números gerais)
  - `/api/ccr/dashboard/charts` (dados para gráficos)

**Dependências:** Todas as fases anteriores
**Resultado esperado:** Sistema completo com dashboard funcional

---

## 📈 Resumo de Dependências

```
FASE 1 (Fundação)
  ↓
FASE 2 (Estrutura)
  ↓
FASE 3 (Configurações: Setores, Membros, Assuntos)
  ↓
FASE 4 (Protocolos) ──→ depende de FASE 3
  ↓
FASE 5 (Recursos) ──→ depende de FASE 4 + FASE 3
  ↓
FASE 6 (Sessões) ──→ depende de FASE 5 + FASE 3 (Membros)
  ↓
FASE 7 (Atas/Acórdãos) ──→ depende de FASE 6
  ↓
FASE 8 (Comunicação) ──→ depende de FASE 5
  ↓
FASE 9 (Dashboard) ──→ depende de TODAS
```

---

## ⚠️ Pontos Críticos de Atenção

### 1. Transações Prisma
- Numeração de protocolos (evitar duplicação)
- Conversão protocolo → recurso (atomicidade)
- Votação e julgamento (integridade dos dados)

### 2. Validações Importantes
- Protocolo só pode virar recurso se `isAdmittedAsResource = true`
- Recurso só pode ser julgado se estiver em sessão
- VOTO só pode ser feito upload após julgamento
- Não permitir ciclos em hierarquia de assuntos
- Ano da pasta VOTO = ano do julgamento (não do protocolo)

### 3. Performance
- Índices no banco (já definidos no schema)
- Paginação em todas as listagens
- Cache de queries frequentes
- Lazy loading de relacionamentos pesados

### 4. Segurança
- Validação de permissões por módulo
- Upload de arquivos: validar tipo e tamanho
- Sanitização de inputs
- Proteção contra SQL injection (Prisma já protege)

---

## 🎯 Estimativa Total
**Tempo estimado:** 25-35 dias de desenvolvimento
**Complexidade:** Alta
**Módulo mais crítico:** Sessões (votação e julgamento)
**Módulo mais simples:** Configurações (CRUDs básicos)

---

## 13. CHANGELOG

### 2025-01-09 - v2.0 📬 **Reestruturação de Destinatários nas Notificações**
**Alinhamento com Estrutura de Tramitação**
- ✅ **Atualizado**: Modelo `Notification` com nova estrutura de destinatários:
  - ❌ **Removido**: Campo `recipient` (String fixo)
  - ✅ **Adicionado**: `sectorId` (FK para Sector, opcional)
  - ✅ **Adicionado**: `sector` (relacionamento com Sector)
  - ✅ **Adicionado**: `destination` (String?, destino personalizado)
  - ✅ **Adicionado**: Índice em `sectorId`
  - ✅ **Adicionado**: `@@map("CCR_Notification")`
- ✅ **Atualizado**: APIs de notificações:
  - POST: `{ sectorId?, destination?, ... }` com validação de pelo menos um
  - PUT: `{ sectorId?, destination?, ... }` com validação
  - GET: query param `sectorId` adicionado
  - Include `sector` e `resource` em todos os GETs
- ✅ **Atualizado**: Formulário de criação:
  - Campo "Destinatário" agora oferece 2 opções: Setor OU Destino Personalizado
  - Validações para garantir pelo menos uma opção selecionada
- ✅ **Atualizado**: Listagem:
  - Coluna "Destinatário" mostra nome do setor ou destino personalizado
  - Filtro por setor adicionado
- **Justificativa**: Alinhar estrutura de notificações com tramitações, permitindo notificar setores específicos ou destinos personalizados (ex: "Conselheiros", "Partes envolvidas"), sem suporte a membros individuais

### 2025-01-09 - v1.9 📧 **Atualização do NotificationType**
**Redefinição dos Tipos de Notificação**
- ✅ **Atualizado**: Enum `NotificationType` com tipos específicos do sistema:
  - **ADMISSIBILIDADE** (novo) - Notificação sobre análise de admissibilidade
  - ~~PAUTA~~ → **SESSAO** - Notificação sobre sessão de julgamento
  - **DILIGENCIA** (mantido) - Notificação sobre pedido de diligência
  - **DECISAO** (mantido) - Notificação sobre decisão do recurso
  - **OUTRO** (mantido) - Outras notificações
  - ❌ **Removido**: `PRAZO` (não era necessário)
- **Justificativa**: Definir tipos de notificação específicos para os principais eventos do processo de recurso

### 2025-01-09 - v1.8 📞 **Padronização do ContactType**
**Atualização do Enum de Tipo de Contato**
- ✅ **Atualizado**: Enum `ContactType` padronizado para português:
  - ~~PHONE~~ → **TELEFONE**
  - **EMAIL** (mantido)
- ✅ **Atualizado**: Comentário no modelo `Contact`: `type ContactType // TELEFONE ou EMAIL`
- ✅ **Atualizado**: Interface TypeScript: `type: 'TELEFONE' | 'EMAIL'`
- **Justificativa**: Manter consistência com nomenclatura em português dos demais enums

### 2025-01-09 - v1.7 📝 **Atualização do ProtocolStatus**
**Redefinição do Enum de Status de Protocolo**
- ✅ **Atualizado**: Enum `ProtocolStatus` agora possui 3 status bem definidos:
  - ~~ACTIVE~~ → **PENDENTE** (Protocolo criado, aguardando análise/decisão)
  - **CONCLUIDO** (novo) - Recurso foi gerado a partir deste protocolo
  - ~~ARCHIVED~~ → **ARQUIVADO** (Protocolo arquivado sem gerar recurso)
- ✅ **Atualizado**: Status default para `PENDENTE`
- ✅ **Atualizado**: API `/api/ccr/protocols/[id]/admissibility`:
  - Se admitido (`isAdmitted = true`): muda status para **CONCLUIDO**
  - Se não admitido (`isAdmitted = false`): muda status para **ARQUIVADO**
- ✅ **Atualizado**: API `/api/ccr/protocols/[id]/archive` muda status para **ARQUIVADO**
- **Justificativa**: Clarificar o ciclo de vida do protocolo com 3 estados distintos

### 2025-01-09 - v1.6 🔄 **Simplificação do TramitationStatus**
**Atualização do Enum de Status de Tramitação**
- ✅ **Simplificado**: Enum `TramitationStatus` agora possui apenas 2 status:
  - ~~PENDING~~ → **PENDENTE** (Tramitação pendente de entrega/devolução)
  - ~~RETURNED~~ → **ENTREGUE** (Tramitação entregue/devolvida)
  - ❌ **Removido**: `IN_PROGRESS` (não era necessário)
  - ❌ **Removido**: `OVERDUE` (calculado dinamicamente via deadline)
- ✅ **Atualizado**: Status default para `PENDENTE`
- ✅ **Atualizado**: API `/api/ccr/tramitations/[id]/return` agora atualiza status para `ENTREGUE`
- ✅ **Atualizado**: API `/api/ccr/tramitations/overdue` retorna tramitações com `status = PENDENTE`
- **Justificativa**: Simplificar o fluxo de tramitações com apenas 2 estados claros

### 2025-01-09 - v1.5 📋 **Adição de Autoridades Vinculadas**
**Tabela de Autoridades para Recursos**
- ✅ **Adicionado**: Tabela `Authority` para registrar autoridades vinculadas aos recursos
  - `resourceId` (FK para Resource)
  - `type` (enum AuthorityType)
  - `name` (nome da autoridade, obrigatório)
  - `phone` (telefone, opcional)
  - `email` (email, opcional)
  - `observations` (observações, opcional)
- ✅ **Adicionado**: Enum `AuthorityType`:
  - `AUTOR_PROCEDIMENTO_FISCAL` (Autor do procedimento fiscal)
  - `JULGADOR_SINGULAR` (Julgador singular)
  - `COORDENADOR` (Coordenador)
  - `OUTROS` (Outras autoridades)
- ✅ **Adicionado**: Relacionamento no Resource: `authorities Authority[]`
- ✅ **Adicionado**: API `/api/ccr/resource-authorities` (CRUD completo)
- ✅ **Adicionado**: Aba "Autoridades" na página de detalhes do recurso (AuthoritiesTab.tsx)
- ✅ **Renumerado**: Seções de API (4.10 = Autoridades, 4.11 = Notificações, 4.12 = Cron Jobs)
- **Justificativa**: Necessário registrar as autoridades envolvidas no processo de recurso para fins de controle e rastreabilidade

### 2025-01-09 - v1.4 🎯 **VERSÃO FINAL**
**Renomeação de Party para Part e atualização de Roles**
- ✅ **Renomeado**: Tabela `Party` → `Part` (evita confusão com "festa" 😅)
- ✅ **Renomeado**: Enum `PartyRole` → `PartRole`
- ✅ **Atualizado**: Roles do PartRole:
  - ~~CONTRIBUINTE~~ → **REQUERENTE**
  - ~~ADVOGADO~~ → **PATRONO**
  - ~~REPRESENTANTE_LEGAL~~ → **REPRESENTANTE**
  - ~~PROCURADOR~~ (removido)
  - **OUTRO** (mantido)
- ✅ **Renomeados**: Componentes:
  - `PartyManager` → `PartManager`
  - `PartyCard` → `PartCard`
- ✅ **Renomeada**: API `/api/parties` → `/api/ccr/parts`
- ✅ **Atualizado**: FK em Contact de `partyId` → `partId`
- **Estrutura hierárquica** (atualizada):
  ```
  Protocol/Resource
    └─ Part (Requerente, Patrono, Representante, Outro)
        └─ Contact (Telefone, Email)
  ```

### 2025-01-09 - v1.3
**Refatoração para estrutura de Partes → Contatos (modelo jurídico correto)**
- ❌ **Removido**: Tabela `Contact` global com FK direta para `Protocol`/`Resource`
- ✅ **Adicionado**: Tabela `Party` (Partes do processo)
  - `name` (nome da parte)
  - `role` (papel: CONTRIBUINTE, ADVOGADO, REPRESENTANTE_LEGAL, PROCURADOR, OUTRO)
  - `document` (CPF/CNPJ, opcional)
  - `notes` (observações)
  - `protocolId` (FK nullable para Protocol)
  - `resourceId` (FK nullable para Resource)
  - `createdBy` (auditoria)
- ✅ **Adicionado**: Tabela `Contact` vinculada a `Party`
  - `partId` (FK obrigatória para Part)
  - `type` (TELEFONE ou EMAIL)
  - `value` (número ou email)
  - `isPrimary` (contato principal da parte)
  - `isVerified` (contato verificado)
  - `notes` (observações)
  - `createdBy` (auditoria)
- ✅ **Adicionado**: Enum `PartRole` (CONTRIBUINTE, ADVOGADO, REPRESENTANTE_LEGAL, PROCURADOR, OUTRO)
- ✅ **Adicionado**: Componentes:
  - `PartManager` (gerencia partes com seus contatos)
  - `PartCard` (card de exibição de parte)
  - `ContactList` (lista de contatos de uma parte)
- ✅ **Adicionado**: API de partes (`/api/ccr/parts`)
  - GET, POST, PUT, DELETE para partes
  - Gerenciamento de contatos aninhados
- **Estrutura hierárquica**:
  ```
  Protocol/Resource
    └─ Party (Contribuinte, Advogado, etc)
        └─ Contact (Telefone, Email)
  ```
- **Benefícios**:
  - **Modelagem correta** para processos jurídicos
  - Separação clara entre "quem" (parte) e "como contatar" (contato)
  - Cada parte pode ter múltiplos contatos
  - Mesma parte pode estar em múltiplos protocolos/recursos
  - Histórico de partes preservado
  - Facilitação de relatórios (ex: todos os processos do contribuinte X)
  - Escalável para adicionar mais informações das partes (endereço, etc)

### 2025-01-09 - v1.2 ⚠️ **DESCARTADA**
**Tentativa de contatos globais reutilizáveis**
- Descartada em favor do modelo de Partes (v1.3)
- Razão: Não refletia a estrutura jurídica correta de um processo

### 2025-01-09 - v1.1 ⚠️ **DESCARTADA**
**Tentativa de tabela ProtocolContact**
- Descartada em favor do modelo de Partes (v1.3)

### 2025-01-09 - v1.0
- Planejamento inicial completo

---

**Última atualização**: 2025-01-09
**Versão**: 1.4 (FINAL)
**Status**: Planejamento completo com estrutura Partes → Contatos
**Próxima ação**: Atualizar schema Prisma e executar migrations
