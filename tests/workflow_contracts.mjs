import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = '/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(`${root}/${relativePath}`, 'utf8'));

const getNode = (workflow, name) => {
  const node = workflow.nodes.find((item) => item.name === name);
  assert(node, `Nodo mancante: ${name}`);
  return node;
};

const runCodeNode = (workflow, name, json, getter = () => ({ item: { json: {} } })) => {
  const code = getNode(workflow, name).parameters.jsCode;
  const fn = new Function('$json', '$', 'items', `${code}`);
  return fn(json, getter, [{ json }]);
};

const aiCore = readJson('Zirèl - AI Core.json');
const appointment = readJson('Zirèl - Registra_Appuntamento.json');
const restaurant = readJson('Zirèl - Registra_Prenotazione.json');
const hotel = readJson('Zirèl - Registra_Prenotazione_Hotel.json');
const notifications = readJson('Zirèl - Notifiche Hotel.json');

for (const [label, workflow] of Object.entries({ aiCore, appointment, restaurant, hotel, notifications })) {
  assert.doesNotThrow(() => JSON.stringify(workflow), `Workflow ${label} non serializzabile`);
  assert.ok(Array.isArray(workflow.nodes) && workflow.nodes.length > 0, `Workflow ${label} senza nodi`);
}

for (const toolName of ['Registra_Appuntamento', 'Registra_Prenotazione', 'Registra_Prenotazione_Hotel']) {
  const value = getNode(aiCore, toolName).parameters.workflowInputs.value;
  assert.ok(value.trace_id, `${toolName} deve ricevere trace_id`);
  assert.ok(value.session_id, `${toolName} deve ricevere session_id`);
  assert.ok(value.source, `${toolName} deve ricevere source`);
}

const normalizedAppointment = runCodeNode(appointment, 'Normalize Appointment Request1', {
  tenant_id: 'zirel_official',
  business_type: 'professional',
  appointment_type: 'demo_request',
  nome: 'mario rossi',
  telefono: '+39 333 1234567',
  email: 'MARIO@EXAMPLE.COM ',
  data_input: '2026-03-20',
  orario: '10.30',
  motivo: 'Demo prodotto',
  note: 'Lead caldo',
})[0].json;

assert.equal(normalizedAppointment.validation_code, '');
assert.equal(normalizedAppointment.nome, 'Mario Rossi');
assert.equal(normalizedAppointment.email, 'mario@example.com');
assert.equal(normalizedAppointment.orario, '10:30');
assert.equal(normalizedAppointment.data_appuntamento, '2026-03-20');
assert.ok(normalizedAppointment.trace_id);
assert.ok(normalizedAppointment.session_id);

const vagueAppointment = runCodeNode(appointment, 'Normalize Appointment Request1', {
  tenant_id: 'zirel_official',
  business_type: 'professional',
  appointment_type: 'demo_request',
  nome: 'mario',
  telefono: '+39 333 1234567',
  email: 'mario@example.com',
  data_input: 'settimana prossima',
  orario: 'mattina',
  motivo: 'Demo',
})[0].json;

assert.equal(vagueAppointment.validation_code, 'NEED_EXACT_SLOT');

const appointmentOutbox = runCodeNode(appointment, 'Build Notification Outbox Rows1', {
}, (name) => {
  if (name === 'Normalize Availability Response1') {
    return {
      item: {
        json: {
          tenant_id: 'zirel_official',
          trace_id: 'trace-1',
          session_id: 'session-1',
          business_type: 'professional',
          appointment_type: 'demo_request',
          nome: 'Mario Rossi',
          telefono: '+39 333 1234567',
          email: 'mario@example.com',
          motivo: 'Demo',
          note: 'Lead caldo',
          data_appuntamento: '2026-03-20',
          data_appuntamento_label: 'venerdi 20 marzo 2026',
          orario: '10:30',
          business_status: 'confirmed',
          reference: null,
        },
      },
    };
  }
  if (name === 'Create a row1') {
    return { item: { json: { id: 'appt-1' } } };
  }
  return { item: { json: {} } };
});

assert.equal(appointmentOutbox.length, 2);
assert.deepEqual(appointmentOutbox.map((item) => item.json.channel).sort(), ['email_guest_appointment', 'telegram_internal_appointment']);
assert.ok(appointmentOutbox.every((item) => item.json.trace_id === 'trace-1'));
assert.ok(appointmentOutbox.every((item) => item.json.dedupe_key));

const normalizedRestaurant = runCodeNode(restaurant, 'Normalize Reservation Request1', {
  tenant_id: 'ristorante_demo',
  business_type: 'restaurant',
  nome_cliente: 'giulia bianchi',
  telefono: '+39 348 0000000',
  data_input: '2026-04-11',
  ora: '20',
  persone: '4',
  note_prenotazione: 'allergia glutine',
})[0].json;

assert.equal(normalizedRestaurant.validation_code, '');
assert.equal(normalizedRestaurant.ora, '20:00');
assert.equal(normalizedRestaurant.nome_cliente, 'Giulia Bianchi');

