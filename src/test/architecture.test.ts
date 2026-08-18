/// <reference types="node" />
// @vitest-environment node

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import * as ts from "typescript";

import { describe, expect, test } from "vitest";

const sourceRoot = path.resolve("src");
const serviceRoot = path.join(sourceRoot, "services");
const mockAdapterRoot = path.join(serviceRoot, "mock");
const dataMockRoot = path.join(sourceRoot, "data", "mock");

async function sourceFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return sourceFiles(entryPath);
      }
      return /\.(ts|tsx)$/.test(entry.name) ? [entryPath] : [];
    }),
  );

  return nested.flat();
}

function importedModuleNames(source: string): readonly string[] {
  return ts
    .preProcessFile(source, true, true)
    .importedFiles.map(({ fileName }) => fileName);
}

function resolveProjectImport(
  importer: string,
  moduleName: string,
): string | undefined {
  if (moduleName.startsWith(".")) {
    return path.resolve(path.dirname(importer), moduleName);
  }

  const normalizedName = moduleName.replaceAll("\\", "/");
  return normalizedName.startsWith("src/")
    ? path.resolve(normalizedName)
    : undefined;
}

function isWithin(candidate: string, directory: string): boolean {
  const relativePath = path.relative(directory, candidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !path.isAbsolute(relativePath))
  );
}

function displayPath(file: string): string {
  return path.relative(process.cwd(), file).replaceAll("\\", "/");
}

function isTestFile(file: string): boolean {
  return /\.(?:test|spec)\.[jt]sx?$/.test(file);
}

describe("frontend dependency boundaries", () => {
  test("resolves barrel imports to their forbidden layer roots", () => {
    const importer = path.join(
      sourceRoot,
      "features",
      "foundation",
      "example.tsx",
    );

    expect(resolveProjectImport(importer, "../../services")).toBe(serviceRoot);
    expect(resolveProjectImport(importer, "../../data/mock")).toBe(dataMockRoot);
  });

  test("presentation layers do not import services or mock fixtures", async () => {
    const presentationRoots = [
      path.join(sourceRoot, "components"),
      path.join(sourceRoot, "features"),
    ];
    const files = (
      await Promise.all(presentationRoots.map(sourceFiles))
    )
      .flat()
      .filter((file) => !isTestFile(file));

    for (const file of files) {
      const contents = await readFile(file, "utf8");
      for (const moduleName of importedModuleNames(contents)) {
        const importedPath = resolveProjectImport(file, moduleName);
        if (!importedPath) {
          continue;
        }

        const importsForbiddenLayer =
          isWithin(importedPath, serviceRoot) ||
          isWithin(importedPath, dataMockRoot);
        expect(
          importsForbiddenLayer,
          `${displayPath(file)} imports forbidden presentation dependency ${moduleName}`,
        ).toBe(false);
      }
    }
  });

  test("outside fixtures, only mock service adapters import typed fixtures", async () => {
    const files = (await sourceFiles(sourceRoot)).filter(
      (file) => !isTestFile(file),
    );

    for (const file of files) {
      const contents = await readFile(file, "utf8");
      for (const moduleName of importedModuleNames(contents)) {
        const importedPath = resolveProjectImport(file, moduleName);
        if (
          !importedPath ||
          !isWithin(importedPath, dataMockRoot) ||
          isWithin(file, dataMockRoot)
        ) {
          continue;
        }

        const isMockAdapter = isWithin(file, mockAdapterRoot);
        expect(
          isMockAdapter,
          `${displayPath(file)} imports mock fixture ${moduleName}`,
        ).toBe(true);
      }
    }
  });
});
