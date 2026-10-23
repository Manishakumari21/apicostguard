import { useState } from "react";

const PROVIDERS = ["Gemini", "OpenAI", "Anthropic", "OpenRouter", "Groq", "Ollama", "LM Studio"];
const TOOLS = ["Cursor", "Claude Code", "Scripts"];

export default function Landing() {
  const [tab, setTab] = useState<"mac" | "win" | "dev">("mac");
  const [copied, setCopied] = useState(false);

  const commands: Record<string, string> = {
    mac: "curl -fsSL https://raw.githubusercontent.com/Manishakumari21/apicostguard/main/scripts/install.sh | sh",
    win: "irm https://raw.githubusercontent.com/Manishakumari21/apicostguard/main/scripts/install.ps1 | iex",
    dev: "cd backend && cargo run\n# then: cd frontend/apicostguard && npm install && npm run dev",
  };

  async function copy() {
    try {
      await navigator.clipboard.writeText(commands[tab]);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b1220] text-slate-100">
      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight">See and cap your AI API spend</h1>
        <p className="mt-4 text-lg text-slate-300">
          APICostGuard sits between your AI tools and providers, logging tokens, latency, and cost for every request.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <a href="#quickstart" className="rounded-lg bg-teal-500 px-5 py-3 font-medium text-slate-900">Get started</a>
          <a href="https://github.com/Manishakumari21/apicostguard" className="rounded-lg border border-slate-600 px-5 py-3">View on GitHub</a>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold">Works with your tools</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {TOOLS.map((t) => (
            <span key={t} className="rounded-full border border-slate-700 px-4 py-2 text-sm">{t}</span>
          ))}
        </div>
        <h2 className="mt-8 text-2xl font-semibold">Routes to providers</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {PROVIDERS.map((p) => (
            <span key={p} className="rounded-full border border-slate-700 px-4 py-2 text-sm">{p}</span>
          ))}
        </div>
      </section>

      <section id="quickstart" className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-2xl font-semibold">Quick start</h2>
        <div role="tablist" className="mt-4 flex gap-2">
          {(["mac", "win", "dev"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm ${tab === k ? "bg-teal-500 text-slate-900" : "bg-slate-800"}`}>
              {k === "mac" ? "macOS & Linux" : k === "win" ? "Windows" : "Developers"}
            </button>
          ))}
        </div>
        <div className="mt-4 rounded-lg bg-slate-900 p-4 font-mono text-sm">
          <pre className="whitespace-pre-wrap">{commands[tab]}</pre>
          <button onClick={copy} className="mt-3 rounded bg-teal-500 px-3 py-1 text-slate-900">
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <ol className="mt-4 list-decimal space-y-1 pl-5 text-slate-300">
          <li>Install APICostGuard</li>
          <li>Add an API key in the app</li>
          <li>Point your tool at http://127.0.0.1:8080/v1/chat/completions</li>
        </ol>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-2xl font-semibold">Features</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold">1. Visibility</h3>
            <p className="mt-2 text-slate-300">Track tokens, latency, and cost per request.</p>
          </div>
          <div className="rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold">2. Budgets</h3>
            <p className="mt-2 text-slate-300">Daily and monthly limits with alerts and optional blocking.</p>
          </div>
          <div className="rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold">3. Projects</h3>
            <p className="mt-2 text-slate-300">Usage tracked per project.</p>
          </div>
          <div className="rounded-xl border border-slate-700 p-6">
            <h3 className="font-semibold">4. Privacy</h3>
            <p className="mt-2 text-slate-300">Runs locally; keys stored in the OS keychain.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-12">
        <h2 className="text-2xl font-semibold">FAQ</h2>
        <div className="mt-4 space-y-4 text-slate-300">
          <p><strong>Does it send my data anywhere?</strong> No, it runs locally.</p>
          <p><strong>Which providers?</strong> Gemini, OpenAI, Anthropic, OpenRouter, Groq, Ollama, LM Studio.</p>
          <p><strong>Does it block requests?</strong> Optionally, when budgets are exceeded.</p>
          <p><strong>Where are keys stored?</strong> In the OS keychain.</p>
          <p><strong>Can I use local models?</strong> Yes, Ollama and LM Studio.</p>
        </div>
      </section>

      <footer className="border-t border-slate-700 px-6 py-8 text-center text-sm text-slate-400">
        <a href="https://github.com/Manishakumari21/apicostguard" className="hover:text-white">GitHub</a>
        {" · "}
        <a href="https://github.com/Manishakumari21/apicostguard/releases" className="hover:text-white">Releases</a>
        {" · "}
        <span>MIT license</span>
      </footer>
    </main>
  );
}