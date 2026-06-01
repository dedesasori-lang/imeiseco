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

  const tac = imei.slice(0, 8);

  // Step 1: busca modelo real pelo TAC na API gratuita
  let modeloReal = null;
  let marcaReal = null;
  try {
    const tacRes = await fetch(`https://alpha.imeicheck.com/api/modelBrandName?imei=${imei}&format=json`);
    const tacData = await tacRes.json();
    if (tacData && tacData.name) {
      modeloReal = tacData.name;
      marcaReal  = tacData.brand || "Apple";
    }
  } catch (_) {}

  // Step 2: monta prompt com modelo real ou pede pra IA identificar
  const modeloInstrucao = modeloReal
    ? `O modelo EXATO deste IMEI é: "${modeloReal}". Use EXATAMENTE este nome, sem alterar.`
    : `Identifique o modelo pelo TAC ${tac}. Seja preciso.`;

  const prompt = `Você é um sistema especialista em iPhones.
IMEI: ${imei} | TAC: ${tac}
${modeloInstrucao}

Retorne SOMENTE JSON válido, sem markdown:
{
  "modelo": "${modeloReal || "iPhone [identifique pelo TAC]"}",
  "capacidade": "capacidade mais comum deste modelo",
  "cor": "cor oficial Apple em português",
  "origem": "XX/X - País (ex: LL/A - EUA, BR/BZ - Brasil, ZP/A - Hong Kong)",
  "pais_origem": "País",
  "ano_lancamento": "AAAA",
  "sistema": "iOS mais recente compatível",
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
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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

    const groqData = await groqRes.json();
    if (groqData.error) return res.status(500).json({ error: groqData.error.message });

    const raw  = groqData.choices?.[0]?.message?.content || "";
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());

    // Força modelo real se conseguiu da API
    if (modeloReal) json.modelo = modeloReal;

    res.json(json);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`iCheck rodando na porta ${PORT}`));
