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
  horizontalCutToggle: document.querySelector("#horizontalCutToggle"),
  verticalCutToggle: document.querySelector("#verticalCutToggle"),
  xControls: document.querySelector("#xControls"),
  yControls: document.querySelector("#yControls"),
  xMarkerA: document.querySelector("#xMarkerA"),
  xMarkerB: document.querySelector("#xMarkerB"),
  yMarkerA: document.querySelector("#yMarkerA"),
  yMarkerB: document.querySelector("#yMarkerB"),
  xMarkerAControl: document.querySelector("#xMarkerAControl"),
  xMarkerBControl: document.querySelector("#xMarkerBControl"),
  yMarkerAControl: document.querySelector("#yMarkerAControl"),
  yMarkerBControl: document.querySelector("#yMarkerBControl"),
  xMarkerAToggle: document.querySelector("#xMarkerAToggle"),
  xMarkerBToggle: document.querySelector("#xMarkerBToggle"),
  yMarkerAToggle: document.querySelector("#yMarkerAToggle"),
  yMarkerBToggle: document.querySelector("#yMarkerBToggle"),
  xRangeA: document.querySelector("#xRangeA"),
  xRangeB: document.querySelector("#xRangeB"),
  yRangeA: document.querySelector("#yRangeA"),
  yRangeB: document.querySelector("#yRangeB"),
  xMarkerReadout: document.querySelector("#xMarkerReadout"),
  yMarkerReadout: document.querySelector("#yMarkerReadout"),
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
  horizontalCut: true,
  verticalCut: false,
  xMarkerAEnabled: true,
  xMarkerBEnabled: true,
  yMarkerAEnabled: true,
  yMarkerBEnabled: true,
  xMarkerA: 1 / 3,
  xMarkerB: 2 / 3,
  yMarkerA: 1 / 3,
  yMarkerB: 2 / 3,
  dragging: null,
  toastTimer: 0,
};

