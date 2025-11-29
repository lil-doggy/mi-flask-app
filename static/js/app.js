// Frontend JS that talks to Flask backend
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const runAnalysisBtn = document.getElementById('runAnalysis');

    // Events
    if (loginBtn) loginBtn.addEventListener('click', login);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (runAnalysisBtn) runAnalysisBtn.addEventListener('click', ejecutarAnalisis);

    // tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        mostrarTab(target, e.currentTarget);
    }));

    // Graph generation button
    const genBtn = document.getElementById('btnGenerateGraph');
    if (genBtn) genBtn.addEventListener('click', generateGeneralGraph);

    const searchBtn = document.getElementById('btnSearchSpecies');
    if (searchBtn) searchBtn.addEventListener('click', searchSpecies);

    const execBtn = document.getElementById('btnExecuteBFS');
    if (execBtn) execBtn.addEventListener('click', executeBFS);

    // Initially hide app
    document.getElementById('appContainer').classList.remove('active');

    // quick focus
    document.getElementById('username').focus();
    // load existing graph links if any
    try { loadGraphLinks(); } catch (e) { /* ignore */ }
});

// Load existing generated graph HTML links from server
function loadGraphLinks() {
    fetch('/api/graphs_list').then(r => r.json()).then(j => {
        if (!j.success) return;
        const files = j.files || [];
        const genBtn = document.getElementById('btnGenerateGraph');
        const hlLink = document.getElementById('linkHighlightGraph');
        if (files.includes('grafo_general.html')) {
            // mark the generate button as already having a generated graph
            if (genBtn) { genBtn.dataset.path = '/static/graphs/grafo_general.html'; genBtn.innerText = '🗺️ Abrir grafo general'; }
        }
        if (files.includes('grafo_resaltado.html') || files.includes('grafo_resaltado.html')) {
            hlLink.href = '/static/graphs/grafo_resaltado.html'; hlLink.style.display='inline-block';
        }
    }).catch(e => { /* ignore */ });
}

function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    fetch('/api/login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({username: user, password: pass})
    }).then(r => r.json()).then(j => {
        if (j.success) {
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('appContainer').classList.add('active');
            inicializarApp();
        } else {
            document.getElementById('loginError').textContent = j.error || 'Error en login';
        }
    }).catch(err => {
        document.getElementById('loginError').textContent = 'Error conectando al servidor';
    });
}

function logout() {
    fetch('/api/logout', {method:'POST'}).finally(() => {
        document.getElementById('appContainer').classList.remove('active');
        document.getElementById('loginContainer').style.display = 'flex';
        document.getElementById('loginError').textContent = '';
        document.getElementById('username').value = 'usuario';
        document.getElementById('password').value = '1234';
    });
}

function mostrarTab(tabName, btnEl) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (btnEl) btnEl.classList.add('active');
    if (tabName === 'grafo') {
        setTimeout(() => {
            initCytoscape();
            // when the tab becomes visible, ensure Cytoscape resizes and fits
            waitForCy(() => {
                try { if (window.cyInstance && typeof window.cyInstance.resize === 'function') { window.cyInstance.resize(); window.cyInstance.fit(); } } catch (e) { /* ignore */ }
            }, 3000);
            // update visible graph stats (node/edge counts)
            try { updateGraphCounts(); } catch (e) { /* ignore */ }
        }, 100);
    }
}

function inicializarApp() {
    fetch('/api/stats').then(r => r.json()).then(data => {
        renderStats(data);
        inicializarGraficos(data);
    }).catch(err => console.warn('No se pudo cargar stats', err));
}

function renderStats(stats) {
    const grid = document.getElementById('statsGrid');
    grid.innerHTML = '';
    const cards = [
        {icon:'🕸️', number: stats.num_nodos || '-', label: 'Total de Nodos'},
        {icon:'📊', number: stats.num_aristas || '-', label: 'Total de Aristas'},
        {icon:'🌱', number: stats.num_plantaciones || '-', label: 'Plantaciones'},
        {icon:'👤', number: stats.num_titulares || '-', label: 'Titulares'},
        {icon:'🌿', number: stats.num_especies || '-', label: 'Especies'}
    ];
    for (const c of cards) {
        const div = document.createElement('div'); div.className='stat-card';
        div.innerHTML = `<div style="font-size:24px">${c.icon}</div><div class="stat-number">${c.number}</div><div class="stat-label">${c.label}</div>`;
        grid.appendChild(div);
    }
}

function inicializarGraficos(stats) {
        // Use the dedicated initCharts function so charts are centralized and easier to update.
        // `stats` can later be passed into initCharts to populate data dynamically.
        initCharts();
}

