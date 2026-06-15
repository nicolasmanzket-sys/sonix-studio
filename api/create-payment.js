// ===========================================================
// /api/create-payment.js
// Cria um pagamento no Mercado Pago usando Checkout Bricks.
// O Access Token é usado SOMENTE aqui, no backend (Vercel Function).
// ===========================================================

const { MercadoPagoConfig, Payment } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

module.exports = async (req, res) => {
  // Aceita apenas POST
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const { product, customer, utms, paymentData } = req.body;

    if (!product || !customer || !paymentData) {
      return res.status(400).json({ error: "Dados incompletos para criar o pagamento." });
    }

    const {
      token,
      issuer_id,
      payment_method_id,
      installments,
      payer
    } = paymentData;

    // Monta o payload do pagamento
    const body = {
      transaction_amount: Number(product.price),
      description: `${product.name} - SoniX Studios`,
      payment_method_id,
      token,
      issuer_id,
      installments: installments || 1,
      payer: {
        email: (payer && payer.email) || customer.email,
        first_name: customer.name,
        identification: payer && payer.identification ? payer.identification : undefined
      },
      // URL para receber notificações de status (webhook)
      notification_url: `${process.env.SITE_URL}/api/webhook`,
      metadata: {
        product_id: product.id,
        product_name: product.name,
        customer_name: customer.name,
        customer_whatsapp: customer.whatsapp,
        customer_email: customer.email,
        ...utms
      }
    };

    const payment = new Payment(client);
    const result = await payment.create({ body });

    return res.status(200).json({
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
      payment_method_id: result.payment_method_id,
      // Dados extras úteis para Pix (QR code), se aplicável
      point_of_interaction: result.point_of_interaction || null
    });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    return res.status(500).json({
      error: "Erro ao processar pagamento.",
      details: error.message || error
    });
  }
};
