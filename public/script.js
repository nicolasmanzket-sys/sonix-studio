// ===========================================================
// SoniX Studios - script.js
// Lógica do site: catálogo, carrinho, UTMs, pixel e Checkout Bricks (MP)
// ===========================================================

// ===== CATÁLOGO DE PRODUTOS =====
const products = [
  {
    id: "musica",
    name: "Música Personalizada",
    price: 19.99,
    image: "/assets/musica-personalizada.png",
    description: "Uma música exclusiva criada com os detalhes da sua história."
  },
  {
    id: "foto_ia",
    name: "Foto com IA",
    price: 10.90,
    image: "/assets/foto-com-ia.png",
    description: "Uma imagem personalizada feita com inteligência artificial."
  },
  {
    id: "cartao_digital",
    name: "Cartão Digital",
    price: 10.90,
    image: "/assets/cartao-digital.png",
    description: "Um cartão bonito e personalizado para enviar em datas especiais."
  },
  {
    id: "video_fotos",
    name: "Vídeo com Fotos",
    price: 29.90,
    image: "/assets/video-com-fotos.png",
    description: "Um vídeo emocionante com fotos, frases e estilo de homenagem."
  },
  {
    id: "correio_eletronico",
    name: "Correio Eletrônico",
    price: 9.97,
    image: "/assets/correio-eletronico.png",
    description: "Uma mensagem digital personalizada para surpreender alguém especial."
  },
  {
    id: "album_5",
    name: "Álbum de Foto com 5 Fotos",
    price: 29.99,
    image: "/assets/album-5-fotos.png",
    description: "Pacote com 5 imagens personalizadas criadas com IA."
  },
  {
    id: "album_15",
    name: "Álbum de Foto com 15 Fotos",
    price: 69.99,
    image: "/assets/album-15-fotos.png",
    description: "Pacote completo com 15 imagens personalizadas."
  },
  {
    id: "pacote_presente",
    name: "Pacote Presente Completo",
    price: 35.90,
    image: "/assets/pacote-presente.png",
    description: "Inclui música personalizada, foto com IA e correio eletrônico."
  },
  {
    id: "convite",
    name: "Convite Digital Personalizado",
    price: 14.99,
    image: "/assets/convite-digital.png",
    description: "Convite digital personalizado para aniversário, casamento ou evento especial."
  }
];

// ===== ESTADO GLOBAL =====
let cart = [];
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
// FORMATAÇÃO
// ===========================================================

function formatPrice(value) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// ===========================================================
// CARRINHO
// ===========================================================

// Carrega o carrinho salvo no localStorage (se existir)
function loadCart() {
  try {
    const stored = localStorage.getItem("sonix_cart");
    cart = stored ? JSON.parse(stored) : [];
  } catch (e) {
    cart = [];
  }
}

// Salva o carrinho no localStorage
function saveCart() {
  localStorage.setItem("sonix_cart", JSON.stringify(cart));
}

// Garante que todos os itens do carrinho têm a imagem correta (recupera pelo ID caso falte)
function normalizeCartItems() {
  cart = cart.map(item => {
    const product = products.find(p => p.id === item.id);
    return {
      ...item,
      image: item.image || product?.image || ""
    };
  });
}

// Adiciona um produto ao carrinho (sem duplicar)
function addToCart(productId) {
  const alreadyInCart = cart.some((item) => item.id === productId);

  if (alreadyInCart) {
    showCartMessage("Esse produto já está no carrinho.", "error");
    return;
  }

  const product = products.find((p) => p.id === productId);
  if (!product) return;

  cart.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image
  });

  saveCart();
  updateCartSummary();
  showCartMessage("Produto adicionado ao carrinho", "success");

  // Dispara AddToCart (Meta Pixel), se disponível
  if (typeof fbq === "function") {
    fbq("track", "AddToCart", {
      content_ids: [product.id],
      content_name: product.name,
      value: product.price,
      currency: "BRL"
    });
  }
}

// Remove um produto do carrinho
function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  updateCartSummary();
}

// Calcula o valor total do carrinho
function calculateCartTotal() {
  return cart.reduce((total, item) => total + Number(item.price), 0);
}

// Esvazia o carrinho
function clearCart() {
  cart = [];
  saveCart();
  updateCartSummary();
}

