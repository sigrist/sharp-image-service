import express from "express";
import sharp from "sharp";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

app.post("/generate", async (req, res) => {
  const { template, logo1, logo2, data, hora } = req.body;

  try {
    // Caminho completo do template
    const templatePath = path.join("templates", template);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template não encontrado.");
    }

    // Carrega o SVG do template
    const templateSVG = fs.readFileSync(templatePath);

    // --- Função para baixar e redimensionar logos ---
    const loadAndResize = async (url) => {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      return sharp(Buffer.from(buffer))
        .resize(300, 300) // <- TAMANHO FORÇADO
        .png()
        .toBuffer();
    };

    const logo1Buffer = await loadAndResize(logo1);
    const logo2Buffer = await loadAndResize(logo2);

    // Renderiza o SVG como imagem base
    const base = sharp(templateSVG).png();

    // Coords fixas iguais ao seu layout
    const finalImage = await base
      .composite([
        { input: logo1Buffer, top: 200, left: 150 },
        { input: logo2Buffer, top: 200, left: 750 },

        // DATA via SVG sobreposto
        {
          input: Buffer.from(`
            <svg width="1200" height="200">
              <text x="450" y="150" font-size="80" fill="white"
                font-family="Arial, Helvetica, sans-serif">
                ${data}
              </text>
            </svg>
          `),
          top: 900,
          left: 0,
        },

        // HORA via SVG sobreposto
        {
          input: Buffer.from(`
            <svg width="1200" height="200">
              <text x="1000" y="150" font-size="80" fill="white"
                font-family="Arial, Helvetica, sans-serif">
                ${hora}
              </text>
            </svg>
          `),
          top: 900,
          left: 0,
        },
      ])
      .toBuffer();

    res.set("Content-Type", "image/png");
    res.send(finalImage);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao gerar imagem");
  }
});

app.listen(3000, () => console.log("API rodando na porta 3000"));

