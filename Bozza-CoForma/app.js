import * as THREE from "three";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const PHASE = {
  priorities: "Fase 01 · Priorità",
  variants: "Fase 02 · Varianti",
  warning: "Fase 03 · Diagnosi",
  tradeoff: "Fase 04 · Trade-off",
};

const screens = [...document.querySelectorAll(".screen")];
const steps = [...document.querySelectorAll(".step")];
const statusPhase = document.getElementById("status-phase");
const statusClock = document.getElementById("status-clock");
const toastEl = document.getElementById("toast");
let toastTimer;

function toast(message) {
  if (!toastEl) return;
  toastEl.hidden = false;
  toastEl.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 2200);
}

function show(id) {
  screens.forEach((screen) => {
    const on = screen.id === `screen-${id}`;
    screen.classList.toggle("is-on", on);
    screen.hidden = !on;
  });
  steps.forEach((step) => {
    const on = step.dataset.go === id;
    step.classList.toggle("is-on", on);
    if (on) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
  });
  if (statusPhase) statusPhase.textContent = PHASE[id] || "";
  if (id !== "variants") closeVariantExplorer?.();
  window.dispatchEvent(new Event("resize"));
}

document.querySelectorAll("[data-go]").forEach((el) => {
  el.addEventListener("click", () => show(el.dataset.go));
});

function tickClock() {
  if (!statusClock) return;
  statusClock.textContent = new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
tickClock();
setInterval(tickClock, 30000);

/* —— Workspace nav —— */
const workspacePanel = document.getElementById("workspace-panel");
const workspacePanelTitle = document.getElementById("workspace-panel-title");
const workspacePanelBody = document.getElementById("workspace-panel-body");

const NAV_PANELS = {
  history: {
    title: "Cronologia decisioni",
    body: "Nessun evento registrato in questa sessione. Le scelte su priorità, Strategy e trade-off compariranno qui.",
  },
  notes: {
    title: "Note di team",
    body: "Tasto Microonde — verificare fillet ≥0.6 mm sul boss clip prima dell’export; allineare layer 0.20 mm con lab snap-fit; tenere resistenza clip prioritaria rispetto all’estetica.",
  },
};

function setWorkspacePanel(key) {
  const content = NAV_PANELS[key];
  if (!workspacePanel || !content) {
    if (workspacePanel) workspacePanel.hidden = true;
    return;
  }
  if (workspacePanelTitle) workspacePanelTitle.textContent = content.title;
  if (workspacePanelBody) workspacePanelBody.textContent = content.body;
  workspacePanel.hidden = false;
}

function activateNavItem(btn) {
  document.querySelectorAll(".nav-item").forEach((b) => {
    b.classList.remove("is-active");
    b.removeAttribute("aria-current");
  });
  btn.classList.add("is-active");
  btn.setAttribute("aria-current", "page");
}

document.querySelectorAll(".nav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.nav;
    activateNavItem(btn);

    if (action === "model") {
      setWorkspacePanel(null);
      show("priorities");
      toast("Mesh attiva · Tasto Microonde.3mf");
      return;
    }
    if (action === "params") {
      setWorkspacePanel(null);
      show("priorities");
      const slider = document.getElementById("pri-res");
      slider?.focus({ preventScroll: true });
      document.getElementById("pane-priorities")?.scrollIntoView({ block: "nearest" });
      toast("Parametri aperti · priorità sessione");
      return;
    }
    if (action === "export") {
      setWorkspacePanel(null);
      show("tradeoff");
      toast("Apri schermata export / trade-off");
      return;
    }
    if (action === "history" || action === "notes") {
      setWorkspacePanel(action);
      toast(NAV_PANELS[action].title);
      return;
    }
  });
});

/* —— Priority labels —— */
const levels = ["molto bassa", "bassa", "media", "alta", "molto alta"];
function bindPriority(inputId, labelId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  if (!input || !label) return;
  const sync = () => {
    const text = levels[Number(input.value) - 1] || "";
    label.textContent = text;
    input.setAttribute("aria-valuetext", text);
  };
  input.addEventListener("input", sync);
  sync();
}
bindPriority("pri-res", "lab-res");
bindPriority("pri-asm", "lab-asm");
bindPriority("pri-est", "lab-est");

