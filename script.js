// ===========================================
// Pikolin Racing Chart - Versão Final
// Contém a lógica para o Looker Studio e o Teste Local
// versão 1.0 12/11/2025 as 15:35
// Autor: Wagner Nascimento 
// ===========================================

// ===========================================
// 1. CÓDIGO DO LOOKER STUDIO
// ===========================================
if (typeof looker !== "undefined") {
  looker.plugins.visualizations.add({
    id: 'pikolin_racing_chart',
    label: 'Grafico Pikolin',
    options: {
      // Opções de Configuração
      duracao: {
        section: 'Animação',
        type: 'number',
        label: 'Velocidade da Animação (ms)',
        default: 1000
      },
      ordem: {
        section: 'Dados',
        type: 'string',
        label: 'Ordenação',
        display: 'select',
        values: [
          {label: 'Decrescente (Maior para Menor)', value: 'desc'},
          {label: 'Crescente (Menor para Maior)', value: 'asc'}
        ],
        default: 'desc'
      },
      topN: {
        section: 'Dados',
        type: 'number',
        label: 'Top N (Quantidade de Barras)',
        default: 10
      },
      // Opções de Estilo
      padding: {
        section: 'Estilo',
        type: 'number',
        label: 'Espessura da Barra (0.1 = grossa, 0.8 = fina)',
        default: 0.4
      },
      idioma: {
        section: 'Estilo',
        type: 'string',
        label: 'Formato do Número',
        display: 'select',
        values: [
          {label: 'Português/Espanhol (1.250,00)', value: 'pt'},
          {label: 'Inglês (1,250.00)', value: 'en'}
        ],
        default: 'pt'
      }
    },

    create: function(element, config) {
      // Cria o container inicial
      element.innerHTML = "<div id='chart' style='width: 100%; height: 100%;'></div>";
    },

    updateAsync: function(data, element, config, queryResponse, details, doneRendering) {

      // --- 1. Limpar Erros e Container ---
      this.clearErrors();
      const container = d3.select(element).select('#chart');
      container.selectAll("*").remove();

      // --- 2. Validação de Dados ---
      if (!queryResponse || !queryResponse.fields) {
        doneRendering();
        return;
      }
      if (queryResponse.fields.dimensions.length === 0 || queryResponse.fields.measures.length === 0) {
        this.addError({title: 'Campos Incompletos', message: 'Por favor, adicione pelo menos 1 Dimensão (Categoria) e 1 Métrica (Valor).'});
        doneRendering();
        return;
      }

      // --- 3. Obter Opções da Configuração ---
      const duracao = config.duracao || 1000;
      const ordem = config.ordem || 'desc';
      const topN = config.topN || 10;
      const padding = config.padding || 0.4;
      const idioma = config.idioma || 'pt';

      // --- 4. Configuração do Gráfico (Dinâmico) ---
      const elRect = element.getBoundingClientRect();
      const svgWidth = elRect.width;
      const svgHeight = elRect.height;
      
      // Margens baseadas no seu teste local
      const margin = { top: 50, right: 205, bottom: 40, left: 180 };
      const width = svgWidth - margin.left - margin.right;
      const height = svgHeight - margin.top - margin.bottom;

      // Proteção contra tamanhos negativos
      if (width <= 0 || height <= 0) {
        doneRendering();
        return;
      }

      const svg = container.append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // URL da logo (hardcoded, como no seu teste)
      const logoUrl = 'https://github.com/wagnernascimento-alt/Empresa/blob/main/logo_3.png?raw=true';

      // --- 5. Transformação de Dados ---
      const dimName = queryResponse.fields.dimensions[0].name;
      const measureName = queryResponse.fields.measures[0].name;
      
      // Verifica se há uma 2ª dimensão (Período)
      const hasPeriod = queryResponse.fields.dimensions.length > 1;
      const periodDimName = hasPeriod ? queryResponse.fields.dimensions[1].name : null;
      let periodText = "";

      let parsedData = data.map(row => {
        // Pega o período da primeira linha (assume que é o mesmo para todos)
        if (hasPeriod && periodText === "") {
          periodText = row[periodDimName].value;
        }
        return {
          label: row[dimName].value,
          value: +row[measureName].value || 0
        };
      });

      // --- 6. Processamento (Ordenar e Fatiar) ---
      parsedData.sort(function(a, b) {
        return ordem === 'asc' ? a.value - b.value : b.value - a.value;
      });
      const slicedData = parsedData.slice(0, topN);

      // --- 7. Formato de Número (Dinâmico) ---
      let formatadorNumero;
      if (idioma === 'pt') {
        const ptBRLocale = d3.formatLocale({"decimal": ",", "thousands": ".", "grouping": [3], "currency": ["R$", ""]});
        formatadorNumero = ptBRLocale.format(",");
      } else {
        // Padrão Inglês
        formatadorNumero = d3.format(",");
      }

      // --- 8. Adição do Período (Dinâmico) ---
      if (hasPeriod) {
        const svgContainer = svg.select(function() { return this.parentNode; });
        svgContainer.append("text")
          .attr("class", "periodo-label")
          .attr("x", svgWidth - 20) // Canto direito
          .attr("y", svgHeight - 20) // Canto inferior
          .attr("text-anchor", "end")
          .style("font-size", "16px")
          .style("fill", "#000000ff") // Usando a cor do seu teste
          .style("font-weight", "bold")
          .text(periodText);
      }

      // --- 9. Escalas X e Y ---
      const x = d3.scaleLinear().range([0, width]);
      const y = d3.scaleBand().range([0, height]).padding(padding); // Usa o padding da config

      x.domain([0, d3.max(slicedData, d => d.value)]);
      y.domain(slicedData.map(d => d.label));

      // --- 10. Desenho e Animação (Lógica do Teste Local) ---
      const barGroups = svg.selectAll(".bar-group")
        .data(slicedData, d => d.label) // Usa 'slicedData'
        .enter()
        .append("g")
        .attr("class", "bar-group")
        .attr("transform", d => `translate(0, ${y(d.label)})`);

      // 1. Adiciona a BARRA
      barGroups.append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", 0) // Estado inicial
        .attr("height", y.bandwidth())
        .attr("fill", "#D71920"); // Cor sólida

      // 2. Adiciona a LOGO
      const logoHeight = y.bandwidth() * 0.9;
      const logoWidth = logoHeight * 3.46; // Proporção
      const logoYOffset = y.bandwidth() * 0.05;

      barGroups.append("image")
        .attr("class", "bar-logo")
        .attr("href", logoUrl)
        .attr("x", 0) // Estado inicial
        .attr("y", logoYOffset)
        .attr("width", logoWidth)
        .attr("height", logoHeight);

      // 3. Adiciona o LABEL (Categoria)
      barGroups.append("text")
        .attr("class", "label")
        .attr("x", -10)
        .attr("y", y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .text(d => d.label);
        
      // 4. Adiciona o VALOR (Número)
      barGroups.append("text")
        .attr("class", "value")
        .attr("x", 0) // Estado inicial
        .attr("y", y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .text(d => formatadorNumero(d.value)); // Usa formatador

      // --- 11. Transições (Animação) ---
      
      // Anima a BARRA
      svg.selectAll(".bar")
        .transition()
        .duration(duracao) // Usa duração da config
        .attr("width", d => x(d.value));

      // Anima a LOGO
      svg.selectAll(".bar-logo")
        .transition()
        .duration(duracao)
        .attr("x", d => x(d.value) + 0.4); // Sem espaço

      // Anima o VALOR
      svg.selectAll(".value")
        .transition()
        .duration(duracao)
        .attr("x", d => x(d.value) + logoWidth + 8);

      // --- Finaliza o render ---
      doneRendering();
    }
  });
} 
// ===========================================
// 2. CÓDIGO DE TESTE LOCAL
// (Seu script de teste, inalterado)
// ===========================================
else if (typeof looker === "undefined") {
  console.log("Modo de teste local ativado (dados simulados)");

  // --- 1. Dados Simulados ---
  const data = [
    { label: "Exportación", value: 100000 },
    { label: "Equipo Interno", value: 80000 },
    { label: "Regional NO-NE", value: 65000 },
    { label: "Nuevos Negocios", value: 35000 },
    { label: "Reg. SP + Prem/Stud", value: 18000 },
    { label: "Hotelería/Franquicias", value: 29768 }
  ];

  // --- 2. Ordenação ---
  const ordem = 'desc'; // Ordena do maior para o menor
  data.sort(function(a, b) {
    return ordem === 'asc' ? a.value - b.value : b.value - a.value;
  });

  // --- 3. Configuração do Gráfico (D3) ---
  const container = d3.select("#chart");
  container.selectAll("*").remove();

  const margin = { top: 50, right: 205, bottom: 40, left: 180 }; // Aumentei a margem direita
  const width = 700 - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = container.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // URL da logo (link do GitHub que você forneceu)
  //const logoUrl = 'https://raw.githubusercontent.com/wagnernascimento-alt/Empresa/refs/heads/main/logo_2.png';
  const logoUrl = 'https://github.com/wagnernascimento-alt/Empresa/blob/main/logo_3.png?raw=true';

  // --- 4. Formato de Número (pt-BR) ---
  const ptBRLocale = d3.formatLocale({
    "decimal": ",",
    "thousands": ".", // Ponto para milhar
    "grouping": [3],
    "currency": ["R$", ""]
  });
  const formatadorNumero = ptBRLocale.format(",");

  // --- 5. Adição do Período (Estático) ---
  const svgContainer = svg.select(function() { return this.parentNode; });
  svgContainer.append("text")
    .attr("class", "periodo-label")
    .attr("x", width + margin.left + margin.right - 20)
    .attr("y", height + margin.top + margin.bottom - 20)
    .attr("text-anchor", "end")
    .style("font-size", "16px") //tamanho a fonte do periodo
    .style("fill", "#000000ff")
    .style("font-weight", "bold") // mudar para negrito o periodo
    .text("Periodo: Enero/2025");

  // --- 6. Escalas X e Y ---
  const x = d3.scaleLinear().range([0, width]);
  const y = d3.scaleBand().range([0, height]).padding(0.4); //espessura da barra, está em 40%

  x.domain([0, d3.max(data, d => d.value)]);
  y.domain(data.map(d => d.label)); // Usa os dados já ordenados

  // --- 7. Desenho e Animação (A Mágica) ---

  // Para cada linha de dado, criamos um Grupo <g>
  const barGroups = svg.selectAll(".bar-group")
    .data(data)
    .enter()
    .append("g")
    .attr("class", "bar-group")
    .attr("transform", d => `translate(0, ${y(d.label)})`);

  // 1. Adiciona a BARRA (vermelha, sólida)
  barGroups.append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0) // Estado inicial
    .attr("height", y.bandwidth())
    .attr("fill", "#D71920"); // Cor sólida

  // 2. Adiciona a LOGO
  // Proporção da sua logo (142x41) é ~3.46x mais larga
  const logoHeight = y.bandwidth() * 0.9; // Logo com 90% da altura da barra
  const logoWidth = logoHeight * 3.46;
  const logoYOffset = y.bandwidth() * 0.05; // Margem para centralizar

  barGroups.append("image")
    .attr("class", "bar-logo")
    .attr("href", logoUrl)
    .attr("x", 0) // Estado inicial
    .attr("y", logoYOffset)
    .attr("width", logoWidth)
    .attr("height", logoHeight);

  // 3. Adiciona o LABEL (Nome da Categoria)
  barGroups.append("text")
    .attr("class", "label")
    .attr("x", -10) // Fixo à esquerda
    .attr("y", y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "end")
    .text(d => d.label);
    
  // 4. Adiciona o VALOR (Número)
  barGroups.append("text")
    .attr("class", "value")
    .attr("x", 0) // Estado inicial
    .attr("y", y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", "start") // Alinha à esquerda
    .text(d => formatadorNumero(d.value)); // Usa o formatador pt-BR

  // --- 8. Transições (Animação) ---

  const duracao = 1000;

  // Anima a BARRA
  svg.selectAll(".bar")
    .transition()
    .duration(duracao)
    .attr("width", d => x(d.value)); // Anima a largura

  // Anima a LOGO
  svg.selectAll(".bar-logo")
    .transition()
    .duration(duracao)
    .attr("x", d => x(d.value) + 0.4); // +5 Anima a posição X (5px depois da barra) removi  o espaço entre a imagem e a barra

  // Anima o VALOR
  svg.selectAll(".value")
    .transition()
    .duration(duracao)
    .attr("x", d => x(d.value) + logoWidth + 8); // Anima Posição X (10px depois da logo)
}