// Charts: species & departments (moved into its own function as requested)
function initCharts(){
    new Chart(document.getElementById('chartEspecies').getContext('2d'),{
        type:'bar',
        data:{ labels:['Guazuma','Ochroma','Eucalyptus g.','Eucalyptus s.','Cordia','Schizolobium','Pinus','Calycophyllum','Cedrelinga','Swietenia'], datasets:[{ label:'Plantaciones', data:[280,152,134,96,95,79,64,63,54,47], backgroundColor:['#006400','#228B22','#32CD32','#90EE90','#3CB371','#2E8B57','#8FBC8F','#20B2AA','#3D9970','#004D00'], borderColor:'#006400', borderWidth:1 }] },
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ x:{ beginAtZero:true } } }
    });

    new Chart(document.getElementById('chartDepartamentos').getContext('2d'),{
        type:'bar',
        data:{ labels:['San Martín','Cajamarca','Loreto','Pasco','Huánuco','Cusco','Junín','Amazonas','Ancash','Ucayali'], datasets:[{ label:'Plantaciones', data:[232,132,120,85,82,69,64,41,41,36], backgroundColor:['#C1272D','#006400','#228B22','#32CD32','#90EE90','#3CB371','#2E8B57','#8FBC8F','#20B2AA','#3D9970'], borderColor:'#006400', borderWidth:1 }] },
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{ display:false } }, scales:{ y:{ beginAtZero:true } } }
    });
}

function ejecutarAnalisis() {
    const tipo = document.getElementById('tipo').value;
    const especie = document.getElementById('especie').value || 'Todas';
    const depto = document.getElementById('departamento').value || 'Todos';
    const start = document.getElementById('startNode') ? document.getElementById('startNode').value : null;
    const target = document.getElementById('targetNode') ? document.getElementById('targetNode').value : null;
    const limit = document.getElementById('limit') ? document.getElementById('limit').value : null;
    const resultadosEl = document.getElementById('analisisResult');
    resultadosEl.style.display = 'block';
    resultadosEl.innerHTML = '<em>Cargando resultados...</em>';

    fetch('/api/analysis', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({tipo:tipo, especie:especie, departamento:depto, startNode: start, targetNode: target, limit: limit})})
    .then(r => {
        // If the server returned non-JSON or an error status, extract text for a readable message
        if (!r.ok) return r.text().then(t => { throw new Error(t || r.statusText); });
        return r.json();
    }).then(j => {
        if (j.success) {
            const res = j.result;
            resultadosEl.innerHTML = `<h3 style="color:var(--verde);">📊 Resultados: ${res.tipo}</h3>`+
                `<p><strong>Filtros:</strong> Especie=${res.filtros.especie} - Departamento=${res.filtros.departamento}</p>`+
                `<pre>${JSON.stringify(res.output, null, 2)}</pre>`+
                `<p style="font-size:12px;color:#666">${res.note}</p>`;

            // Visualizaciones en Cytoscape según tipo
            if (res.output) {
                const visited = res.output ? (res.output.visited || res.output.nodes) : null;
                const path = res.output ? (res.output.path || null) : null;

                // Ensure the graph tab is visible and Cytoscape is initialized before highlighting
                try { mostrarTab('grafo'); } catch (e) { /* ignore if not present */ }

                waitForCy(() => {
                    if (path && Array.isArray(path) && path.length) {
                        highlightPath(path.map(String));
                        // also render focused subgraph for the path
                        try { renderResultSubgraph(path.map(String)); } catch (e) { console.warn('renderResultSubgraph failed', e); }
                    } else if (visited && Array.isArray(visited) && visited.length) {
                        highlightNodes(visited.map(String));
                        // center on visited nodes
                        fitToNodes(visited.map(String));
                        try { renderResultSubgraph(visited.slice(0,200).map(String)); } catch (e) { console.warn('renderResultSubgraph failed', e); }
                    }
                }, 3000);
            }
        } else {
            resultadosEl.innerHTML = '<p>Error al ejecutar el análisis</p>';
        }
    }).catch(err => {
        console.error('Error calling /api/analysis', err);
        resultadosEl.innerHTML = `<p style="color:#c00">Error al ejecutar el análisis: ${err.message}</p>`;
    });
}

// Generate general graph HTML on server and provide link
function generateGeneralGraph() {
    const btn = document.getElementById('btnGenerateGraph');
    const overlay = document.getElementById('overlay');
    const exportBtn = document.getElementById('btnExportPNG');
    // If graph already generated, open it instead of regenerating
    if (btn && btn.dataset && btn.dataset.path) {
        try { window.open(btn.dataset.path, '_blank'); return; } catch (e) { /* fallback to regenerate */ }
    }
    if (btn) { btn.disabled = true; btn.innerText = 'Generando...'; }
    if (overlay) overlay.style.display = 'flex';
    fetch('/api/generate_general_graph', { method: 'POST' })
    .then(r => r.json())
    .then(j => {
        if (j && j.success && j.path) {
            if (btn) { btn.dataset.path = j.path; btn.innerText = '🗺️ Abrir grafo general'; btn.disabled = false; }
            // refresh available links and counts
            try { loadGraphLinks(); } catch (e) { /* ignore */ }
            try { updateGraphCounts(); } catch (e) { /* ignore */ }
            window.open(j.path, '_blank');
        } else {
            if (btn) { btn.disabled = false; btn.innerText = '🗺️ Generar y ver grafo general'; }
            alert('Error generando grafo: ' + (j && j.error ? j.error : 'Desconocido'));
        }
    }).catch(e => { if (btn) { btn.disabled = false; btn.innerText = '🗺️ Generar y ver grafo general'; } alert('Error: '+(e && e.message?e.message:String(e))); })
    .finally(() => {
        if (overlay) overlay.style.display = 'none';
    });
}

