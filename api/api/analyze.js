import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { activo, temporalidad, imageBase64, imageMediaType } = req.body;

    if (!activo || !temporalidad || !imageBase64) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const prompt = `Tengo este gráfico de ${activo} en temporalidad de ${temporalidad}. Necesito que me ayudes con lo siguiente:

1. ¿Cuál es la tendencia en timeframes mayores? (4H y Daily) ¿Está subiendo, bajando o lateral?
2. ¿Dónde están los máximos y mínimos importantes que debería tener en cuenta?
3. ¿Hay zonas de liquidez (donde hay muchos stops acumulados) donde el precio podría ir a buscar?
4. ¿El precio actual está caro o barato dentro del rango?
5. ¿Hay alguna zona institucional importante donde el precio podría reaccionar?
6. Dame un plan de trading completo: ¿Debería COMPRAR o VENDER? ¿A qué precio entrar? ¿Dónde poner el Stop Loss? ¿Dónde tomar ganancias? (dame 2 objetivos) ¿Cuánto puedo ganar vs cuánto arriesgo?
7. ¿Qué tendría que pasar para que este análisis ya no sea válido?

Responde en español, formato claro con secciones numeradas, estilo institucional SMC/ICT.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType || "image/png",
                data: imageBase64,
              },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    return res.status(200).json({
      analysis: response.content[0].text,
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: error.message || "Error procesando análisis",
    });
  }
}