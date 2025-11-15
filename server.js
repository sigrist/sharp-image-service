import express from "express";
import sharp from "sharp";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

// Configuração via variáveis de ambiente
const TEMPLATES_DIR = process.env.TEMPLATES_DIR || "./templates";
const PORT = process.env.PORT || 3000;

// Função para carregar configuração do template
const loadTemplateConfig = (templateName) => {
  const configPath = path.join(TEMPLATES_DIR, templateName.replace(".svg", ".json"));

  if (!fs.existsSync(configPath)) {
    return null;
  }

  const configContent = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(configContent);
};

// Função para processar logo (URL ou base64 data URI)
const loadLogoSource = async (source) => {
  // Detecta se é data URI (base64)
  if (source.startsWith("data:image/")) {
    // Extrai o base64 após a vírgula
    const base64Data = source.split(",")[1];
    return Buffer.from(base64Data, "base64");
  }

  // Caso contrário, trata como URL
  const response = await fetch(source);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer);
};

// Função para baixar e redimensionar logos
const loadAndResizeLogo = async (source, width, height) => {
  const buffer = await loadLogoSource(source);
  return sharp(buffer)
    .resize(width, height)
    .png()
    .toBuffer();
};

app.post("/generate", async (req, res) => {
  const { template, ...variables } = req.body;

  try {
    // Caminho completo do template
    const templatePath = path.join(TEMPLATES_DIR, template);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template não encontrado.");
    }

    // Carrega configuração do template
    const config = loadTemplateConfig(template);

    if (!config) {
      return res.status(404).send("Configuração do template não encontrada.");
    }

    // Carrega o SVG do template como string
    let templateSVG = fs.readFileSync(templatePath, "utf-8");

    // Normaliza as chaves do payload para uppercase (exceto logos)
    const normalizedVariables = {};
    for (const [key, value] of Object.entries(variables)) {
      const isLogo = config.logos.some(logo => logo.name === key);
      if (!isLogo) {
        normalizedVariables[key.toUpperCase()] = value;
      }
    }

    // Substitui as variáveis dinamicamente no template
    // Primeiro aplica os defaults da config, depois sobrescreve com valores do payload
    const allVariables = { ...config.defaultVariables, ...normalizedVariables };

    for (const [key, value] of Object.entries(allVariables)) {
      const placeholder = `{{${key}}}`;
      templateSVG = templateSVG.replaceAll(placeholder, value);
    }

    // Processa os logos dinamicamente baseado na config
    const logoBuffers = [];
    for (const logoConfig of config.logos) {
      const logoSource = variables[logoConfig.name];

      if (logoSource) {
        const logoBuffer = await loadAndResizeLogo(
          logoSource,
          logoConfig.width,
          logoConfig.height
        );

        logoBuffers.push({
          input: logoBuffer,
          top: logoConfig.top,
          left: logoConfig.left
        });
      }
    }

    // Renderiza o SVG como imagem base
    const base = sharp(Buffer.from(templateSVG)).png();

    // Composita os logos dinamicamente
    const finalImage = await base
      .composite(logoBuffers)
      .toBuffer();

    res.set("Content-Type", "image/png");
    res.send(finalImage);

  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao gerar imagem");
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));

