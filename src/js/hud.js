import { CONFIG } from './config.js';


const focusedLoadRow = document.getElementById('focused-load-row');
const focusedLoadIdEl = document.getElementById('focused-load-id');
const clearFocusBtn = document.getElementById('clear-focus-btn');
const viewToggleButtons = document.querySelectorAll('.view-toggle-btn');

const embedPanel = document.getElementById('embed-panel');
const embedIframe = document.getElementById('embed-iframe');
const embedToggleBtn = document.getElementById('embed-toggle-btn');
const embedRestoreBtn = document.getElementById('embed-restore-btn');
const embedInstruction = document.getElementById('embed-instruction');
const embedResizeHandle = document.getElementById('embed-resize-handle');
const embedOpenBtn = document.getElementById('embed-open-btn');

export function initHud({ onViewModeChange, onClearFocus }) {
  viewToggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      viewToggleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      onViewModeChange(btn.dataset.view);
    });
  });

  clearFocusBtn.addEventListener('click', () => {
    hideFocusedLoad();
    onClearFocus();
  });

  embedToggleBtn.addEventListener('click', () => minimizeEmbedPanel());
  embedRestoreBtn.addEventListener('click', () => restoreEmbedPanel());
  embedOpenBtn.href = CONFIG.dashboardBaseUrl;
  
  setupResize();

  embedIframe.src = CONFIG.dashboardBaseUrl;
}

export function showFocusedLoad(loadId) {
  focusedLoadIdEl.textContent = `Load #${loadId}`;
  focusedLoadRow.hidden = false;
}

export function hideFocusedLoad() {
  focusedLoadRow.hidden = true;
}

export function requestLoadView(loadId) {
  if (embedIframe.src !== CONFIG.dashboardBaseUrl) {
    // embedIframe.src = CONFIG.dashboardBaseUrl;
  }
  embedInstruction.hidden = false;
  embedInstruction.textContent = `Click Load #${loadId} in the map below to view its data.`;
  restoreEmbedPanel();
}

export function clearLoadView() {
  embedInstruction.hidden = true;
}

function minimizeEmbedPanel() {
  embedPanel.classList.add('minimized');
  embedToggleBtn.setAttribute('aria-expanded', 'false');
}

function restoreEmbedPanel() {
  embedPanel.classList.remove('minimized');
  embedToggleBtn.setAttribute('aria-expanded', 'true');
}

function setupResize() {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  embedResizeHandle.addEventListener('pointerdown', (event) => {
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    const rect = embedPanel.getBoundingClientRect();
    startWidth = rect.width;
    startHeight = rect.height;
    embedResizeHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  embedResizeHandle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const deltaX = startX - event.clientX;
    const deltaY = startY - event.clientY;

    const minWidth = 280;
    const minHeight = 200;
    const maxWidth = window.innerWidth - 32;
    const maxHeight = window.innerHeight - 32;

    const newWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + deltaX));
    const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));

    embedPanel.style.width = `${newWidth}px`;
    embedPanel.style.height = `${newHeight}px`;
  });

  embedResizeHandle.addEventListener('pointerup', (event) => {
    dragging = false;
    embedResizeHandle.releasePointerCapture(event.pointerId);
  });
}