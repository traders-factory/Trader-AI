import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM = `Eres Trader-AI, un asistente de trading institucional avanzado creado por Traders Factory y Miyagi Trader.

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

export const config = {
  api: {
    bodyParser: { sizeLimit: "10mb" },
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { asset, timeframe, imageBase64, imageType } = req.body;

    if (!asset || !timeframe || !imageBase64) {
      return res.status(400).json({ error: "Faltan datos: activo, temporalidad o imagen" });
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2500,
      system: SYSTEM,
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
            {
              type: "text",
              text: `Analiza este grafico de ${asset.toUpperCase()} en temporalidad de ${timeframe.toUpperCase()}. Dame el analisis completo con los 7 puntos.`,
            },
          ],
        },
      ],
    });

    const text = message.content.find((b) => b.type === "text")?.text || "";

    return res.status(200).json({ analysis: text });
  } catch (err) {
    console.error("Trader-AI error:", err);
    return res.status(500).json({
      error: err.message || "Error generando analisis",
    });
  }
}