const puppeteer = require('puppeteer');
const express = require('express');
require('dotenv').config();
const fs = require('fs').promises;

const steamIds = ['76561198112048366', '76561198107664446', '76561198127888167', '76561198191772670', '76561198218622723', '76561199110088832'];
const resultados = {};

async function robo(steamId) {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0');

  const qualquerUrl = `https://csstats.gg/player/${steamId}`;
  await page.goto(qualquerUrl);

  const resultado = await page.evaluate((steamId) => {
    let cs2Rank = document.querySelector('#cs2-rank');
    let cs2Rating = cs2Rank.querySelector('.cs2rating');
    let spanElement = cs2Rating.querySelector('span');

    return {
      steamId,
      rank: spanElement.textContent.trim(),
    };
  }, steamId);

  resultados[steamId] = {
    steamId: steamId,
    rank: resultado.rank,
  };

  await browser.close();
}

async function processarSteamIds() {
  for (const steamId of steamIds) {
    await robo(steamId);
  }

  // Salvar os resultados em um arquivo JSON
  const jsonResultados = JSON.stringify(resultados, null, 2);
  await fs.writeFile('resultado.json', jsonResultados);
}

const app = express();

app.get('/resultado', async (req, res) => {
  await processarSteamIds();

  // Ler o arquivo e enviar como resposta
  const fileContents = await fs.readFile('resultado.json', 'utf-8');
  res.json(JSON.parse(fileContents));
});

// Inicia o servidor Express na porta 3000 (ou na porta definida pela variável de ambiente PORT)
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
