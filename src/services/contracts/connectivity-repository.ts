import type {
  ConnectivityCompareInput,
  ConnectivityCompareResult,
  ConnectivityProduct,
} from "../../types";
import type { RequestOptions } from "./request-context";

export interface ConnectivityRepository {
  listProducts(
    portIds: readonly string[],
    options?: RequestOptions,
  ): Promise<readonly ConnectivityProduct[]>;

  compare(
    input: ConnectivityCompareInput,
    options?: RequestOptions,
  ): Promise<ConnectivityCompareResult>;
}
