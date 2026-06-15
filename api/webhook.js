// ===========================================================
// /api/webhook.js
// Recebe notificações (webhooks) do Mercado Pago.
// Consulta o pagamento pelo ID e verifica se foi aprovado.
// ===========================================================

const { MercadoPagoConfig, Payment } = require("mercadopago");

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN
});

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  try {
    const { type, data, action } = req.body;

    // O Mercado Pago envia notificações de diferentes tipos (payment, merchant_order, etc.)
    // Aqui tratamos apenas notificações de pagamento.
    const paymentId =
      (data && data.id) ||
      (req.query && req.query["data.id"]) ||
      null;

    const isPaymentEvent =
      type === "payment" || (action && action.startsWith("payment"));

    if (!isPaymentEvent || !paymentId) {
      // Confirma o recebimento mesmo que não seja um evento de pagamento
      return res.status(200).json({ received: true });
    }

    // Consulta o pagamento pelo ID para confirmar o status real
    const payment = new Payment(client);
    const result = await payment.get({ id: paymentId });

    if (result.status === "approved") {
      // ===================================================
      // TODO: Pagamento aprovado!
      // Aqui futuramente você pode:
      // 1. Salvar o pedido em um banco de dados (ex: Supabase, MongoDB, etc.)
      // 2. Enviar os dados para uma planilha (ex: Google Sheets via API)
      // 3. Disparar o evento "Purchase" via API de Conversões do Meta
      //    usando os dados em result.metadata (product_id, customer_email,
      //    utms, etc.) e result.transaction_amount
      // ===================================================

      console.log("Pagamento aprovado:", {
        id: result.id,
        amount: result.transaction_amount,
        metadata: result.metadata
      });
    } else {
      console.log(`Pagamento ${paymentId} com status: ${result.status}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    // Retorna 200 para evitar reenvios excessivos do Mercado Pago,
    // mas registra o erro para investigação.
    return res.status(200).json({ received: true, error: true });
  }
};
