// ====================================================================================
// ========= 🤫 CUIDADO: CHAVES DE API E ENDPOINTS DO AZURE 🤫 =========
// ====================================================================================
// EM UM AMBIENTE DE PRODUÇÃO, ESTAS CHAVES NUNCA DEVEM FICAR NO CÓDIGO FRONTEND.
// ELAS DEVEM SER GERENCIADAS POR UM SERVIÇOR DE BACKEND SEGURO.
// Para este projeto (Learning Sectors), o uso no frontend é para fins de demonstração.
// ------------------------------------------------------------------------------------
// ⛔ SUBSTITUA PELAS SUAS PRÓPRIAS CHAVES E ENDPOINT DO AZURE COGNITIVE SERVICES ⛔
// ------------------------------------------------------------------------------------
const AZURE_CONFIG = {
  SUBSCRIPTION_KEY_VISION: "2lq6d62WM18MjLN1z9rNNddKM1yK3Db4CzSdaVaZpBYDphSnv7LAJQQJ99BDACZoyfiXJ3w3AAAFACOG71Rz",
  ENDPOINT_VISION: "https://amplifica.cognitiveservices.azure.com/",
  SUBSCRIPTION_KEY_SPEECH: '8USfj4ZObcOCdModY3PgpN20wUDAOv3d7jk3FaSNvPzL8ijFEPIkJQQJ99BDACZoyfiXJ3w3AAAYACOGFlGA',
  REGION_SPEECH: 'brazilsouth',
  VOICE_SPEECH: 'pt-BR-FranciscaNeural'
};
// ====================================================================================

// --- Seletores DOM Globais ---
const video = document.getElementById('webcam');
const zoomCanvas = document.getElementById('zoomCanvas');
const zoomCanvasCtx = zoomCanvas.getContext('2d');
const overlay = document.getElementById('overlay');
const videoWrapper = document.getElementById('videoWrapper');
const resultadoOCR = document.getElementById('resultadoOCR'); // ONDE O TEXTO APARECE
const ocrStatus = document.getElementById('ocr-status');
const startWebcamBtn = document.getElementById('start-webcam-btn');
const resetCameraBtn = document.getElementById('reset-camera-btn');
const ampBtn = document.getElementById('amp-btn');
const trsBtn = document.getElementById('trs-btn');
const zoomFullscreenBtn = document.getElementById('zoom-fullscreen-btn');
const transcriptionFullscreenBtn = document.getElementById('transcription-fullscreen-btn');
const baixarTextoBtn = document.getElementById('baixar-texto-btn');
const narrarTextoBtn = document.getElementById('narrar-texto-btn');
const mainContent = document.getElementById('main-content');
const zoomView = document.getElementById('zoom-view');
const transcriptionView = document.getElementById('transcription-view');

// --- Seletores DOM para o Painel de Acessibilidade ---
const toggleAccessibilityPanelBtn = document.getElementById('toggle-accessibility-panel-btn');
const closeAccessibilityPanelBtn = document.getElementById('close-accessibility-panel-btn');
const accessibilityOptionsPanel = document.getElementById('accessibility-options');
const accessibilityPanelTitle = document.getElementById('accessibility-title'); // Título do painel (h3)
const highContrastToggle = document.getElementById('high-contrast-toggle');
const dyslexicFontToggle = document.getElementById('dyslexic-font-toggle');
const decreaseFontBtn = document.getElementById('decrease-font-btn');
const increaseFontBtn = document.getElementById('increase-font-btn');
const fontSizeSlider = document.getElementById('font-size-slider');
const fontSizeValueDisplay = document.getElementById('font-size-value');
const colorblindModeRadios = document.querySelectorAll('input[name="colorblind-mode"]');

// --- Variáveis de Estado Globais ---
let currentStream = null;
let selection = null;
let isSelecting = false;
let selectionStartX = 0, selectionStartY = 0;
let isDrawingZoom = false;
let lastFocusedElementBeforePanel; // Para gerenciamento de foco do painel

// --- Variáveis de Estado para Acessibilidade ---
let panelCurrentFontSize = 16; // Tamanho da fonte controlado pelo painel de acessibilidade
const PANEL_MIN_FONT_SIZE = 12;
const PANEL_MAX_FONT_SIZE = 32;
const PANEL_FONT_STEP = 2;

