const stockCodeInput = document.getElementById("stockCode");
const searchBtn = document.getElementById("searchBtn");
const resultsDiv = document.getElementById("results");
const loadingDiv = document.getElementById("loading");
const chatbotToggle = document.getElementById("chatbot-toggle");
const chatbotPopup = document.getElementById("chatbot-popup");
const chatbotClose = document.getElementById("chatbot-close");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatMessages = document.getElementById("chat-messages");
const API_BASE_URL = window.location.origin;

function init() {
  setupEventListeners();
  initAccordions();
  initSmoothScrolling();
  setupChatbot();
}

function setupChatbot() {
  chatbotToggle.addEventListener("click", () => {
    chatbotPopup.classList.toggle("hidden");
  });

  chatbotClose.addEventListener("click", () => {
    chatbotPopup.classList.add("hidden");
  });

  chatSend.addEventListener("click", sendMessage);

  chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });
}

async function sendMessage() {
  const prompt = chatInput.value.trim();
  if (!prompt) return;

  addMessage(prompt, "user");
  chatInput.value = "";

  const typingIndicator = document.createElement("div");
  typingIndicator.id = "typing-indicator";
  typingIndicator.className = "typing-indicator bot-message";
  typingIndicator.innerHTML = "<span></span><span></span><span></span>";
  chatMessages.appendChild(typingIndicator);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  try {
    const result = await fetchGeminiResponse(prompt);
    document.getElementById("typing-indicator")?.remove();
    addMessage(result.response, "bot");
  } catch (error) {
    document.getElementById("typing-indicator")?.remove();
    addMessage("Error: " + error.message, "bot");
    console.error("Chat error:", error);
  }
}

function addMessage(text, sender) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${sender}-message`;

  // Clean up the AI response formatting
  let formattedText = text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/```([^`]+)```/g, "<pre>$1</pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Format lists properly
    .replace(/(\d+)\.\s/g, "<br>$1. ")
    .replace(/\-\s/g, "<br>• ")
    // Convert links
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Preserve line breaks
    .replace(/\n/g, "<br>");

  // Add sender name for bot messages
  if (sender === "bot") {
    formattedText = `<div class="font-semibold text-blue-600 mb-1">InvestAI Assistant</div>${formattedText}`;
  }

  messageDiv.innerHTML = formattedText;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function fetchGeminiResponse(prompt) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gemini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) throw new Error(`Error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}

function setupEventListeners() {
  if (searchBtn) {
    searchBtn.addEventListener("click", handleSearch);
  }

  document.querySelectorAll(".stock-chip").forEach((button) => {
    button.addEventListener("click", () => {
      const stockCode = button.getAttribute("data-stock");
      if (stockCodeInput) {
        stockCodeInput.value = stockCode;
      }
    });
  });

  if (stockCodeInput) {
    stockCodeInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    });
  }
}

function initAccordions() {
  document.querySelectorAll(".accordion-header").forEach((header) => {
    header.addEventListener("click", () => {
      const item = header.closest(".accordion-item");
      const body = item?.querySelector(".accordion-body");
      const icon = header.querySelector("svg");

      if (body) {
        if (body.classList.contains("hidden")) {
          body.classList.remove("hidden");
          body.style.height = "0";
          body.style.overflow = "hidden";
          const fullHeight = body.scrollHeight + "px";

          body.style.transition = "height 0.3s ease-out";
          body.style.height = fullHeight;

          setTimeout(() => {
            body.style.height = "";
            body.style.overflow = "";
            body.style.transition = "";
          }, 300);
        } else {
          body.style.height = body.scrollHeight + "px";
          body.style.overflow = "hidden";

          body.style.transition = "height 0.3s ease-out";
          setTimeout(() => {
            body.style.height = "0";
          }, 10);

          setTimeout(() => {
            body.classList.add("hidden");
            body.style.height = "";
            body.style.overflow = "";
            body.style.transition = "";
          }, 310);
        }
      }

      if (icon) {
        icon.classList.toggle("rotate-180");
      }
    });
  });
}

function initSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) {
        const offset = 100;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({
          top: targetPosition - offset,
          behavior: "smooth",
        });
      }
    });
  });
}

async function handleSearch() {
  if (!stockCodeInput) return;

  const stockCode = stockCodeInput.value.trim().toUpperCase();

  if (!stockCode) {
    showAlert("Silakan masukkan kode saham");
    return;
  }

  showLoadingState();

  try {
    const stockData = await fetchStockData(stockCode);
    displayResults(stockData);
  } catch (error) {
    showError(`Gagal memuat data: ${error.message}`);
  }
}

function showLoadingState() {
  if (!resultsDiv || !loadingDiv) return;

  resultsDiv.classList.remove("hidden");
  loadingDiv.classList.remove("hidden");
  resultsDiv.innerHTML = "";
  resultsDiv.appendChild(loadingDiv);
}

async function fetchStockData(stockCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/stock/${stockCode}`);
    if (!response.ok) {
      throw new Error("Gagal mengambil data dari API");
    }
    return await response.json();
  } catch (error) {
    throw new Error("Gagal mengambil data saham: " + error.message);
  }
}

function displayResults(data) {
  if (!loadingDiv || !resultsDiv) return;

  const valuation = calculateValuation(data);
  const resultsHTML = createResultsHTML(data, valuation);

  loadingDiv.classList.add("hidden");
  resultsDiv.innerHTML = resultsHTML;
  renderPriceChart(data.code);
}

