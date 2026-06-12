// MOD BENCH — every control writes a CSS variable; the spec sheet
// shows which ones have drifted from factory settings.

const FACTORY = {
    hue: 22,
    tilt: -2,
    weight: 640,
    size: 100,
    wonk: true,
    night: false,
};

const state = { ...FACTORY };
let stickerCount = 0;
let headlineEdited = false;

const root = document.documentElement.style;
const $ = (id) => document.getElementById(id);

const STICKER_WORDS = ["MOD", "REMIX", "FORKED", "v2", "MINE NOW", "★", "OK!"];

/* ---------- apply state → CSS vars + outputs ---------- */

function apply() {
    root.setProperty("--accent-h", state.hue);
    root.setProperty("--tilt", state.tilt + "deg");
    root.setProperty("--headline-weight", state.weight);
    root.setProperty("--headline-size", state.size / 100);
    root.setProperty("--wonk", state.wonk ? 1 : 0);
    document.body.classList.toggle("night", state.night);

    $("out-hue").textContent = Math.round(state.hue);
    $("out-tilt").textContent = state.tilt.toFixed(0) + "°";
    $("out-weight").textContent = Math.round(state.weight);
    $("out-size").textContent = Math.round(state.size) + "%";
    $("slider-size").value = state.size;
    $("toggle-wonk").setAttribute("aria-pressed", String(state.wonk));
    $("toggle-ink").setAttribute("aria-pressed", String(state.night));

    renderSpec();
}

/* ---------- spec sheet ---------- */

function specRows() {
    return [
        ["--accent-h", Math.round(state.hue), state.hue !== FACTORY.hue],
        ["--tilt", state.tilt.toFixed(0) + "deg", state.tilt !== FACTORY.tilt],
        ["--headline-weight", Math.round(state.weight), state.weight !== FACTORY.weight],
        ["--headline-size", (state.size / 100).toFixed(2), state.size !== FACTORY.size],
        ["--wonk", state.wonk ? "1" : "0", state.wonk !== FACTORY.wonk],
        ["night ink", state.night ? "on" : "off", state.night !== FACTORY.night],
        ["headline text", headlineEdited ? "custom" : "stock", headlineEdited],
        ["stickers", String(stickerCount), stickerCount > 0],
    ];
}

function renderSpec() {
    const rows = specRows();
    const tbody = $("specTable").tBodies[0];
    tbody.innerHTML = rows
        .map(
            ([name, value, modded]) =>
                `<tr class="${modded ? "modded" : ""}"><td>${modded ? "● " : ""}${name}</td><td>${value}</td></tr>`,
        )
        .join("");
    $("modCount").textContent = rows.filter(([, , m]) => m).length;
}

/* ---------- knobs (drag vertically or use arrow keys) ---------- */

function makeKnob(id, key, min, max, step, perPixel) {
    const el = $(id);
    const indicator = el.querySelector(".knob-indicator");

    const setAngle = () => {
        const t = (state[key] - min) / (max - min);
        indicator.style.setProperty("--angle", (t * 270 - 135).toFixed(1) + "deg");
        el.setAttribute("aria-valuenow", String(Math.round(state[key])));
    };

    const nudge = (delta) => {
        state[key] = Math.min(max, Math.max(min, state[key] + delta));
        setAngle();
        apply();
    };

    el.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        let lastY = e.clientY;
        const move = (ev) => {
            nudge((lastY - ev.clientY) * perPixel);
            lastY = ev.clientY;
        };
        const up = () => {
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
    });

    el.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") nudge(step);
        else if (e.key === "ArrowDown" || e.key === "ArrowLeft") nudge(-step);
        else return;
        e.preventDefault();
    });

    setAngle();
    return { setAngle };
}

const knobs = [
    makeKnob("knob-hue", "hue", 0, 360, 10, 2),
    makeKnob("knob-tilt", "tilt", -8, 8, 1, 0.1),
    makeKnob("knob-weight", "weight", 100, 900, 50, 4),
];

const syncKnobs = () => knobs.forEach((k) => k.setAngle());

/* ---------- slider + toggles ---------- */

$("slider-size").addEventListener("input", (e) => {
    state.size = Number(e.target.value);
    apply();
});

$("toggle-wonk").addEventListener("click", () => {
    state.wonk = !state.wonk;
    apply();
});

$("toggle-ink").addEventListener("click", () => {
    state.night = !state.night;
    apply();
});

/* ---------- chaos / reset ---------- */

$("btn-chaos").addEventListener("click", () => {
    state.hue = Math.random() * 360;
    state.tilt = Math.random() * 16 - 8;
    state.weight = 100 + Math.random() * 800;
    state.size = 60 + Math.random() * 90;
    state.wonk = Math.random() < 0.5;
    state.night = Math.random() < 0.35;
    syncKnobs();
    apply();
    document.body.classList.remove("shaking");
    void document.body.offsetWidth; // restart animation
    document.body.classList.add("shaking");
});

$("btn-reset").addEventListener("click", () => {
    Object.assign(state, FACTORY);
    stickerCount = 0;
    headlineEdited = false;
    $("headline").innerHTML = "THIS PAGE IS<br />MODDABLE";
    document.querySelectorAll(".sticker").forEach((s) => s.remove());
    syncKnobs();
    apply();
});

/* ---------- stickers + headline edits ---------- */

const specimen = $("specimen");
specimen.addEventListener("click", (e) => {
    if (e.target.closest(".headline")) return; // editing, not slapping
    const sticker = document.createElement("span");
    sticker.className = "sticker";
    sticker.textContent = STICKER_WORDS[Math.floor(Math.random() * STICKER_WORDS.length)];
    sticker.style.setProperty("--r", (Math.random() * 24 - 12).toFixed(1) + "deg");
    const box = specimen.getBoundingClientRect();
    sticker.style.left = e.clientX - box.left + "px";
    sticker.style.top = e.clientY - box.top + "px";
    specimen.appendChild(sticker);
    if (++stickerCount > 25) {
        specimen.querySelector(".sticker").remove();
        stickerCount = 25;
    }
    renderSpec();
});

$("headline").addEventListener("input", () => {
    headlineEdited = true;
    renderSpec();
});

apply();
