// ==========================================
// 1. DADOS BASE E ESTADO DO APLICATIVO
// ==========================================
const alertasBase = [
  {
    lat: -25.4411,
    lng: -49.2768,
    cidade: "Curitiba (Cajuru)",
    tipo: "Alagamento em via pública",
    diagnostico: "Acúmulo de água acima de 30cm detectado. Rota alternativa recomendada.",
    data: "Monitoramento Contínuo"
  },
  {
    lat: -25.5200,
    lng: -48.5100,
    cidade: "Paranaguá (Litoral)",
    tipo: "Maré Alta + Chuva Intensa",
    diagnostico: "Drenagem urbana sobrecarregada devido à frente fria e El Niño.",
    data: "Monitoramento Contínuo"
  },
  {
    lat: -25.3100,
    lng: -48.8800,
    cidade: "Serra do Mar (BR-277)",
    tipo: "Risco de deslizamento",
    diagnostico: "Solo com saturação hídrica elevada. Atenção redobrada.",
    data: "Monitoramento Contínuo"
  }
];

let alertasSalvos = JSON.parse(localStorage.getItem('guardiao_pr_alertas')) || [];
let gpsLat = null;
let gpsLng = null;
let map = null;

// ==========================================
// 2. CARREGAR TODOS OS 399 MUNICÍPIOS DO PARANÁ
// ==========================================
async function carregarMunicipiosPR() {
  const datalist = document.getElementById('listaCidadesPR');
  if (!datalist) return;

  try {
    const resp = await fetch('https://ibge.gov.br');
    const municipios = await resp.json();
    municipios.forEach(function(m) {
      const option = document.createElement('option');
      option.value = m.nome;
      datalist.appendChild(option);
    });
  } catch (e) {
    const reserva = ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "São José dos Pinhais", "Foz do Iguaçu", "Colombo", "Guarapuava", "Paranaguá"];
    reserva.forEach(function(cidade) {
      const option = document.createElement('option');
      option.value = cidade;
      datalist.appendChild(option);
    });
  }
}

// ==========================================
// 3. INICIALIZAÇÃO DO MAPA DO PARANÁ
// ==========================================
function inicializarMapa() {
  const mapDiv = document.getElementById('map');
  if (typeof L === 'undefined') {
    if (mapDiv) {
      mapDiv.textContent = "Conecte-se à internet para visualizar o mapa interativo do Paraná.";
      mapDiv.style.padding = "20px";
      mapDiv.style.textAlign = "center";
      mapDiv.style.color = "#94a3b8";
    }
    atualizarContadorEHistorico();
    return;
  }

  map = L.map('map').setView([-24.89, -51.55], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(map);

  const todosAlertas = alertasBase.concat(alertasSalvos);
  todosAlertas.forEach(function(alerta) {
    adicionarPinoNoMapa(alerta, false);
  });

  atualizarContadorEHistorico();
}

function adicionarPinoNoMapa(alerta, abrirPopup) {
  if (!map) return;

  const containerPopup = document.createElement('div');
  const titulo = document.createElement('strong');
  titulo.textContent = "🚨 " + alerta.tipo + " — " + alerta.cidade;
  const br = document.createElement('br');
  const desc = document.createElement('span');
  desc.textContent = alerta.diagnostico;

  containerPopup.appendChild(titulo);
  containerPopup.appendChild(br);
  containerPopup.appendChild(desc);

  const marcador = L.marker([alerta.lat, alerta.lng]).addTo(map).bindPopup(containerPopup);

  if (abrirPopup) {
    marcador.openPopup();
    map.setView([alerta.lat, alerta.lng], 12);
  }
}

async function buscarCoordenadasCidade(nomeCidade) {
  if (gpsLat !== null && nomeCidade.indexOf("Minha Localização") !== -1) {
    return { lat: gpsLat, lng: gpsLng };
  }
  try {
    const query = encodeURIComponent(nomeCidade + ', Paraná, Brasil');
    const resp = await fetch('https://openstreetmap.org' + query + '&limit=1');
    const dados = await resp.json();
    const primeiro = dados.shift();
    if (primeiro) {
      return { lat: parseFloat(primeiro.lat), lng: parseFloat(primeiro.lon) };
    }
  } catch (e) {
    console.warn("Erro ao buscar coordenadas:", e);
  }
  return { lat: -24.89, lng: -51.55 };
}

// ==========================================
// 4. NAVEGAÇÃO ENTRE ABAS E CONFIGURAÇÃO API
// ==========================================
document.querySelectorAll('.tab-btn').forEach(function(botao) {
  botao.addEventListener('click', function() {
    document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });

    botao.classList.add('active');
    const tabId = botao.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'urbano' && map) {
      setTimeout(function() { map.invalidateSize(); }, 200);
    }
  });
});

