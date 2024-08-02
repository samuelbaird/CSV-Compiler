export function convertToCSV(data) {
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

export function convertToJSONL(combinedData) {
  const jsonLines = combinedData.map((entry) => JSON.stringify(entry));

  const jsonlContent = jsonLines.join("\n");

  return jsonlContent;
}
