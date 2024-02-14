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
  const rows = [];
  for (const rowElement of rowElements) {
    const tds = await rowElement.$$eval('td', (tds) => tds.map((td) => td.textContent.trim()));
    rows.push(tds);
  }

  // assemble cadeiras' objects
  const cadeiras = [];
  let cadeira;
  for (const row of rows.slice(1)) {
    const turma = {
      turma: row[2],
      vagas_veteranos: row[3],
      vagas_calouros: row[4],
      horarios: row[8] === 'Horário não definido.' ? null : row[8].replace(/\"|2\\n/g, '').split(' '),
      professores: row[9] === 'Professor não definido.' ? null : row[9].split(' '),
    };
    if (row[0]) {
      if (cadeira) {
        cadeiras.push(cadeira);
      }
      cadeira = {
        name: row[0],
        creditos: row[1],
        turmas: [turma],
      };
    } else {
      cadeira.turmas.push(turma);
    }
  }

  await res.send(cadeiras);
  await browser.close();
});
