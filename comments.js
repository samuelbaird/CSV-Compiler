const fs = require("fs"); // Import the file system module
const csvParser = require("csv-parser"); // Import csv-parser library

// Function to convert JSON data to CSV format
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

// Function to extract comments from lineAnnotations
function getResponseComments(annotations) {
  const lineAnnotations = annotations?.lineAnnotations || [];
  let comments = [];

  for (let annotation of lineAnnotations) {
    if (annotation[0] === -1 && annotation[1]) {
      comments.push(annotation[1]);
    }
  }

  return comments;
}

// Main function to process CSV and extract comments
async function processCSV(inputFile, outputFilename) {
  try {
    const data = [];
    fs.createReadStream(inputFile)
      .pipe(csvParser())
      .on("data", (row) => data.push(row))
      .on("end", () => {
        let outputData = [];

        data.forEach((row) => {
          const taskId = row.task_id;
          try {
            // Parse the JSON in operate_data
            const operateData = JSON.parse(row.operate_data);
            const responseAComments = getResponseComments(
              operateData.responseA
            );
            const responseBComments = getResponseComments(
              operateData.responseB
            );

            // Combine comments from responseA and responseB
            const allComments = [...responseAComments, ...responseBComments];

            // Add each comment with the task_id to the output data
            allComments.forEach((comment) => {
              outputData.push({ task_id: taskId, comment: comment });
            });
          } catch (error) {
            console.error("Error parsing operate_data:", error);
          }
        });

        // Convert output data to CSV format
        const csvContent = convertToCSV(outputData);

        // Write the output CSV file
        fs.writeFileSync(outputFilename, csvContent);
        console.log(`Comments extracted and saved to: ${outputFilename}`);
      })
      .on("error", (error) => {
        console.error("Error processing CSV:", error);
      });
  } catch (error) {
    console.error("Error:", error);
  }
}

// Call the main function with your input and output file paths
processCSV("./operate.csv", "comments.csv");
