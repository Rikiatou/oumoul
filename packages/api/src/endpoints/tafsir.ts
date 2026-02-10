import { apiRoutes } from "@oumoul/config";
import { HttpClient } from "../http-client";
import type { TafsirRequest, TafsirResponse } from "../types";
import { buildQuery } from "../utils";

export interface TafsirSourceInfo {
  key: string;
  name: string;
  author: string | null;
  locale: "fr" | "en" | "ar" | null;
}

export interface TafsirSourcesResponse {
  sources: TafsirSourceInfo[];
}

export function createTafsirApi(client: HttpClient) {
  const base = `${apiRoutes.backend.tafsir ?? "/tafsir"}`;

  return {
    listSources(locale?: "fr" | "en" | "ar") {
      const query = locale ? buildQuery({ locale }) : "";
      return client.request<TafsirSourcesResponse>(`${base}/sources${query}`, {
        method: "GET",
      });
    },
    getTafsir(params: TafsirRequest) {
      const query = buildQuery({
        surah: params.surah,
        ayah: params.ayah,
        locale: params.locale,
        source: params.source,
      });
      return client.request<TafsirResponse>(`${base}${query}`, {
        method: "GET",
      });
    },
  } as const;
}