// Variáveis para zoom do texto em tela cheia (diferente do painel)
let fullscreenTextCurrentFontSize = 32;
const FULLSCREEN_TEXT_FONT_STEP = 4;
const FULLSCREEN_TEXT_MIN_FONT_SIZE = 16;
const FULLSCREEN_TEXT_MAX_FONT_SIZE = 80;
const fullscreenTextZoomControls = document.getElementById('fullscreen-text-zoom-controls');
const fullscreenZoomInBtn = document.getElementById('fullscreen-zoom-in-btn');
const fullscreenZoomOutBtn = document.getElementById('fullscreen-zoom-out-btn');


// --- INICIALIZAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
  setupGlobalEventListeners();
  setupAccessibilityFeatures(); // Configura funcionalidades de acessibilidade
  applyPanelFontSize(); // Aplica o tamanho de fonte inicial do painel
  checkAzureConfig();
});

function checkAzureConfig() {
  if (AZURE_CONFIG.SUBSCRIPTION_KEY_VISION === "SUA_CHAVE_AZURE_COMPUTER_VISION" || AZURE_CONFIG.ENDPOINT_VISION === "SEU_ENDPOINT_AZURE_COMPUTER_VISION" || AZURE_CONFIG.SUBSCRIPTION_KEY_SPEECH === "SUA_CHAVE_AZURE_SPEECH_SERVICE" || AZURE_CONFIG.REGION_SPEECH === "sua-regiao") {
      console.warn("AVISO: As chaves e endpoints do Azure não foram configurados em script.js. As funcionalidades de OCR e Narração podem não funcionar corretamente.");
      if(ocrStatus) ocrStatus.textContent = "Configuração do Azure pendente. OCR e Narração podem estar indisponíveis.";
      if(narrarTextoBtn) narrarTextoBtn.disabled = true;
  }
}

function setupGlobalEventListeners() {
  // Adiciona verificações para garantir que os elementos existem antes de adicionar listeners
  if(startWebcamBtn) startWebcamBtn.addEventListener('click', initWebcam);
  if(resetCameraBtn) resetCameraBtn.addEventListener('click', resetWebcam);
  if(videoWrapper) {
      videoWrapper.addEventListener('mousedown', startSelection);
      videoWrapper.addEventListener('mousemove', updateSelection);
      videoWrapper.addEventListener('mouseup', endSelection);
      videoWrapper.addEventListener('mouseleave', cancelSelection);
  }
  if(ampBtn) ampBtn.addEventListener('click', () => toggleViewMode(true));
  if(trsBtn) trsBtn.addEventListener('click', () => toggleViewMode(false));
  if(zoomFullscreenBtn) zoomFullscreenBtn.addEventListener('click', () => toggleFullscreen(zoomView));
  if(transcriptionFullscreenBtn) transcriptionFullscreenBtn.addEventListener('click', () => toggleFullscreen(transcriptionView));
  if(baixarTextoBtn) baixarTextoBtn.addEventListener('click', downloadText);
  if(narrarTextoBtn) narrarTextoBtn.addEventListener('click', narrateText);
  if(fullscreenZoomInBtn) fullscreenZoomInBtn.addEventListener('click', zoomInFullscreenText);
  if(fullscreenZoomOutBtn) fullscreenZoomOutBtn.addEventListener('click', zoomOutFullscreenText);

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(event =>
      document.addEventListener(event, handleFullscreenChange, false)
  );
}

// ==========================================================
// ========= SEÇÃO DE ACESSIBILIDADE (REVISADA E COMPLETA) =========
// ==========================================================

