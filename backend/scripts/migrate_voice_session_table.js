import { prisma } from '../src/prisma.js';

async function migrate() {
  console.log('Ensuring VoiceDiscoverySession table exists in PostgreSQL...');
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "public"."VoiceDiscoverySession" (
        "id" TEXT NOT NULL,
        "workspaceId" TEXT,
        "userId" TEXT,
        "channel" TEXT NOT NULL DEFAULT 'VOICE',
        "provider" TEXT NOT NULL DEFAULT 'TWILIO',
        "twilioCallSid" TEXT NOT NULL,
        "callerPhone" TEXT,
        "recipientPhone" TEXT,
        "status" TEXT NOT NULL DEFAULT 'INITIATED',
        "language" TEXT NOT NULL DEFAULT 'auto',
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "connectedAt" TIMESTAMP(3),
        "endedAt" TIMESTAMP(3),
        "durationSeconds" INTEGER,
        "callData" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "VoiceDiscoverySession_pkey" PRIMARY KEY ("id")
      );
    `);
    console.log('✓ Table "VoiceDiscoverySession" created / verified.');

    // Create unique index on twilioCallSid
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "VoiceDiscoverySession_twilioCallSid_key" 
      ON "public"."VoiceDiscoverySession"("twilioCallSid");
    `);
    console.log('✓ Unique index on twilioCallSid verified.');

    // Create foreign keys if workspace exists
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'VoiceDiscoverySession_workspaceId_fkey'
        ) THEN
          ALTER TABLE "public"."VoiceDiscoverySession"
          ADD CONSTRAINT "VoiceDiscoverySession_workspaceId_fkey"
          FOREIGN KEY ("workspaceId") REFERENCES "public"."Workspace"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'VoiceDiscoverySession_userId_fkey'
        ) THEN
          ALTER TABLE "public"."VoiceDiscoverySession"
          ADD CONSTRAINT "VoiceDiscoverySession_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "public"."User"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // Create standard indices
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VoiceDiscoverySession_workspaceId_createdAt_idx" 
      ON "public"."VoiceDiscoverySession"("workspaceId", "createdAt");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VoiceDiscoverySession_status_idx" 
      ON "public"."VoiceDiscoverySession"("status");
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "VoiceDiscoverySession_callerPhone_idx" 
      ON "public"."VoiceDiscoverySession"("callerPhone");
    `);

    console.log('✓ All indices and constraints successfully established.');
  } catch (err) {
    console.error('Migration execution error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
