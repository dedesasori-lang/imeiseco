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

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Você é um sistema especialista em identificação de iPhones via IMEI.
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
}`
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = (data.content || []).map(b => b.text || "").join("");
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`iCheck rodando na porta ${PORT}`));
