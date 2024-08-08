// Adjusted language detection logic
const languageKeywords = {
  javascript: ["function", "var", "let", "const", "=>", "import", "export"],
  python: ["def", "import", "self", "class", "print", "lambda"],
  java: ["public", "static", "void", "class", "import", "extends"],
  c: ["#include", "int", "void", "return", "struct"],
  csharp: ["using", "namespace", "class", "public", "void", "static"],
  cpp: ["#include", "int", "void", "return", "class", "namespace"],
  r: ["function", "library", "data.frame", "ggplot", "plot"],
  regex: ["\\d+", "\\w+", "\\s+", "\\b", "\\("],
  go: ["func", "package", "import", "var", "type"],
  sql: ["SELECT", "FROM", "WHERE", "JOIN", "INSERT"],
  html_css: ["<html>", "<head>", "<body>", "div", "span", "class"],
  bash: ["#!/bin/bash", "echo", "ls", "grep", "awk"],
};

const priorityWeights = {
  javascript: 1.0,
  python: 1.0,
  java: 1.0,
  c: 0.9,
  csharp: 0.9,
  cpp: 0.9,
  r: 0.8,
  regex: 0.8,
  go: 0.9,
  sql: 0.8,
  html_css: 0.7,
  bash: 0.7,
};

function detectLanguage(text) {
  const languageCounts = {};
  const textTokens = text
    .toLowerCase()
    .replace(/[.,;:!?()`\']/g, " ")
    .split(/\s+/);

  for (let lang in languageKeywords) {
    const positiveCount = languageKeywords[lang].reduce(
      (acc, keyword) =>
        acc + textTokens.filter((word) => word === keyword).length,
      0
    );
    languageCounts[lang] = positiveCount * (priorityWeights[lang] || 1.0);
  }

  const detectedLanguage = Object.keys(languageCounts).reduce((a, b) =>
    languageCounts[a] > languageCounts[b] ? a : b
  );

  return languageCounts[detectedLanguage] > 0 ? detectedLanguage : "unknown";
}

export async function analyzeCSV(metricsPromise, annotationsPromise) {
  try {
    const data = await metricsPromise;
    const annotationsData = await annotationsPromise;

    // Filter metricsData to include only rows where batch_id === 2
    const filteredData = data.filter((row) => row["batch_id"] === "2");

    // Filter annotationsData to exclude those with promptCheck === "Fail"
    const filteredAnnotationsData = annotationsData.filter(
      (annotation) => JSON.parse(annotation.operate_data).promptCheck === "Pass"
    );

    function getResponseRating(annotations) {
      const lineAnnotations = annotations?.lineAnnotations;

      if (!lineAnnotations) {
        // If lineAnnotations is null or undefined, return a neutral/default rating
        return "";
      }

      for (let annotation of lineAnnotations) {
        if (annotation[0] === -1) {
          return -1;
        }
      }
      return 1;
    }

    const results = filteredData.map((row) => {
      const resultRow = {
        task_id: row["task_id (uuid)"],
        language: detectLanguage(row["response_a"]),
      };

      // Find the corresponding annotation data for this task_id
      const annotation = filteredAnnotationsData.find(
        (a) => a["task_id"] === row["task_id (uuid)"]
      );

      if (annotation) {
        const operateData = JSON.parse(annotation.operate_data);

        ["response_a", "response_b"].forEach((response) => {
          const text = row[response];
          resultRow[`${response}_character_count`] = text.length;
          resultRow[`${response}_line_count`] = text.split("\n").length;

          const annotationKey =
            response === "response_a" ? "responseA" : "responseB";
          const responseAnnotations = operateData[annotationKey];

          resultRow[`${response}_rating`] = responseAnnotations
            ? getResponseRating(responseAnnotations)
            : "";
        });
      } else {
        // If no annotations are found, populate the metrics but leave ratings blank
        ["response_a", "response_b"].forEach((response) => {
          const text = row[response];
          resultRow[`${response}_character_count`] = text.length;
          resultRow[`${response}_line_count`] = text.split("\n").length;
          resultRow[`${response}_rating`] = "Off Scope";
        });
      }

      return { ...resultRow };
    });

    return results;
  } catch (error) {
    console.error("Error processing CSV:", error);
  }
}
