import type {
  ConnectivityCompareInput,
  ConnectivityCompareResult,
  ConnectivityProduct,
} from "../../types";
import type {
  ConnectivityRepository,
  RequestOptions,
} from "../contracts";
import { delay, throwIfAborted, withAbort } from "../request-utils";
import { MilestoneUnavailableError } from "../service-errors";

let productsPromise: Promise<readonly ConnectivityProduct[]> | undefined;

function loadProducts(): Promise<readonly ConnectivityProduct[]> {
  productsPromise ??= import("../../data/mock/connectivity-products")
    .then(({ mockConnectivityProducts }) => mockConnectivityProducts)
    .catch((error: unknown) => {
      productsPromise = undefined;
      throw error;
    });
  return productsPromise;
}

export class MockConnectivityRepository implements ConnectivityRepository {
  readonly #promiseCache = new Map<string, Promise<unknown>>();

  constructor(private readonly latencyMs = 80) {}

  listProducts(
    portIds: readonly string[],
    options: RequestOptions = {},
  ): Promise<readonly ConnectivityProduct[]> {
    const uniqueIds = [...new Set(portIds)].sort();
    const key = `products:${uniqueIds.join(",")}`;
    const operation = this.#cached(key, async () => {
      const [, products] = await Promise.all([
        delay(this.latencyMs),
        loadProducts(),
      ]);
      if (uniqueIds.length === 0) {
        return [];
      }

      return products.filter((product) =>
        product.coverage.some((coverage) =>
          coverage.portIds.some((portId) => uniqueIds.includes(portId)),
        ),
      );
    });
    return withAbort(operation, options.signal);
  }

  compare(
    input: ConnectivityCompareInput,
    options: RequestOptions = {},
  ): Promise<ConnectivityCompareResult> {
    throwIfAborted(options.signal);
    void input;
    return Promise.reject(
      new MilestoneUnavailableError(
        "Milestone F5",
        "Multi-port connectivity comparison",
      ),
    );
  }

  #cached<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.#promiseCache.get(key);
    if (cached) {
      return cached as Promise<T>;
    }

    const operation = factory();
    this.#promiseCache.set(key, operation);
    operation.catch(() => this.#promiseCache.delete(key));
    return operation;
  }
}