// Atualiza o resumo visual do carrinho na seção de checkout
function updateCartSummary() {
  const cartItemsEl = document.getElementById("cart-items");
  const cartTotalEl = document.getElementById("cart-total-value");

  if (!cartItemsEl || !cartTotalEl) return;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = `<p class="cart-empty">Nenhum produto adicionado ainda.</p>`;
    cartTotalEl.textContent = formatPrice(0);
    return;
  }

  cartItemsEl.innerHTML = cart
    .map(
      (item) => `
        <div class="cart-item" data-id="${item.id}">
          <img src="${item.image || ""}" alt="${item.name}" class="cart-item-thumb" onerror="this.style.display='none';">
          <div class="cart-item-info">
            <span class="cart-item-name">${item.name}</span>
            <span class="cart-item-price">${formatPrice(item.price)}</span>
          </div>
          <button class="cart-item-remove" data-id="${item.id}" type="button">Remover</button>
        </div>
      `
    )
    .join("");

  cartTotalEl.textContent = formatPrice(calculateCartTotal());

  // Vincula os botões "Remover" recém-criados
  cartItemsEl.querySelectorAll(".cart-item-remove").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.id));
  });
}

// Rola até a seção de checkout/carrinho
function goToCheckout() {
  document.getElementById("checkout-section").scrollIntoView({ behavior: "smooth" });
}

// ===========================================================
// MENSAGENS
// ===========================================================

function showCheckoutMessage(text, type) {
  const msgEl = document.getElementById("checkoutMessage");
  if (!msgEl) return;
  msgEl.textContent = text;
  msgEl.className = "checkout-message" + (type === "success" ? " success" : "");
}

// Mensagem rápida ao adicionar/remover do carrinho (some sozinha)
let cartMessageTimeout = null;
function showCartMessage(text, type) {
  const msgEl = document.getElementById("cartMessage");
  if (!msgEl) return;

  msgEl.textContent = text;
  msgEl.className = "cart-message" + (type === "error" ? " error" : " success");
  msgEl.style.display = "block";

  if (cartMessageTimeout) clearTimeout(cartMessageTimeout);
  cartMessageTimeout = setTimeout(() => {
    msgEl.style.display = "none";
  }, 2500);
}

// ===========================================================
// PAYMENT BRICK (Checkout Bricks - Mercado Pago)
// ===========================================================

