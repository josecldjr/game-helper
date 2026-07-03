const EXAMPLE_IMAGE = "./Gemini_Generated_Image_.png";
const MIN_SEGMENT_RATIO = 0.03;

const elements = {
  fileInput: document.querySelector("#fileInput"),
  loadExampleButton: document.querySelector("#loadExampleButton"),
  resetButton: document.querySelector("#resetButton"),
  cutButton: document.querySelector("#cutButton"),
  dropZone: document.querySelector("#dropZone"),
  emptyState: document.querySelector("#emptyState"),
  workspace: document.querySelector("#workspace"),
  imageMeta: document.querySelector("#imageMeta"),
  imageFrame: document.querySelector("#imageFrame"),
  sourceImage: document.querySelector("#sourceImage"),
  markerA: document.querySelector("#markerA"),
  markerB: document.querySelector("#markerB"),
  rangeA: document.querySelector("#rangeA"),
  rangeB: document.querySelector("#rangeB"),
  verticalCutToggle: document.querySelector("#verticalCutToggle"),
  markerReadout: document.querySelector("#markerReadout"),
  resultsEmpty: document.querySelector("#resultsEmpty"),
  resultsScroll: document.querySelector("#resultsScroll"),
  resultCount: document.querySelector("#resultCount"),
  toast: document.querySelector("#toast"),
};

const state = {
  imageName: "model-sheet.png",
  imageUrl: "",
  objectUrl: "",
  naturalWidth: 0,
  naturalHeight: 0,
  markerA: 1 / 3,
  markerB: 2 / 3,
  verticalCut: false,
  dragging: null,
  toastTimer: 0,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatPercent(value) {
  return `${Number((value * 100).toFixed(1))}%`;
}

function getBaseName(fileName) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "slice";
}

function getActiveSize() {
  return state.verticalCut ? state.naturalHeight : state.naturalWidth;
}

function normalizeMarker(which, rawValue) {
  const value = clamp(rawValue, MIN_SEGMENT_RATIO, 1 - MIN_SEGMENT_RATIO);

  if (which === "a") {
    return Math.min(value, state.markerB - MIN_SEGMENT_RATIO);
  }

  return Math.max(value, state.markerA + MIN_SEGMENT_RATIO);
}

function updateControls() {
  const markerAPercent = formatPercent(state.markerA);
  const markerBPercent = formatPercent(state.markerB);
  const activeSize = getActiveSize();
  const markerAPx = Math.round(state.markerA * activeSize);
  const markerBPx = Math.round(state.markerB * activeSize);
  const axisLabel = state.verticalCut ? "Y" : "X";

  elements.imageFrame.classList.toggle("is-vertical-cut", state.verticalCut);

  if (state.verticalCut) {
    elements.markerA.style.left = "";
    elements.markerB.style.left = "";
    elements.markerA.style.top = markerAPercent;
    elements.markerB.style.top = markerBPercent;
  } else {
    elements.markerA.style.top = "";
    elements.markerB.style.top = "";
    elements.markerA.style.left = markerAPercent;
    elements.markerB.style.left = markerBPercent;
  }

  elements.rangeA.value = Math.round(state.markerA * 1000);
  elements.rangeB.value = Math.round(state.markerB * 1000);
  elements.markerA.setAttribute("aria-valuenow", Math.round(state.markerA * 100));
  elements.markerB.setAttribute("aria-valuenow", Math.round(state.markerB * 100));
  elements.markerA.setAttribute("aria-orientation", state.verticalCut ? "vertical" : "horizontal");
  elements.markerB.setAttribute("aria-orientation", state.verticalCut ? "vertical" : "horizontal");
  elements.markerReadout.textContent = `${axisLabel} A: ${markerAPercent} (${markerAPx}px) · ${axisLabel} B: ${markerBPercent} (${markerBPx}px)`;
}

function setMarker(which, value) {
  if (!state.naturalWidth) {
    return;
  }

  if (which === "a") {
    state.markerA = normalizeMarker("a", value);
  } else {
    state.markerB = normalizeMarker("b", value);
  }

  updateControls();
}

