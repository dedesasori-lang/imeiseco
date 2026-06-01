const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// TAC database - principais modelos iPhone
const TAC_DB = {
  // iPhone 16 series
  "35672024": { modelo: "iPhone 16 Pro Max", capacidade: "256GB" },
  "35672124": { modelo: "iPhone 16 Pro", capacidade: "128GB" },
  "35283024": { modelo: "iPhone 16 Plus", capacidade: "128GB" },
  "35283124": { modelo: "iPhone 16", capacidade: "128GB" },
  // iPhone 15 series
  "35424024": { modelo: "iPhone 15 Pro Max", capacidade: "256GB" },
  "35424124": { modelo: "iPhone 15 Pro", capacidade: "128GB" },
  "35355624": { modelo: "iPhone 15 Plus", capacidade: "128GB" },
  "35355724": { modelo: "iPhone 15", capacidade: "128GB" },
  // iPhone 14 series
  "35319524": { modelo: "iPhone 14 Pro Max", capacidade: "128GB" },
  "35319624": { modelo: "iPhone 14 Pro", capacidade: "128GB" },
  "35213524": { modelo: "iPhone 14 Plus", capacidade: "128GB" },
  "35213624": { modelo: "iPhone 14", capacidade: "128GB" },
  // iPhone 13 series
  "35270724": { modelo: "iPhone 13 Pro Max", capacidade: "128GB" },
  "35270824": { modelo: "iPhone 13 Pro", capacidade: "128GB" },
  "35270924": { modelo: "iPhone 13 mini", capacidade: "128GB" },
  "35271024": { modelo: "iPhone 13", capacidade: "128GB" },
  "35271124": { modelo: "iPhone 13", capacidade: "128GB" },
  "35316524": { modelo: "iPhone 13 Pro Max", capacidade: "256GB" },
  "35316624": { modelo: "iPhone 13 Pro", capacidade: "256GB" },
  // iPhone 12 series
  "35229911": { modelo: "iPhone 12 Pro Max", capacidade: "128GB" },
  "35229811": { modelo: "iPhone 12 Pro", capacidade: "128GB" },
  "35228011": { modelo: "iPhone 12 mini", capacidade: "64GB" },
  "35228111": { modelo: "iPhone 12", capacidade: "64GB" },
  "35228211": { modelo: "iPhone 12", capacidade: "128GB" },
  "35228311": { modelo: "iPhone 12 Pro", capacidade: "256GB" },
  "35229711": { modelo: "iPhone 12 Pro Max", capacidade: "256GB" },
  "35399011": { modelo: "iPhone 12", capacidade: "64GB" },
  "35399111": { modelo: "iPhone 12 mini", capacidade: "128GB" },
  "35241011": { modelo: "iPhone 12 Pro Max", capacidade: "512GB" },
  // iPhone 11 series
  "35291908": { modelo: "iPhone 11 Pro Max", capacidade: "64GB" },
  "35291808": { modelo: "iPhone 11 Pro", capacidade: "64GB" },
  "35292008": { modelo: "iPhone 11", capacidade: "64GB" },
  "35292108": { modelo: "iPhone 11", capacidade: "128GB" },
  "35292208": { modelo: "iPhone 11 Pro", capacidade: "256GB" },
  "35292308": { modelo: "iPhone 11 Pro Max", capacidade: "256GB" },
  // iPhone XS/XR
  "35270408": { modelo: "iPhone XS Max", capacidade: "64GB" },
  "35270508": { modelo: "iPhone XS", capacidade: "64GB" },
  "35270608": { modelo: "iPhone XR", capacidade: "64GB" },
  // iPhone X
  "35299708": { modelo: "iPhone X", capacidade: "64GB" },
  "35299808": { modelo: "iPhone X", capacidade: "256GB" },
  // iPhone 8
  "35326507": { modelo: "iPhone 8 Plus", capacidade: "64GB" },
  "35326407": { modelo: "iPhone 8", capacidade: "64GB" },
};

function findTacInfo(imei) {
  const tac = imei.slice(0, 8);
  // exact match
  if (TAC_DB[tac]) return { ...TAC_DB[tac], tac };
  // prefix match (6 digits)
  const prefix6 = imei.slice(0, 6);
  for (const [key, val] of Object.entries(TAC_DB)) {
    if (key.startsWith(prefix6)) return { ...val, tac };
  }
  return null;
}

app.post("/api/check", async (req, res) => {
  const { imei } = req.body;
  if (!imei) return res.status(400).json({ error: "IMEI obrigatório" });

  const tac = imei.slice(0, 8);
  const tacHint = findTacInfo(imei);
  const modeloHint = tacHint
    ? `O TAC ${tac} corresponde a um ${tacHint.modelo}. Use EXATAMENTE este modelo.`
    : `O TAC ${tac} não está na base local. Identifique o modelo correto baseado no TAC.`;

  const prompt = `Você é um sistema especialista em identificação de iPhones via IMEI.
IMEI: ${imei}
TAC (8 primeiros dígitos): ${tac}

IMPORTANTE: ${modeloHint}
NÃO invente nem troque o modelo. Use o modelo exato indicado acima.

Retorne SOMENTE JSON válido, sem markdown, sem texto extra:
{
  "modelo": "${tacHint ? tacHint.modelo : "iPhone [identifique pelo TAC " + tac + "]"}",
  "capacidade": "${tacHint ? tacHint.capacidade : "XGB"}",
  "cor": "cor oficial Apple em português (ex: Preto Meia-Noite, Branco Estelar, Azul, Vermelho)",
  "origem": "XX/X - País (ex: LL/A - EUA, BR/BZ - Brasil, ZP/A - Hong Kong)",
  "pais_origem": "País",
  "ano_lancamento": "AAAA",
  "sistema": "iOS mais recente compatível com este modelo",
  "tac": "${tac}",
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
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.choices?.[0]?.message?.content || "";
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // force correct model from TAC DB if we have it
    if (tacHint) {
      json.modelo = tacHint.modelo;
      json.capacidade = tacHint.capacidade;
    }

    res.json(json);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`iCheck rodando na porta ${PORT}`));