function createResultsHTML(data, valuation) {
  return `
    <div class="mb-6 results-card">
      <h2 class="text-2xl font-bold">${data.name} (${data.code})</h2>
      <p>Region: ${data.sector}</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div class="bg-white p-4 rounded-lg shadow transition-transform transform hover:scale-105">
        <h3 class="font-semibold mb-2">Statistik Keuangan</h3>
        <table class="w-full">
          ${createFinancialStatsTable(data)}
        </table>
      </div>

      <div class="bg-white p-4 rounded-lg shadow transition-transform transform hover:scale-105">
        <h3 class="font-semibold mb-2">Analisis Valuasi</h3>
        ${createValuationHTML(valuation)}
      </div>
    </div>

    <div class="bg-white p-4 rounded-lg shadow h-[400px]">
      <h3 class="font-semibold mb-4">Performa Harga</h3>
      <div class="h-[350px]">
        <canvas id="priceChart"></canvas>
      </div>
    </div>
  `;
}

function createFinancialStatsTable(data) {
  const stats = [
    { label: "Harga Saat Ini (USD)", value: `$ ${formatNumber(data.currentPrice)}` },
    { label: "Price/Book", value: `${formatNumber(data.pbRatio, 2)}x` },
    { label: "Trailing P/E", value: `${formatNumber(data.peRatio, 2)}x` },
    { label: "EPS Current Year", value: formatNumber(data.epsCurrentYear) },
    { label: "Share Outstanding", value: formatNumber(data.sharesOutstanding) },
    { label: "Dividend Yield", value: `${data.dividendYield.toFixed(2)}%` },
  ];

  return stats
    .map(
      (stat) => `
    <tr class="border-b">
      <td class="py-2">${stat.label}</td>
      <td class="py-2 text-right">${stat.value}</td>
    </tr>
  `
    )
    .join("");
}

function createValuationHTML(valuation) {
  const valueClass = valuation.isUndervalued ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800";
  const discountClass = valuation.discountPercent > 0 ? "text-green-600" : "text-red-600";
  const discountSymbol = valuation.discountPercent > 0 ? "▼" : "▲";

  return `
    <div class="mb-4">
      <span class="inline-block px-3 py-1 rounded-full ${valueClass}">
        ${valuation.isUndervalued ? "UNDERVALUE" : "OVERVALUE"}
      </span>
    </div>
    <div class="mb-2">
      <p>Harga Wajar:</p>
      <p class="text-xl font-bold">Rp ${formatNumber(valuation.fairValue)}</p>
    </div>
    <div>
      <p>Diskon/Premium:</p>
      <p class="text-xl font-bold ${discountClass}">
        ${discountSymbol} ${Math.abs(valuation.discountPercent).toFixed(2)}%
      </p>
    </div>
  `;
}

function formatNumber(value, decimals = 0) {
  if (value === undefined || value === null) return "N/A";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function calculateValuation(stockData) {
  const netIncome = stockData.epsCurrentYear * stockData.sharesOutstanding;
  const fairValue = (stockData.peRatio * netIncome) / stockData.sharesOutstanding;
  const discountPercent = ((fairValue - stockData.currentPrice) / fairValue) * 100;

  return {
    fairValue,
    discountPercent,
    isUndervalued: discountPercent > 0,
  };
}

async function renderPriceChart(stockCode) {
  const ctx = document.getElementById("priceChart")?.getContext("2d");
  if (!ctx || !stockCode) return;

  try {
    const response = await fetch(`http://localhost:3000/api/historical/${stockCode}`);
    const historicalData = await response.json();

    if (historicalData.s === "ok") {
      renderChart(ctx, historicalData);
    }
  } catch (error) {
    console.error("Error rendering chart:", error);
    showChartError();
  }
}

function showChartError() {
  const chartContainer = document.querySelector("#priceChart")?.parentElement;
  if (chartContainer) {
    chartContainer.innerHTML = `
      <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <p class="text-yellow-700">Data grafik tidak tersedia saat ini</p>
      </div>
    `;
  }
}

function renderChart(ctx, historicalData) {
  const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
  gradient.addColorStop(0, "rgba(74, 139, 223, 0.2)");
  gradient.addColorStop(1, "rgba(74, 139, 223, 0)");

  const firstPrice = historicalData.c[0];
  const lastPrice = historicalData.c[historicalData.c.length - 1];
  const chartColor = lastPrice >= firstPrice ? "#4CAF50" : "#F44336";

  new Chart(ctx, {
    type: "line",
    data: {
      labels: historicalData.t.map(() => ""), // Mengosongkan label
      datasets: [
        {
          label: "Price",
          data: historicalData.c,
          borderColor: chartColor,
          borderWidth: 1.5,
          backgroundColor: gradient,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 5,
          tension: 0.1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "#1E293B",
          titleColor: "#F8FAFC",
          bodyColor: "#F8FAFC",
          callbacks: {
            label: (context) => `$${context.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            display: false, // Menyembunyikan ticks pada sumbu x
          },
        },
        y: {
          position: "right",
          ticks: {
            callback: (value) => `$${value.toFixed(2)}`,
          },
        },
      },
    },
  });
}

function showError(message) {
  if (!loadingDiv || !resultsDiv) return;

  loadingDiv.classList.add("hidden");
  resultsDiv.innerHTML = `
    <div class="bg-red-50 border-l-4 border-red-500 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <i class="fas fa-exclamation-circle text-red-500"></i>
        </div>
        <div class="ml-3">
          <p class="text-sm text-red-700">${message}</p>
        </div>
      </div>
    </div>
  `;
}

function showAlert(message) {
  alert(message);
}

document.addEventListener("DOMContentLoaded", init);
