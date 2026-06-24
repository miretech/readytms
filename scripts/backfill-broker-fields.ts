/**
 * One-shot backfill: scan existing auto-extracted loads whose broker
 * info was stuffed into the notes field as plain text (old format) and
 * lift the values into the proper broker_name / broker_address /
 * broker_phone / broker_email columns.
 *
 * Run once on the server after `npm run db:push`:
 *   npx tsx scripts/backfill-broker-fields.ts
 *
 * Idempotent — skips loads that already have brokerName set.
 */
import { storage } from "../server/storage";

function parseLine(notes: string, label: string): string | null {
  // Matches lines like: "Broker: ACME Logistics" or "Broker Phone: (555) 123-4567"
  const re = new RegExp(`^${label}:\\s*(.+)$`, "im");
  const m = notes.match(re);
  return m ? m[1].trim() : null;
}

async function main() {
  const loads = await storage.getAllLoads();
  let updated = 0;
  let skipped = 0;
  let untouched = 0;

  for (const load of loads) {
    const anyLoad = load as any;
    if (anyLoad.brokerName) {
      skipped++;
      continue;
    }
    const notes = anyLoad.notes as string | null;
    if (!notes) {
      untouched++;
      continue;
    }
    const brokerName = parseLine(notes, "Broker");
    const brokerAddress = parseLine(notes, "Broker Address");
    const brokerPhone = parseLine(notes, "Broker Phone");
    const brokerEmail = parseLine(notes, "Broker Email");
    if (!brokerName && !brokerAddress && !brokerPhone && !brokerEmail) {
      untouched++;
      continue;
    }
    await storage.updateLoad(anyLoad.id, {
      brokerName: brokerName ?? undefined,
      brokerAddress: brokerAddress ?? undefined,
      brokerPhone: brokerPhone ?? undefined,
      brokerEmail: brokerEmail ?? undefined,
    } as any);
    updated++;
    console.log(`✓ ${anyLoad.loadNumber}: ${brokerName ?? "(no name)"}`);
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped} (already had broker), untouched ${untouched} (no broker info in notes).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