/* —— Strategy catalog + explorer —— */
const STRATEGIES = {
  1: {
    id: 1,
    code: "Strategy 01",
    name: "Clip aggressiva",
    tag: "Inserimento rapido",
    eyebrow: "Strategy 01",
    fit: 62,
    fitClass: "",
    recommended: false,
    sintesi:
      "Questa strategy allunga i ganci e alleggerisce la base per favorire uno scatto rapido nel frontalino. È pensata per montaggi dove la velocità di inserimento conta più della vita a fatica della clip.",
    what:
      "Ganci più lunghi rispetto al pezzo di partenza, spessore ridotto alla radice e base relativamente sottile. Il percorso di deformazione della clip è più ampio: entra facilmente, ma accumula tensione sullo snodo.",
    why:
      "Quando l’assemblaggio deve avvenire in pochi gesti (linea corta, prova rapida su frontalino), l’aggressività geometrica riduce la forza di inserimento e accelera il ciclo di montaggio.",
    pros: [
      { title: "Montaggio veloce", text: "Pochi gesti e bassa resistenza all’ingresso nel frontalino." },
      { title: "Pochi interventi CAD", text: "Modifica concentrata su lunghezza gancio e base: intervento paramétrico contenuto." },
    ],
    cons: [
      { title: "Rischio rottura allo scatto", text: "La radice della clip lavora vicino al limite: cricche o snervamento dopo pochi cicli, soprattutto in PLA." },
      { title: "Poca margine di errore", text: "Tolleranze di stampa e umidità del filamento pesano subito sulla tenuta." },
    ],
    impact: [
      { k: "Resistenza clip", level: "risk", levelLabel: "critica", text: "Priorità alta non è soddisfatta: Fit basso sul vincolo principale della sessione." },
      { k: "Assemblaggio", level: "high", levelLabel: "forte", text: "Ottimo allineamento al vincolo di montaggio rapido." },
      { k: "Estetica", level: "mid", levelLabel: "neutra", text: "Impatto estetico limitato; la base più sottile può trasparire leggermente." },
    ],
    risks: [
      { k: "Clip", text: "Flessione / cricca alla radice sotto scatto ripetuto. Raccordo ≥ 1.2 mm consigliato se si insiste su questa via." },
      { k: "Boss", text: "Boss restano secondari: non compensano la debolezza dello snodo clip." },
      { k: "Base", text: "Base sottile può flettere durante l’inserimento e alterare l’allineamento." },
    ],
    when: "Sceglila solo per smoke-test di montaggio o prototipi monouso, non per pezzi con resistenza clip come priorità alta.",
  },
  2: {
    id: 2,
    code: "Strategy 02",
    name: "Clip + boss bilanciati",
    tag: "Tenuta e montaggio",
    eyebrow: "Strategy 02 · consigliata",
    fit: 91,
    fitClass: "good",
    recommended: true,
    sintesi:
      "Strategy consigliata dalla sessione corrente: bilancia ganci di lunghezza media, boss rinforzati e raccordo alla base. Allinea resistenza clip e assemblaggio senza sacrificare troppo materiale.",
    what:
      "Ganci medi (né aggressivi né corti), boss con parete più generosa e raccordo alla radice della clip. La base resta compatta ma non alleggerita oltre soglia.",
    why:
      "Con priorità alte su resistenza clip e assemblaggio (estetica bassa), il ranking punta a un compromesso sostenibile: tenuta allo scatto e montaggio ancora praticabile in linea.",
    pros: [
      { title: "Tenuta sostenibile", text: "Lo snodo lavora con margine maggiore; meno rischio di rottura ai primi cicli." },
      { title: "Montaggio ancora agevole", text: "Forza di inserimento accettabile senza richiedere utensili speciali." },
      { title: "Boss più robusti", text: "Riduce ovalizzazione al serraggio rispetto alle varianti alleggerite." },
    ],
    cons: [
      { title: "Leggero aumento materiale", text: "Boss e raccordi aggiungono volume e qualche minuto di stampa." },
      { title: "Calibrazione necessaria", text: "Il fillet va applicato in CAD da te; CoForma non lo esegue automaticamente." },
    ],
    impact: [
      { k: "Resistenza clip", level: "high", levelLabel: "alta", text: "Allineata al vincolo primario della sessione (Fit ~91)." },
      { k: "Assemblaggio", level: "high", levelLabel: "alta", text: "Montaggio ancora sostenibile senza clip iper-aggressive." },
      { k: "Estetica", level: "low", levelLabel: "bassa priorità", text: "Boss un po’ più evidenti: accettabile dato il peso basso dell’estetica." },
    ],
    risks: [
      { k: "Clip", text: "Hotspot residuo alla radice: applicare fillet ≥ 1.2 mm e ricontrollare la diagnosi." },
      { k: "Boss", text: "Ovalizzazione possibile se la coppia di serraggio è eccessiva in prova." },
      { k: "Base", text: "Rischio basso se si mantiene lo spessore attuale e il raccordo." },
    ],
    when: "Scelta di default per questo pezzo con le priorità attuali. Procedi in diagnosi, applica il fillet in CAD, poi trade-off ed export.",
  },
  3: {
    id: 3,
    code: "Strategy 03",
    name: "Alleggerita",
    tag: "Meno materiale",
    eyebrow: "Strategy 03",
    fit: 48,
    fitClass: "",
    recommended: false,
    sintesi:
      "Riduce pareti e accorcia i boss per tagliare filamento e tempo macchina. Utile in esplorazione di costo, ma confligge con resistenza clip e stabilità della base.",
    what:
      "Pareti alleggerite, boss più corti, meno materiale nella base. La clip resta presente ma con meno sostegno strutturale circostante.",
    why:
      "Quando il vincolo dominante è tempo/materiale (non in questa sessione), l’alleggerimento accelera le stampe di screening.",
    pros: [
      { title: "Leggera ed economica", text: "Meno filamento e ciclo macchina più corto." },
      { title: "Iterazioni rapide", text: "Utile per smoke-test di forma generale, non di tenuta." },
    ],
    cons: [
      { title: "Flessione sulla base", text: "Sotto carico la base cede e deallinea clip e boss." },
      { title: "Boss deboli", text: "Ovalizzazione e tenuta vite più critiche." },
    ],
    impact: [
      { k: "Resistenza clip", level: "risk", levelLabel: "bassa", text: "In contrasto netto con la priorità alta della sessione." },
      { k: "Assemblaggio", level: "mid", levelLabel: "media", text: "Inserimento possibile ma pezzo meno stabile a montaggio completato." },
      { k: "Estetica", level: "low", levelLabel: "variabile", text: "Superfici più sottili possono mostrare densità di infill." },
    ],
    risks: [
      { k: "Clip", text: "Supporto insufficiente intorno allo snodo → flessione eccessiva." },
      { k: "Boss", text: "Boss corti e sottili: rischio ovalizzazione al serraggio." },
      { k: "Base", text: "Flessione primaria sotto carico — warning tipico di questa strategy." },
    ],
    when: "Solo se abbassi esplicitamente la priorità di resistenza clip e accetti un pezzo da screening, non da validazione funzionale.",
  },
};

