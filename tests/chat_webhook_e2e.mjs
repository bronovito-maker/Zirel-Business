import crypto from 'node:crypto';

const DEFAULT_URL = 'https://primary-production-b2af.up.railway.app/webhook/d9e10e54-2d61-4643-98ed-7bbe6221699e/chat';

const scenarios = {
  appointment_happy: {
    tenantId: 'zirel_official',
    messages: [
      'Ciao',
      'Vorrei prenotare una demo',
      'Mi chiamo Mario Rossi',
      'Il mio numero è +39 333 1234567',
      'La mia email è mario@example.com',
      'Vorrei venerdì 20 marzo alle 10:30',
      'Mi interessa capire come funziona Zirèl per un hotel',
      'Confermo',
    ],
  },
  appointment_vague: {
    tenantId: 'zirel_official',
    messages: [
      'Vorrei una demo',
      'Settimana prossima di mattina',
    ],
  },
  restaurant_happy: {
    tenantId: 'chiringuito_gino_001',
    messages: [
      'Ciao, vorrei prenotare un tavolo',
      'Mi chiamo Giulia Bianchi',
      'Il mio numero è +39 348 1234567',
      'Per sabato 21 marzo alle 20:30',
      'Siamo in 4',
      'Se possibile tavolo esterno',
      'Confermo',
    ],
  },
  hotel_happy: {
    tenantId: 'hotel_rivamare_demo_001',
    messages: [
      'Ciao, vorrei prenotare una camera',
      'Mi chiamo Luca Verdi',
      'Il mio numero è +39 349 1234567',
      'La mia email è luca@example.com',
      'Dal 10 luglio al 15 luglio',
      'Siamo 2 adulti e 1 bambino',
      'Vorrei una Deluxe Sea View con parcheggio e colazione',
      'Arrivo serale',
      'Confermo',
    ],
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    scenario: 'appointment_happy',
    url: DEFAULT_URL,
    delayMs: 500,
    tenantId: '',
    sessionId: '',
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--scenario') options.scenario = args[index + 1];
    if (arg === '--url') options.url = args[index + 1];
    if (arg === '--delay') options.delayMs = Number(args[index + 1] || '500');
    if (arg === '--tenant') options.tenantId = args[index + 1];
    if (arg === '--session') options.sessionId = args[index + 1];
  }

  return options;
};

const readResponseText = async (response) => {
  const cloned = response.clone();
  try {
    const data = await response.json();
    if (typeof data === 'string') return data;
    if (Array.isArray(data) && data[0]?.output) return data[0].output;
    if (data?.output) return data.output;
    return JSON.stringify(data);
  } catch {
    return cloned.text();
  }
};

const main = async () => {
  const options = parseArgs();
  const scenario = scenarios[options.scenario];

  if (!scenario) {
    console.error(`Scenario non trovato: ${options.scenario}`);
    console.error(`Disponibili: ${Object.keys(scenarios).join(', ')}`);
    process.exit(1);
  }

  const tenantId = options.tenantId || scenario.tenantId;
  const sessionId = options.sessionId || `${tenantId}__e2e_${Date.now()}`;
  const transcript = [];

  console.log(`Scenario: ${options.scenario}`);
  console.log(`Tenant: ${tenantId}`);
  console.log(`Session: ${sessionId}`);
  console.log(`URL: ${options.url}`);
  console.log('');

  for (const message of scenario.messages) {
    const traceId = crypto.randomUUID();
    const payload = {
      chatInput: message,
      sessionId,
      metadata: {
        tenant_id: tenantId,
        client: 'cli-e2e',
        protocol_version: '1.1',
        trace_id: traceId,
      },
    };

    console.log(`USER > ${message}`);

    const response = await fetch(options.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Zirel-Source': 'cli-e2e',
        'X-Zirel-Timestamp': new Date().toISOString(),
        'X-Zirel-Trace-Id': traceId,
      },
      body: JSON.stringify(payload),
    });

    const text = await readResponseText(response);
    console.log(`BOT  < ${text}`);
    console.log('');

    transcript.push({
      message,
      traceId,
      status: response.status,
      ok: response.ok,
      response: text,
    });

    if (!response.ok) {
      console.error(`Errore HTTP ${response.status}, interrompo lo scenario.`);
      break;
    }

    await sleep(options.delayMs);
  }

  console.log('Transcript JSON:');
  console.log(JSON.stringify({ scenario: options.scenario, tenantId, sessionId, transcript }, null, 2));
};

main().catch((error) => {
  console.error('Test chat fallito:');
  console.error(error);
  process.exit(1);
});