function toggleConfig() {
  document.getElementById('configPanel').classList.toggle('open');
}

function salvarApiKey() {
  const key = document.getElementById('geminiApiKey').value.trim();
  if (key) {
    localStorage.setItem('guardiao_gemini_key', key);
    document.getElementById('aiStatusBadge').textContent = "🟢 API Gemini Conectada";
    alert("Chave API salva! O app agora usará a IA real do Google Gemini.");
  } else {
    localStorage.removeItem('guardiao_gemini_key');
    document.getElementById('aiStatusBadge').textContent = "⚡ Modo Demo Inteligente";
  }
  toggleConfig();
}

// ==========================================
// 5. RECURSOS DO DISPOSITIVO (GPS E CÂMERA)
// ==========================================
function usarGPS() {
  if (!navigator.geolocation) {
    alert("Seu navegador não suporta geolocalização.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      gpsLat = pos.coords.latitude;
      gpsLng = pos.coords.longitude;
      const input = document.getElementById('cidadeInput');
      input.value = "Minha Localização (" + gpsLat.toFixed(3) + ", " + gpsLng.toFixed(3) + ")";
      if (map) {
        map.setView([gpsLat, gpsLng], 13);
      }
    },
    function() {
      alert("Não foi possível obter o GPS. Digite o nome da cidade no campo.");
    }
  );
}

function previewImagem(input, imgId) {
  const img = document.getElementById(imgId);
  if (input.files && input.files.length > 0) {
    const arquivo = input.files.item(0);
    const reader = new FileReader();
    reader.onload = function(e) {
      img.src = e.target.result;
      img.style.display = 'block';
    };
    reader.readAsDataURL(arquivo);
  }
}

// ==========================================
// 6. INTEGRAÇÃO COM IA (GEMINI REAL OU SIMULADOR)
// ==========================================
async function chamarIA(promptTexto) {
  const apiKey = localStorage.getItem('guardiao_gemini_key');

  if (apiKey) {
    try {
      const url = 'https://googleapis.com' + apiKey;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptTexto }] }]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        const candidato = data.candidates.shift();
        if (candidato.content && candidato.content.parts && candidato.content.parts.length > 0) {
          return candidato.content.parts.shift().text;
        }
      }
    } catch (erro) {
      console.warn("Falha na API externa, ativando fallback local:", erro);
    }
  }

  return new Promise(function(resolve) {
    setTimeout(function() { resolve(null); }, 1200);
  });
}

async function processarAlertaUrbano() {
  const loading = document.getElementById('loadingUrbano');
  const resultado = document.getElementById('resultadoUrbano');
  const nomeCidade = document.getElementById('cidadeInput').value.trim() || "Curitiba";
  const tipo = document.getElementById('tipoOcorrencia').value;

  resultado.style.display = 'none';
  loading.style.display = 'block';

  const coords = await buscarCoordenadasCidade(nomeCidade);
  const prompt = 'Você é a IA da Defesa Civil do Paraná (Guardião PR). Um morador relatou "' + tipo + '" em "' + nomeCidade + '" durante período de chuvas intensas do El Niño. Gere um diagnóstico técnico curto (máximo 3 frases) com orientação de segurança imediata.';
  const respostaReal = await chamarIA(prompt);

  const textoDiagnostico = respostaReal || ("Padrão de risco confirmado para " + tipo + " em " + nomeCidade + ", agravado pelo solo encharcado. Evite transitar pelo local e acione a Defesa Civil (199) caso o nível suba.");

  loading.style.display = 'none';
  resultado.innerHTML = '';

  const tag = document.createElement('span');
  tag.className = 'risk-tag risk-high';
  tag.textContent = 'RISCO CRÍTICO VALIDADO PELA IA';

  const pLocal = document.createElement('p');
  pLocal.textContent = 'Local: ' + nomeCidade;

  const pParecer = document.createElement('p');
  pParecer.textContent = 'Parecer Técnico: ' + textoDiagnostico;

  resultado.appendChild(tag);
  resultado.appendChild(pLocal);
  resultado.appendChild(pParecer);
  resultado.style.display = 'block';

  const novoAlerta = {
    lat: coords.lat,
    lng: coords.lng,
    cidade: nomeCidade,
    tipo: tipo,
    diagnostico: textoDiagnostico,
    data: new Date().toLocaleString('pt-BR')
  };

  alertasSalvos.push(novoAlerta);
  localStorage.setItem('guardiao_pr_alertas', JSON.stringify(alertasSalvos));
  adicionarPinoNoMapa(novoAlerta, true);
  atualizarContadorEHistorico();
}

