import axios from "axios";
import express from "express";
import { MEMPOOL_URL } from "../config/config";

// Define a type for the new API response structure
interface BitcoinPrice {
  USD: number;
}

// Define a type for the Mempool Space API response structure for recommended fees
interface RecommendedFeesResponse {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

const utils = {
  getBTCUSD: async (req: express.Request, res: express.Response) => {
    const url = `${MEMPOOL_URL}/v1/prices`;
    try {
      console.log(`Sending request to ${url}`);
      // Specify the NewApiResponse type for the axios response
      const response = await axios.get<BitcoinPrice>(url);
      console.log("Response received:", response.data);
      // Directly access the USD price from the response
      const btcPriceUSD = Math.floor(response.data.USD);
      res.json({ btcprice: btcPriceUSD });
    } catch (error) {
      console.error("Error occurred:", error);
      if (axios.isAxiosError(error)) {
        // Error is an AxiosError
        console.error("Error response data:", error.response?.data);
        console.error("Error response status:", error.response?.status);
        console.error("Error response headers:", error.response?.headers);
      } else if (error instanceof Error) {
        // Error is a standard Error
        console.error("Error message:", error.message);
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  getRecommendedFees: async (req: express.Request, res: express.Response) => {
    const url = `${MEMPOOL_URL}/fees/recommended`;
    try {
      console.log(`Sending request to ${url}`);
      // Specify the RecommendedFeesResponse type for the axios response
      const response = await axios.get<RecommendedFeesResponse>(url);
      console.log("Response received:", response.data);
      // Since you want to return everything from the API, directly return the response
      res.json(response.data);
    } catch (error) {
      console.error("Error occurred:", error);
      if (axios.isAxiosError(error)) {
        // Error is an AxiosError
        console.error("Error response data:", error.response?.data);
        console.error("Error response status:", error.response?.status);
        console.error("Error response headers:", error.response?.headers);
      } else if (error instanceof Error) {
        // Error is a standard Error
        console.error("Error message:", error.message);
      }
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
};

export default utils;