// Update graph counts shown next to controls
function updateGraphCounts() {
    const el = document.getElementById('graphCounts');
    if (!el) return;
    fetch('/api/stats').then(r => r.json()).then(data => {
        const n = data && data.num_nodos ? data.num_nodos : '-';
        const m = data && data.num_aristas ? data.num_aristas : '-';
        el.innerText = `Nodos: ${n} • Aristas: ${m}`;
    }).catch(() => { /* ignore */ });
}

// Export current Cytoscape view as PNG
/* Export button removed by user request */

// Species search (returns matches)
function searchSpecies() {
    const q = document.getElementById('speciesSearch').value || '';
    if (!q) { alert('Ingresa nombre (o parte) de la especie'); return; }
    const out = document.getElementById('speciesMatches');
    out.innerHTML = 'Buscando...';
    fetch('/api/species_search', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query: q}) })
    .then(r => r.json()).then(j => {
        if (!j.success) { out.innerText = 'Error: ' + (j.error||''); return; }
        const matches = j.matches || [];
        if (!matches.length) { out.innerText = 'No se encontraron coincidencias.'; return; }
        // render radio list
        out.innerHTML = '';
        const form = document.createElement('div');
        matches.forEach((m, i) => {
            const id = 'sp_match_' + i;
            const r = document.createElement('input'); r.type='radio'; r.name='spmatch'; r.id=id; r.value=m; if (i===0) r.checked=true;
            const label = document.createElement('label'); label.htmlFor=id; label.style.marginLeft='6px'; label.innerText = m;
            const wrapper = document.createElement('div'); wrapper.style.margin='6px 0'; wrapper.appendChild(r); wrapper.appendChild(label);
            form.appendChild(wrapper);
        });
        out.appendChild(form);
    }).catch(e => { out.innerText = 'Error: '+e.message; });
}

// Execute BFS for selected species and optionally generate highlighted HTML
function executeBFS() {
    const matchesDiv = document.getElementById('speciesMatches');
    if (!matchesDiv) { alert('Primero busca especies'); return; }
    const selected = matchesDiv.querySelector('input[name="spmatch"]:checked');
    if (!selected) { alert('Selecciona una especie de la lista'); return; }
    const species = selected.value;
    const gen = document.getElementById('chkGenerateHighlight') && document.getElementById('chkGenerateHighlight').checked;
    const out = document.getElementById('bfsResult');
    out.innerText = 'Ejecutando BFS...';
    fetch('/api/bfs_execute', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ species: species, generate_highlight: gen }) })
    .then(r => r.json()).then(j => {
        if (!j.success) { out.innerText = 'Error: ' + (j.error||''); return; }
        const res = j.result || {};
        // Build card-based HTML report
        let html = '<div class="result-cards">';

        // Left card: summary + plantaciones (if any)
        html += '<div class="result-card">';
        html += `<h4>Resultados de la búsqueda</h4>`;
        html += `<div class="result-summary"><strong>Especie:</strong> ${res.especie || ''} — <strong>Nodos:</strong> ${res.nodos_resaltar ? res.nodos_resaltar.length : 0} — <strong>Aristas:</strong> ${res.num_bordes || 0}</div>`;

        if (res.plantaciones && Array.isArray(res.plantaciones) && res.plantaciones.length) {
            html += '<div class="plantaciones-title">Plantaciones encontradas</div>';
            html += '<div class="result-list"><table style="width:100%; border-collapse:collapse; font-size:13px">';
            html += '<thead><tr style="text-align:left; border-bottom:1px solid #eee"><th style="padding:6px">ID</th><th style="padding:6px">Especie</th><th style="padding:6px">Titular</th><th style="padding:6px">Distrito</th><th style="padding:6px; text-align:right">Sup.</th></tr></thead><tbody>';
            res.plantaciones.forEach(p => {
                const id = p.id || p.ID || '';
                const especie = p.especie || p.ESPECIE || '';
                const titular = p.titular || p.TITULAR || '';
                const distrito = p.distrito || p.DISTRITO || '';
                const sup = p.superficie || p.SUPERFICIE || '';
                html += `<tr style="border-bottom:1px solid #f3f3f3"><td style="padding:6px">${id}</td><td style="padding:6px">${especie}</td><td style="padding:6px">${titular}</td><td style="padding:6px">${distrito}</td><td style="padding:6px; text-align:right">${sup}</td></tr>`;
            });
            html += '</tbody></table></div>';
        } else {
            html += '<div class="result-list"><small>No hay plantaciones para mostrar.</small></div>';
        }

        html += '</div>'; // end left card

        // Right card: nodes + edges (muted background)
        html += '<div class="result-muted">';
        html += `<h4>Nodos resaltados (mostrando ${res.nodos_resaltar ? Math.min(res.nodos_resaltar.length,200) : 0}${res.nodos_resaltar && res.nodos_resaltar.length>200? ' de '+res.nodos_resaltar.length : ''})</h4>`;
        if (res.nodos_resaltar && Array.isArray(res.nodos_resaltar) && res.nodos_resaltar.length) {
            const sample = res.nodos_resaltar.slice(0, 200);
            html += `<div class="result-list nodes-list" style="margin-bottom:10px">${sample.map(x=>String(x)).join(', ')}</div>`;
        } else {
            html += '<div class="result-list nodes-list" style="margin-bottom:10px"><small>No hay nodos resaltables.</small></div>';
        }

        html += `<h4 style="margin-top:6px">Aristas (muestra)</h4>`;
        if (res.bordes && Array.isArray(res.bordes) && res.bordes.length) {
            const sampleE = res.bordes.slice(0,200);
            html += '<div class="result-list edges-list">' + sampleE.map(b => {
                if (Array.isArray(b) && b.length>=2) return `${b[0]} → ${b[1]}`;
                if (b && b.source && b.target) return `${b.source} → ${b.target}`;
                return JSON.stringify(b);
            }).join('<br/>') + '</div>';
        } else {
            html += '<div class="result-list edges-list"><small>No se encontraron aristas.</small></div>';
        }

        html += '</div>'; // end right card

        html += '</div>'; // end result-cards

        out.innerHTML = html;
        if (res.highlight_path) {
            const link = document.getElementById('linkHighlightGraph');
            link.href = res.highlight_path; link.style.display='inline-block';
            // auto-open
            window.open(res.highlight_path, '_blank');
        }
    }).catch(e => { out.innerText = 'Error: '+e.message; });
}

