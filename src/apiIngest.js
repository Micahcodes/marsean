import axios from "axios";

export async function fetchApiData(url, params = {}, headers = {}) {
  try {
    const requestParams = { ...params };
    if (
      requestParams.limit == null &&
      requestParams.first == null &&
      requestParams.page_size == null
    ) {
      requestParams.limit = 10;
    }

    const response = await axios.get(url, { params: requestParams, headers });
    return response.data;
  } catch (error) {
    console.error("API ingest error:", error.message || error);
    throw error;
  }
}
