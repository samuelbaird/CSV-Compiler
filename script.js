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
  const batchId = document.getElementById("batchId").value;

  const dataPromise = await parseCSV(dataFile);

  const formattedData = await formatData(dataPromise, batchId);

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

async function formatData(dataPromise, batchId) {
  const data = await dataPromise;

  const formattedData = await Promise.all(
    data.map(async (row, index) => {
      const task_id = generateUUID();
      const splitJson = await lineSplitter(row);

      const prompt = row.prompt_turn_1;
      const response_a = row.response_a_turn_1;
      const response_b = row.response_b_turn_1;

      return {
        batch_id: batchId,
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
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (
      c ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
    ).toString(16)
  );
}

async function lineSplitter(row) {
  const prompt = row.prompt_turn_1;
  const response_a = row.response_a_turn_1.split("\n");
  const response_b = row.response_b_turn_1.split("\n");

  const splitData = {
    prompt: prompt,
    response_a: response_a,
    response_b: response_b,
  };

  return JSON.stringify(splitData);
}