const axisConfig = {
  x: {
    enabledKey: "horizontalCut",
    sizeKey: "naturalWidth",
    axisLabel: "X",
    orientation: "horizontal",
    markerAKey: "xMarkerA",
    markerBKey: "xMarkerB",
    markerAEnabledKey: "xMarkerAEnabled",
    markerBEnabledKey: "xMarkerBEnabled",
    markerAElement: elements.xMarkerA,
    markerBElement: elements.xMarkerB,
    markerAControlElement: elements.xMarkerAControl,
    markerBControlElement: elements.xMarkerBControl,
    markerAToggleElement: elements.xMarkerAToggle,
    markerBToggleElement: elements.xMarkerBToggle,
    rangeAElement: elements.xRangeA,
    rangeBElement: elements.xRangeB,
    controlsElement: elements.xControls,
    toggleElement: elements.horizontalCutToggle,
    readoutElement: elements.xMarkerReadout,
  },
  y: {
    enabledKey: "verticalCut",
    sizeKey: "naturalHeight",
    axisLabel: "Y",
    orientation: "vertical",
    markerAKey: "yMarkerA",
    markerBKey: "yMarkerB",
    markerAEnabledKey: "yMarkerAEnabled",
    markerBEnabledKey: "yMarkerBEnabled",
    markerAElement: elements.yMarkerA,
    markerBElement: elements.yMarkerB,
    markerAControlElement: elements.yMarkerAControl,
    markerBControlElement: elements.yMarkerBControl,
    markerAToggleElement: elements.yMarkerAToggle,
    markerBToggleElement: elements.yMarkerBToggle,
    rangeAElement: elements.yRangeA,
    rangeBElement: elements.yRangeB,
    controlsElement: elements.yControls,
    toggleElement: elements.verticalCutToggle,
    readoutElement: elements.yMarkerReadout,
  },
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

function getAxisSize(axis) {
  return state[axisConfig[axis].sizeKey];
}

function normalizeAxisMarker(axis, which, rawValue) {
  const config = axisConfig[axis];
  const markerA = state[config.markerAKey];
  const markerB = state[config.markerBKey];
  const value = clamp(rawValue, MIN_SEGMENT_RATIO, 1 - MIN_SEGMENT_RATIO);

  if (which === "a") {
    return Math.min(value, markerB - MIN_SEGMENT_RATIO);
  }

  return Math.max(value, markerA + MIN_SEGMENT_RATIO);
}

function updateAxisControls(axis) {
  const config = axisConfig[axis];
  const axisEnabled = state[config.enabledKey];
  const markerAEnabled = axisEnabled && state[config.markerAEnabledKey];
  const markerBEnabled = axisEnabled && state[config.markerBEnabledKey];
  const markerA = state[config.markerAKey];
  const markerB = state[config.markerBKey];
  const markerAPercent = formatPercent(markerA);
  const markerBPercent = formatPercent(markerB);
  const markerAPx = Math.round(markerA * getAxisSize(axis));
  const markerBPx = Math.round(markerB * getAxisSize(axis));

  config.toggleElement.checked = axisEnabled;
  config.markerAToggleElement.checked = state[config.markerAEnabledKey];
  config.markerBToggleElement.checked = state[config.markerBEnabledKey];
  config.controlsElement.classList.toggle("opacity-60", !axisEnabled);
  config.markerAControlElement.classList.toggle("opacity-50", !markerAEnabled);
  config.markerBControlElement.classList.toggle("opacity-50", !markerBEnabled);
  config.markerAElement.classList.toggle("is-hidden", !markerAEnabled);
  config.markerBElement.classList.toggle("is-hidden", !markerBEnabled);
  config.markerAToggleElement.disabled = !axisEnabled;
  config.markerBToggleElement.disabled = !axisEnabled;
  config.rangeAElement.disabled = !markerAEnabled;
  config.rangeBElement.disabled = !markerBEnabled;
  config.rangeAElement.value = Math.round(markerA * 1000);
  config.rangeBElement.value = Math.round(markerB * 1000);
  config.markerAElement.setAttribute("aria-valuenow", Math.round(markerA * 100));
  config.markerBElement.setAttribute("aria-valuenow", Math.round(markerB * 100));
  config.markerAElement.setAttribute("aria-orientation", config.orientation);
  config.markerBElement.setAttribute("aria-orientation", config.orientation);
  const markerAReadout = state[config.markerAEnabledKey] ? `${markerAPercent} (${markerAPx}px)` : "off";
  const markerBReadout = state[config.markerBEnabledKey] ? `${markerBPercent} (${markerBPx}px)` : "off";
  config.readoutElement.textContent = `${config.axisLabel} A: ${markerAReadout} · ${config.axisLabel} B: ${markerBReadout}`;

  if (axis === "x") {
    config.markerAElement.style.left = markerAPercent;
    config.markerBElement.style.left = markerBPercent;
  } else {
    config.markerAElement.style.top = markerAPercent;
    config.markerBElement.style.top = markerBPercent;
  }
}

function updateControls() {
  updateAxisControls("x");
  updateAxisControls("y");
  elements.cutButton.disabled = !state.naturalWidth || (!state.horizontalCut && !state.verticalCut);
}

function setAxisMarker(axis, which, value) {
  if (!state.naturalWidth) {
    return;
  }

  const config = axisConfig[axis];
  const markerKey = which === "a" ? config.markerAKey : config.markerBKey;
  state[markerKey] = normalizeAxisMarker(axis, which, value);
  updateControls();
}

function setAxisMarkerEnabled(axis, which, enabled) {
  const config = axisConfig[axis];
  const enabledKey = which === "a" ? config.markerAEnabledKey : config.markerBEnabledKey;

  state[enabledKey] = enabled;
  clearResults();
  updateControls();
}

function resetMarkers() {
  state.xMarkerA = 1 / 3;
  state.xMarkerB = 2 / 3;
  state.yMarkerA = 1 / 3;
  state.yMarkerB = 2 / 3;
  state.xMarkerAEnabled = true;
  state.xMarkerBEnabled = true;
  state.yMarkerAEnabled = true;
  state.yMarkerBEnabled = true;
  updateControls();
}

function setAxisEnabled(axis, enabled) {
  const config = axisConfig[axis];
  const otherAxis = axis === "x" ? "y" : "x";
  const otherConfig = axisConfig[otherAxis];

  if (!enabled && !state[otherConfig.enabledKey]) {
    config.toggleElement.checked = true;
    return;
  }

  state[config.enabledKey] = enabled;
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

function getPointerRatio(axis, event) {
  const rect = elements.sourceImage.getBoundingClientRect();
  const pointerPosition = axis === "y" ? event.clientY - rect.top : event.clientX - rect.left;
  const axisLength = axis === "y" ? rect.height : rect.width;

  return clamp(pointerPosition / axisLength, 0, 1);
}

function startDrag(axis, which, event) {
  event.preventDefault();
  state.dragging = { axis, which };
  event.currentTarget.setPointerCapture(event.pointerId);
  setAxisMarker(axis, which, getPointerRatio(axis, event));
}

function handleDrag(event) {
  if (!state.dragging) {
    return;
  }

  setAxisMarker(state.dragging.axis, state.dragging.which, getPointerRatio(state.dragging.axis, event));
}

function stopDrag(event) {
  if (!state.dragging) {
    return;
  }

  const config = axisConfig[state.dragging.axis];
  const marker = state.dragging.which === "a" ? config.markerAElement : config.markerBElement;

  if (marker.hasPointerCapture?.(event.pointerId)) {
    marker.releasePointerCapture(event.pointerId);
  }

  state.dragging = null;
}

function moveMarkerWithKeyboard(axis, which, event) {
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
    setAxisMarker(axis, which, MIN_SEGMENT_RATIO);
  } else if (movement === "end") {
    setAxisMarker(axis, which, 1 - MIN_SEGMENT_RATIO);
  } else {
    const config = axisConfig[axis];
    const current = state[which === "a" ? config.markerAKey : config.markerBKey];
    setAxisMarker(axis, which, current + movement * (step / 0.01));
  }
}

function getAxisSegments(axis) {
  const config = axisConfig[axis];
  const axisSize = getAxisSize(axis);

  if (!state[config.enabledKey]) {
    return [{ start: 0, size: axisSize, index: 1 }];
  }

  const cuts = [
    state[config.markerAEnabledKey] ? Math.round(state[config.markerAKey] * axisSize) : null,
    state[config.markerBEnabledKey] ? Math.round(state[config.markerBKey] * axisSize) : null,
  ]
    .filter((cut) => cut !== null)
    .sort((left, right) => left - right);
  const boundaries = [0, ...cuts, axisSize];

  return boundaries.slice(0, -1).map((start, index) => ({
    start,
    size: boundaries[index + 1] - start,
    index: index + 1,
  })).filter((segment) => segment.size > 0);
}

function createCropCard(segment, index, modeName) {
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
  const fileName = `${getBaseName(state.imageName)}-${modeName}-part-${index + 1}.png`;
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

function getModeName() {
  if (state.horizontalCut && state.verticalCut) {
    return "grid";
  }

  return state.horizontalCut ? "horizontal" : "vertical";
}

function cutImage() {
  if (!state.naturalWidth || !state.naturalHeight || (!state.horizontalCut && !state.verticalCut)) {
    return;
  }

  const xSegments = getAxisSegments("x");
  const ySegments = getAxisSegments("y");
  const segments = ySegments.flatMap((ySegment) =>
    xSegments.map((xSegment) => ({
      x: xSegment.start,
      y: ySegment.start,
      width: xSegment.size,
      height: ySegment.size,
    })),
  );
  const modeName = getModeName();

  elements.resultsScroll.replaceChildren(...segments.map((segment, index) => createCropCard(segment, index, modeName)));
  elements.resultsEmpty.classList.add("hidden");
  elements.resultsScroll.classList.remove("hidden");
  elements.resultCount.textContent = `${segments.length} ${segments.length === 1 ? "image" : "images"}`;
  elements.resultsScroll.scrollTo({ left: 0, behavior: "smooth" });
  showSliceToast();
}

function handleDrop(event) {
  event.preventDefault();
  elements.dropZone.classList.remove("is-dragging");
  loadFile(event.dataTransfer.files?.[0]);
}

function bindAxisEvents(axis) {
  const config = axisConfig[axis];

  config.toggleElement.addEventListener("change", (event) => setAxisEnabled(axis, event.target.checked));
  config.markerAToggleElement.addEventListener("change", (event) => setAxisMarkerEnabled(axis, "a", event.target.checked));
  config.markerBToggleElement.addEventListener("change", (event) => setAxisMarkerEnabled(axis, "b", event.target.checked));
  config.rangeAElement.addEventListener("input", (event) => setAxisMarker(axis, "a", Number(event.target.value) / 1000));
  config.rangeBElement.addEventListener("input", (event) => setAxisMarker(axis, "b", Number(event.target.value) / 1000));
  config.markerAElement.addEventListener("pointerdown", (event) => startDrag(axis, "a", event));
  config.markerBElement.addEventListener("pointerdown", (event) => startDrag(axis, "b", event));
  config.markerAElement.addEventListener("pointermove", handleDrag);
  config.markerBElement.addEventListener("pointermove", handleDrag);
  config.markerAElement.addEventListener("pointerup", stopDrag);
  config.markerBElement.addEventListener("pointerup", stopDrag);
  config.markerAElement.addEventListener("pointercancel", stopDrag);
  config.markerBElement.addEventListener("pointercancel", stopDrag);
  config.markerAElement.addEventListener("keydown", (event) => moveMarkerWithKeyboard(axis, "a", event));
  config.markerBElement.addEventListener("keydown", (event) => moveMarkerWithKeyboard(axis, "b", event));
}

function bindEvents() {
  elements.fileInput.addEventListener("change", (event) => loadFile(event.target.files?.[0]));
  elements.loadExampleButton.addEventListener("click", () => loadImageFromUrl(EXAMPLE_IMAGE, "Gemini_Generated_Image_.png"));
  elements.resetButton.addEventListener("click", resetMarkers);
  elements.cutButton.addEventListener("click", cutImage);
  bindAxisEvents("x");
  bindAxisEvents("y");

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
updateControls();
loadImageFromUrl(EXAMPLE_IMAGE, "Gemini_Generated_Image_.png");
