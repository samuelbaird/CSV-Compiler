const uploadForm = document.getElementById("uploadForm");
const gptFilterForm = document.getElementById("gptFilterForm");

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

function parseCSV(file) {
  const reader = new FileReader();
  reader.readAsText(file);
  return new Promise((resolve, reject) => {
    reader.onload = (event) => {
      const data = event.target.result;
      const lines = data.split(/\r?\n/);
      const headers = lines[0]
        .split(",")
        .map((header) => header.trim().replace(/"/g, ""));

      const rows = lines.slice(1).map((line) => {
        const trimmedLine = line.trim().replace(/"/g, "");
        if (!trimmedLine) return null;

        const values = trimmedLine.split(",");
        const headersWithoutEmpty = headers.filter(
          (header, i) => values[i] !== undefined
        );

        return headersWithoutEmpty.reduce((obj, header, index) => {
          obj[header.trim()] = values[index].trim();
          return obj;
        }, {});
      });
      resolve(rows.filter((row) => row !== null));
    };
    reader.onerror = (error) => reject(error);
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

  const headers = Object.keys(data[0]);
  const lines = [headers.join(",")];
  data.forEach((row) => {
    lines.push(headers.map((header) => row[header]).join(","));
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