async function renderPaymentBrick() {
  if (cart.length === 0) {
    showCheckoutMessage("Adicione pelo menos um produto ao carrinho.", "error");
    return;
  }

  const name = document.getElementById("customerName").value.trim();
  const whatsapp = document.getElementById("customerWhatsapp").value.trim();
  const email = document.getElementById("customerEmail").value.trim();

  if (!name || !whatsapp || !email) {
    showCheckoutMessage("Preencha nome, WhatsApp e e-mail para continuar.", "error");
    return;
  }

  const total = calculateCartTotal();

  // Desmonta um Brick anterior, se existir
  if (paymentBrickController) {
    paymentBrickController.unmount();
    paymentBrickController = null;
  }

  const startBtn = document.getElementById("startPaymentButton");
  startBtn.disabled = true;
  showCheckoutMessage("Carregando formas de pagamento...", "");

  // Dispara InitiateCheckout (Meta Pixel) com o valor total do carrinho
  if (typeof fbq === "function") {
    fbq("track", "InitiateCheckout", {
      content_ids: cart.map((item) => item.id),
      contents: cart.map((item) => ({ id: item.id, quantity: 1, item_price: item.price })),
      value: total,
      currency: "BRL"
    });
  }

  const bricksBuilder = mp.bricks();

  const settings = {
    initialization: {
      amount: total
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
            produto: "Pedido SoniX Studios",
            produtos: cart,
            valor: total,
            nome: name,
            whatsapp,
            email,
            paymentData: formData,
            utms: getStoredUTMs()
          };

          fetch("/api/create-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })
            .then((response) => response.json())
            .then((data) => {
              handlePaymentResult(data, formData, { name, whatsapp, email, total });
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

function handlePaymentResult(data, formData, customer) {
  const status = data && data.status;

  console.log("Resposta do pagamento:", data);

  // Salva o último pedido no localStorage (usado na página de obrigado)
  const order = {
    products: cart,
    total: customer.total,
    customer: {
      name: customer.name,
      whatsapp: customer.whatsapp,
      email: customer.email
    },
    status: status || "unknown",
    paymentId: data && data.id,
    paymentMethod: formData ? formData.payment_method_id : null,
    date: new Date().toISOString()
  };
  localStorage.setItem("sonix_last_order", JSON.stringify(order));

  // ===== PIX: exibe QR Code / código copia e cola =====
  if (data && data.point_of_interaction && data.point_of_interaction.transaction_data) {
    const tx = data.point_of_interaction.transaction_data;

    const pixResult = document.getElementById("pix-result");
    const pixQrCode = document.getElementById("pix-qr-code");
    const pixCode = document.getElementById("pix-code");

    pixResult.style.display = "block";

    if (tx.qr_code_base64) {
      pixQrCode.src = `data:image/png;base64,${tx.qr_code_base64}`;
      pixQrCode.style.display = "block";
    }

    if (tx.qr_code) {
      pixCode.value = tx.qr_code;
    }

    showCheckoutMessage("Pix gerado! Agora pague pelo app do seu banco.", "success");

    // Não dispara Purchase aqui - só após aprovação confirmada via polling
    startPaymentPolling(data.id);
    return;
  }

  if (status === "approved") {
    // Dispara Purchase (Meta Pixel) somente após aprovação
    if (typeof fbq === "function") {
      fbq("track", "Purchase", {
        content_ids: cart.map((item) => item.id),
        contents: cart.map((item) => ({ id: item.id, quantity: 1, item_price: item.price })),
        value: customer.total,
        currency: "BRL"
      });
    }

    showCheckoutMessage("Pagamento aprovado! Redirecionando...", "success");

    clearCart();

    setTimeout(() => {
      window.location.href = "/obrigado.html";
    }, 1200);
  } else if (status === "pending" || status === "in_process") {
    // Pix geralmente fica pending até o pagamento ser confirmado
    showCheckoutMessage(
      "Pagamento em processamento. Se for Pix, finalize o pagamento no app do seu banco.",
      ""
    );
    startPaymentPolling(data.id);
  } else {
    showCheckoutMessage(
      "Pagamento não aprovado. Verifique os dados e tente novamente.",
      "error"
    );
    document.getElementById("startPaymentButton").disabled = false;
  }
}

// ===========================================================
// POLLING DE STATUS DO PAGAMENTO (usado principalmente no Pix)
// ===========================================================

function startPaymentPolling(paymentId) {
  if (!paymentId) return;

  const interval = setInterval(async () => {
    try {
      const response = await fetch(`/api/check-payment?payment_id=${paymentId}`);
      const data = await response.json();

      console.log("Status do pagamento:", data);

      if (data.status === "approved") {
        clearInterval(interval);

        // Recupera dados do pedido salvo para disparar o Purchase corretamente
        let order = null;
        try {
          order = JSON.parse(localStorage.getItem("sonix_last_order"));
        } catch (e) {
          order = null;
        }

        // Dispara Purchase somente agora que o pagamento foi confirmado
        if (typeof fbq === "function") {
          const orderProducts = (order && order.products) || cart;
          const orderTotal = (order && order.total) || calculateCartTotal();

          fbq("track", "Purchase", {
            content_ids: orderProducts.map((item) => item.id),
            contents: orderProducts.map((item) => ({ id: item.id, quantity: 1, item_price: item.price })),
            value: orderTotal,
            currency: "BRL"
          });
        }

        // Atualiza status do pedido salvo e limpa o carrinho
        if (order) {
          order.status = "approved";
          localStorage.setItem("sonix_last_order", JSON.stringify(order));
        }
        clearCart();

        window.location.href = "/obrigado.html";
      }
    } catch (error) {
      console.error("Erro ao consultar pagamento:", error);
    }
  }, 5000);
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

  // Carrega carrinho salvo e normaliza imagens (recupera imagem pelo ID se faltar)
  loadCart();
  normalizeCartItems();
  updateCartSummary();

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

  // Vincula os botões "Adicionar ao carrinho"
  document.querySelectorAll(".btn-buy").forEach((button) => {
    button.addEventListener("click", () => {
      const { id } = button.dataset;
      addToCart(id);
    });
  });

  // Botão "Finalizar pedido" rola até o checkout
  const btnFinalizar = document.getElementById("btnFinalizarPedido");
  if (btnFinalizar) {
    btnFinalizar.addEventListener("click", goToCheckout);
  }

  // Botão "Gerar pagamento"
  const startBtn = document.getElementById("startPaymentButton");
  if (startBtn) {
    startBtn.addEventListener("click", renderPaymentBrick);
  }

  // Botão "Copiar código Pix"
  document.getElementById("copy-pix-code")?.addEventListener("click", async () => {
    const code = document.getElementById("pix-code").value;

    if (!code) {
      alert("Código Pix ainda não foi gerado.");
      return;
    }

    await navigator.clipboard.writeText(code);
    alert("Código Pix copiado!");
  });

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
