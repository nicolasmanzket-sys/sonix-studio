// ===========================================================
// /api/check-payment.js
// Consulta o status de um pagamento pelo ID (usado no polling do Pix).
// Access Token usado apenas no backend via process.env.MP_ACCESS_TOKEN.
// ===========================================================

const { MercadoPagoConfig, Payment } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método não permitido. Use GET." });
  }

  try {
    const { payment_id } = req.query;

    if (!payment_id) {
      return res.status(400).json({ error: "payment_id obrigatório" });
    }

    const payment = new Payment(client);
    const paymentInfo = await payment.get({ id: payment_id });

    return res.status(200).json({
      id: paymentInfo.id,
      status: paymentInfo.status,
      status_detail: paymentInfo.status_detail
    });
  } catch (error) {
    console.error("Erro ao consultar pagamento:", error);
    return res.status(500).json({
      error: "Erro ao consultar pagamento",
      details: error.message
    });
  }
};
