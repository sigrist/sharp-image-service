import express from "express";
import sharp from "sharp";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const app = express();
app.use(express.json());

app.post("/generate", async (req, res) => {
  const {
    template,
    logo1,
    logo2,
    data,
    hora,
    titulo,
    estadio,
    time1Cor1,
    time1Cor2,
    time2Cor1,
    time2Cor2
  } = req.body;

  try {
    // Caminho completo do template
    const templatePath = path.join("templates", template);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).send("Template não encontrado.");
    }

    // Carrega o SVG do template como string
    let templateSVG = fs.readFileSync(templatePath, "utf-8");

    // Substitui as variáveis no template (usando replaceAll para múltiplas ocorrências)
    templateSVG = templateSVG
      .replaceAll("{{TITULO}}", titulo || "PARTIDA DE FUTEBOL")
      .replaceAll("{{DATA}}", data || "DATA")
      .replaceAll("{{HORA}}", hora || "HORA")
      .replaceAll("{{ESTADIO}}", estadio || "ESTÁDIO")
      .replaceAll("{{TIME1_COR1}}", time1Cor1 || "#0A0F2D")
      .replaceAll("{{TIME1_COR2}}", time1Cor2 || "#1A4870")
      .replaceAll("{{TIME2_COR1}}", time2Cor1 || "#8B0000")
      .replaceAll("{{TIME2_COR2}}", time2Cor2 || "#DC143C");

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
    const base = sharp(Buffer.from(templateSVG)).png();

    // Coords fixas iguais ao seu layout
    const finalImage = await base
      .composite([
        { input: logo1Buffer, top: 220, left: 150 },
        { input: logo2Buffer, top: 220, left: 750 },
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

