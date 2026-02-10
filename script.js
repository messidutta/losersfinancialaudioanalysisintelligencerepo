let sentimentChart;

async function upload() {
  const fileInput = document.getElementById("audioFile");
  const status = document.getElementById("status");
  const results = document.getElementById("results");

  if (!fileInput.files.length) {
    alert("Please select an audio file.");
    return;
  }

  const formData = new FormData();
  formData.append("audio", fileInput.files[0]);

  status.innerText = "⏳ Processing audio...";
  results.classList.add("hidden");

  try {
    const res = await fetch("http://127.0.0.1:8000/analyze-call/", {
      method: "POST",
      body: formData
    });

    if (!res.ok) throw new Error(await res.text());

    const data = await res.json();

    document.getElementById("transcript").innerText = data.transcript;

    const metrics = extractMetrics(data.analysis);
    renderSentimentChart(metrics.sentiment);
    renderRisk(metrics.riskScore);

    renderInsights(metrics.insights);

    status.innerText = "✅ Analysis complete.";
    results.classList.remove("hidden");

  } catch (err) {
    status.innerText = "❌ Error occurred.";
    alert(err.message);
  }
}

/* ===== METRIC EXTRACTION ===== */
function extractMetrics(text) {
  const lower = text.toLowerCase();

  let sentiment = { positive: 0, neutral: 1, negative: 0 };
  if (lower.includes("positive")) sentiment = { positive: 1, neutral: 0, negative: 0 };
  if (lower.includes("negative")) sentiment = { positive: 0, neutral: 0, negative: 1 };

  let riskScore = 30;
  if (lower.includes("urgent")) riskScore += 25;
  if (lower.includes("low credit")) riskScore += 25;
  if (lower.includes("risk")) riskScore += 20;

  riskScore = Math.min(riskScore, 100);

  const insights = text
    .split("\n")
    .filter(line => line.trim().length > 10)
    .slice(0, 5);

  return { sentiment, riskScore, insights };
}

/* ===== CHART ===== */
function renderSentimentChart(sentiment) {
  const ctx = document.getElementById("sentimentChart");

  if (sentimentChart) sentimentChart.destroy();

  sentimentChart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: ["Positive", "Neutral", "Negative"],
      datasets: [{
        data: [
          sentiment.positive,
          sentiment.neutral,
          sentiment.negative
        ],
        backgroundColor: ["#22c55e", "#38bdf8", "#ef4444"],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,   // 🔑 allows resizing
      plugins: {
        legend: {
          labels: {
            color: "#e5e7eb"
          }
        }
      }
    }
  });
}


/* ===== RISK ===== */
function renderRisk(score) {
  const el = document.getElementById("riskScore");
  const label = document.getElementById("riskLabel");

  el.innerText = score;

  if (score < 40) label.innerText = "Low Risk";
  else if (score < 70) label.innerText = "Moderate Risk";
  else label.innerText = "High Risk";
}

/* ===== INSIGHTS ===== */
function renderInsights(items) {
  const ul = document.getElementById("insightsList");
  ul.innerHTML = "";
  items.forEach(i => {
    const li = document.createElement("li");
    li.innerText = i;
    ul.appendChild(li);
  });
}
