const uploadForm = document.getElementById("uploadForm");
const gptFilterForm = document.getElementById("gptFilterForm");

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const workplaceFile = document.getElementById("workplaceFile").files[0];
  const hubstaffFile = document.getElementById("hubstaffFile").files[0];

  const workplaceDataPromise = parseCSV(workplaceFile);
  const hubstaffDataPromise = parseCSV(hubstaffFile);

  const combinedData = await combineData(
    workplaceDataPromise,
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

async function combineData(workplaceDataPromise, hubstaffDataPromise) {
  const workplaceData = await workplaceDataPromise;
  const hubstaffData = await hubstaffDataPromise;

  const combined = [];
  workplaceData.forEach((workplaceRow) => {
    const workplaceNames = workplaceRow.Agent.split(" ");

    const matchingHubstaff = hubstaffData.find((hubstaffRow) => {
      const hubstaffNames = hubstaffRow.Member.split(" ");

      const agentRegex = new RegExp("^" + workplaceRow.Agent.slice(0, 4), "i");

      const matches = workplaceNames.filter((workplaceName) =>
        hubstaffNames.some((hubstaffName) =>
          hubstaffName.toLowerCase().includes(workplaceName.toLowerCase())
        )
      ).length;

      const matchThreshold = Math.ceil(workplaceNames.length * 0.75);

      const results =
        agentRegex.test(hubstaffRow.Member) + (matches >= matchThreshold);

      return results;
    });

    if (matchingHubstaff) {
      combined.push({
        Agent: workplaceRow.Agent,
        Timer: matchingHubstaff.Project,
        Task: workplaceRow.Step,
        Date: matchingHubstaff.Date,
        Time: matchingHubstaff.Time,
        Activity: matchingHubstaff.Activity,
        "Tasks Completed": workplaceRow["# of Base Runs"],
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
  ];

  const filteredUrls = urlsData.filter((row) =>
    filterUrls.includes(row["App or Site"])
  );

  return filteredUrls;
}
