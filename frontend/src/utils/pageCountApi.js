/**
 * Page Count API Client
 *
 * Calls the page_count Lambda function to get the exact PDF page count
 * of a DOCX file. Used to validate resumes are exactly 1 page.
 */

const PAGE_COUNT_BASE =
  import.meta.env.VITE_PAGE_COUNT_URL || "http://localhost:9000";

// If the URL is a local proxy path (e.g. "/page-count"), use it directly.
// The proxy configuration (vite.config.js) handles the rewrite to the Lambda path.
// If it's a localhost URL, append the standard RIE path.
// Otherwise (production Lambda URL), use it as is.
let LAMBDA_ENDPOINT = PAGE_COUNT_BASE;
if (PAGE_COUNT_BASE.includes("localhost") && !PAGE_COUNT_BASE.startsWith("/")) {
  LAMBDA_ENDPOINT = `${PAGE_COUNT_BASE}/2015-03-31/functions/function/invocations`;
}

/**
 * Get the page count of a DOCX blob by calling the page_count Lambda
 *
 * @param {Blob} docxBlob - The DOCX file as a Blob
 * @returns {Promise<{page_count: number}>} - The page count result
 * @throws {Error} - If the request fails or times out
 */
export async function getPageCount(docxBlob) {
  // Convert blob to base64
  const arrayBuffer = await docxBlob.arrayBuffer();
  const base64Content = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  );

  const requestBody = {
    body: base64Content,
    filename: "resume.docx",
    content_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };

  const response = await fetch(LAMBDA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(
      `Page count service error: ${response.status} ${response.statusText}`,
    );
  }

  const result = await response.json();

  // Handle Lambda response format
  if (result.statusCode === 200) {
    return result.body;
  } else if (result.body?.error) {
    throw new Error(`Page count error: ${result.body.error}`);
  }

  // Direct response format (for local testing)
  if (typeof result.page_count === "number") {
    return result;
  }

  throw new Error("Unexpected response format from page count service");
}

/**
 * Validate that a DOCX blob is exactly 1 page, with retry loop
 *
 * @param {Blob} docxBlob - The DOCX file as a Blob
 * @param {Object} options - Validation options
 * @param {number} options.maxAttempts - Maximum retry attempts (default: 5)
 * @param {Function} options.onProgress - Progress callback: (message, attempt, maxAttempts) => void
 * @param {Function} options.onCompress - Callback to compress and regenerate: () => Promise<Blob>
 * @returns {Promise<{valid: boolean, page_count: number, attempts: number}>}
 */
export async function validateSinglePage(docxBlob, options = {}) {
  const { maxAttempts = 5, onProgress = () => {}, onCompress = null } = options;

  let currentBlob = docxBlob;
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;

    onProgress(
      `Validating page count (attempt ${attempt}/${maxAttempts})...`,
      attempt,
      maxAttempts,
    );

    try {
      const result = await getPageCount(currentBlob);
      const pageCount = result.page_count;

      if (pageCount === 1) {
        onProgress(`✅ Validated: exactly 1 page`, attempt, maxAttempts);
        return { valid: true, page_count: 1, attempts: attempt };
      }

      // More than 1 page - need to compress
      if (pageCount > 1) {
        onProgress(
          `⚠️ Document is ${pageCount} pages. Compressing layout...`,
          attempt,
          maxAttempts,
        );

        if (onCompress && attempt < maxAttempts) {
          // Let the caller handle compression and regeneration
          currentBlob = await onCompress(attempt, pageCount);
          continue;
        } else {
          // No compression callback or max attempts reached
          return { valid: false, page_count: pageCount, attempts: attempt };
        }
      }

      // 0 pages (empty) - shouldn't happen but handle it
      return { valid: false, page_count: pageCount, attempts: attempt };
    } catch (error) {
      console.error(`Page count validation error (attempt ${attempt}):`, error);

      // If this is the last attempt, throw
      if (attempt >= maxAttempts) {
        throw new Error(
          `Page count validation failed after ${attempt} attempts: ${error.message}`,
        );
      }

      onProgress(`⚠️ Validation error, retrying...`, attempt, maxAttempts);
    }
  }

  return { valid: false, page_count: -1, attempts: attempt };
}

/**
 * Check if page count service is available
 *
 * @returns {Promise<boolean>} - True if service is reachable
 */
export async function isPageCountServiceAvailable() {
  try {
    // Try a simple health check by sending a valid dummy payload
    const response = await fetch(LAMBDA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send a minimal valid base64 string to avoid "expecting value" errors
      body: JSON.stringify({
        body: "UERG",
        filename: "healthcheck.pdf",
      }),
      signal: AbortSignal.timeout(3000),
    });
    return true; // Service responded
  } catch (error) {
    console.warn("Page count service unavailable:", error.message);
    return false;
  }
}
