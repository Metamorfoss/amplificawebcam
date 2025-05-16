// ======================== CONFIGURAÇÃO AZURE ==========================
const subscriptionKey = "2lq6d62WM18MjLN1z9rNNddKM1yK3Db4CzSdaVaZpBYDphSnv7LAJQQJ99BDACZoyfiXJ3w3AAAFACOG71Rz"; // ⛔ Substitua pela sua chave do Azure
const endpoint = "https://amplifica.cognitiveservices.azure.com/";     // ⛔ Substitua pelo seu endpoint completo
// ======================================================================

const video = document.getElementById('webcam');
const canvas = document.getElementById('zoomCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const videoWrapper = document.getElementById('videoWrapper');
const resultado = document.getElementById('resultadoOCR');
const resultbox = document.getElementById('resultbox');
const zoomCanvas = document.getElementById('zoomCanvas');

let contrasteAtivado = false;
let selection = null;
let isSelecting = false;
let startX = 0;
let startY = 0;
let tamanhoFonteAtual = 16;
let isAmplified = false;
let currentFontSize = 14; // Tamanho inicial para acessibilidade

async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      console.log("Câmera iniciada com sucesso");
    };
  } catch (err) {
    console.error("Erro ao acessar a webcam:", err);
    resultado.textContent = "Erro ao acessar a webcam. Por favor, verifique as permissões e tente novamente.";
    
    // Tenta reiniciar automaticamente após 5 segundos
    setTimeout(() => {
      startWebcam();
    }, 5000);
  }
}

// Adiciona botão para reiniciar a câmera
function addResetCameraButton() {
  const resetBtn = document.createElement("button");
  resetBtn.id = "resetCamera";
  resetBtn.textContent = "Reiniciar Câmera";
  resetBtn.style.position = "absolute";
  resetBtn.style.bottom = "10px";
  resetBtn.style.left = "10px";
  resetBtn.style.zIndex = "100";
  resetBtn.style.padding = "8px 12px";
  resetBtn.style.backgroundColor = "#e74c3c";
  resetBtn.style.color = "white";
  resetBtn.style.border = "none";
  resetBtn.style.borderRadius = "4px";
  resetBtn.style.cursor = "pointer";
  
  resetBtn.addEventListener('click', async () => {
    resetBtn.textContent = "Reiniciando...";
    const stream = video.srcObject;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    await startWebcam();
    resetBtn.textContent = "Reiniciar Câmera";
  });
  
  document.body.appendChild(resetBtn);
}

videoWrapper.addEventListener('mousedown', (e) => {
  isSelecting = true;
  const rect = video.getBoundingClientRect();
  startX = e.clientX - rect.left;
  startY = e.clientY - rect.top;
  overlay.style.left = `${startX}px`;
  overlay.style.top = `${startY}px`;
  overlay.style.width = `0px`;
  overlay.style.height = `0px`;
  overlay.style.display = 'block';
});

videoWrapper.addEventListener('mousemove', (e) => {
  if (!isSelecting) return;
  const rect = video.getBoundingClientRect();
  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;
  const width = currentX - startX;
  const height = currentY - startY;
  overlay.style.left = `${Math.min(startX, currentX)}px`;
  overlay.style.top = `${Math.min(startY, currentY)}px`;
  overlay.style.width = `${Math.abs(width)}px`;
  overlay.style.height = `${Math.abs(height)}px`;
});

videoWrapper.addEventListener('mouseup', (e) => {
  isSelecting = false;
  const rect = video.getBoundingClientRect();
  const endX = e.clientX - rect.left;
  const endY = e.clientY - rect.top;
  const x = Math.min(startX, endX);
  const y = Math.min(startY, endY);
  const width = Math.abs(endX - startX);
  const height = Math.abs(endY - startY);
  selection = { x, y, width, height };
  capturarEAnalisar(); // Automatically trigger OCR on selection
});

let isDrawing = true; // Variável para controlar o loop de animação

