const express = require("express");
const yahooFinance = require("yahoo-finance2").default;
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const path = require("path");

// Sajikan file statis (seperti index.html, styles.css, dll)
app.use(express.static(__dirname));

// Handler untuk root "/"
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = 3000;

// Endpoint Gemini yang sudah diperbarui
app.post("/api/gemini", async (req, res) => {
  try {
    const { prompt } = req.body;

    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      contents: [
        {
          parts: [
            {
              text: `Anda adalah asisten analis saham profesional bernama InvestAI Assistant. 
              Berikan jawaban dalam Bahasa Indonesia yang jelas dan terstruktur. 
              Format jawaban dengan:
              - Gunakan paragraf pendek
              - Gunakan bullet points untuk poin-poin penting
              - Bold untuk istilah penting (**istilah**)
              - Italic untuk penekanan (*penekanan*)
              - Kode untuk ticker saham (\`AAPL\`)
              
              Pertanyaan: ${prompt}`,
            },
          ],
        },
      ],
    });

    let responseText = response.data.candidates[0].content.parts[0].text;

    // Clean up any odd formatting that might come through
    responseText = responseText
      .replace(/^\s*\[INST\].*?\[\/INST\]\s*/i, "") // Remove any remaining [INST] tags
      .replace(/\*\*\*/g, "**") // Fix triple asterisks
      .trim();

    res.json({ response: responseText });
  } catch (error) {
    console.error("Gemini API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error processing your request with Gemini" });
  }
});

// Endpoint untuk mengambil data saham
app.get("/api/stock/:symbol", async (req, res) => {
  const stockCode = req.params.symbol;
  try {
    const result = await yahooFinance.quote(stockCode);
    res.json({
      code: stockCode,
      name: result.longName || "N/A",
      sector: result.region || "N/A",
      currentPrice: result.regularMarketPrice || 0,
      eps: result.trailingEps || 0,
      bookValue: result.bookValue || 0,
      peRatio: result.trailingPE || 0,
      pbRatio: result.priceToBook || 0, // Price/Book
      psRatio: result.priceToSales || 0, // Price/Sales
      sharesOutstanding: result.sharesOutstanding || 0, // Share Outstanding
      profitMargin: result.profitMargin || 0, // Profit Margin
      returnOnEquity: result.returnOnEquity || 0, // Return on Equity
      netIncome: result.netIncome || 0, // Net Income Avi to Common (ttm)
      debtToEquity: result.debtToEquity || 0, // Total Debt/Equity (mrq)
      epsCurrentYear: result.epsCurrentYear || 0,
      dividendYield: (result.dividendYield || 0) * 1,
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data dari Yahoo Finance" });
  }
});

app.get("/api/historical/:symbol", async (req, res) => {
  const stockCode = req.params.symbol;
  const url = `https://api.twelvedata.com/time_series?symbol=${stockCode}&interval=5min&outputsize=30&apikey=${process.env.TWELVE_DATA_API_KEY}`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    if (data.status === "error") {
      return res.status(500).json({ error: data.message });
    }

    const historicalData = {
      s: "ok",
      c: [], // close prices
      t: [], // timestamp (UNIX)
    };

    for (const point of data.values.reverse()) {
      historicalData.c.push(parseFloat(point.close));
      historicalData.t.push(new Date(point.datetime).getTime() / 1000);
    }

    res.json(historicalData);
  } catch (error) {
    console.error("Fetch historical error:", error.message);
    res.status(500).json({ error: "Gagal mengambil data historis dari Twelve Data" });
  }
});

// Menjalankan server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
