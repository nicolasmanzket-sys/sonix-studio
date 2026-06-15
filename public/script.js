// ===========================================================
// SoniX Studios - script.js
// Lógica do site: produtos, UTMs, pixel e Checkout Bricks (MP)
// ===========================================================

// ===== CATÁLOGO DE PRODUTOS =====
const products = [
  {
    id: "musica",
    name: "Música Personalizada",
    price: 19.99,
    description: "Uma música exclusiva criada com os detalhes da sua história."
  },
  {
    id: "foto_ia",
    name: "Foto com IA",
    price: 10.90,
    description: "Uma imagem personalizada feita com inteligência artificial."
  },
  {
    id: "cartao_digital",
    name: "Cartão Digital",
    price: 10.90,
    description: "Um cartão bonito e personalizado para enviar em datas especiais."
  },
  {
    id: "video_fotos",
    name: "Vídeo com Fotos",
    price: 29.90,
    description: "Um vídeo emocionante com fotos, frases e estilo de homenagem."
  },
  {
    id: "correio_eletronico",
    name: "Correio Eletrônico",
    price: 9.97,
    description: "Uma mensagem digital personalizada para surpreender alguém especial."
  },
  {
    id: "album_5",
    name: "Álbum de Foto com 5 Fotos",
    price: 29.99,
    description: "Pacote com 5 imagens personalizadas criadas com IA."
  },
  {
    id: "album_15",
    name: "Álbum de Foto com 15 Fotos",
    price: 69.99,
    description: "Pacote completo com 15 imagens personalizadas."
  },
  {
    id: "pacote_presente",
    name: "Pacote Presente Completo",
    price: 35.90,
    description: "Inclui música personalizada, foto com IA e correio eletrônico."
  },
  {
    id: "convite",
    name: "Convite Digital Personalizado",
    price: 14.99,
    description: "Convite digital personalizado para aniversário, casamento ou evento especial."
  }
];

// ===== ESTADO GLOBAL =====
let selectedProduct = null;
let paymentBrickController = null;

// ===== MERCADO PAGO SDK =====
const mp = new MercadoPago("APP_USR-9f709671-8b91-456d-a776-133e0a3667bf", {
  locale: "pt-BR"
});

// ===========================================================
// UTMs
// ===========================================================

// Captura UTMs da URL e salva no localStorage
function captureUTMs() {
  const params = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  const utms = {};
  let hasUTM = false;

  utmKeys.forEach((key) => {
    const value = params.get(key);
    if (value) {
      utms[key] = value;
      hasUTM = true;
    }
  });

  if (hasUTM) {
    localStorage.setItem("sonix_utms", JSON.stringify(utms));
  }

  return getStoredUTMs();
}

// Retorna as UTMs salvas no localStorage (ou objeto vazio)
function getStoredUTMs() {
  try {
    const stored = localStorage.getItem("sonix_utms");
    return stored ? JSON.parse(stored) : {};
  } catch (e) {
    return {};
  }
}

// ===========================================================
// SELEÇÃO DE PRODUTO
// ===========================================================

function formatPrice(value) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function selectProduct(id, name, price) {
  selectedProduct = { id, name, price: Number(price) };

  // Atualiza o resumo do checkout
  document.getElementById("selectedProductName").textContent = name;
  document.getElementById("selectedProductPrice").textContent = formatPrice(selectedProduct.price);

  // Limpa mensagens anteriores
  const msgEl = document.getElementById("checkoutMessage");
  if (msgEl) {
    msgEl.textContent = "";
    msgEl.className = "checkout-message";
  }

  // Rola até a seção de checkout
  document.getElementById("checkout-section").scrollIntoView({ behavior: "smooth" });

  // Dispara InitiateCheckout (Meta Pixel), se disponível
  if (typeof fbq === "function") {
    fbq("track", "InitiateCheckout", {
      content_ids: [id],
      content_name: name,
      value: selectedProduct.price,
      currency: "BRL"
    });
  }
}

// ===========================================================
// PAYMENT BRICK (Checkout Bricks - Mercado Pago)
// ===========================================================