function drawZoomed() {
  // Parar o loop se o canvas não estiver visível
  if (zoomCanvas.style.visibility === 'hidden' || !isDrawing) {
    return;
  }

  // Verificar se o canvas está em um estado válido
  if (!ctx || canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
    requestAnimationFrame(drawZoomed);
    return;
  }

  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  const displayWidth = video.clientWidth;
  const displayHeight = video.clientHeight;

  const scaleX = videoWidth / displayWidth;
  const scaleY = videoHeight / displayHeight;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (selection) {
    const sx = selection.x * scaleX;
    const sy = selection.y * scaleY;
    const sWidth = selection.width * scaleX;
    const sHeight = selection.height * scaleY;

    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(drawZoomed);
}

function activateZoom() {
  isAmplified = true;
  resultbox.classList.add('hidden');
  zoomCanvas.style.visibility = 'visible';
  document.getElementById('amp-btn').classList.add('active');
  document.getElementById('trs-btn').classList.remove('active');
  isDrawing = true;
  drawZoomed();
}

function activateTranscription() {
  isAmplified = false;
  resultbox.classList.remove('hidden');
  zoomCanvas.style.visibility = 'hidden';
  document.getElementById('amp-btn').classList.remove('active');
  document.getElementById('trs-btn').classList.add('active');
  isDrawing = false;
  if (selection) {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;

    const scaleX = videoWidth / displayWidth;
    const scaleY = videoHeight / displayHeight;

    const sx = selection.x * scaleX;
    const sy = selection.y * scaleY;
    const sWidth = selection.width * scaleX;
    const sHeight = selection.height * scaleY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  }
}

// Associar eventos aos botões
document.getElementById('amp-btn').addEventListener('click', activateZoom);
document.getElementById('trs-btn').addEventListener('click', activateTranscription);

async function capturarEAnalisar() {
  // Verifique se o canvas está pronto
  if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
    resultado.textContent = "Erro: Canvas não está pronto. Tente novamente.";
    return;
  }

  // Forçar renderização do frame atual no canvas
  if (selection) {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const displayWidth = video.clientWidth;
    const displayHeight = video.clientHeight;

    const scaleX = videoWidth / displayWidth;
    const scaleY = videoHeight / displayHeight;

    const sx = selection.x * scaleX;
    const sy = selection.y * scaleY;
    const sWidth = selection.width * scaleX;
    const sHeight = selection.height * scaleY;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
  } else {
    // Se não houver seleção, capturar o vídeo inteiro
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  }

  resultado.textContent = "Analisando com Azure OCR...";

  // Capturar o blob após garantir que o canvas está desenhado
  canvas.toBlob(async function(blob) {
    if (!blob) {
      resultado.textContent = "Erro: Falha ao capturar imagem do canvas.";
      return;
    }

    try {
      const url = `${endpoint}/vision/v3.2/read/analyze`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/octet-stream'
        },
        body: blob
      });

      const operationLocation = response.headers.get("operation-location");
      if (!operationLocation) throw new Error("Falha ao obter operação OCR.");

      let result;
      while (true) {
        const res = await fetch(operationLocation, {
          headers: { 'Ocp-Apim-Subscription-Key': subscriptionKey }
        });
        const data = await res.json();
        if (data.status === 'succeeded') {
          result = data.analyzeResult.readResults;
          break;
        } else if (data.status === 'failed') {
          throw new Error("Falha na análise OCR.");
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      let textoReconhecido = '';
      for (const page of result) {
        for (const line of page.lines) {
          textoReconhecido += line.text + '\n';
        }
      }

      resultado.textContent = "Texto reconhecido:\n" + textoReconhecido;

    } catch (error) {
      resultado.textContent = "Erro no OCR Azure: " + error.message;
    }
  }, 'image/jpeg', 1.0);
}

async function narrarComAzure(texto) {
  const subscriptionKey = '8USfj4ZObcOCdModY3PgpN20wUDAOv3d7jk3FaSNvPzL8ijFEPIkJQQJ99BDACZoyfiXJ3w3AAAYACOGFlGA'; // sua chave do Azure Speech
  const region = 'brazilsouth';
  const voice = 'pt-BR-FranciscaNeural';

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const ssml = `
    <speak version='1.0' xml:lang='pt-BR'>
      <voice name='${voice}'>
        ${texto}
      </voice>
    </speak>`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'OCRWebApp'
      },
      body: ssml
    });

    if (!response.ok) throw new Error('Erro ao gerar áudio do Azure');

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    audio.play();

    } catch (err) {
      alert('Erro ao narrar com Azure: ' + err.message);
    }
  }

function togglePanel() {
  const panel = document.getElementById("accessibility-options");
  panel.classList.toggle("hidden");
}