const groupRestaurant = runCodeNode(restaurant, 'Normalize Reservation Request1', {
  tenant_id: 'ristorante_demo',
  business_type: 'restaurant',
  nome_cliente: 'gruppo',
  telefono: '+39 348 0000000',
  data_input: '2026-04-11',
  ora: '20:00',
  persone: '12',
})[0].json;

assert.equal(groupRestaurant.validation_code, 'GROUP_REQUIRES_MANUAL_HANDLING');

const restaurantOutbox = runCodeNode(restaurant, 'Build Notification Outbox Rows1', {
}, (name) => {
  if (name === 'Normalize Availability Response1') {
    return {
      item: {
        json: {
          tenant_id: 'ristorante_demo',
          trace_id: 'trace-r',
          session_id: 'session-r',
          business_type: 'restaurant',
          nome_cliente: 'Giulia Bianchi',
          telefono: '+39 348 0000000',
          data_prenotazione: '2026-04-11',
          data_prenotazione_label: 'sabato 11 aprile 2026',
          ora: '20:00',
          persone: 4,
          note_prenotazione: 'allergia glutine',
          business_status: 'manual_review',
          reference: null,
        },
      },
    };
  }
  if (name === 'Create a row') {
    return { item: { json: { id: 'booking-1' } } };
  }
  return { item: { json: {} } };
});

assert.equal(restaurantOutbox.length, 2);
assert.deepEqual(restaurantOutbox.map((item) => item.json.channel).sort(), ['email_guest_restaurant', 'telegram_internal_restaurant']);
assert.ok(restaurantOutbox.every((item) => item.json.trace_id === 'trace-r'));
assert.ok(restaurantOutbox.every((item) => item.json.dedupe_key));

const normalizedHotel = runCodeNode(hotel, 'Normalize & Validate Booking Data', {
  tenant_id: 'hotel_demo',
  business_type: 'hotel',
  nome: 'Luca Verdi',
  telefono: '+39 349 1111111',
  email: 'LUCA@EXAMPLE.COM',
  checkin_input: '2026-07-10',
  checkout_input: '2026-07-15',
  ospiti_adulti: '2',
  ospiti_bambini: '1',
  room_type_requested: 'Deluxe',
  servizi_richiesti: 'SPA',
})[0].json;

assert.equal(normalizedHotel.is_valid_payload, true);
assert.equal(normalizedHotel.email, 'luca@example.com');
assert.equal(normalizedHotel.ospiti_bambini, 1);
assert.ok(normalizedHotel.trace_id);

const hotelOutbox = runCodeNode(hotel, 'Build Notification Outbox Rows', {
}, (name) => {
  if (name === 'Normalize Adapter Response') {
    return {
      item: {
        json: {
          tenant_id: 'hotel_demo',
          trace_id: 'trace-h',
          session_id: 'session-h',
          nome_attivita: 'Hotel Demo',
          booking_status: 'manual_review',
          availability_status: 'manual_review',
          nome: 'Luca Verdi',
          telefono: '+39 349 1111111',
          email: 'luca@example.com',
          checkin_date: '2026-07-10',
          checkout_date: '2026-07-15',
          ospiti_adulti: 2,
          ospiti_bambini: 1,
          room_type_requested: 'Deluxe',
          payment_required: false,
          payment_url: null,
          booking_reference: null,
        },
      },
    };
  }
  if (name === 'Create Hotel Booking Row') {
    return { item: { json: { id: 'hotel-booking-1' } } };
  }
  return { item: { json: {} } };
});

assert.equal(hotelOutbox.length, 2);
assert.deepEqual(hotelOutbox.map((item) => item.json.channel).sort(), ['email_guest_hotel', 'telegram_internal_hotel']);
assert.ok(hotelOutbox.every((item) => item.json.trace_id === 'trace-h'));
assert.ok(hotelOutbox.every((item) => item.json.dedupe_key));

const notificationChannels = notifications.nodes
  .filter((node) => node.name === 'If Email Channel?' || node.name === 'If Telegram Channel?')
  .map((node) => JSON.stringify(node.parameters));
assert.ok(notificationChannels.some((value) => value.includes('startsWith(\\"email_\\")')));
assert.ok(notificationChannels.some((value) => value.includes('startsWith(\\"telegram_\\")')));

const dashboardTypes = fs.readFileSync(`${root}/dashboard/src/types/index.ts`, 'utf8');
assert.ok(dashboardTypes.includes('stripe_customer_id?: string;'));
assert.ok(dashboardTypes.includes('stripe_customer_portal_url?: string;'));

const dashboardComponent = fs.readFileSync(`${root}/dashboard/src/components/Dashboard.tsx`, 'utf8');
assert.ok(dashboardComponent.includes('Billing SaaS'));
assert.ok(dashboardComponent.includes('stripe_checkout_url'));
assert.ok(dashboardComponent.includes('stripe_customer_portal_url'));

console.log('Workflow contract checks passed.');