function setupAccessibilityFeatures() {
  if (toggleAccessibilityPanelBtn) {
      toggleAccessibilityPanelBtn.addEventListener('click', toggleAccessibilityPanel);
  }
  if (closeAccessibilityPanelBtn) {
      closeAccessibilityPanelBtn.addEventListener('click', toggleAccessibilityPanel);
  }
  if (highContrastToggle) {
      highContrastToggle.addEventListener('change', handleHighContrastToggle);
  }
  if (dyslexicFontToggle) {
      dyslexicFontToggle.addEventListener('change', handleDyslexicFontToggle);
  }
  if (colorblindModeRadios) {
      colorblindModeRadios.forEach(radio => {
          radio.addEventListener('change', (e) => {
              if (e.target.checked) { // Aplica apenas se o radio button estiver marcado
                  applyColorBlindMode(e.target.value);
              }
          });
      });
  }
  if (decreaseFontBtn) {
      decreaseFontBtn.addEventListener('click', () => updatePanelFontSize('decrease'));
  }
  if (increaseFontBtn) {
      increaseFontBtn.addEventListener('click', () => updatePanelFontSize('increase'));
  }
  if (fontSizeSlider) {
      fontSizeSlider.addEventListener('input', (e) => updatePanelFontSize(parseInt(e.target.value)));
  }
  // Nenhuma chamada inicial para applyColorBlindMode aqui, pois o padrão é "none" (HTML)
}

// --- Gerenciamento do Painel de Acessibilidade (Abrir/Fechar, Foco, ESC) ---
function toggleAccessibilityPanel() {
  if (!accessibilityOptionsPanel || !toggleAccessibilityPanelBtn) {
      console.error("Elementos do painel de acessibilidade não encontrados.");
      return;
  }

  const isHidden = accessibilityOptionsPanel.classList.toggle('hidden');
  const isExpanded = !isHidden;
  toggleAccessibilityPanelBtn.setAttribute('aria-expanded', isExpanded.toString());

  if (isExpanded) {
      lastFocusedElementBeforePanel = document.activeElement;
      if (accessibilityPanelTitle && typeof accessibilityPanelTitle.focus === 'function') {
          accessibilityPanelTitle.focus();
      } else {
          // Fallback se o título não for focável por algum motivo (embora tenha tabindex="-1")
          accessibilityOptionsPanel.focus(); // O painel em si tem tabindex="-1"
      }
      accessibilityOptionsPanel.addEventListener('keydown', trapFocusInPanel);
      document.addEventListener('keydown', accessibilityEscapeKeyListener);
  } else {
      accessibilityOptionsPanel.removeEventListener('keydown', trapFocusInPanel);
      document.removeEventListener('keydown', accessibilityEscapeKeyListener);
      if (lastFocusedElementBeforePanel && typeof lastFocusedElementBeforePanel.focus === 'function') {
          lastFocusedElementBeforePanel.focus();
      }
  }
}

function trapFocusInPanel(e) {
  if (e.key !== 'Tab' || !accessibilityOptionsPanel) return;

  const focusableElementsString = 'h3[tabindex="-1"], input[type="checkbox"], input[type="radio"], input[type="range"], button';
  const focusableElements = Array.from(
      accessibilityOptionsPanel.querySelectorAll(focusableElementsString)
  ).filter(el => el.offsetParent !== null && !el.disabled); // Apenas elementos visíveis e não desabilitados

  if (focusableElements.length === 0) {
      e.preventDefault();
      return;
  }

  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  if (e.shiftKey) { // Shift + Tab
      if (document.activeElement === firstFocusable || document.activeElement === accessibilityOptionsPanel) {
          lastFocusable.focus();
          e.preventDefault();
      }
  } else { // Tab
      if (document.activeElement === lastFocusable) {
          firstFocusable.focus();
          e.preventDefault();
      } else if (!focusableElements.includes(document.activeElement)) {
          // Se, por algum motivo, o foco sair dos elementos esperados dentro do painel,
          // direciona para o primeiro elemento focável.
          firstFocusable.focus();
          e.preventDefault();
      }
  }
}

function accessibilityEscapeKeyListener(e) {
  if (e.key === 'Escape' && accessibilityOptionsPanel && !accessibilityOptionsPanel.classList.contains('hidden')) {
      toggleAccessibilityPanel();
  }
}

// --- Alto Contraste ---
function handleHighContrastToggle() {
  if (highContrastToggle) {
      document.body.classList.toggle('high-contrast', highContrastToggle.checked);
      console.log("Alto contraste alterado para: ", highContrastToggle.checked);
  } else {
      console.error("Elemento highContrastToggle não encontrado.");
  }
}