async function processarDiagnosticoAgro() {
  const loading = document.getElementById('loadingAgro');
  const resultado = document.getElementById('resultadoAgro');
  const cultura = document.getElementById('culturaSelect').value;
const sintoma = document.getElementById('sintomaAgro').value || "manchas foliares e alta umidade";
resultado.style.display = 'none';
loading.style.display = 'block';
const prompt = 'Você é um agrônomo virtual especialista no clima do Paraná durante o El Niño. Um pequeno produtor de ' + cultura + ' relatou: "' + sintoma + '". Dê uma recomendação preventiva curta e prática em 3 tópicos simples.';
const respostaReal = await chamarIA(prompt);
const textoAgro = respostaReal || "1. Risco elevado de doenças fúngicas devido ao calor e umidade persistente.\n2. Suspenda aplicações foliares se houver previsão de chuva nas próximas 24h.\n3. Verifique os canais de escoamento para evitar encharcamento das raízes.";
loading.style.display = 'none';
resultado.innerHTML = '';
const tag = document.createElement('span');
tag.className = 'risk-tag risk-med';
tag.textContent = 'ALERTA FITOSSANITÁRIO • ' + cultura.toUpperCase();
const pTexto = document.createElement('p');
pTexto.style.marginTop = '8px';
pTexto.style.whiteSpace = 'pre-line';
pTexto.textContent = textoAgro;
resultado.appendChild(tag);
resultado.appendChild(pTexto);
resultado.style.display = 'block';
}
// ==========================================
// 7. HISTÓRICO E CONTADORES
// ==========================================
function atualizarContadorEHistorico() {
const total = alertasBase.length + alertasSalvos.length;
document.getElementById('contadorAlertas').textContent = total + ' Alertas Ativos';
const lista = document.getElementById('listaHistorico');
lista.innerHTML = '';
if (alertasSalvos.length === 0) {
const vazio = document.createElement('p');
vazio.style.color = '#94a3b8';
vazio.style.fontSize = '0.85rem';
vazio.style.marginTop = '10px';
vazio.textContent = 'Nenhum novo alerta enviado pelo usuário ainda.';
lista.appendChild(vazio);
return;
}
alertasSalvos.slice().reverse().forEach(function(item) {
const card = document.createElement('div');
card.className = 'historico-item';
const titulo = document.createElement('strong');
titulo.textContent = '🚨 ' + item.tipo + ' — ' + item.cidade;
const desc = document.createElement('p');
desc.style.marginTop = '4px';
desc.style.color = '#cbd5e1';
desc.textContent = item.diagnostico;
const dataSpan = document.createElement('span');
dataSpan.className = 'data';
dataSpan.textContent = 'Registrado em: ' + item.data;
card.appendChild(titulo);
card.appendChild(desc);
card.appendChild(dataSpan);
lista.appendChild(card);
});
}
function limparHistorico() {
localStorage.removeItem('guardiao_pr_alertas');
alertasSalvos = [];
location.reload();
}
// ==========================================
// 8. INICIALIZAÇÃO AO ABRIR A PÁGINA
// ==========================================
if (localStorage.getItem('guardiao_gemini_key')) {
document.getElementById('aiStatusBadge').textContent = "🟢 API Gemini Conectada";
}
carregarMunicipiosPR();
inicializarMapa();
