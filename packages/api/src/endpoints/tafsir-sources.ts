import { apiRoutes } from "@oumoul/config";
import type { HttpClient } from "../http-client";

export interface TafsirSourceInfo {
  key: string;
  name: string;
  author: string | null;
  locale: "fr" | "en" | "ar" | null;
}

export interface TafsirSourcesResponse {
  sources: TafsirSourceInfo[];
}

export function createTafsirSourcesApi(client: HttpClient) {
  const base = `${apiRoutes.backend.tafsir ?? "/tafsir"}/sources`;

  return {
    list(locale?: "fr" | "en" | "ar") {
      const query = locale ? `?locale=${encodeURIComponent(locale)}` : "";
      return client.request<TafsirSourcesResponse>(`${base}${query}`, {
        method: "GET",
      });
    },
  } as const;
}