function clearHighlights() {
    if (!window.cyInstance) return;
    const cy = window.cyInstance;
    cy.elements().removeClass('highlighted');
    cy.elements().removeClass('start');
    cy.elements().removeClass('end');
}

function highlightNodes(nodeList) {
    if (!window.cyInstance) return;
    const cy = window.cyInstance;
    try { if (typeof cy.destroyed === 'function' && cy.destroyed()) return; } catch (e) { /* ignore */ }
    clearHighlights();
    nodeList.forEach(id => {
        const sid = String(id);
        let n = cy.getElementById(sid);
        // fallback: search by label if id not found
        if ((!n || !n.length) && sid) {
            const found = cy.nodes().filter(nd => (nd.data && String(nd.data('label')) === sid));
            if (found && found.length) n = found[0];
        }
        if (n && n.length) n.addClass('highlighted');
    });
}

function highlightPath(path) {
    if (!window.cyInstance) return;
    const cy = window.cyInstance;
    try { if (typeof cy.destroyed === 'function' && cy.destroyed()) return; } catch (e) { /* ignore */ }
    clearHighlights();
    const elsToFit = [];
    for (let i = 0; i < path.length; i++) {
        const nid = String(path[i]);
        let n = cy.getElementById(nid);
        // fallback: try to find node by label if id isn't present
        if ((!n || !n.length) && nid) {
            const found = cy.nodes().filter(nd => (nd.data && String(nd.data('label')) === nid));
            if (found && found.length) n = found[0];
        }
        if (n && n.length) {
            n.addClass('highlighted');
            elsToFit.push(n);
        }
        if (i < path.length - 1) {
            const nextId = String(path[i+1]);
            const e = cy.edges().filter(edge => (edge.data('source') === nid && edge.data('target') === nextId) || (edge.data('source') === nextId && edge.data('target') === nid));
            if (e && e.length) {
                e.addClass('highlighted');
                elsToFit.push(e);
            }
        }
    }
    // Mark start and end specially
    if (path.length > 0) {
        const startId = String(path[0]);
        const endId = String(path[path.length - 1]);
        const startNode = cy.getElementById(startId);
        const endNode = cy.getElementById(endId);
        if (startNode && startNode.length) startNode.addClass('start');
        if (endNode && endNode.length) endNode.addClass('end');
    }
    // Center view on the path
    try {
        if (elsToFit.length) cy.fit(elsToFit, 60);
    } catch (e) { console.warn('Could not fit elements', e); }
}

function fitToNodes(nodeList) {
    if (!window.cyInstance) return;
    const cy = window.cyInstance;
    try {
        if (typeof cy.destroyed === 'function' && cy.destroyed()) return;
    } catch (e) { /* ignore */ }
    const els = nodeList.map(id => cy.getElementById(String(id))).filter(e => e && e.length);
    if (els.length) {
        try { cy.fit(els, 60); } catch (e) { console.warn('fitToNodes failed', e); }
    }
}

// Wait for Cytoscape instance to be ready before running callbacks
function waitForCy(callback, timeout = 3000, interval = 100) {
    const start = Date.now();
    (function check() {
        if (window.cyInstance) return callback();
        if (Date.now() - start > timeout) {
            console.warn('waitForCy: timeout waiting for cyInstance');
            return;
        }
        setTimeout(check, interval);
    })();
}