function toggleHighContrast() {
  const isHighContrast = document.body.classList.toggle("high-contrast");
  
  // Atualiza cores do header no modo alto contraste
  const header = document.querySelector('header');
  if (isHighContrast) {
    header.style.backgroundColor = '#000';
    header.style.borderBottom = '1px solid #fff';
    // Aplica contraste apenas a elementos específicos
    document.querySelectorAll('#resultbox, #accessibility-options, #accessibility-btn button, .features').forEach(el => {
      el.style.backgroundColor = '#000';
      el.style.color = '#fff';
    });
  } else {
    header.style.backgroundColor = 'var(--primary-color)';
    header.style.borderBottom = 'none';
    // Remove estilos de contraste
    document.querySelectorAll('#resultbox, #accessibility-options, #accessibility-btn button, .features').forEach(el => {
      el.style.backgroundColor = '';
      el.style.color = '';
    });
  }
}

function toggleDyslexicFont() {
  document.body.classList.toggle("dyslexic-font");
}

function getFilterForType(type) {
  switch(type) {
    case 'protanopia': return 'hue-rotate(-50deg) saturate(0.8)';
    case 'deuteranopia': return 'hue-rotate(50deg) saturate(0.8)';
    case 'tritanopia': return 'hue-rotate(180deg) saturate(0.7)';
    case 'achromatopsia': return 'grayscale(100%) contrast(120%)';
    default: return 'none';
  }
}

function toggleColorBlindMode(type) {
  // Remove todas as classes de daltonismo primeiro
  document.body.classList.remove("protanopia-mode", "deuteranopia-mode", "tritanopia-mode", "achromatopsia-mode");
  
  // Adiciona apenas a classe selecionada
  if (document.querySelector(`input[onchange="toggleColorBlindMode('${type}')"]`).checked) {
    document.body.classList.add(`${type}-mode`);
    
    // Aplica o filtro apenas aos elementos que não são vídeo/canvas
    const elements = document.querySelectorAll('body > *:not(#webcam):not(#zoomCanvas):not(#videoWrapper)');
    elements.forEach(el => {
      el.style.filter = getFilterForType(type);
    });
  } else {
    // Remove o filtro
    const elements = document.querySelectorAll('body > *:not(#webcam):not(#zoomCanvas):not(#videoWrapper)');
    elements.forEach(el => {
      el.style.filter = 'none';
    });
  }
  
  // Atualiza os outros checkboxes para desmarcados
  document.querySelectorAll('input[type="checkbox"][onchange^="toggleColorBlindMode"]').forEach(checkbox => {
    if (checkbox.getAttribute('onchange') !== `toggleColorBlindMode('${type}')`) {
      checkbox.checked = false;
    }
  });
}

function adjustFontSize(operation) {
  // Define os limites mínimo e máximo
  const minSize = 12;
  const maxSize = 28;
  const step = 2;
  
  // Ajusta o tamanho conforme a operação
  if (operation === 'increase' && currentFontSize < maxSize) {
    currentFontSize += step;
  } else if (operation === 'decrease' && currentFontSize > minSize) {
    currentFontSize -= step;
  } else if (typeof operation === 'number') {
    // Se for um número direto (do range)
    currentFontSize = operation;
  }
  
  // Garante que está dentro dos limites
  currentFontSize = Math.max(minSize, Math.min(maxSize, currentFontSize));
  
  // Aplica o novo tamanho
  document.documentElement.style.fontSize = currentFontSize + 'px';
  document.getElementById('font-size-value').textContent = currentFontSize + 'px';
  
  // Atualiza o range slider se existir
  const rangeInput = document.querySelector('input[type="range"]');
  if (rangeInput) {
    rangeInput.value = currentFontSize;
  }
}

function narrarTexto() {
  const texto = resultado.innerText;
  narrarComAzure(texto);
}

async function baixarTexto() {
  const texto = resultado.textContent;
  const tipo = document.getElementById('exportFormat').value;

  if (tipo === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const marginLeft = 10;
    const marginTop = 10;
    const lineHeight = 10;
    const pageHeight = doc.internal.pageSize.height;

    const linhas = doc.splitTextToSize(texto, 180);
    let y = marginTop;

    for (const linha of linhas) {
      if (y + lineHeight > pageHeight - marginTop) {
        doc.addPage();
        y = marginTop;
      }
      doc.text(linha, marginLeft, y);
      y += lineHeight;
    }

    doc.save("ocr_output.pdf");
    return;
  }

  let blob;
  if (tipo === 'txt') {
    blob = new Blob([texto], { type: 'text/plain' });
  } else {
    alert("Formato inválido");
    return;
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ocr_output.${tipo}`;
  a.click();
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  startWebcam().then(drawZoomed);
  addResetCameraButton();
});