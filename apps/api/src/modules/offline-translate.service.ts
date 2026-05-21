import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ChildProcessWithoutNullStreams, execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import * as path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

type PendingRequest = {
  reject: (reason?: unknown) => void;
  resolve: (translations: string[]) => void;
};

@Injectable()
export class OfflineTranslateService implements OnModuleDestroy {
  private readonly logger = new Logger(OfflineTranslateService.name);
  private readonly cache = new Map<string, string>();
  private readonly enabled = process.env.OFFLINE_TRANSLATE_ENABLED !== "false";
  private readonly pythonPath = process.env.PYTHON_PATH?.trim();
  private readonly modelName = process.env.MARIAN_MODEL_NAME?.trim() || "Helsinki-NLP/opus-mt-en-zh";
  private readonly hfHome = process.env.HF_HOME?.trim() || path.join(process.cwd(), ".hf-cache");
  private readonly scriptPath = path.join(process.cwd(), "scripts", "translate_marian.py");
  private readonly workerEnv = {
    ...process.env,
    PYTHONIOENCODING: "utf-8",
    HF_HOME: this.hfHome,
    TRANSFORMERS_CACHE: path.join(this.hfHome, "transformers"),
    HUGGINGFACE_HUB_CACHE: path.join(this.hfHome, "hub"),
    HF_HUB_DISABLE_SYMLINKS_WARNING: "1",
    MARIAN_MODEL_NAME: this.modelName
  };
  private hasLoggedProbe = false;
  private worker?: ChildProcessWithoutNullStreams;
  private workerReady?: Promise<void>;
  private readonly pending = new Map<string, PendingRequest>();

  async translateEnToZh(text: string): Promise<string | null> {
    const results = await this.translateEnToZhBatch([text]);
    return results[0] ?? null;
  }

  async translateEnToZhBatch(texts: string[]): Promise<string[]> {
    const cleaned = texts.map((text) => text.trim());
    const results = new Array<string>(cleaned.length).fill("");
    if (!this.enabled) return results;
    if (!existsSync(this.scriptPath)) {
      this.logger.warn(`Marian translator script not found: ${this.scriptPath}`);
      return results;
    }

    const uncachedIndexes: number[] = [];
    const uncachedTexts: string[] = [];

    cleaned.forEach((text, index) => {
      if (!text) return;
      const hit = this.cache.get(text);
      if (hit) {
        results[index] = hit;
        return;
      }
      uncachedIndexes.push(index);
      uncachedTexts.push(text);
    });

    if (!uncachedTexts.length) return results;

    try {
      const translated = await this.translateViaWorker(uncachedTexts);
      uncachedIndexes.forEach((resultIndex, index) => {
        const value = translated[index]?.trim() ?? "";
        if (!value) return;
        results[resultIndex] = value;
        this.cache.set(cleaned[resultIndex], value);
      });
      return results;
    } catch (error) {
      if (!this.hasLoggedProbe) {
        this.hasLoggedProbe = true;
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Persistent Marian worker failed: ${message}`);
      }
    }

    const fallback = await this.translateViaOneShot(uncachedTexts);
    uncachedIndexes.forEach((resultIndex, index) => {
      const value = fallback[index]?.trim() ?? "";
      if (!value) return;
      results[resultIndex] = value;
      this.cache.set(cleaned[resultIndex], value);
    });
    return results;
  }

  async onModuleDestroy() {
    if (this.worker && !this.worker.killed) {
      this.worker.kill();
    }
  }

  private async translateViaWorker(texts: string[]): Promise<string[]> {
    await this.ensureWorker();
    const worker = this.worker;
    if (!worker) throw new Error("worker_unavailable");

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const payload = JSON.stringify({ id: requestId, texts });

    return await new Promise<string[]>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      worker.stdin.write(`${payload}\n`, "utf-8", (error) => {
        if (!error) return;
        this.pending.delete(requestId);
        reject(error);
      });
    });
  }

  private async ensureWorker() {
    if (this.worker && !this.worker.killed) return;
    if (this.workerReady) {
      await this.workerReady;
      return;
    }

    this.workerReady = this.startWorker();
    try {
      await this.workerReady;
    } finally {
      this.workerReady = undefined;
    }
  }

  private async startWorker() {
    const runner = this.getRunner();
    this.worker = spawn(runner.cmd, [...runner.args, this.scriptPath, "--worker"], {
      env: this.workerEnv,
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    const worker = this.worker;
    const rl = createInterface({ input: worker.stdout });

    rl.on("line", (line) => {
      try {
        const payload = JSON.parse(line) as { error?: string; id: string; translations?: string[] };
        const pending = this.pending.get(payload.id);
        if (!pending) return;
        this.pending.delete(payload.id);
        if (payload.error) {
          pending.reject(new Error(payload.error));
          return;
        }
        pending.resolve(payload.translations ?? []);
      } catch (error) {
        this.logger.warn(`Failed to parse Marian worker output: ${String(error)}`);
      }
    });

    worker.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf-8").trim();
      if (!message) return;
      if (message.includes("Loading weights")) return;
      if (message.includes("max_new_tokens")) return;
      if (message.includes("HF Hub")) return;
      this.logger.warn(message);
    });

    worker.on("exit", () => {
      this.worker = undefined;
      const pendingEntries = Array.from(this.pending.entries());
      this.pending.clear();
      pendingEntries.forEach(([, pending]) => pending.reject(new Error("worker_exited")));
    });
  }

  private async translateViaOneShot(texts: string[]): Promise<string[]> {
    const payload = JSON.stringify(texts);
    const runner = this.getRunner();
    const { stdout } = await execFileAsync(
      runner.cmd,
      [...runner.args, this.scriptPath, payload],
      {
        windowsHide: true,
        timeout: 120000,
        maxBuffer: 8 * 1024 * 1024,
        env: this.workerEnv
      }
    );
    return JSON.parse(stdout) as string[];
  }

  private getRunner() {
    if (this.pythonPath) {
      return { cmd: this.pythonPath, args: [] };
    }
    return { cmd: "python", args: [] };
  }
}
