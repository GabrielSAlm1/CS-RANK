const puppeteer = require('puppeteer');
const express = require('express');
require('dotenv').config();

const steamIds = ['76561198112048366', '76561198107664446', '76561198127888167', '76561198191772670', '76561198218622723', '76561199110088832'];
let resultados = {};
let intervalId = null;

process.setMaxListeners(20);

async function iniciarCiclo() {
  try {
    await processarSteamIds();
    intervalId = setInterval(async () => {
      try {
        // Limpar resultados antigos para evitar crescimento indefinido
        resultados = {};
        await processarSteamIds();
      } catch (error) {
        console.error('Erro no ciclo:', error);
      }
    }, 30000);
  } catch (error) {
    console.error('Erro ao iniciar ciclo:', error);
  }
}

async function processarSteamIds() {
  try {
    // Reutilizar o mesmo navegador
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

    for (const steamId of steamIds) {
      await robo(steamId, browser);
      await esperar(5000);
    }

    await browser.close(); // Fechar o navegador após o processamento
    console.log("Processamento concluído.");
  } catch (error) {
    console.error('Erro ao processar Steam IDs:', error);
  }
}

async function robo(steamId, browser) {
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0');

  const qualquerUrl = `https://csstats.gg/player/${steamId}`;
  try {
    const response = await page.goto(qualquerUrl, { waitUntil: 'domcontentloaded' });

    if (!response || response.status() !== 200) {
      console.error(`Erro ao processar ${steamId}: Falha na navegação.`);
      return;
    }

    const resultado = await page.evaluate((steamId) => {
      let cs2Rating2 = document.querySelector('.rank');
      let spanElement = cs2Rating2.querySelector('span');

      return {
        steamId,
        rank: spanElement.textContent.trim(),
      };
    }, steamId);

    resultados[steamId] = {
      steamId,
      rank: resultado.rank,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error(`Erro ao processar ${steamId}: ${error}`);
  } finally {
    await page.close();
  }
}

async function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const app = express();

app.get('/', async (req, res) => {
  res.send("Ta funcionando!!!!");
});

app.get('/resultado', async (req, res) => {
  try {
    if (!resultados) {
      await processarSteamIds();
    }

    res.json(resultados);
  } catch (error) {
    console.error(error);
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

iniciarCiclo();
