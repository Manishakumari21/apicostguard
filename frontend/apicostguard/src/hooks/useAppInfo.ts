import { useMemo } from "react";
import { getAppInfo } from "../services/appInfo";
import { useGatewayQuery } from "./useGatewayQuery";

const APP_INFO_KEY = ["app-info"];

export function useAppInfo() {
  const key = useMemo(() => APP_INFO_KEY, []);
  return useGatewayQuery(() => getAppInfo(), key);
}