function resetMarkers() {
  state.markerA = 1 / 3;
  state.markerB = 2 / 3;
  updateControls();
}

function setCutAxis(verticalCut) {
  state.verticalCut = verticalCut;
  clearResults();
  updateControls();
}

function clearResults() {
  elements.resultsScroll.replaceChildren();
  elements.resultsScroll.classList.add("hidden");
  elements.resultsEmpty.classList.remove("hidden");
  elements.resultCount.textContent = "0 images";
}

function setImageLoaded(name) {
  state.imageName = name;
  state.naturalWidth = elements.sourceImage.naturalWidth;
  state.naturalHeight = elements.sourceImage.naturalHeight;

  elements.emptyState.classList.add("hidden");
  elements.workspace.classList.remove("hidden");
  elements.workspace.classList.add("flex");
  elements.cutButton.disabled = false;
  elements.imageMeta.textContent = `${name} · ${state.naturalWidth} x ${state.naturalHeight}px`;

  resetMarkers();
  clearResults();
}

function showImageError(name) {
  elements.imageMeta.textContent = `Could not load ${name}`;
  elements.cutButton.disabled = true;
}

function loadImageFromUrl(url, name, objectUrl = "") {
  if (state.objectUrl && state.objectUrl !== objectUrl) {
    URL.revokeObjectURL(state.objectUrl);
  }

  state.objectUrl = objectUrl;
  state.imageUrl = url;
  elements.sourceImage.onload = () => setImageLoaded(name);
  elements.sourceImage.onerror = () => showImageError(name);
  elements.sourceImage.src = url;
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  loadImageFromUrl(objectUrl, file.name, objectUrl);
}

function getPointerRatio(event) {
  const rect = elements.sourceImage.getBoundingClientRect();
  const pointerPosition = state.verticalCut ? event.clientY - rect.top : event.clientX - rect.left;
  const axisLength = state.verticalCut ? rect.height : rect.width;

  return clamp(pointerPosition / axisLength, 0, 1);
}

function startDrag(which, event) {
  event.preventDefault();
  state.dragging = which;
  event.currentTarget.setPointerCapture(event.pointerId);
  setMarker(which, getPointerRatio(event));
}

function handleDrag(event) {
  if (!state.dragging) {
    return;
  }

  setMarker(state.dragging, getPointerRatio(event));
}

function stopDrag(event) {
  if (!state.dragging) {
    return;
  }

  const marker = state.dragging === "a" ? elements.markerA : elements.markerB;

  if (marker.hasPointerCapture?.(event.pointerId)) {
    marker.releasePointerCapture(event.pointerId);
  }

  state.dragging = null;
}

function moveMarkerWithKeyboard(which, event) {
  const keyMap = {
    ArrowLeft: -0.01,
    ArrowRight: 0.01,
    ArrowUp: -0.01,
    ArrowDown: 0.01,
    Home: "start",
    End: "end",
  };

  if (!(event.key in keyMap)) {
    return;
  }

  event.preventDefault();

  const movement = keyMap[event.key];
  const step = event.shiftKey ? 0.05 : 0.01;

  if (movement === "start") {
    setMarker(which, MIN_SEGMENT_RATIO);
  } else if (movement === "end") {
    setMarker(which, 1 - MIN_SEGMENT_RATIO);
  } else {
    const current = which === "a" ? state.markerA : state.markerB;
    setMarker(which, current + movement * (step / 0.01));
  }
}

function createCropCard(segment, index) {
  const canvas = document.createElement("canvas");
  canvas.width = segment.width;
  canvas.height = segment.height;

  const context = canvas.getContext("2d");
  context.drawImage(
    elements.sourceImage,
    segment.x,
    segment.y,
    segment.width,
    segment.height,
    0,
    0,
    segment.width,
    segment.height,
  );

  const dataUrl = canvas.toDataURL("image/png");
  const axisName = state.verticalCut ? "vertical" : "horizontal";
  const fileName = `${getBaseName(state.imageName)}-${axisName}-part-${index + 1}.png`;
  const article = document.createElement("article");
  article.className = "crop-card rounded-lg border border-neutral-200 bg-white shadow-sm";

  article.innerHTML = `
    <div class="grid h-72 place-items-center rounded-t-lg bg-neutral-50 p-2">
      <img src="${dataUrl}" alt="Slice ${index + 1}" />
    </div>
    <div class="grid gap-3 border-t border-neutral-200 p-3">
      <div>
        <h3 class="text-sm font-semibold text-neutral-950">Part ${index + 1}</h3>
        <p class="text-xs text-neutral-500">${segment.width} x ${segment.height}px</p>
      </div>
      <a
        class="inline-flex h-9 items-center justify-center rounded-md border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-neutral-500"
        href="${dataUrl}"
        download="${fileName}"
      >
        Download PNG
      </a>
    </div>
  `;

  return article;
}