// Render a small focused subgraph (nodes + connecting edges) inside the results panel
function renderResultSubgraph(nodeList) {
    if (!nodeList || !nodeList.length) return;
    // ensure main cy exists so we can pull node/edge data
    if (!window.cyInstance) return;

    // create container inside resultados element
    let resultadosEl = document.getElementById('resultados');
    if (!resultadosEl) return;
    let container = document.getElementById('resultGraphContainer');
    if (!container) {
        // create wrapper with title + container so we can show a caption like in the screenshot
        const wrapper = document.createElement('div');
        wrapper.id = 'resultGraphWrapper';
        wrapper.style.marginTop = '10px';
        wrapper.style.borderRadius = '6px';
        wrapper.style.background = '#fff';
        wrapper.style.padding = '8px';
        wrapper.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';

        const title = document.createElement('div');
        title.id = 'resultGraphTitle';
        title.style.textAlign = 'center';
        title.style.fontWeight = '700';
        title.style.marginBottom = '6px';
        wrapper.appendChild(title);

        container = document.createElement('div');
        container.id = 'resultGraphContainer';
        container.style.height = '360px';
        container.style.border = '1px solid #eee';
        container.style.borderRadius = '6px';
        wrapper.appendChild(container);

        resultadosEl.appendChild(wrapper);
    } else {
        // clear title and container
        const title = document.getElementById('resultGraphTitle');
        if (title) title.innerText = '';
        container.innerHTML = '';
    }

    // collect elements from main cy
    const cy = window.cyInstance;
    const ids = nodeList.map(String);
    const idSet = new Set(ids);
    const elements = [];

    // nodes
    ids.forEach(id => {
        let n = cy.getElementById(id);
        if ((!n || !n.length) && id) {
            const found = cy.nodes().filter(nd => (nd.data && String(nd.data('label')) === id));
            if (found && found.length) n = found[0];
        }
        if (n && n.length) {
            elements.push({ data: Object.assign({}, n.data()) });
        }
    });

    // edges where both ends are in idSet
    cy.edges().forEach(e => {
        const s = String(e.data('source'));
        const t = String(e.data('target'));
        if (idSet.has(s) && idSet.has(t)) {
            elements.push({ data: Object.assign({}, e.data()) });
        }
    });

    // destroy existing result cy if present
    if (window.resultCyInstance) {
        try { window.resultCyInstance.destroy(); } catch (e) { /* ignore */ }
        window.resultCyInstance = null;
    }

    // init a new cytoscape instance in the result container
    try {
        // set title text and add download button
        const title = document.getElementById('resultGraphTitle');
        if (title) title.innerText = `Subgrafo: ${elements.filter(el=>el.data).length} elementos (nodos + aristas)`;
        // add download button next to title
        const wrapper = document.getElementById('resultGraphWrapper');
        if (wrapper && !document.getElementById('resultDownloadBtn')) {
            const btn = document.createElement('button');
            btn.id = 'resultDownloadBtn';
            btn.innerText = 'Descargar imagen';
            btn.style.cssText = 'float:right;background:#006400;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:13px;margin-top:-28px';
            btn.onclick = function() {
                try {
                    if (window.resultCyInstance) {
                        const png = window.resultCyInstance.png({ full: true, scale: 1 });
                        const a = document.createElement('a');
                        a.href = png;
                        a.download = 'subgrafo.png';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    }
                } catch (e) { console.warn('Export failed', e); }
            };
            wrapper.insertBefore(btn, wrapper.firstChild);
        }

        // ensure nodes have displayLabel/fullLabel for styling
        elements.forEach(el => {
            if (!el.data) return;
            // normalize label fields
            el.data.displayLabel = el.data.id;
            el.data.fullLabel = el.data.label || el.data.id;
            // if node has a type and it's not Plantación, display full label
            if (el.data.type && el.data.type !== 'Plantación') {
                el.data.displayLabel = el.data.label || el.data.id;
            }
        });

        window.resultCyInstance = cytoscape({
            container: container,
            elements: elements,
            style: [
                // default node
                { selector: 'node', style: {
                    'label': 'data(displayLabel)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': '#FFD700',
                    'width': 38,
                    'height': 38,
                    'font-size': 10,
                    'color': '#000',
                    'text-wrap': 'wrap',
                    'text-max-width': 120,
                    'padding': 4,
                    'border-color': '#333',
                    'border-width': 1
                }},
                // edge style
                { selector: 'edge', style: { 'width': 2, 'line-color': '#222', 'target-arrow-shape': 'none', 'curve-style':'bezier' } },
                // types
                { selector: 'node[type="Plantación"]', style: { 'background-color': '#FFC107', 'shape':'ellipse', 'border-color':'#3b2f00', 'border-width':3, 'color':'#000', 'font-weight':'700' } },
                { selector: 'node[type="Especie"]', style: { 'background-color': '#8BC34A', 'shape':'round-rectangle' } },
                { selector: 'node[type="Titular"]', style: { 'background-color': '#03A9F4', 'shape':'round-rectangle' } },
                { selector: 'node[type="Ubicación"]', style: { 'background-color': '#FF7043', 'shape':'round-rectangle' } },
                { selector: 'node[type="ARFFS"]', style: { 'background-color': '#DA70D6', 'shape':'diamond' } },
                // highlighted classes keep same look as main
                { selector: '.highlighted', style: { 'background-color': '#FF4136', 'line-color': '#FF4136' } },
                { selector: '.start', style: { 'background-color': '#2ECC40', 'border-color': '#006400', 'border-width': 3 } },
                { selector: '.end', style: { 'background-color': '#0074D9', 'border-color': '#001f3f', 'border-width': 3 } }
            ],
            layout: { name: 'cose', padding: 10, idealEdgeLength: 80, nodeRepulsion: 8000 }
        });

        // after layout, add external labels for Plantación nodes
        window.resultCyInstance.once('layoutstop', () => {
            try {
                const rc = window.resultCyInstance;
                // create label nodes for plantaciones
                const plantNodes = rc.nodes().filter(n => n.data('type') === 'Plantación');
                plantNodes.forEach(n => {
                    const nid = n.id();
                    const lblId = 'lbl_' + nid;
                    if (rc.getElementById(lblId).length) return; // already exists
                    // add label node
                    rc.add({ group: 'nodes', data: { id: lblId, label: n.data('fullLabel') }, position: { x: n.position('x') + 80, y: n.position('y') } , classes: 'result-label' });
                    // add invisible edge so label follows layout if needed
                    rc.add({ group: 'edges', data: { id: 'e_'+lblId+'_'+nid, source: lblId, target: nid } , classes: 'invis-edge' });
                });
                // style for label nodes and invisible edges
                rc.style().selector('.result-label').style({ 'background-opacity':0, 'label':'data(label)', 'text-valign':'center', 'text-halign':'left', 'font-size':10, 'color':'#111', 'text-wrap':'wrap', 'text-max-width':160 }).update();
                rc.style().selector('.invis-edge').style({ 'opacity':0, 'width':0 }).update();
            } catch (e) { console.warn('Could not add external labels', e); }
        });
    } catch (e) {
        console.warn('No se pudo renderizar subgrafo de resultados', e);
    }
}

