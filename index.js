const puppeteer = require('puppeteer');
const express = require('express');
require('dotenv').config();

const app = express();
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

const user = process.env.PORTAL_USER;
const password = process.env.PORTAL_PASSWORD;

async function signIn(page) {
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

async function getPortal() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1024 });
  await page.goto('https://www1.ufrgs.br/sistemas/portal/', { waitUntil: 'networkidle0' });
  await signIn(page);

  return { browser, page };
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}

app.get('/', async (req, res) => {
  const { browser, page } = await getPortal();

  const selectElement = await page.$('#selecionado');
  const cursos = await selectElement.$$eval('option', (options) =>
    options.slice(1).map((option) => ({ id: option.value, name: option.textContent.trim() }))
  );

  res.send({ cursos });
  await browser.close();
});

app.get('/:id', async (req, res) => {
  const { browser, page } = await getPortal();

  // select curso and período letivo
  await page.select('#selecionado', req.params.id);
  await page.waitForSelector('select[name="PL"]');
  const plOptions = await page.$$('select[name="PL"] option');
  if (plOptions.length > 0) {
    const firstOptionValue = await (await plOptions[0].getProperty('value')).jsonValue();
    await page.select('select[name="PL"]', firstOptionValue);
  }
  await page.waitForNavigation({ waitUntil: 'networkidle0' });

  // get information from table
  const table = await page.$('#Horarios tbody');
  const rowElements = await table.$$('tr');
  const cadeiras = [];
  let cadeira;
  for (const rowElement of rowElements.slice(1)) {
    const tds = await rowElement.$$('td');

    // proccess horarios
    let horarios = await tds[8].$$eval('li', (items) => items.map((item) => item.textContent.trim()));
    if (horarios[0] === 'Horário não definido.') {
      horarios = null;
    } else {
      horarios = horarios.map((item) => {
        const [dia, horario] = item.split(' ');
        return { dia, horario };
      });
    }

    // proccess professores
    let professores = await tds[9].$$eval('li', (items) => items.map((item) => item.textContent.trim()));
    if (professores[0] === 'Professor não definido.') {
      professores = null;
    } else {
      professores = professores.map((item) => {
        return {
          nome: item.split('-')[0].trim(),
          regente: item.includes('Regente'),
          ministrante: item.includes('Ministrante'),
          responsavel_conceito: item.includes('Responsável conceito'),
        };
      });
    }

    // assemble cadeira and turma
    const turma = {
      turma: (await (await tds[2].getProperty('textContent')).jsonValue()).trim(),
      vagas_veteranos: parseInt((await (await tds[3].getProperty('textContent')).jsonValue()).trim(), 10),
      vagas_calouros: parseInt((await (await tds[4].getProperty('textContent')).jsonValue()).trim(), 10),
      horarios,
      professores,
    };
    const cadeiraName = (await (await tds[0].getProperty('textContent')).jsonValue()).trim();
    if (cadeiraName) {
      if (cadeira) {
        cadeiras.push(cadeira);
      }
      cadeira = {
        name: cadeiraName,
        creditos: parseInt((await (await tds[1].getProperty('textContent')).jsonValue()).trim(), 10),
        turmas: [turma],
      };
    } else {
      cadeira.turmas.push(turma);
    }
  }

  await res.send(cadeiras);
  await browser.close();
});