// --- Fonte para Dislexia ---
function handleDyslexicFontToggle() {
  if (dyslexicFontToggle) {
      document.body.classList.toggle('dyslexic-font', dyslexicFontToggle.checked);
      console.log("Fonte disléxica alterada para: ", dyslexicFontToggle.checked);
  } else {
      console.error("Elemento dyslexicFontToggle não encontrado.");
  }
}

// --- Modos de Daltonismo ---
function applyColorBlindMode(mode) {
  const modes = ["protanopia-mode", "deuteranopia-mode", "tritanopia-mode", "achromatopsia-mode"];
  modes.forEach(m => {
      if (document.body.classList.contains(m)) {
          document.body.classList.remove(m);
      }
  });

  if (mode && mode !== "none") {
      document.body.classList.add(mode);
      console.log(`Modo daltonismo aplicado: ${mode}`);
  } else {
      console.log("Modo daltonismo desativado (normal).");
  }
}

// --- Ajuste de Tamanho da Fonte (Controlado pelo Painel de Acessibilidade) ---
function applyPanelFontSize() {
  if (resultadoOCR) {
      resultadoOCR.style.fontSize = `${panelCurrentFontSize}px`;
  } else {
      console.error("Elemento resultadoOCR não encontrado para aplicar tamanho da fonte.");
  }
  if (fontSizeValueDisplay) {
      fontSizeValueDisplay.textContent = `${panelCurrentFontSize}px`;
  } else {
      console.error("Elemento fontSizeValueDisplay não encontrado.");
  }
  if (fontSizeSlider) {
      fontSizeSlider.value = panelCurrentFontSize;
  } else {
      console.error("Elemento fontSizeSlider não encontrado.");
  }
  // console.log(`Tamanho da fonte do painel aplicado: ${panelCurrentFontSize}px`); // Menos verboso
}

function updatePanelFontSize(operationOrValue) {
  let newSize = panelCurrentFontSize;
  if (operationOrValue === 'increase') {
      newSize = Math.min(PANEL_MAX_FONT_SIZE, panelCurrentFontSize + PANEL_FONT_STEP);
  } else if (operationOrValue === 'decrease') {
      newSize = Math.max(PANEL_MIN_FONT_SIZE, panelCurrentFontSize - PANEL_FONT_STEP);
  } else if (typeof operationOrValue === 'number') {
      newSize = Math.max(PANEL_MIN_FONT_SIZE, Math.min(PANEL_MAX_FONT_SIZE, operationOrValue));
  }

  if (newSize !== panelCurrentFontSize) {
      panelCurrentFontSize = newSize;
      applyPanelFontSize();
      console.log(`Tamanho da fonte do painel atualizado para: ${panelCurrentFontSize}px`);
  }
}
// ========================================================
// ========= FIM DA SEÇÃO DE ACESSIBILIDADE =========
// ========================================================


// --- Funções Principais da Aplicação (Webcam, OCR, Narração, etc.) ---
// (Estas funções permanecem como na versão anterior, com verificações adicionais de existência de elementos)

async function initWebcam() {
  if (currentStream) currentStream.getTracks().forEach(track => track.stop());
  try {
      currentStream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
      if(video) video.srcObject = currentStream;
      if(video) video.onloadedmetadata = () => {
          if(mainContent) mainContent.classList.remove('hidden');
          if(startWebcamBtn) startWebcamBtn.classList.add('hidden');
          if(resetCameraBtn) resetCameraBtn.classList.remove('hidden');
          toggleViewMode(true);
      };
  } catch (err) {
      console.error("Erro ao acessar webcam:", err);
      if(ocrStatus) ocrStatus.textContent = "Erro webcam. Verifique permissões.";
      if(mainContent) mainContent.classList.add('hidden');
      if(startWebcamBtn) startWebcamBtn.classList.remove('hidden');
      if(resetCameraBtn) resetCameraBtn.classList.add('hidden');
  }
}

function resetWebcam() { if(ocrStatus) ocrStatus.textContent = "Reiniciando..."; initWebcam(); }

function startSelection(e) {
  if (!currentStream || !video || video.paused || video.ended || !overlay) return;
  isSelecting = true; const rect = video.getBoundingClientRect();
  selectionStartX = e.clientX - rect.left; selectionStartY = e.clientY - rect.top;
  Object.assign(overlay.style, { left: `${selectionStartX}px`, top: `${selectionStartY}px`, width: `0px`, height: `0px`, display: 'block' });
}