function initCytoscape() {
    if (window.cyInstance) window.cyInstance.destroy();
    fetch('/api/graph').then(r => {
        if (!r.ok) throw new Error('Error al cargar /api/graph: ' + r.status);
        return r.json();
    }).then(data => {
        // Ensure Cytoscape library is available before attempting to instantiate
        if (typeof cytoscape === 'undefined') {
            const cyContainer = document.getElementById('cy');
            if (cyContainer) cyContainer.innerHTML = '<div style="padding:20px;color:#c00"> Comprueba la conexión a internet o la referencia a la librería.</div>';
            console.warn('Cytoscape.js no está definido en la página.');
            return;
        }
        if (!data || !Array.isArray(data.nodes) || data.nodes.length === 0) {
            const cyContainer = document.getElementById('cy');
            if (cyContainer) cyContainer.innerHTML = '<div style="padding:20px;color:#666">No hay nodos en el grafo. Asegúrate de haber creado `datos/grafo_plantaciones.pkl` y reiniciado el servidor.</div>';
            return;
        }
        const elements = [];
        (data.nodes || []).forEach(n => elements.push({data:n.data}));
        (data.edges || []).forEach(e => elements.push({data:e.data}));

        // Choose a layout strategy depending on graph size to improve performance
        const layoutOptions = (elements && elements.length > 800)
            ? { name: 'grid' }
            : { name: 'cose', directed: true, padding: 20, animate: false, idealEdgeLength: 80, nodeRepulsion: 4000, numIter: 250 };

        const cy = cytoscape({ container: document.getElementById('cy'), elements: elements, style: [
            { selector: 'node', style: { 'label': 'data(label)', 'background-color': '#FFD700', 'text-valign': 'center', 'text-halign': 'center' } },
            { selector: 'edge', style: { 'width': 2, 'line-color': '#ccc' } },
            { selector: 'node[type="Titular"]', style: {'background-color':'#87CEEB'} },
            { selector: 'node[type="Especie"]', style: {'background-color':'#90EE90'} },
            { selector: '.hover', style: {'background-color': '#FFB6C1', 'border-width': 3} }
        ], layout: layoutOptions });

        window.cyInstance = cy;
        try { updateGraphCounts(); } catch (e) { /* ignore */ }
        // Build autocomplete indices from graph data
        try { buildAutocompleteIndices(data); setupSearchAutocomplete(); } catch (e) { console.warn('Autocomplete init failed', e); }
        // estilos para resaltado (clases .highlighted, .start, .end)
        cy.style()
          .selector('.highlighted').style({
              'background-color': '#FF4136',
              'line-color': '#FF4136',
              'target-arrow-color': '#FF4136',
              'border-color': '#990000',
              'border-width': 4,
              'z-index': 9999
          })
          .selector('.start').style({
              'background-color': '#2ECC40',
              'border-color': '#006400',
              'border-width': 5,
              'z-index': 10000
          })
          .selector('.end').style({
              'background-color': '#0074D9',
              'border-color': '#001f3f',
              'border-width': 5,
              'z-index': 10000
          })
                    .update();

                // Add hover behavior via events (use class toggle instead of pseudo-selector)
                try {
                        cy.on('mouseover', 'node', (evt) => { evt.target.addClass('hover'); });
                        cy.on('mouseout', 'node', (evt) => { evt.target.removeClass('hover'); });
                } catch (e) { console.warn('Could not attach hover events', e); }
    }).catch(err => { 
        console.warn('No se pudo cargar grafo', err);
        const cyContainer = document.getElementById('cy');
        if (cyContainer) cyContainer.innerHTML = `<div style="padding:20px;color:#c00">Error cargando el grafo: ${err.message}</div>`;
    });
}

// --- Autocomplete and search helpers ---
const autocompleteIndex = { ids: [], labels: [], species: [], departamentos: [], nodesById: {}, nodesBySpecies: {}, nodesByDept: {} };

