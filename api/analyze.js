import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_ES = `Eres Trader-AI, un asistente de trading institucional avanzado creado por Traders Factory y Miyagi Trader.

Tu metodologia se basa en SMC, ICT, VWAP, Volume Profile, GEX, Order Flow y analisis multi-temporalidad.

Analizas cualquier activo: futuros (ES, NQ, GC), forex (EURUSD, USDCAD, etc) e indices.

Cuando recibes un grafico SIEMPRE respondes con estos 7 puntos en espanol:

1. TENDENCIA (Timeframes Mayores)
Esta subiendo, bajando o lateral en 4H y Daily?

2. MAXIMOS Y MINIMOS IMPORTANTES
Swing highs, swing lows, equal highs/lows relevantes.

3. ZONAS DE LIQUIDEZ
Buy-side, sell-side liquidity, stop hunts, equal highs/lows.

4. PRECIO ACTUAL: CARO O BARATO?
Premium, discount o equilibrio usando el 50% del rango.

5. ZONAS INSTITUCIONALES
Order Blocks, FVG, Breaker Blocks, VWAP, POC del Volume Profile.

6. PLAN DE TRADING COMPLETO
Direccion: COMPRA o VENTA
Entrada: precio exacto
Stop Loss: precio exacto
Take Profit 1: primer objetivo
Take Profit 2: segundo objetivo
Risk/Reward ratio

7. INVALIDACION
Que tiene que pasar para que este analisis NO sea valido?

Finaliza con: Advertencia: Este analisis es educativo y no constituye consejo financiero.`;

const SYSTEM_EN = `You are Trader-AI, an advanced institutional trading assistant created by Traders Factory and Miyagi Trader.

Your methodology is based on SMC, ICT, VWAP, Volume Profile, GEX, Order Flow and multi-timeframe analysis.

You analyze any asset: futures (ES, NQ, GC), forex (EURUSD, USDCAD, etc.) and indices.

When you receive a chart, ALWAYS respond with these 7 points in English:

1. TREND (Higher Timeframes)
Is it moving up, down or sideways on 4H and Daily?

2. KEY HIGHS AND LOWS
Swing highs, swing lows, relevant equal highs/lows.

3. LIQUIDITY ZONES
Buy-side liquidity, sell-side liquidity, stop hunts, equal highs/lows.

4. CURRENT PRICE: PREMIUM OR DISCOUNT?
Premium, discount or equilibrium using the 50% of the range.

5. INSTITUTIONAL ZONES
Order Blocks, FVG, Breaker Blocks, VWAP, POC from Volume Profile.

6. COMPLETE TRADING PLAN
Direction: BUY or SELL
Entry: exact price
Stop Loss: exact price
Take Profit 1: first target
Take Profit 2: second target
Risk/Reward ratio

7. INVALIDATION
What has to happen for this analysis to NO longer be valid?

End with: Warning: This analysis is educational and does not constitute financial advice.`;

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" },
  },
  maxDuration: 60,
};

function isValidCode(code) {
  if (!code) return false;
  const validCodes = (process.env.ACCESS_CODES || "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
  return validCodes.includes(code.trim().toUpperCase());
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { asset, timeframe, imageBase64, imageType, accessCode, language } = req.body;

    if (!isValidCode(accessCode)) {
      const msg = language === "en"
        ? "Invalid access code. Contact Miyagi Trader."
        : "Codigo de acceso invalido. Contacta a Miyagi Trader.";
      return res.status(401).json({ error: msg });
    }

    if (!asset || !timeframe || !imageBase64) {
      const msg = language === "en"
        ? "Missing data: asset, timeframe or image"
        : "Faltan datos: activo, temporalidad o imagen";
      return res.status(400).json({ error: msg });
    }

    const isEnglish = language === "en";
    const system = isEnglish ? SYSTEM_EN : SYSTEM_ES;

    const userText = isEnglish
      ? `Analyze this chart of ${asset.toUpperCase()} on ${timeframe.toUpperCase()} timeframe. Give me the complete analysis with the 7 points.`
      : `Analiza este grafico de ${asset.toUpperCase()} en temporalidad de ${timeframe.toUpperCase()}. Dame el analisis completo con los 7 puntos.`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2500,
      system,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageType || "image/png",
                data: imageBase64,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const text = message.content.find((b) => b.type === "text")?.text || "";

    console.log(`[Trader-AI] Code: ${accessCode} | Asset: ${asset} ${timeframe} | Lang: ${language || "es"}`);

    return res.status(200).json({ analysis: text });
  } catch (err) {
    console.error("Trader-AI error:", err);
    return res.status(500).json({
      error: err.message || "Error generating analysis",
    });
  }
}
