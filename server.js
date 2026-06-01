const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/check", async (req, res) => {
  const { imei } = req.body;
  if (!imei) return res.status(400).json({ error: "IMEI obrigatório" });

  const prompt = `Você é um sistema especialista em identificação de iPhones via IMEI.
IMEI: ${imei} | TAC: ${imei.slice(0, 8)}

Retorne SOMENTE JSON válido, sem markdown, sem texto extra:
{
  "modelo": "iPhone [número] [variante completa]",
  "capacidade": "XGB",
  "cor": "cor oficial Apple em português",
  "origem": "XX/X - País (ex: LL/A - EUA, BR/BZ - Brasil, ZP/A - Hong Kong, MY/A - México)",
  "pais_origem": "País",
  "ano_lancamento": "AAAA",
  "sistema": "iOS XX.X",
  "tac": "${imei.slice(0, 8)}",
  "bloqueios": {
    "blacklist": { "status": "limpo", "descricao": "Sem registros negativos" },
    "icloud":    { "status": "limpo", "descricao": "Sem conta vinculada" },
    "operadora": { "status": "desbloqueado", "operadora": null, "descricao": "Livre para qualquer operadora" },
    "mdm":       { "status": "sem MDM", "descricao": "Sem gerenciamento corporativo" },
    "garantia":  { "status": "expirada", "expiracao": "Mês AAAA", "descricao": "Fora de cobertura Apple" },
    "fmi":       { "status": "desativado", "descricao": "Find My desligado" }
  }
}`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`iCheck rodando na porta ${PORT}`));