function buildAutocompleteIndices(data) {
    // Reset
    autocompleteIndex.ids = [];
    autocompleteIndex.labels = [];
    autocompleteIndex.species = [];
    autocompleteIndex.departamentos = [];
    autocompleteIndex.nodesById = {};
    autocompleteIndex.nodesBySpecies = {};
    autocompleteIndex.nodesByDept = {};

    const nodes = data && data.nodes ? data.nodes : [];
    nodes.forEach(n => {
        const d = n.data || {};
        const id = String(d.id || '');
        const label = String(d.label || d.id || '').trim();
        if (!id) return;
        autocompleteIndex.ids.push(id);
        if (label && !autocompleteIndex.labels.includes(label)) autocompleteIndex.labels.push(label);
        // store raw node for details
        autocompleteIndex.nodesById[id] = d;

        // possible species / departamento fields: especie, ESPECIE, tipo, departamento, DEPARTAMENTO
        const especiesCandidates = [d.especie, d.ESPECIE, d.label, (d.tipo === 'Especie' ? d.label : null)].filter(Boolean).map(x=>String(x).trim());
        const departamentosCandidates = [d.departamento, d.DEPARTAMENTO, d.distrito].filter(Boolean).map(x=>String(x).trim());

        especiesCandidates.forEach(sp => {
            if (!sp) return;
            if (!autocompleteIndex.species.includes(sp)) autocompleteIndex.species.push(sp);
            autocompleteIndex.nodesBySpecies[sp] = autocompleteIndex.nodesBySpecies[sp] || [];
            autocompleteIndex.nodesBySpecies[sp].push(id);
        });
        departamentosCandidates.forEach(dep => {
            if (!dep) return;
            if (!autocompleteIndex.departamentos.includes(dep)) autocompleteIndex.departamentos.push(dep);
            autocompleteIndex.nodesByDept[dep] = autocompleteIndex.nodesByDept[dep] || [];
            autocompleteIndex.nodesByDept[dep].push(id);
        });
    });
    // dedupe
    autocompleteIndex.ids = Array.from(new Set(autocompleteIndex.ids));
    autocompleteIndex.labels = Array.from(new Set(autocompleteIndex.labels));
    autocompleteIndex.species = Array.from(new Set(autocompleteIndex.species));
    autocompleteIndex.departamentos = Array.from(new Set(autocompleteIndex.departamentos));
}

function setupSearchAutocomplete() {
    const inp = document.getElementById('buscarNodo');
    const suggContainer = document.getElementById('searchSuggestions');
    if (!inp || !suggContainer) return;

    // create dropdown list element
    let listEl = document.getElementById('searchSuggestList');
    if (!listEl) {
        listEl = document.createElement('div');
        listEl.id = 'searchSuggestList';
        listEl.style.cssText = 'position:relative; background:#fff; border:1px solid #ddd; border-radius:6px; max-height:180px; overflow:auto; box-shadow:0 6px 18px rgba(0,0,0,0.08); padding:6px;';
        suggContainer.appendChild(listEl);
    }
    listEl.innerHTML = '';

    inp.addEventListener('input', (e) => {
        const v = e.target.value || '';
        const tokens = v.split(',');
        const last = tokens[tokens.length-1].trim().toLowerCase();
        if (!last) { listEl.innerHTML = ''; return; }

        const matches = [];
        // match ids
        autocompleteIndex.ids.forEach(id => { if (id.toLowerCase().includes(last)) matches.push({type:'id', value:id}); });
        // match labels
        autocompleteIndex.labels.forEach(l => { if (l.toLowerCase().includes(last)) matches.push({type:'label', value:l}); });
        // species
        autocompleteIndex.species.forEach(s => { if (s.toLowerCase().includes(last)) matches.push({type:'species', value:s}); });
        // departments
        autocompleteIndex.departamentos.forEach(d => { if (d.toLowerCase().includes(last)) matches.push({type:'dept', value:d}); });

        // limit and render
        const max = 50;
        listEl.innerHTML = '';
        matches.slice(0,max).forEach(m => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:6px 8px; cursor:pointer; border-bottom:1px solid #fafafa; font-size:13px;';
            item.innerHTML = `<strong style="margin-right:8px">[${m.type}]</strong> ${m.value}`;
            item.addEventListener('click', () => {
                // if id or label -> replace last token and trigger search
                if (m.type === 'id' || m.type === 'label') {
                    tokens[tokens.length-1] = m.value;
                    inp.value = tokens.join(', ');
                    listEl.innerHTML = '';
                    buscarNodo();
                } else if (m.type === 'species') {
                    // set species input and trigger BFS search via species search if desired
                    const spInp = document.getElementById('especie'); if (spInp) spInp.value = m.value;
                    tokens[tokens.length-1] = m.value; inp.value = tokens.join(', ');
                    listEl.innerHTML = '';
                } else if (m.type === 'dept') {
                    const dInp = document.getElementById('departamento'); if (dInp) dInp.value = m.value;
                    tokens[tokens.length-1] = m.value; inp.value = tokens.join(', ');
                    listEl.innerHTML = '';
                }
            });
            listEl.appendChild(item);
        });
    });

    // hide on click outside
    document.addEventListener('click', (ev) => {
        if (!suggContainer.contains(ev.target)) {
            listEl.innerHTML = '';
        }
    });
}