function updateSelection(e) {
  if (!isSelecting || !video || !overlay) return;
  const rect = video.getBoundingClientRect(); const currentX = e.clientX - rect.left; const currentY = e.clientY - rect.top;
  Object.assign(overlay.style, { left: `${Math.min(selectionStartX, currentX)}px`, top: `${Math.min(selectionStartY, currentY)}px`, width: `${Math.abs(currentX - selectionStartX)}px`, height: `${Math.abs(currentY - selectionStartY)}px` });
}

function endSelection(e) {
  if (!isSelecting || !video || !overlay) return;
  isSelecting = false; overlay.style.display = 'none'; const rect = video.getBoundingClientRect();
  const endX = e.clientX - rect.left; const endY = e.clientY - rect.top; const x = Math.min(selectionStartX, endX); const y = Math.min(selectionStartY, endY);
  const width = Math.abs(endX - selectionStartX); const height = Math.abs(endY - selectionStartY);
  selection = (width > 10 && height > 10) ? { x, y, width, height } : null;
  processSelection();
}

function cancelSelection() { if (isSelecting && overlay) { isSelecting = false; overlay.style.display = 'none'; selection = null; } }

function processSelection() { if (!selection) return; if (!isDrawingZoom) captureAndAnalyze(); }

function toggleViewMode(showZoom) {
  if (!zoomView || !transcriptionView || !ampBtn || !trsBtn) return;
  isDrawingZoom = showZoom;
  zoomView.classList.toggle('hidden', !showZoom);
  transcriptionView.classList.toggle('hidden', showZoom);
  ampBtn.classList.toggle('active', showZoom);
  trsBtn.classList.toggle('active', !showZoom);
  ampBtn.setAttribute('aria-selected', showZoom.toString());
  trsBtn.setAttribute('aria-selected', (!showZoom).toString());

  if (showZoom && currentStream) {
      requestAnimationFrame(drawZoomedFrame);
  } else if (!showZoom && selection) {
      captureAndAnalyze();
  } else if (!showZoom && !selection) {
      if(resultadoOCR) resultadoOCR.textContent = "";
      if(ocrStatus) ocrStatus.textContent = "Selecione uma área na webcam para transcrever.";
  }
}

function drawZoomedFrame() {
  if (!isDrawingZoom || !currentStream || !video || video.paused || video.ended || !zoomCanvas || !zoomCanvasCtx) return;
  if (zoomCanvas.width !== zoomCanvas.clientWidth) zoomCanvas.width = zoomCanvas.clientWidth;
  if (zoomCanvas.height !== zoomCanvas.clientHeight) zoomCanvas.height = zoomCanvas.clientHeight;
  zoomCanvasCtx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);
  if (selection) {
      const scaleX = video.videoWidth / video.clientWidth; const scaleY = video.videoHeight / video.clientHeight;
      const sx = selection.x * scaleX; const sy = selection.y * scaleY;
      const sWidth = selection.width * scaleX; const sHeight = selection.height * scaleY;
      if (sWidth > 0 && sHeight > 0) zoomCanvasCtx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, zoomCanvas.width, zoomCanvas.height);
  } else {
      zoomCanvasCtx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color-dark') || '#333';
      zoomCanvasCtx.font = "16px Arial"; zoomCanvasCtx.textAlign = "center";
      zoomCanvasCtx.fillText("Selecione uma área na webcam para ampliar.", zoomCanvas.width / 2, zoomCanvas.height / 2);
  }
  requestAnimationFrame(drawZoomedFrame);
}

