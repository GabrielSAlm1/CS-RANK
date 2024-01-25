const puppeteer = require('puppeteer');
const express = require('express');
require('dotenv').config();

const steamIds = ['76561198112048366', '76561198107664446', '76561198127888167', '76561198191772670', '76561198218622723', '76561199110088832'];
let resultados = null; // Armazena os resultados globalmente

async function robo(steamId) {
  const browser = await puppeteer.launch({
    headless: 'new',
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
  try {
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
  } catch (error) {
    console.error(`Erro ao processar ${steamId}: ${error}`);
  } finally {
    // Fechar a página, mas não o navegador, para que seja possível processar outras Steam IDs
    await page.close();
  }
}

async function processarSteamIds() {
  resultados = {}; // Inicializa os resultados antes de começar o processamento
  for (const steamId of steamIds) {
    await robo(steamId);
    await esperar(5000);
  }
}

async function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const app = express();

app.get('/', async (req, res) => {
  res.send("Ta funcionando!!!");
});

app.get('/resultado', async (req, res) => {
  try {
    if (!resultados) {
      // Se os resultados não foram processados, ou seja, a primeira vez que alguém acessa /resultado
      await processarSteamIds();
    }

    // Envia os resultados como resposta JSON
    res.json(resultados);
  } catch (error) {
    console.error(error);
  }
});

// Inicia o servidor Express na porta 3000 (ou na porta definida pela variável de ambiente PORT)
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