function showSliceToast() {
  window.clearTimeout(state.toastTimer);
  elements.toast.classList.add("is-visible");

  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 3000);
}

function cutImage() {
  if (!state.naturalWidth || !state.naturalHeight) {
    return;
  }

  const activeSize = getActiveSize();
  const cutA = Math.round(state.markerA * activeSize);
  const cutB = Math.round(state.markerB * activeSize);
  const segments = state.verticalCut
    ? [
        { x: 0, y: 0, width: state.naturalWidth, height: cutA },
        { x: 0, y: cutA, width: state.naturalWidth, height: cutB - cutA },
        { x: 0, y: cutB, width: state.naturalWidth, height: state.naturalHeight - cutB },
      ].filter((segment) => segment.height > 0)
    : [
        { x: 0, y: 0, width: cutA, height: state.naturalHeight },
        { x: cutA, y: 0, width: cutB - cutA, height: state.naturalHeight },
        { x: cutB, y: 0, width: state.naturalWidth - cutB, height: state.naturalHeight },
      ].filter((segment) => segment.width > 0);

  elements.resultsScroll.replaceChildren(...segments.map(createCropCard));
  elements.resultsEmpty.classList.add("hidden");
  elements.resultsScroll.classList.remove("hidden");
  elements.resultCount.textContent = `${segments.length} images`;
  elements.resultsScroll.scrollTo({ left: 0, behavior: "smooth" });
  showSliceToast();
}

function handleDrop(event) {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragging");
  loadFile(event.dataTransfer.files?.[0]);
}

function bindEvents() {
  elements.fileInput.addEventListener("change", (event) => loadFile(event.target.files?.[0]));
  elements.loadExampleButton.addEventListener("click", () => loadImageFromUrl(EXAMPLE_IMAGE, "Gemini_Generated_Image_.png"));
  elements.resetButton.addEventListener("click", resetMarkers);
  elements.cutButton.addEventListener("click", cutImage);
  elements.verticalCutToggle.addEventListener("change", (event) => setCutAxis(event.target.checked));

  elements.rangeA.addEventListener("input", (event) => setMarker("a", Number(event.target.value) / 1000));
  elements.rangeB.addEventListener("input", (event) => setMarker("b", Number(event.target.value) / 1000));

  elements.markerA.addEventListener("pointerdown", (event) => startDrag("a", event));
  elements.markerB.addEventListener("pointerdown", (event) => startDrag("b", event));
  elements.markerA.addEventListener("pointermove", handleDrag);
  elements.markerB.addEventListener("pointermove", handleDrag);
  elements.markerA.addEventListener("pointerup", stopDrag);
  elements.markerB.addEventListener("pointerup", stopDrag);
  elements.markerA.addEventListener("pointercancel", stopDrag);
  elements.markerB.addEventListener("pointercancel", stopDrag);
  elements.markerA.addEventListener("keydown", (event) => moveMarkerWithKeyboard("a", event));
  elements.markerB.addEventListener("keydown", (event) => moveMarkerWithKeyboard("b", event));

  ["dragenter", "dragover"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropZone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    elements.dropZone.addEventListener(eventName, (event) => {
      if (eventName === "drop") {
        handleDrop(event);
      } else if (!elements.dropZone.contains(event.relatedTarget)) {
        elements.dropZone.classList.remove("is-dragging");
      }
    });
  });
}

bindEvents();
loadImageFromUrl(EXAMPLE_IMAGE, "Gemini_Generated_Image_.png");
