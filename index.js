const { MongoClient } = require('mongodb');
const puppeteer = require('puppeteer');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function connectDB() {
  await client.connect(uri);
  const db = await client.db('db');
  await db.command({ ping: 1 });
  console.log('✓ Conectado ao MongoDB');

  return db;
}

async function signIn(page) {
  const user = process.env.PORTAL_USER;
  const password = process.env.PORTAL_PASSWORD;

  if (user === undefined || password === undefined) {
    throw new Error('Please set PORTAL_USER and PORTAL_PASSWORD environment variables');
  }

  await page.type('#usuario', user);
  await page.type('#senha', password);
  await page.click('input[name="login"]', { waitUntil: 'networkidle0' });
  await page.goto('https://www1.ufrgs.br/intranet/portal/public/index.php?cods=1,1,1,224', {
    waitUntil: 'networkidle0',
  });
}

async function accessPortal() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1024 });
  await page.goto('https://www1.ufrgs.br/sistemas/portal/', { waitUntil: 'networkidle0' });
  console.log('✓ Portal acessado');

  await signIn(page);
  console.log('✓ Autenticado');

  return { browser, page };
}

async function getCursos(page) {
  let cursos = [];
  const selectElement = await page.$('#selecionado');
  cursos = await selectElement.$$eval('option', (options) =>
    options.slice(1).map((option) => ({ _id: option.value, nome: option.textContent.trim() }))
  );

  return cursos;
}

async function getCadeiras(page, id) {
  try {
    await page.click('text=[alterar]');
  } catch (error) {}

  await page.waitForSelector('#selecionado');
  await page.select('#selecionado', id);
  await page.waitForSelector('select[name="PL"]');
  const firstOptionValue = await page.evaluate(() => {
    const options = document.querySelectorAll('select[name="PL"] option');
    return options.length > 0 ? options[0].value : null;
  });

  if (firstOptionValue) {
    await page.select('select[name="PL"]', firstOptionValue);
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  const pElementContent = await page.evaluate(() => {
    const pElement = document.querySelector('p');
    return pElement ? pElement.textContent : '';
  });

  if (pElementContent.includes('Não há nenhuma turma programada')) {
    return null;
  }

  return page.evaluate(() => {
    const table = document.querySelector('#Horarios tbody');
    if (!table) return [];

    const cadeiras = [];
    let cadeira = null;

    const rows = table.querySelectorAll('tr');
    for (const row of Array.from(rows).slice(1)) {
      const tds = Array.from(row.cells);

      const horarios = Array.from(tds[8].querySelectorAll('li')).map((el) => el.textContent.trim());
      const professores = Array.from(tds[9].querySelectorAll('li')).map((el) => el.textContent.trim());

      const turma = {
        turma: tds[2].textContent.trim(),
        vagas_veteranos: parseInt(tds[3].textContent.trim(), 10),
        vagas_calouros: parseInt(tds[4].textContent.trim(), 10),
        horarios:
          horarios[0] === 'Horário não definido.'
            ? null
            : horarios.map((item) => {
                const [dia, horario] = item.split(' ');
                return { dia, horario };
              }),
        professores:
          professores[0] === 'Professor não definido.'
            ? null
            : professores.map((item) => {
                const parts = item.split('-');
                return {
                  nome: parts[0].trim(),
                  regente: item.includes('Regente'),
                  ministrante: item.includes('Ministrante'),
                  responsavel_conceito: item.includes('Responsável conceito'),
                };
              }),
      };

      const cadeiraName = tds[0].textContent.trim();
      if (cadeiraName) {
        if (cadeira) {
          cadeiras.push(cadeira);
        }
        cadeira = {
          name: cadeiraName,
          creditos: parseInt(tds[1].textContent.trim(), 10),
          turmas: [turma],
        };
      } else if (cadeira) {
        cadeira.turmas.push(turma);
      }
    }

    if (cadeira) {
      cadeiras.push(cadeira);
    }

    return cadeiras;
  });
}

async function main() {
  const { browser, page } = await accessPortal();

  try {
    const db = await connectDB();
    await db.dropDatabase();

    const cursos = await getCursos(page);
    const cursosLength = cursos.length;
    await db.collection('cursos').insertMany(cursos);
    console.log('✓ Cursos obtidos');

    let counter = 0;
    for (const curso of cursos) {
      const cadeiras = await getCadeiras(page, curso._id);
      const object = { _id: curso._id, cadeiras };
      await db.collection('cadeiras').insertOne(object);
      console.log(`✓ ${curso.nome} (${++counter}/${cursosLength})`);
    }
    console.log('✓ Todas cadeiras inseridas');
  } catch (error) {
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }

    await client.close();
    console.log('✓ Navegador e banco de dados encerrados');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
