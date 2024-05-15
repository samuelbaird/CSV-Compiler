const uploadForm = document.getElementById("uploadForm");
const downloadButton = document.getElementById("downloadButton");

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

  downloadCSV(csvContent);
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

      return workplaceNames.every((workplaceName) =>
        hubstaffNames.some(
          (hubstaffName) =>
            hubstaffName.toLowerCase() === workplaceName.toLowerCase()
        )
      );
    });

    if (matchingHubstaff) {
      combined.push({
        Agent: workplaceRow.Agent,
        Timer: matchingHubstaff.Project,
        Task: workplaceRow.Step,
        Date: matchingHubstaff.Date,
        Time: matchingHubstaff.Time,
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

function downloadCSV(csvContent) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "combined_results.csv";
  link.click();
  window.URL.revokeObjectURL(url);
}
