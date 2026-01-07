
import { GoogleGenAI, Type } from "@google/genai";
import { Product, CartItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async chatWithAssistant(message: string, products: Product[], cart: CartItem[]) {
    const context = `
      System: You are an expert Developer Support and ERP Assistant.
      Knowledge: The user has a local SQL database and needs to connect this web app to it via a local bridge/API.
      Context: 
      - Current local catalog size: ${products.length} records.
      - Bridge URL configured by user: (Available in app state).
      Task: 
      1. If the user asks technical questions about SQL, give them snippets for a local API (Node.js/Express, Python/Flask).
      2. If they ask about stock, use the provided catalog data.
      3. Be highly professional and technical. Use terms like 'CORS', 'JSON Payload', 'SQL Connector', and 'Endpoint'.
      
      Catalog Summary: ${JSON.stringify(products.slice(0, 5).map(p => `${p.name} (SKU: ${p.code})`))}
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${context}\nUser: ${message}`,
      });
      return response.text;
    } catch (error) {
      return "Hubo un error al consultar el motor de IA. Verifique su API Key.";
    }
  }
};