async function renderPaymentBrick() {
  if (!selectedProduct) {
    showCheckoutMessage("Selecione um produto antes de gerar o pagamento.", "error");
    return;
  }

  const name = document.getElementById("customerName").value.trim();
  const whatsapp = document.getElementById("customerWhatsapp").value.trim();
  const email = document.getElementById("customerEmail").value.trim();

  if (!name || !whatsapp || !email) {
    showCheckoutMessage("Preencha nome, WhatsApp e e-mail para continuar.", "error");
    return;
  }

  // Desmonta um Brick anterior, se existir
  if (paymentBrickController) {
    paymentBrickController.unmount();
    paymentBrickController = null;
  }

  const startBtn = document.getElementById("startPaymentButton");
  startBtn.disabled = true;
  showCheckoutMessage("Carregando formas de pagamento...", "");

  const bricksBuilder = mp.bricks();

  const settings = {
    initialization: {
      amount: selectedProduct.price
    },
    customization: {
      paymentMethods: {
        bankTransfer: "all", // Pix
        creditCard: "all",
        debitCard: "all",
        ticket: [] // boleto desabilitado
      }
    },
    callbacks: {
      onReady: () => {
        showCheckoutMessage("", "");
        startBtn.disabled = false;
      },
      onSubmit: ({ selectedPaymentMethod, formData }) => {
        return new Promise((resolve, reject) => {
          showCheckoutMessage("Processando pagamento...", "");

          const payload = {
            product: selectedProduct,
            customer: {
              name,
              whatsapp,
              email
            },
            utms: getStoredUTMs(),
            paymentData: formData
          };

          fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
            .then((response) => response.json())
            .then((data) => {
              handlePaymentResult(data, formData);
              resolve();
            })
            .catch((error) => {
              console.error("Erro ao processar pagamento:", error);
              showCheckoutMessage("Não foi possível processar o pagamento. Tente novamente.", "error");
              reject();
            });
        });
      },
      onError: (error) => {
        console.error("Erro no Payment Brick:", error);
        showCheckoutMessage("Ocorreu um erro ao carregar o pagamento. Tente novamente.", "error");
        startBtn.disabled = false;
      }
    }
  };

  try {
    paymentBrickController = await bricksBuilder.create(
      "payment",
      "paymentBrick_container",
      settings
    );
  } catch (error) {
    console.error("Erro ao criar Payment Brick:", error);
    showCheckoutMessage("Erro ao carregar o formulário de pagamento.", "error");
    startBtn.disabled = false;
  }
}

// ===========================================================
// RESULTADO DO PAGAMENTO
// ===========================================================

function handlePaymentResult(data, formData) {
  const status = data && data.status;

  // Salva o último pedido no localStorage
  const order = {
    product: selectedProduct,
    status: status || "unknown",
    paymentId: data && data.id,
    paymentMethod: formData ? formData.payment_method_id : null,
    date: new Date().toISOString()
  };
  localStorage.setItem("sonix_last_order", JSON.stringify(order));

  if (status === "approved") {
    // Dispara Purchase (Meta Pixel) somente após aprovação
    if (typeof fbq === "function") {
      fbq("track", "Purchase", {
        content_ids: [selectedProduct.id],
        content_name: selectedProduct.name,
        value: selectedProduct.price,
        currency: "BRL"
      });
    }

    showCheckoutMessage("Pagamento aprovado! Redirecionando...", "success");

    setTimeout(() => {
      window.location.href = "/obrigado.html";
    }, 1200);
  } else if (status === "pending" || status === "in_process") {
    // Pix geralmente fica pending até o pagamento ser confirmado
    showCheckoutMessage(
      "Pagamento em processamento. Se for Pix, finalize o pagamento no app do seu banco.",
      ""
    );
  } else {
    showCheckoutMessage(
      "Pagamento não aprovado. Verifique os dados e tente novamente.",
      "error"
    );
    document.getElementById("startPaymentButton").disabled = false;
  }
}

// ===========================================================
// MENSAGENS DO CHECKOUT
// ===========================================================

function showCheckoutMessage(text, type) {
  const msgEl = document.getElementById("checkoutMessage");
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = "checkout-message" + (type === "success" ? " success" : "");
}

// ===========================================================
// FAQ - ACORDEÃO
// ===========================================================

function initFAQ() {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const question = item.querySelector(".faq-question");
    question.addEventListener("click", () => {
      const isOpen = item.classList.contains("active");
      faqItems.forEach((i) => i.classList.remove("active"));
      if (!isOpen) {
        item.classList.add("active");
      }
    });
  });
}

// ===========================================================
// INICIALIZAÇÃO
// ===========================================================

document.addEventListener("DOMContentLoaded", () => {
  // Captura/recupera UTMs
  captureUTMs();

  // Dispara ViewContent ao abrir a página
  if (typeof fbq === "function") {
    fbq("track", "ViewContent");
  }

  // Botão "Escolher meu presente" leva até os produtos
  const btnEscolher = document.getElementById("btnEscolherPresente");
  if (btnEscolher) {
    btnEscolher.addEventListener("click", () => {
      document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    });
  }

  // Vincula os botões "Comprar agora" aos produtos
  document.querySelectorAll(".btn-buy").forEach((button) => {
    button.addEventListener("click", () => {
      const { id, name, price } = button.dataset;
      selectProduct(id, name, price);
    });
  });

  // Botão "Gerar pagamento"
  const startBtn = document.getElementById("startPaymentButton");
  if (startBtn) {
    startBtn.addEventListener("click", renderPaymentBrick);
  }

  // Vídeo do hero
  const videoPlaceholder = document.querySelector(".video-placeholder");
  const videoIframe = document.querySelector(".video-iframe");
  if (videoPlaceholder && videoIframe) {
    videoPlaceholder.addEventListener("click", () => {
      videoPlaceholder.style.display = "none";
      videoIframe.style.display = "block";
    });
  }

  // FAQ acordeão
  initFAQ();
});
