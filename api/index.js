const express = require("express");
const yahooFinance = require("yahoo-finance2").default;
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint Gemini
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

    responseText = responseText
      .replace(/^\s*\[INST\].*?\[\/INST\]\s*/i, "")
      .replace(/\*\*\*/g, "**")
      .trim();

    res.json({ response: responseText });
  } catch (error) {
    console.error("Gemini API error:", error.response?.data || error.message);
    res.status(500).json({ error: "Error processing your request with Gemini" });
  }
});

app.get("/api/stock/:symbol", async (req, res) => {
  const stockCode = req.params.symbol;
  try {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${stockCode}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
    const response = await axios.get(url);
    const data = response.data;

    if (!data || Object.keys(data).length === 0) {
      return res.status(404).json({ error: "Saham tidak ditemukan" });
    }

    const priceUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockCode}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`;
    const priceResponse = await axios.get(priceUrl);
    const priceData = priceResponse.data["Global Quote"];

    res.json({
      code: stockCode,
      name: data.Name || "N/A",
      sector: data.Sector || "N/A",
      currentPrice: parseFloat(priceData["05. price"]) || 0,
      eps: parseFloat(data.EPS) || 0,
      bookValue: parseFloat(data.BookValue) || 0,
      peRatio: parseFloat(data.PERatio) || 0,
      pbRatio: parseFloat(data.PriceToBookRatio) || 0,
      psRatio: parseFloat(data.PriceToSalesRatioTTM) || 0,
      sharesOutstanding: parseFloat(data.SharesOutstanding) || 0,
      profitMargin: parseFloat(data.ProfitMargin) || 0,
      returnOnEquity: parseFloat(data.ReturnOnEquityTTM) || 0,
      netIncome: parseFloat(data.NetIncomeTTM) || 0,
      debtToEquity: parseFloat(data.DebtToEquityRatio) || 0,
      epsCurrentYear: parseFloat(data.EPS) || 0,
      dividendYield: parseFloat(data.DividendYield) || 0,
    });
  } catch (error) {
    console.error("Stock error:", error.message);
    res.status(500).json({ error: "Gagal mengambil data saham", detail: error.message });
  }
});

// Endpoint untuk data historis
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
      c: [],
      t: [],
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

module.exports = app;