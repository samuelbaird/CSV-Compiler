import { parseCSV } from "./fileParser.js";
import {
  combineData,
  gptFilter,
  formatData,
  formatExport,
  downloadCSV,
  hourlyReport,
} from "./dataManipulation.js";
import { convertToCSV, convertToJSONL } from "./conversion.js";

const uploadForm = document.getElementById("uploadForm");
const gptFilterForm = document.getElementById("gptFilterForm");
const formatterForm = document.getElementById("formatterForm");
const exportForm = document.getElementById("exportForm");
const reportForm = document.getElementById("reportForm");

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

exportForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const taskFile = document.getElementById("taskFile").files[0];
  const operateFile = document.getElementById("operateFile").files[0];

  const taskPromise = await parseCSV(taskFile);
  const operatePromise = await parseCSV(operateFile);

  const exportData = await formatExport(taskPromise, operatePromise);

  const jsonlContent = convertToJSONL(exportData);

  downloadCSV(jsonlContent, "export_data.jsonl");
});

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const hourlyFile = document.getElementById("hourlyFile").files[0];
  const hourlyId = document.getElementById("hourlyId").value;

  const hourlyPromise = await parseCSV(hourlyFile);

  const hourlyData = await hourlyReport(hourlyPromise, hourlyId);

  const csvContent = convertToCSV(hourlyData);

  downloadCSV(csvContent, "hourly_report.csv");
});