async function captureAndAnalyze() {
  if (AZURE_CONFIG.SUBSCRIPTION_KEY_VISION === "SUA_CHAVE_AZURE_COMPUTER_VISION") { if(ocrStatus) ocrStatus.textContent = "OCR indisponível (configure chaves Azure)."; return; }
  if (!selection) { if(ocrStatus) ocrStatus.textContent = "Nenhuma área selecionada."; if(resultadoOCR) resultadoOCR.textContent = ""; return; }
  if(ocrStatus) ocrStatus.textContent = "Preparando imagem..."; if(resultadoOCR) resultadoOCR.textContent = ""; const tempCanvas = document.createElement('canvas'); const tempCtx = tempCanvas.getContext('2d');
  const scaleX = video.videoWidth / video.clientWidth; const scaleY = video.videoHeight / video.clientHeight; const sx = selection.x * scaleX; const sy = selection.y * scaleY;
  const sWidth = selection.width * scaleX; const sHeight = selection.height * scaleY; if (sWidth <= 0 || sHeight <= 0) { if(ocrStatus) ocrStatus.textContent = "Seleção inválida."; return; }
  tempCanvas.width = sWidth; tempCanvas.height = sHeight; tempCtx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
  tempCanvas.toBlob(async function(blob) {
      if (!blob) { if(ocrStatus) ocrStatus.textContent = "Erro ao capturar imagem."; return; } if(ocrStatus) ocrStatus.textContent = "Analisando com Azure OCR...";
      try {
          const readApiUrl = `${AZURE_CONFIG.ENDPOINT_VISION}/vision/v3.2/read/analyze?api-version=2023-02-01-preview&features=read&model-version=latest&language=pt`;
          let response = await fetch(readApiUrl, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': AZURE_CONFIG.SUBSCRIPTION_KEY_VISION, 'Content-Type': 'application/octet-stream' }, body: blob });
          if (!response.ok) { const errorData = await response.json().catch(() => ({ error: { message: response.statusText } })); throw new Error(`Azure OCR (submit): ${response.status} - ${errorData.error?.message || 'Erro desconhecido'}`); }
          const operationLocation = response.headers.get("operation-location"); if (!operationLocation) throw new Error("Falha ao obter 'operation-location'.");
          for (let i = 0; i < 30; i++) { // Limit retries
              await new Promise(r => setTimeout(r, 1000));
              response = await fetch(operationLocation, { headers: { 'Ocp-Apim-Subscription-Key': AZURE_CONFIG.SUBSCRIPTION_KEY_VISION } });
              if (!response.ok) throw new Error(`Azure OCR (get result): ${response.status} - ${await response.text()}`);
              const analysisResult = await response.json();
              if (analysisResult.status === 'succeeded') { let recognizedText = analysisResult.analyzeResult?.readResults?.[0]?.lines.map(line => line.text).join('\n') || ""; if(resultadoOCR) resultadoOCR.textContent = recognizedText.trim() || "Nenhum texto detectado."; if(ocrStatus) ocrStatus.textContent = "Análise concluída."; return; }
              else if (analysisResult.status === 'failed') throw new Error("Análise OCR do Azure falhou: " + JSON.stringify(analysisResult.error || analysisResult));
              if(ocrStatus) ocrStatus.textContent = `Análise em progresso... (${analysisResult.status})`;
          } throw new Error("Tempo limite da análise OCR excedido.");
      } catch (error) { console.error("Erro no OCR Azure:", error); if(resultadoOCR) resultadoOCR.textContent = ""; if(ocrStatus) ocrStatus.textContent = "Erro no OCR: " + error.message.substring(0,100) + "..."; }
  }, 'image/png');
}

async function narrateText() {
  if(!resultadoOCR || !narrarTextoBtn) return;
  const textToNarrate = resultadoOCR.textContent.trim(); if (!textToNarrate) { alert("Não há texto para narrar."); return; }
  if (AZURE_CONFIG.SUBSCRIPTION_KEY_SPEECH === "SUA_CHAVE_AZURE_SPEECH_SERVICE") { alert("Narração indisponível (configure chaves Azure)."); return; }
  const originalButtonHTML = narrarTextoBtn.innerHTML; narrarTextoBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Narrando...'; narrarTextoBtn.disabled = true;
  const ssml = `<speak version='1.0' xml:lang='pt-BR'><voice name='${AZURE_CONFIG.VOICE_SPEECH}'>${textToNarrate.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</voice></speak>`;
  try {
      const ttsUrl = `https://${AZURE_CONFIG.REGION_SPEECH}.tts.speech.microsoft.com/cognitiveservices/v1`;
      const response = await fetch(ttsUrl, { method: 'POST', headers: { 'Ocp-Apim-Subscription-Key': AZURE_CONFIG.SUBSCRIPTION_KEY_SPEECH, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3', 'User-Agent': 'AmplificaApp' }, body: ssml });
      if (!response.ok) throw new Error(`Azure TTS: ${response.status} - ${await response.text()}`); const audioBlob = await response.blob(); const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl); audio.play(); audio.onended = () => { narrarTextoBtn.innerHTML = originalButtonHTML; narrarTextoBtn.disabled = false; }; audio.onerror = () => { throw new Error('Erro ao reproduzir áudio.'); };
  } catch (err) { console.error('Erro ao narrar:', err); alert('Erro ao narrar: ' + err.message); narrarTextoBtn.innerHTML = originalButtonHTML; narrarTextoBtn.disabled = false; }
}

function downloadText() {
  if(!resultadoOCR) return;
  const text = resultadoOCR.textContent; const formatEl = document.getElementById('exportFormat'); if(!formatEl) return; const format = formatEl.value;
  const filename = `amplifica_texto_${new Date().toISOString().slice(0,10)}.${format}`;
  if (format === 'pdf') { const { jsPDF } = window.jspdf; const doc = new jsPDF(); const margin = 15, lineHeight = 7, pageHeight = doc.internal.pageSize.height, pageWidth = doc.internal.pageSize.width; const textLines = doc.splitTextToSize(text, pageWidth - margin * 2); let y = margin; textLines.forEach(line => { if (y + lineHeight > pageHeight - margin) { doc.addPage(); y = margin; } doc.text(line, margin, y); y += lineHeight; }); doc.save(filename); }
  else { const blob = new Blob([text], { type: 'text/plain;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); }
}

function toggleFullscreen(element) {
  if(!element) return;
  const fsDoc = document;
  if (!fsDoc.fullscreenElement && !fsDoc.mozFullScreenElement && !fsDoc.webkitFullscreenElement && !fsDoc.msFullscreenElement) {
      if (element.requestFullscreen) element.requestFullscreen(); else if (element.mozRequestFullScreen) element.mozRequestFullScreen(); else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen(); else if (element.msRequestFullscreen) element.msRequestFullscreen();
  } else { if (fsDoc.exitFullscreen) fsDoc.exitFullscreen(); else if (fsDoc.mozCancelFullScreen) fsDoc.mozCancelFullScreen(); else if (fsDoc.webkitExitFullscreen) fsDoc.webkitExitFullscreen(); else if (fsDoc.msExitFullscreen) fsDoc.msExitFullscreen(); }
}

function handleFullscreenChange() {
  const fullscreenElement = document.fullscreenElement || document.mozFullScreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
  const isTranscriptionFullscreen = fullscreenElement === transcriptionView;
  if(fullscreenTextZoomControls) fullscreenTextZoomControls.classList.toggle('visible', isTranscriptionFullscreen);
  if (isTranscriptionFullscreen) {
      if(transcriptionView) transcriptionView.classList.add('fullscreen-active');
      if(resultadoOCR) resultadoOCR.style.fontSize = `${fullscreenTextCurrentFontSize}px`;
  } else {
      if (transcriptionView && transcriptionView.classList.contains('fullscreen-active')) {
          transcriptionView.classList.remove('fullscreen-active');
          if(resultadoOCR) resultadoOCR.style.fontSize = `${panelCurrentFontSize}px`;
      }
  }
  if(zoomView) zoomView.classList.toggle('fullscreen-active', fullscreenElement === zoomView);
}

function zoomInFullscreenText() { if (fullscreenTextCurrentFontSize < FULLSCREEN_TEXT_MAX_FONT_SIZE) { fullscreenTextCurrentFontSize += FULLSCREEN_TEXT_FONT_STEP; if(resultadoOCR) resultadoOCR.style.fontSize = `${fullscreenTextCurrentFontSize}px`; } }
function zoomOutFullscreenText() { if (fullscreenTextCurrentFontSize > FULLSCREEN_TEXT_MIN_FONT_SIZE) { fullscreenTextCurrentFontSize -= FULLSCREEN_TEXT_FONT_STEP; if(resultadoOCR) resultadoOCR.style.fontSize = `${fullscreenTextCurrentFontSize}px`; } }

console.log("Amplifica Script Carregado e Acessibilidade Revisada. Lembre-se de configurar as chaves do Azure!");