// Enhanced buscarNodo: supports multiple IDs (comma-separated), labels, species or department matches
function buscarNodo() {
    const raw = document.getElementById('buscarNodo').value || '';
    const ids = raw.split(',').map(s => s.trim()).filter(Boolean);
    const outTable = document.getElementById('searchResultsTable');
    const detailsEl = document.getElementById('nodeDetails');
    if (!ids.length) {
        if (outTable) outTable.innerHTML = '<div style="color:#c00">Ingresa al menos un ID</div>';
        return;
    }
    if (!window.cyInstance) {
        if (outTable) outTable.innerHTML = '<div style="color:#c00">Grafo no cargado aún.</div>';
        return;
    }

    const foundNodes = [];
    const notFound = [];
    ids.forEach(token => {
        // Try exact id
        let n = window.cyInstance.getElementById(String(token));
        if (n && n.length) {
            foundNodes.push(n[0]);
            return;
        }
        // try match by label
        const byLabel = window.cyInstance.nodes().filter(nd => String(nd.data('label') || '').toLowerCase() === token.toLowerCase());
        if (byLabel && byLabel.length) { foundNodes.push(...byLabel); return; }
        // try species map
        const speciesMatches = autocompleteIndex.nodesBySpecies[token] || autocompleteIndex.nodesBySpecies[capitalize(token)];
        if (speciesMatches && speciesMatches.length) { speciesMatches.forEach(id => { const n2 = window.cyInstance.getElementById(String(id)); if (n2 && n2.length) foundNodes.push(n2[0]); }); return; }
        // try dept map
        const deptMatches = autocompleteIndex.nodesByDept[token] || autocompleteIndex.nodesByDept[capitalize(token)];
        if (deptMatches && deptMatches.length) { deptMatches.forEach(id => { const n2 = window.cyInstance.getElementById(String(id)); if (n2 && n2.length) foundNodes.push(n2[0]); }); return; }
        // try partial contains for id/label
        const partial = window.cyInstance.nodes().filter(nd => {
            const idv = String(nd.id() || '').toLowerCase();
            const lbl = String(nd.data('label') || '').toLowerCase();
            return idv.includes(token.toLowerCase()) || lbl.includes(token.toLowerCase());
        });
        if (partial && partial.length) { partial.forEach(p => foundNodes.push(p)); return; }
        notFound.push(token);
    });

    if (!foundNodes.length) {
        if (outTable) outTable.innerHTML = `<div style="color:#c00">No se encontraron nodos para: ${notFound.join(', ')}</div>`;
        if (detailsEl) detailsEl.innerText = `No se encontraron nodos para: ${notFound.join(', ')}`;
        return;
    }

    // Deduplicate
    const unique = {};
    const uniqNodes = [];
    foundNodes.forEach(n => { if (!unique[n.id()]) { unique[n.id()] = true; uniqNodes.push(n); } });

    // Highlight and fit
    try { highlightNodes(uniqNodes.map(n => n.id())); fitToNodes(uniqNodes.map(n => n.id())); } catch (e) { console.warn('Highlight/fit failed', e); }

    // Populate details: if single node show full details, if multiple list top 10 details
    if (uniqNodes.length === 1) {
        const n = uniqNodes[0];
        const d = n.data();
        const deg = n.connectedEdges().length;
        let info = `ID: ${d.id}\nLabel: ${d.label || ''}\nTipo: ${d.type || d.tipo || ''}\n`;
        info += `Especie: ${d.especie || d.ESPECIE || ''}\nDepartamento: ${d.departamento || d.DEPARTAMENTO || ''}\nDistrito: ${d.distrito || ''}\nConexiones: ${deg}`;
        if (detailsEl) detailsEl.innerText = info;
    } else {
        // build summary
        let txt = `Nodos encontrados: ${uniqNodes.length}\n`;
        txt += uniqNodes.slice(0,30).map(n => `${n.id()} (${n.data().label || ''})`).join('\n');
        if (detailsEl) detailsEl.innerText = txt;
    }

    // Build results table
    if (outTable) {
        let html = '<div style="background:#fff;padding:8px;border-radius:6px;border:1px solid #eee">';
        html += '<table style="width:100%; border-collapse:collapse; font-size:13px">';
        html += '<thead><tr style="text-align:left;border-bottom:1px solid #eee"><th style="padding:6px">ID</th><th style="padding:6px">Label/Especie</th><th style="padding:6px">Departamento</th><th style="padding:6px">Distrito</th><th style="padding:6px">Conexiones</th></tr></thead><tbody>';
        uniqNodes.forEach(n => {
            const d = n.data();
            const id = d.id || n.id();
            const especie = d.especie || d.ESPECIE || d.label || '';
            const dept = d.departamento || d.DEPARTAMENTO || '';
            const distrito = d.distrito || '';
            const connections = n.connectedEdges().length;
            html += `<tr style="border-bottom:1px solid #f3f3f3"><td style="padding:6px">${id}</td><td style="padding:6px">${especie}</td><td style="padding:6px">${dept}</td><td style="padding:6px">${distrito}</td><td style="padding:6px">${connections}</td></tr>`;
        });
        html += '</tbody></table></div>';
        outTable.innerHTML = html;
    }
}

function capitalize(s) { if (!s) return s; return s.charAt(0).toUpperCase() + s.slice(1); }