let activeStrategyId = 2;
let selectedStrategyId = 2;
const explorerEl = document.getElementById("variant-explorer");
const galleryEl = document.getElementById("variants-gallery");

function levelClass(level) {
  if (level === "high") return "high";
  if (level === "mid") return "mid";
  if (level === "risk") return "risk";
  return "low";
}

function renderVariantSections(strategy) {
  const host = document.getElementById("variant-sections");
  if (!host) return;
  host.innerHTML = `
    <details class="variant-section" open>
      <summary>Sintesi · What &amp; Why</summary>
      <div class="variant-section-body">
        <p class="lead"></p>
        <p><strong>What.</strong> <span data-f="what"></span></p>
        <p><strong>Why.</strong> <span data-f="why"></span></p>
      </div>
    </details>
    <details class="variant-section" open>
      <summary>Pro &amp; Contro · trade-off</summary>
      <div class="variant-section-body">
        <div class="trade-grid" data-f="trades"></div>
      </div>
    </details>
    <details class="variant-section" open>
      <summary>Impatto su priorità</summary>
      <div class="variant-section-body">
        <ul class="impact-list" data-f="impact"></ul>
      </div>
    </details>
    <details class="variant-section" open>
      <summary>Rischi geometrici sul pezzo</summary>
      <div class="variant-section-body">
        <ul class="risk-list" data-f="risks"></ul>
      </div>
    </details>
    <details class="variant-section" open>
      <summary>Quando sceglierla</summary>
      <div class="variant-section-body">
        <p data-f="when"></p>
      </div>
    </details>
  `;
  host.querySelector(".lead").textContent = strategy.sintesi;
  host.querySelector('[data-f="what"]').textContent = strategy.what;
  host.querySelector('[data-f="why"]').textContent = strategy.why;
  host.querySelector('[data-f="when"]').textContent = strategy.when;

  const trades = host.querySelector('[data-f="trades"]');
  strategy.pros.forEach((p) => {
    const el = document.createElement("div");
    el.className = "trade-item";
    el.innerHTML = `<strong>Pro · </strong>`;
    const title = document.createElement("span");
    title.textContent = p.title;
    const text = document.createElement("p");
    text.textContent = p.text;
    el.querySelector("strong").append(title);
    el.append(text);
    trades.appendChild(el);
  });
  strategy.cons.forEach((c) => {
    const el = document.createElement("div");
    el.className = "trade-item";
    el.innerHTML = `<strong>Contro · </strong>`;
    const title = document.createElement("span");
    title.textContent = c.title;
    const text = document.createElement("p");
    text.textContent = c.text;
    el.querySelector("strong").append(title);
    el.append(text);
    trades.appendChild(el);
  });

  const impact = host.querySelector('[data-f="impact"]');
  strategy.impact.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="impact-k"></span><p class="impact-v"><span class="impact-level"></span><span class="impact-text"></span></p>`;
    li.querySelector(".impact-k").textContent = row.k;
    const badge = li.querySelector(".impact-level");
    badge.textContent = row.levelLabel;
    badge.classList.add(levelClass(row.level));
    li.querySelector(".impact-text").textContent = row.text;
    impact.appendChild(li);
  });

  const risks = host.querySelector('[data-f="risks"]');
  strategy.risks.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = `<span class="risk-k"></span><p class="risk-v"></p>`;
    li.querySelector(".risk-k").textContent = row.k;
    li.querySelector(".risk-v").textContent = row.text;
    risks.appendChild(li);
  });
}

function markPickedCard(id) {
  selectedStrategyId = id;
  document.querySelectorAll(".strategy-card").forEach((card) => {
    card.classList.toggle("is-pick", Number(card.dataset.strategy) === id);
  });
}

function openVariantExplorer(id) {
  const strategy = STRATEGIES[id];
  if (!strategy || !explorerEl) return;
  activeStrategyId = id;
  document.getElementById("vx-eyebrow").textContent = strategy.eyebrow;
  document.getElementById("vx-title").textContent = strategy.name;
  document.getElementById("vx-tag").textContent = strategy.tag;
  const score = document.getElementById("vx-score");
  score.textContent = `Fit ${strategy.fit}`;
  score.className = `score${strategy.fitClass ? ` ${strategy.fitClass}` : ""}`;
  const selectBtn = document.getElementById("vx-select");
  selectBtn.dataset.strategy = String(id);
  document.getElementById("variants-chat-context").textContent = `Contestuale · ${strategy.code}`;
  renderVariantSections(strategy);
  explorerEl.hidden = false;
  if (galleryEl) galleryEl.setAttribute("aria-hidden", "true");
  document.getElementById("vx-close")?.focus();
  resetVariantChat(strategy);
  window.dispatchEvent(new Event("resize"));
}

function closeVariantExplorer() {
  if (!explorerEl || explorerEl.hidden) return;
  explorerEl.hidden = true;
  if (galleryEl) galleryEl.removeAttribute("aria-hidden");
  document.querySelector(`.open-variant[data-strategy="${activeStrategyId}"]`)?.focus();
}

document.querySelectorAll(".open-variant").forEach((btn) => {
  btn.addEventListener("click", () => openVariantExplorer(Number(btn.dataset.strategy)));
});

document.getElementById("vx-close")?.addEventListener("click", () => closeVariantExplorer());

document.querySelectorAll(".pick").forEach((btn) => {
  btn.addEventListener("click", () => {
    const id = Number(btn.dataset.strategy) || selectedStrategyId;
    markPickedCard(id);
    toast(`Strategy ${id} selezionata`);
  });
});

/* —— Warnings —— */
document.querySelectorAll(".warn-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".warn-item").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
  });
});

document.getElementById("see-all-warnings")?.addEventListener("click", () => {
  const extra = document.getElementById("warnings-extra");
  const open = extra.hidden;
  extra.hidden = !open;
  document.getElementById("see-all-warnings").textContent = open
    ? "Nascondi elenco esteso"
    : "Vedi tutti i warning";
});

/* —— Guide / source / save / export —— */
const guideBtn = document.getElementById("guide-btn");
guideBtn?.addEventListener("click", () => {
  const guide = document.getElementById("guide");
  const open = guide.hidden;
  guide.hidden = !open;
  guideBtn.setAttribute("aria-expanded", String(open));
  guideBtn.textContent = open ? "Chiudi guida" : "Guida il comando";
});

const toggleSource = document.getElementById("toggle-source");
toggleSource?.addEventListener("click", () => {
  const body = document.getElementById("source-body");
  const open = body.hidden;
  body.hidden = !open;
  toggleSource.setAttribute("aria-expanded", String(open));
  toggleSource.textContent = open ? "Chiudi scheda fonte" : "Apri scheda fonte";
});

document.getElementById("save-session")?.addEventListener("click", () => {
  const status = document.getElementById("save-status");
  const stamp = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  try {
    localStorage.setItem(
      "coforma-session",
      JSON.stringify({ project: "Tasto Microonde", savedAt: Date.now() })
    );
  } catch (_) { /* ignore */ }
  status.textContent = `Sessione salvata alle ${stamp}`;
  toast(`Sessione salvata · ${stamp}`);
});

const thick = document.getElementById("thick");
const thickLabel = document.getElementById("thick-label");
const meterRes = document.getElementById("meter-res");
const meterCost = document.getElementById("meter-cost");
const meterResLabel = document.getElementById("meter-res-label");
const meterCostLabel = document.getElementById("meter-cost-label");

function syncMeters() {
  if (!thick) return;
  const mm = Number(thick.value) / 10;
  thickLabel.textContent = `${mm.toFixed(1)} mm`;
  thick.setAttribute("aria-valuetext", `${mm.toFixed(1)} millimetri`);
  const t = (mm - 1) / 1.5;
  const res = Math.round(42 + t * 50);
  const cost = Math.round(28 + t * 48);
  if (meterRes) meterRes.style.width = `${res}%`;
  if (meterCost) meterCost.style.width = `${cost}%`;
  if (meterResLabel) meterResLabel.textContent = res > 75 ? "alta" : res > 50 ? "media" : "bassa";
  if (meterCostLabel) meterCostLabel.textContent = cost > 70 ? "alto" : cost > 45 ? "medio" : "basso";
}
thick?.addEventListener("input", syncMeters);
syncMeters();

const gates = [...document.querySelectorAll(".gate")];
const exportBtn = document.getElementById("export");
const done = document.getElementById("done");
const gateCount = document.getElementById("gate-count");

function syncExport() {
  const checked = gates.filter((box) => box.checked).length;
  if (gateCount) gateCount.textContent = `${checked}/3`;
  const ready = checked === gates.length;
  exportBtn.disabled = !ready;
  if (!ready) done.hidden = true;
}
gates.forEach((box) => box.addEventListener("change", syncExport));
exportBtn?.addEventListener("click", () => {
  done.hidden = false;
  toast("Export macchina autorizzato");
});

/* —— Assistente fittizio (fonti obbligatorie + link) —— */
const SOURCES = {
  labSnap: {
    title: "Scheda lab PLA/PETG · snap-fit",
    detail: "Valori indicativi flessione/trazione per clip FDM",
    reliability: "3/5 · prototipazione",
    url: "examples/sources/lab-snapfit.html",
    linkLabel: "Apri scheda lab",
  },
  geom3mf: {
    title: "Stima geometrica · Tasto-Microonde.3mf",
    detail: "Analisi locale spessori su mesh (~18k facce)",
    reliability: "3/5 · stima, non FEA",
    url: "examples/sources/geom-3mf.html",
    linkLabel: "Apri nota geometrica",
  },
  cadGuide: {
    title: "Guida operativa CAD · Fillet/Raccordo",
    detail: "Sequenza nativa: seleziona spigolo → Fillet → conferma",
    reliability: "4/5 · procedura tool",
    url: "examples/sources/cad-fillet.html",
    linkLabel: "Apri guida fillet",
  },
  strategyRank: {
    title: "Ranking Strategy · priorità sessione",
    detail: "Pesi: resistenza clip alta, assemblaggio alta, estetica bassa",
    reliability: "4/5 · coerente con priorities",
    url: "examples/sources/strategy-rank.html",
    linkLabel: "Apri ranking Strategy",
  },
  printParams: {
    title: "Parametri stampa progetto",
    detail: "Layer 0.20 mm · nozzle Ø0.4 · export Shapr3D→3MF",
    reliability: "5/5 · metadati file",
    url: "examples/sources/print-params.html",
    linkLabel: "Apri parametri stampa",
  },
  policy: {
    title: "Policy CoForma · fonti obbligatorie",
    detail: "Nessuna raccomandazione senza riferimento esplicito",
    reliability: "5/5 · regola di sistema",
    url: "examples/sources/policy.html",
    linkLabel: "Apri policy fonti",
  },
  spec3mf: {
    title: "3MF Consortium · Specification",
    detail: "Formato 3MF ufficiale per scambio modelli di stampa",
    reliability: "5/5 · standard pubblico",
    url: "https://3mf.io/specification/",
    linkLabel: "Apri specifica 3MF",
  },
};

function pickSources(...keys) {
  const list = keys.map((k) => SOURCES[k]).filter(Boolean);
  if (!list.length) return [SOURCES.policy, SOURCES.geom3mf];
  if (!list.some((s) => s === SOURCES.policy)) list.push(SOURCES.policy);
  return list;
}

function inventReply(question, strategyId = null) {
  const q = question.toLowerCase();
  const sid = strategyId || activeStrategyId;
  const strategy = STRATEGIES[sid];

  if (/fit|score|perch[eé].*strateg|questa strategy/.test(q) && strategy) {
    return {
      text: `${strategy.code} · ${strategy.name} ha Fit ${strategy.fit}. ${strategy.sintesi} Con le priorità attuali la Strategy 02 resta in testa (Fit 91).`,
      sources: pickSources("strategyRank", "geom3mf"),
    };
  }
  if (/risch|geometric|hotspot|warning/.test(q) && strategy) {
    const riskText = strategy.risks.map((r) => `${r.k}: ${r.text}`).join(" ");
    return {
      text: `Sulla ${strategy.code} aperta: ${riskText} Conferma sempre con prova fisica sullo scatto.`,
      sources: pickSources("geom3mf", "labSnap", "cadGuide"),
    };
  }
  if (/quando|sceglier|conviene|caso d.?uso/.test(q) && strategy) {
    return {
      text: strategy.when,
      sources: pickSources("strategyRank", "policy"),
    };
  }
  if (/confront|altre strateg|differen|vs|versus/.test(q)) {
    return {
      text: "Strategy 01 privilegia montaggio rapido (Fit 62) ma rischia la clip; Strategy 02 bilancia clip e boss (Fit 91, consigliata); Strategy 03 alleggerisce materiale (Fit 48) a discapito di base e resistenza. Il ranking segue resistenza clip e assemblaggio alti.",
      sources: pickSources("strategyRank", "geom3mf", "labSnap"),
    };
  }
  if (/spess|radice|clip|raccord|fillet|1\.2|fless/.test(q)) {
    return {
      text: "Sulla radice della clip sinistra lo spessore locale è sotto soglia indicativa. Raccomando un raccordo ≥ 1.2 mm applicato da te in CAD, poi ricontrollo hotspot. Non sostituisce una prova di scatto sul frontalino.",
      sources: pickSources("geom3mf", "cadGuide", "labSnap"),
    };
  }
  if (/pla|petg|material|filamento|resina/.test(q)) {
    return {
      text: "Per un tasto snap-fit prototipo, PETG tende a essere più tollerante allo scatto ripetuto rispetto al PLA fragile; il PLA resta accettabile per smoke-test. I valori di scheda lab sono indicativi (affidabilità 3/5): verifica con inserimento reale.",
      sources: pickSources("labSnap", "printParams"),
    };
  }
  if (/fillet|comando|guida|cad|shapr|fusion/.test(q)) {
    return {
      text: "Sequenza nativa: 1) seleziona lo spigolo alla base della clip, 2) avvia Fillet/Raccordo, 3) imposta 1.2 mm, 4) conferma e ricontrolla la zona. CoForma non esegue il comando al posto tuo.",
      sources: pickSources("cadGuide", "geom3mf"),
    };
  }
  if (/strateg|variant|consigl|scegli|rank|priorit/.test(q)) {
    return {
      text: "Con le priorità attuali (resistenza clip e assemblaggio alte, estetica bassa) il ranking punta a Strategy 02 · Clip + boss bilanciati (Fit ~91). Strategy 01 è più aggressiva sullo scatto; Strategy 03 alleggerisce ma aumenta flessione sulla base.",
      sources: pickSources("strategyRank", "geom3mf", "labSnap"),
    };
  }
  if (/export|stamp|3mf|layer|nozzle|mesh/.test(q)) {
    return {
      text: "Il pezzo attivo è Tasto-Microonde.3mf (layer 0.20 mm, nozzle 0.4, ~18k facce). L’export macchina resta bloccato finché la checklist pre-export non è completa: scelta strategy, fillet applicato in CAD, verifica fonti/trade-off.",
      sources: pickSources("printParams", "spec3mf", "strategyRank"),
    };
  }
  if (/boss|vite|oval|serrag/.test(q)) {
    return {
      text: "I boss rischiano ovalizzazione al serraggio se la parete è troppo sottile o il preload eccessivo. Tieni il boss rinforzato (Strategy 02) e limita la coppia in fase di prova. Conferma con prova fisica sul pezzo stampato.",
      sources: pickSources("geom3mf", "labSnap"),
    };
  }

  if (strategy) {
    return {
      text: `Sto discutendo ${strategy.code} · ${strategy.name} (Fit ${strategy.fit}). ${strategy.sintesi} Posso approfondire rischi, Fit, materiali o fillet CAD. Ogni risposta include fonti con link.`,
      sources: pickSources("strategyRank", "policy", "geom3mf"),
    };
  }

  return {
    text: "Posso aiutarti su clip, materiali, fillet CAD, ranking Strategy ed export del Tasto Microonde. Ogni risposta include fonti con livello di affidabilità e link apribile.",
    sources: pickSources("policy", "printParams", "geom3mf"),
  };
}

const chatPanel = document.getElementById("chat-panel");
const chatBackdrop = document.getElementById("chat-backdrop");
const chatToggle = document.getElementById("chat-toggle");
const chatClose = document.getElementById("chat-close");
const chatThread = document.getElementById("chat-thread");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatThreadVariants = document.getElementById("chat-thread-variants");
const chatFormVariants = document.getElementById("chat-form-variants");
const chatInputVariants = document.getElementById("chat-input-variants");
const chatSendVariants = document.getElementById("chat-send-variants");

function setChatOpen(open) {
  if (!chatPanel) return;
  chatPanel.hidden = !open;
  if (chatBackdrop) chatBackdrop.hidden = !open;
  chatToggle?.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("chat-open", open);
  if (open) chatInput?.focus();
}

chatToggle?.addEventListener("click", () => {
  setChatOpen(chatPanel.hidden);
});
chatClose?.addEventListener("click", () => setChatOpen(false));
chatBackdrop?.addEventListener("click", () => setChatOpen(false));
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (explorerEl && !explorerEl.hidden) {
    closeVariantExplorer();
    return;
  }
  if (chatPanel && !chatPanel.hidden) setChatOpen(false);
});

function appendUser(text, thread = chatThread) {
  if (!thread) return;
  const wrap = document.createElement("div");
  wrap.className = "msg msg-user";
  wrap.innerHTML = `
    <div class="msg-bubble"></div>
    <p class="msg-meta">Tu</p>
  `;
  wrap.querySelector(".msg-bubble").textContent = text;
  thread.appendChild(wrap);
  thread.scrollTop = thread.scrollHeight;
}

function appendBot({ text, sources }, thread = chatThread) {
  if (!thread) return;
  const wrap = document.createElement("div");
  wrap.className = "msg msg-bot";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  const sourcesBox = document.createElement("section");
  sourcesBox.className = "msg-sources";
  sourcesBox.setAttribute("aria-label", "Fonti della risposta");

  const title = document.createElement("p");
  title.className = "sources-title";
  title.textContent = "Fonti (obbligatorie)";
  sourcesBox.appendChild(title);

  if (!sources?.length) {
    sources = pickSources("policy");
  }

  sources.forEach((src) => {
    const row = document.createElement("div");
    row.className = "source-row";
    const strong = document.createElement("strong");
    strong.textContent = src.title;
    const detail = document.createElement("span");
    detail.textContent = src.detail;
    const rel = document.createElement("p");
    rel.className = "rel";
    rel.textContent = `Affidabilità ${src.reliability}`;
    row.append(strong, detail, rel);
    if (src.url) {
      const link = document.createElement("a");
      link.className = "source-link";
      link.href = src.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = src.linkLabel || "Apri fonte";
      row.appendChild(link);
    }
    sourcesBox.appendChild(row);
  });

  const meta = document.createElement("p");
  meta.className = "msg-meta";
  meta.textContent = "Assistente CoForma · simulato";

  wrap.append(bubble, sourcesBox, meta);
  thread.appendChild(wrap);
  thread.scrollTop = thread.scrollHeight;
}

function appendTyping(thread = chatThread) {
  if (!thread) return null;
  const wrap = document.createElement("div");
  wrap.className = "msg msg-bot";
  wrap.dataset.typing = "1";
  wrap.innerHTML = `<div class="msg-typing" aria-label="L’assistente sta scrivendo"><i></i><i></i><i></i></div>`;
  thread.appendChild(wrap);
  thread.scrollTop = thread.scrollHeight;
  return wrap;
}

async function askAssistant(question, { thread = chatThread, input = chatInput, send = chatSend, strategyId = null } = {}) {
  const q = question.trim();
  if (!q || !thread) return;
  appendUser(q, thread);
  if (input) input.value = "";
  if (send) send.disabled = true;
  const typing = appendTyping(thread);
  await new Promise((r) => setTimeout(r, 550 + Math.random() * 450));
  typing?.remove();
  appendBot(inventReply(q, strategyId), thread);
  if (send) send.disabled = false;
  input?.focus();
}

function resetVariantChat(strategy) {
  if (!chatThreadVariants) return;
  chatThreadVariants.innerHTML = "";
  appendBot(
    {
      text: `Ciao — stiamo esplorando ${strategy.code} · ${strategy.name} (Fit ${strategy.fit}). Chiedimi Fit, rischi, pro/contro o confronto con le altre Strategy. Ogni risposta include fonti con link apribile.`,
      sources: pickSources("policy", "strategyRank"),
    },
    chatThreadVariants
  );
}

chatForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  askAssistant(chatInput.value);
});

chatInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm?.requestSubmit();
  }
});

chatFormVariants?.addEventListener("submit", (e) => {
  e.preventDefault();
  askAssistant(chatInputVariants.value, {
    thread: chatThreadVariants,
    input: chatInputVariants,
    send: chatSendVariants,
    strategyId: activeStrategyId,
  });
});

chatInputVariants?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatFormVariants?.requestSubmit();
  }
});

document.querySelectorAll("#chat-suggestions .suggest").forEach((btn) => {
  btn.addEventListener("click", () => askAssistant(btn.dataset.q || btn.textContent));
});

document.querySelectorAll(".suggest-variant").forEach((btn) => {
  btn.addEventListener("click", () =>
    askAssistant(btn.dataset.q || btn.textContent, {
      thread: chatThreadVariants,
      input: chatInputVariants,
      send: chatSendVariants,
      strategyId: activeStrategyId,
    })
  );
});

if (chatThread) {
  appendBot({
    text: "Ciao — sono l’assistente fittizio di CoForma sul pezzo Tasto Microonde. Posso aiutarti su clip, materiali, fillet e Strategy. Ogni risposta include fonti con affidabilità e link: senza fonte non rispondo.",
    sources: pickSources("policy", "printParams"),
  });
}

/* —— Resizable panes —— */
const STORAGE_KEY = "coforma-splits";

function loadSplits() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveSplits(map) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (_) { /* ignore */ }
}

const splitState = loadSplits();

document.querySelectorAll(".split").forEach((split) => {
  const key = split.dataset.split;
  if (splitState[key]) {
    Object.entries(splitState[key]).forEach(([prop, val]) => {
      split.style.setProperty(prop, val);
    });
  }

  split.querySelectorAll(".splitter").forEach((handle) => {
    const edge = handle.dataset.splitEdge;

    const onPointerDown = (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      handle.classList.add("is-dragging");
      document.body.classList.add("is-resizing");
      const startX = e.clientX;
      const rect = split.getBoundingClientRect();
      const styles = getComputedStyle(split);
      const start = {
        left: parseFloat(styles.getPropertyValue("--left")) || 220,
        right: parseFloat(styles.getPropertyValue("--right")) || 300,
        c1: parseFr(styles.getPropertyValue("--c1")),
        c2: parseFr(styles.getPropertyValue("--c2")),
        c3: parseFr(styles.getPropertyValue("--c3")),
      };

      const onMove = (ev) => {
        const dx = ev.clientX - startX;
        if (key === "variant-explorer") resizeExplorer(split, edge, start, dx, rect.width);
        else resizeTriple(split, edge, start, dx, rect.width, key === "warning");
        window.dispatchEvent(new Event("resize"));
      };

      const onUp = () => {
        handle.releasePointerCapture(e.pointerId);
        handle.classList.remove("is-dragging");
        document.body.classList.remove("is-resizing");
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        persistSplit(split, key);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
    };

    handle.addEventListener("pointerdown", onPointerDown);

    handle.addEventListener("keydown", (e) => {
      const stepPx = e.shiftKey ? 40 : 16;
      let dir = 0;
      if (e.key === "ArrowLeft") dir = -1;
      if (e.key === "ArrowRight") dir = 1;
      if (!dir) return;
      e.preventDefault();
      const rect = split.getBoundingClientRect();
      const styles = getComputedStyle(split);
      const start = {
        left: parseFloat(styles.getPropertyValue("--left")) || 220,
        right: parseFloat(styles.getPropertyValue("--right")) || 300,
        c1: parseFr(styles.getPropertyValue("--c1")),
        c2: parseFr(styles.getPropertyValue("--c2")),
        c3: parseFr(styles.getPropertyValue("--c3")),
      };
      if (key === "variant-explorer") resizeExplorer(split, edge, start, dir * stepPx, rect.width);
      else resizeTriple(split, edge, start, dir * stepPx, rect.width, key === "warning");
      persistSplit(split, key);
      window.dispatchEvent(new Event("resize"));
    });
  });
});

function parseFr(val) {
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 1;
}

function resizeTriple(split, edge, start, dx, totalW, twoCol) {
  const minSide = 160;
  const minCenter = 240;
  const splitter = 7;
  if (edge === "left") {
    const max = twoCol
      ? totalW - splitter - minCenter
      : totalW - start.right - splitter * 2 - minCenter;
    const next = clamp(start.left + dx, minSide, max);
    split.style.setProperty("--left", `${Math.round(next)}px`);
  } else if (edge === "right" && !twoCol) {
    const max = totalW - start.left - splitter * 2 - minCenter;
    const next = clamp(start.right - dx, minSide, max);
    split.style.setProperty("--right", `${Math.round(next)}px`);
  }
}

function resizeExplorer(split, edge, start, dx, totalW) {
  if (edge !== "right") return;
  const minChat = 280;
  const minDetail = 320;
  const splitter = 7;
  const next = clamp(start.right - dx, minChat, totalW - splitter - minDetail);
  split.style.setProperty("--right", `${Math.round(next)}px`);
}

function persistSplit(split, key) {
  const props =
    key === "warning"
      ? ["--left"]
      : key === "variant-explorer"
        ? ["--right"]
        : ["--left", "--right"];
  const map = {};
  props.forEach((p) => {
    map[p] = split.style.getPropertyValue(p);
  });
  splitState[key] = map;
  saveSplits(splitState);
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/* —— 3D viewer —— */
initViewer();

async function initViewer() {
  const host = document.getElementById("viewer-host");
  const canvas = document.getElementById("viewer");
  const hint = document.getElementById("viewer-hint");
  const resetBtn = document.getElementById("reset-camera");
  if (!host || !canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  let camera = new THREE.PerspectiveCamera(38, 1, 0.1, 2000);
  camera.position.set(60, 45, 80);
  let useOrtho = false;
  let orthoCam = null;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 10, 0);

  scene.add(new THREE.HemisphereLight(0xdde6f0, 0x2a3038, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 1.15);
  key.position.set(55, 90, 40);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9fb4c8, 0.55);
  rim.position.set(-60, 30, -45);
  scene.add(rim);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(90, 64),
    new THREE.MeshBasicMaterial({ color: 0x0a0e13, transparent: true, opacity: 0.35 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  scene.add(ground);

  let modelRoot = null;
  let fitCamera = () => {};
  let activeCamera = camera;

  function resize() {
    const { clientWidth: w, clientHeight: h } = host;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    if (useOrtho && orthoCam) {
      const frustum = 55;
      orthoCam.left = (-frustum * aspect) / 2;
      orthoCam.right = (frustum * aspect) / 2;
      orthoCam.top = frustum / 2;
      orthoCam.bottom = -frustum / 2;
      orthoCam.updateProjectionMatrix();
    } else {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
  }
  window.addEventListener("resize", resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, activeCamera);
  }
  animate();

  function setProjection(ortho) {
    useOrtho = ortho;
    const aspect = host.clientWidth / Math.max(host.clientHeight, 1);
    if (ortho) {
      const frustum = 55;
      orthoCam = new THREE.OrthographicCamera(
        (-frustum * aspect) / 2,
        (frustum * aspect) / 2,
        frustum / 2,
        -frustum / 2,
        0.1,
        2000
      );
      orthoCam.position.copy(camera.position);
      activeCamera = orthoCam;
      controls.object = orthoCam;
    } else {
      activeCamera = camera;
      controls.object = camera;
    }
    controls.update();
    fitCamera();
    resize();
  }

  document.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-view]").forEach((b) => {
        b.classList.toggle("is-on", b === btn);
        b.setAttribute("aria-pressed", String(b === btn));
      });
      setProjection(btn.dataset.view === "ortho");
    });
  });

  resetBtn?.addEventListener("click", () => fitCamera());

  const material = new THREE.MeshStandardMaterial({
    color: 0x4a515a,
    metalness: 0.08,
    roughness: 0.62,
  });

  fitCamera = () => {
    if (!modelRoot) return;
    const box = new THREE.Box3().setFromObject(modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 40;
    const dist = maxDim * 2.15;
    controls.target.copy(center);
    const pos = new THREE.Vector3(
      center.x + dist * 0.72,
      center.y + dist * 0.5,
      center.z + dist * 0.88
    );
    camera.position.copy(pos);
    if (orthoCam) orthoCam.position.copy(pos);
    camera.near = dist / 100;
    camera.far = dist * 20;
    camera.updateProjectionMatrix();
    controls.update();
    ground.position.set(center.x, box.min.y - 0.15, center.z);
  };

  function mount(object) {
    scene.add(object);
    modelRoot = object;
    host.classList.add("has-3d");
    hint.textContent = "Orbit · scroll zoom · Fit per inquadrare";
    fitCamera();
  }

  try {
    const object = await new ThreeMFLoader().loadAsync("examples/Tasto-Microonde.3mf");
    object.rotation.x = -Math.PI / 2;
    object.traverse((child) => {
      if (child.isMesh) child.material = material;
    });
    mount(object);
  } catch (err3mf) {
    console.warn("3MF non caricato, uso STL derivato", err3mf);
    try {
      const geometry = await new STLLoader().loadAsync("examples/Tasto-Microonde.stl");
      geometry.computeVertexNormals();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mount(mesh);
    } catch (errStl) {
      console.warn("Fallback anteprima immagine", errStl);
      hint.textContent = "Anteprima statica · scarica il .3mf";
      canvas.style.display = "none";
    }
  }
}
