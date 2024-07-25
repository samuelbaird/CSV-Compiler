const uploadForm = document.getElementById("uploadForm");
const gptFilterForm = document.getElementById("gptFilterForm");
const formatterForm = document.getElementById("formatterForm");

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const metabaseFile = document.getElementById("metabaseFile").files[0];
  const hubstaffFile = document.getElementById("hubstaffFile").files[0];

  const metabaseDataPromise = parseCSV(metabaseFile);
  const hubstaffDataPromise = parseCSV(hubstaffFile);

  const combinedData = await combineData(
    metabaseDataPromise,
    hubstaffDataPromise
  );

  const csvContent = convertToCSV(combinedData);

  downloadCSV(csvContent, "combined_data.csv");
});

gptFilterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const urlsFile = document.getElementById("urlsFile").files[0];

  const urlsFilePromise = await parseCSV(urlsFile);

  const filteredUrls = await gptFilter(urlsFilePromise);

  const csvContent = convertToCSV(filteredUrls);

  downloadCSV(csvContent, "filtered_urls.csv");
});

formatterForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const dataFile = document.getElementById("dataFile").files[0];

  const dataPromise = await parseCSV(dataFile);

  const formattedData = await formatData(dataPromise);

  const csvContent = convertToCSV(formattedData);

  downloadCSV(csvContent, "formatted_data.csv");
});

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        resolve(results.data);
      },
      error: function (error) {
        reject(error);
      },
    });
  });
}

async function combineData(metabaseDataPromise, hubstaffDataPromise) {
  const metabaseData = await metabaseDataPromise;
  const hubstaffData = await hubstaffDataPromise;

  const combined = [];

  hubstaffData.forEach((hubstaffRow) => {
    let task = null;
    let tasksCompleted = null;

    if (
      hubstaffRow.Project === "Google - Multi-Turn (QA)" ||
      hubstaffRow.Project === "Google - Multi-Turn (Operating)"
    ) {
      const matchingMetabaseEntries = metabaseData.filter(
        (metabaseRow) =>
          metabaseRow.email === hubstaffRow["Work email"] &&
          metabaseRow.day === hubstaffRow.Date
      );

      if (matchingMetabaseEntries.length > 0) {
        matchingMetabaseEntries.forEach((matchingMetabase) => {
          combined.push({
            Agent: hubstaffRow.Member,
            Email: hubstaffRow["Work email"],
            Timer: hubstaffRow.Project,
            Task: matchingMetabase.step_name,
            Date: hubstaffRow.Date,
            Time: hubstaffRow.Time,
            Activity: hubstaffRow.Activity,
            "Tasks Completed": matchingMetabase.Steps,
          });
        });
      } else {
        combined.push({
          Agent: hubstaffRow.Member,
          Email: hubstaffRow["Work email"],
          Timer: hubstaffRow.Project,
          Task: null,
          Date: hubstaffRow.Date,
          Time: hubstaffRow.Time,
          Activity: hubstaffRow.Activity,
          "Tasks Completed": null,
        });
      }
    } else {
      combined.push({
        Agent: hubstaffRow.Member,
        Email: hubstaffRow["Work email"],
        Timer: hubstaffRow.Project,
        Task: null,
        Date: hubstaffRow.Date,
        Time: hubstaffRow.Time,
        Activity: hubstaffRow.Activity,
        "Tasks Completed": null,
      });
    }
  });

  metabaseData.forEach((metabaseRow) => {
    const matchingHubstaff = hubstaffData.find(
      (hubstaffRow) =>
        metabaseRow.email === hubstaffRow["Work email"] &&
        metabaseRow.day === hubstaffRow.Date
    );

    if (!matchingHubstaff) {
      combined.push({
        Agent: null,
        Email: metabaseRow.email,
        Timer: null,
        Task: metabaseRow.step_name,
        Date: metabaseRow.day,
        Time: null,
        Activity: null,
        "Tasks Completed": metabaseRow.Steps,
      });
    }
  });

  return combined;
}

function convertToCSV(data) {
  if (!data.length) return "";

  const escapeAndQuote = (value) => {
    const str = String(value);
    if (str.includes(",") || str.includes("\n") || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = Object.keys(data[0]);
  const lines = [headers.join(",")];
  data.forEach((row) => {
    lines.push(headers.map((header) => escapeAndQuote(row[header])).join(","));
  });
  return lines.join("\n");
}


function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

async function gptFilter(urlsFilePromise) {
  const urlsData = await urlsFilePromise;

  const filterUrls = [
    "chatgpt.com",
    "perplexity.ai",
    "perplexity.chat",
    "huggingface.co",
    "claude.ai",
    "github.com/github-copilot",
  ];

  const filteredUrls = urlsData.filter((row) =>
    filterUrls.includes(row["App or Site"])
  );

  return filteredUrls;
}

async function formatData(dataPromise) {
  const data = await dataPromise;

  // Process each row individually
  const formattedData = await Promise.all(
    data.map(async (row, index) => {
      const task_id = generateUUID();
      const splitJson = await lineSplitter(row);

      const prompt = row.prompt;
      const response_a = row.response_a;
      const response_b = row.response_b;

      return {
        batch_id: 1,
        task_id: task_id,
        task_json: splitJson,
        prompt: prompt,
        response_a: response_a || "",
        response_b: response_b || "",
      };
    })
  );

  return formattedData;
}

function generateUUID() {
  let d = new Date().getTime();
  let d2 = (performance && performance.now && performance.now() * 1000) || 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function lineSplitter(row) {
  const prompt = row.prompt;
  const response_a = row.response_a.split("\n").map((line) => line.trim());
  const response_b = row.response_b.split("\n").map((line) => line.trim());

  const splitData = {
    prompt: prompt,
    response_a: response_a,
    response_b: response_b,
  };

  return JSON.stringify(splitData);
}
