import { readFile, writeFile } from 'node:fs/promises';

const replacements = [
  // 1. API Keys & Emails
  {
    from: 'Apikey eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InBpbmNpYUBnbWFpbC5jb20iLCJleHAiOjQ5MTM3MDI0MzIsImp0aSI6ImI3NzBiMGUwLWRkOWItNDU3MC1iNGRmLWMzOTIwZjA5YWYxYiJ9.56Ot8Xfl-a-67rCWF4JSyKl_BkfzHCn-UY2cfh4iCds',
    to: 'Apikey INSERISCI_TUA_API_KEY_QUI'
  },
  {
    from: 'pincia@gmail.com',
    to: 'template@concessionaria.it'
  },
  // 2. Websites and Form placeholders
  {
    from: 'https://www.gruppofr.it/auto/usate/...',
    to: 'https://www.concessionaria.it/auto/usate/...'
  },
  {
    from: 'www.gruppofr.it',
    to: 'www.concessionaria.it'
  },
  {
    from: 'Gruppo FR',
    to: 'Concessionaria Auto'
  },
  {
    from: 'GruppoFR',
    to: 'ConcessionariaAuto'
  },
  {
    from: 'Frcar - Gruppo Fr',
    to: 'Concessionaria Auto'
  },
  {
    from: 'Simcar - Gruppo Fr',
    to: 'Concessionaria Auto'
  },
  // 3. Dropdown option Accounts
  { from: 'FrCar', to: 'Account_Social_1' },
  { from: 'Simcar-Fiat', to: 'Account_Social_2' },
  { from: 'Simcar-Kia', to: 'Account_Social_3' },
  { from: 'Simcar-Aixam', to: 'Account_Social_4' },
  { from: 'Simcar-Foton-Emc', to: 'Account_Social_5' },
  { from: 'test_niki', to: 'Account_Test' },
  // 4. Dropdown option Locations / Keys
  {
    from: 'FrCar - Sesta Godano (Mitsubishi, Ram, Horsetruck)',
    to: 'Sede Principale - Roma'
  },
  {
    from: 'Simcar - Corso Nazionale (Abarth, Fiat, Lancia)',
    to: 'Sede Secondaria - Milano'
  },
  {
    from: 'Simcar - Via O.T.O. (Kia, Aixam, Foton, Emc)',
    to: 'Sede Terziaria - Torino'
  },
  {
    from: 'Simcar - Santo Stefano SP (Spoticar, Stellantis, PSA, FCA)',
    to: 'Sede Quaternaria - Bologna'
  },
  {
    from: 'Test Niki - Fabrizio Pezzoli (Genova)',
    to: 'Sede Test'
  },
  // 5. Specific text mappings (emails, phones, addresses) - single quotes removed/replaced to avoid JSON escape errors
  { from: 'info@frcar.it', to: 'roma@concessionaria.it' },
  { from: 'info@simcarsrl.it', to: 'milano@concessionaria.it' },
  { from: 'viaoto@simcarsrl.it', to: 'torino@concessionaria.it' },
  { from: 's.stefano@simcarsrl.it', to: 'bologna@concessionaria.it' },
  { from: '0187891330', to: '0612345678' },
  { from: '0187 523152', to: '0212345678' },
  { from: '0187 501113', to: '01112345678' },
  { from: '0187 630170', to: '05112345678' },
  { from: 'Sesta Godano, Via Roma 203, La Spezia', to: 'Via Flaminia 123, Roma' },
  { from: 'Corso Nazionale, 588, 19124 La Spezia', to: 'Via Montenapoleone 45, Milano' },
  { from: 'Via Privata O.T.O., 16 - 19136 La Spezia', to: 'Corso Vittorio Emanuele 16, Torino' },
  { from: 'Via Pescinati, 19037 Santo Stefano di magra SP', to: 'Via dell Indipendenza 84, Bologna' },
  // 6. Test Niki - Fabrizio Pezzoli details
  { from: 'Fabrizio Pezzoli Fotografia, Web design, Marketing', to: 'Studio Digitale - Servizio Foto & Video' },
  { from: 'Fabrizio Pezzoli', to: 'Studio Digitale' },
  { from: 'Via Giorgio Chiesa, 9/7, 16147 Genova GE, Italia', to: 'Via Garibaldi 12, Genova' },
  // 7. Conditional logic replacements
  { from: 'Sesta Godano', to: 'Roma' },
  { from: 'Corso Nazionale', to: 'Milano' },
  { from: 'Via O.T.O.', to: 'Torino' },
  { from: 'Santo Stefano', to: 'Bologna' },
  { from: 'Test Niki', to: 'Test' },
  // 8. Location IDs
  { from: 'locations/9888727903729786590', to: 'locations/1111111111111111111' },
  { from: 'locations/1615696832702837779', to: 'locations/2222222222222222221' },
  { from: 'locations/11354917662958242076', to: 'locations/2222222222222222222' },
  { from: 'locations/4293467683166556271', to: 'locations/2222222222222222223' },
  { from: 'locations/18373794305068304360', to: 'locations/3333333333333333331' },
  { from: 'locations/9020057640082122467', to: 'locations/3333333333333333332' },
  { from: 'locations/12999599493813975639', to: 'locations/4444444444444444444' },
  { from: 'locations/3992028418107803345', to: 'locations/5555555555555555555' },
  // 9. Brand details cleanup
  { from: 'Mitsubishi, Ram Trucks, Auto multimarca', to: 'Auto Nuove e Usate Multimarca' },
  { from: 'Carrosserie Ameline Horsetruck', to: 'Allestimenti Speciali' },
  { from: 'Abarth, Fiat, Lancia', to: 'Gamma Veicoli' },
  { from: 'Kia Aixam Foton Emc', to: 'Gamma City Car e SUV' },
  { from: 'Spoticar Auto Km0 Gruppo Stellantis', to: 'Auto Km0 e Usato Garantito' },
  { from: 'FCA (Fiat, Abarth, Lancia, Jeep, Chrysler)', to: 'Gamma City Car' },
  { from: 'PSA (Peugeot, Citroen, DS e Opel)', to: 'Gamma Crossover e SUV' },
  { from: '(Mitsubishi, Ram, Horsetruck)', to: '(Auto Nuove e Usate)' },
  { from: '(Abarth, Fiat, Lancia)', to: '(City Car)' },
  { from: '(Kia, Aixam, Foton, Emc)', to: '(City Car e SUV)' },
  { from: '(Spoticar, Stellantis, PSA, FCA)', to: '(Usato e Km0)' }
];

async function run() {
  for (const filename of ['template-social-foto.json', 'template-social-video.json']) {
    const filePath = `demo/public/workflows/${filename}`;
    let content = await readFile(filePath, 'utf8');

    for (const r of replacements) {
      content = content.replaceAll(r.from, r.to);
    }

    await writeFile(filePath, content, 'utf8');
    console.log(`Sanitized ${filename}`);
  }
}

run().catch(console.error);
