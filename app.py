from flask import Flask, render_template, request, jsonify, session, send_from_directory, send_file
from pathlib import Path
import json
import os
import pickle
import networkx as nx


app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = 'dev-secret-change-in-prod'


BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, 'datos')
STATS_FILE = os.path.join(DATA_DIR, 'grafo_stats.json')
PKL_FILE = os.path.join(DATA_DIR, 'grafo_plantaciones.pkl')
GRAPH_HTML_DIR = os.path.join('static', 'graphs')
GRAPH_GENERAL_HTML = os.path.join(GRAPH_HTML_DIR, 'grafo_general.html')
GRAPH_HIGHLIGHT_HTML = os.path.join(GRAPH_HTML_DIR, 'grafo_resaltado.html')


# Cache loaded graph
_GRAPH_CACHE = None


def load_graph():
    global _GRAPH_CACHE
    if _GRAPH_CACHE is not None:
        return _GRAPH_CACHE
    if not os.path.exists(PKL_FILE):
        _GRAPH_CACHE = nx.Graph()
        return _GRAPH_CACHE
    try:
        with open(PKL_FILE, 'rb') as f:
            g = pickle.load(f)
        # Si no es un NetworkX Graph, intentar construir uno
        if not isinstance(g, nx.Graph):
            g = nx.Graph(g)
        _GRAPH_CACHE = g
    except Exception:
        _GRAPH_CACHE = nx.Graph()
    return _GRAPH_CACHE


def resolve_node_identifier(g, identifier):

    if identifier is None:
        return None, []
    sid = str(identifier).strip()
    if sid in g:
        return sid, []
    sid_lower = sid.lower()
    candidates = []
    for n, attrs in g.nodes(data=True):
        # check label first
        label = None
        if isinstance(attrs, dict):
            label = attrs.get('label') or attrs.get('nombre') or attrs.get('titulo')
        if isinstance(label, str) and label.strip().lower() == sid_lower:
            candidates.append(str(n))
            continue
        # check all attribute values
        if isinstance(attrs, dict):
            for k, v in attrs.items():
                if v is None:
                    continue
                try:
                    if isinstance(v, str) and v.strip().lower() == sid_lower:
                        candidates.append(str(n)); break
                    if not isinstance(v, str) and str(v).strip().lower() == sid_lower:
                        candidates.append(str(n)); break
                except Exception:
                    continue
        # check node id string equality case-insensitive
        try:
            if str(n).strip().lower() == sid_lower:
                candidates.append(str(n))
        except Exception:
            pass
    # deduplicate preserving order
    uniq = []
    seen = set()
    for c in candidates:
        if c not in seen:
            uniq.append(c); seen.add(c)
    if len(uniq) == 1:
        return uniq[0], []
    return None, uniq


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/favicon.ico')
def favicon():
    static_dir = os.path.join(BASE_DIR, 'static')
    fav_path = os.path.join(static_dir, 'favicon.ico')
    if os.path.exists(fav_path):
        return send_from_directory(static_dir, 'favicon.ico')
    # If not present, return no content to avoid 404 in console
    return ('', 204)


@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json() or {}
    username = data.get('username')
    password = data.get('password')
    # Credenciales de prueba según solicitud
    if username == 'usuario' and password == '1234':
        session['user'] = username
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Credenciales inválidas'}), 401


@app.route('/api/logout', methods=['POST'])
def api_logout():
    session.pop('user', None)
    return jsonify({'success': True})


@app.route('/api/stats', methods=['GET'])
def api_stats():
    try:
        with open(STATS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/graph', methods=['GET'])
def api_graph():
    g = load_graph()
    nodes = []
    edges = []
    for n, attrs in g.nodes(data=True):
        # Expose node attributes to the frontend to allow client-side aggregations
        node_data = {
            'id': str(n),
            'label': attrs.get('label', str(n)),
            # support both English/Spanish attribute names used by different scripts
            'type': attrs.get('type', attrs.get('tipo', attrs.get('categoria', 'Node'))),
        }
        # attach all attributes under 'attrs' so frontend can access departamento, provincia, etc.
        node = {'data': node_data, 'attrs': {k: v for k, v in attrs.items()}}
        nodes.append(node)
    for u, v, attrs in g.edges(data=True):
        eid = attrs.get('id', f"e_{u}_{v}")
        edges.append({'data': {'source': str(u), 'target': str(v), 'id': str(eid)}})
    return jsonify({'nodes': nodes, 'edges': edges})


@app.route('/graphs/<path:filename>')
def serve_graph_html(filename):
    # serve files from static/graphs safely
    safe_dir = os.path.join(BASE_DIR, 'static', 'graphs')
    full = os.path.join(safe_dir, filename)
    if not os.path.exists(full):
        return (jsonify({'error': 'Not found'}), 404)
    return send_from_directory(safe_dir, filename)


@app.route('/api/generate_general_graph', methods=['POST'])
def api_generate_general_graph():
    # generate graph HTML using Complejidad logic
    try:
        from codigo.complex_grafo import build_visual_and_logical_graphs, export_pyvis
        csv_candidates = [
            os.path.join(DATA_DIR, 'plantaciones-2021-1.csv'),
            os.path.join(DATA_DIR, 'plantaciones 2021.csv'),
            os.path.join(DATA_DIR, 'plantaciones-2021.csv'),
            os.path.join(DATA_DIR, 'plantaciones.csv')
        ]
        csv_path = None
        for c in csv_candidates:
            if os.path.exists(c):
                csv_path = c; break
        if not csv_path:
            return jsonify({'success': False, 'error': 'CSV de plantaciones no encontrado en datos/'}), 400
        G_viz, G_logico = build_visual_and_logical_graphs(Path(csv_path))
        out = Path(BASE_DIR) / GRAPH_GENERAL_HTML
        export_pyvis(G_viz, out)
        return jsonify({'success': True, 'path': f'/static/graphs/{out.name}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/graphs_list', methods=['GET'])
def api_graphs_list():
    """Return list of generated graph HTML files in static/graphs."""
    safe_dir = os.path.join(BASE_DIR, 'static', 'graphs')
    if not os.path.exists(safe_dir):
        return jsonify({'success': True, 'files': []})
    files = [f for f in os.listdir(safe_dir) if f.lower().endswith('.html')]
    return jsonify({'success': True, 'files': files})


@app.route('/api/species_search', methods=['POST'])
def api_species_search():
    data = request.get_json() or {}
    query = data.get('query')
    if not query:
        return jsonify({'success': False, 'error': 'query required'}), 400
    try:
        from codigo.complex_grafo import build_visual_and_logical_graphs
        # load graphs
        # prefer project data CSV
        csv_candidates = [
            os.path.join(DATA_DIR, 'plantaciones-2021-1.csv'),
            os.path.join(DATA_DIR, 'plantaciones 2021.csv')
        ]
        csv_path = None
        for c in csv_candidates:
            if os.path.exists(c):
                csv_path = c; break
        if not csv_path:
            return jsonify({'success': False, 'error': 'CSV no encontrado'}), 400
        G_viz, G_logico = build_visual_and_logical_graphs(Path(csv_path))
        # collect unique species in G_viz matching query (substring, case-insensitive)
        q = query.strip().upper()
        matches = [n for n, attrs in G_viz.nodes(data=True) if attrs.get('tipo','').lower() == 'especie' and q in str(n).upper()]
        return jsonify({'success': True, 'matches': matches})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/bfs_execute', methods=['POST'])
def api_bfs_execute():
    data = request.get_json() or {}
    species = data.get('species')
    generate_highlight = bool(data.get('generate_highlight'))
    if not species:
        return jsonify({'success': False, 'error': 'species required'}), 400
    try:
        from codigo.complex_grafo import build_visual_and_logical_graphs, ejecutar_bfs_en_grafos, export_pyvis
        csv_candidates = [
            os.path.join(DATA_DIR, 'plantaciones-2021-1.csv'),
            os.path.join(DATA_DIR, 'plantaciones 2021.csv')
        ]
        csv_path = None
        for c in csv_candidates:
            if os.path.exists(c):
                csv_path = c; break
        if not csv_path:
            return jsonify({'success': False, 'error': 'CSV no encontrado'}), 400
        G_viz, G_logico = build_visual_and_logical_graphs(Path(csv_path))
        nodos_resaltar, bordes_resaltar = ejecutar_bfs_en_grafos(G_viz, G_logico, species)
        # Print matches to server console for the user's review
        print('\n--- BFS ejecutado para especie:', species, '---')
        if nodos_resaltar:
            print('Nodos a resaltar (incluye la especie y distritos encontrados):')
            for n in sorted(map(str, nodos_resaltar)):
                print(' -', n)
        else:
            print('No se encontraron nodos para la especie solicitada.')

        # Collect plantaciones details from logical graph
        try:
            plantas = G_logico.bfs_por_especie(species)
            plantaciones = []
            for p in plantas:
                plantaciones.append({
                    'id': getattr(p, 'id', None),
                    'especie': getattr(p, 'especie', None),
                    'titular': getattr(p, 'titular', None),
                    'distrito': getattr(p, 'distrito', None),
                    'superficie': getattr(p, 'superficie', None)
                })
        except Exception:
            plantaciones = []

        result = {
            'nodos_resaltar': list(nodos_resaltar),
            'num_bordes': len(bordes_resaltar),
            'bordes': [list(map(str, b)) for b in bordes_resaltar],
            'plantaciones': plantaciones
        }

        # If frontend requested generation, do it immediately
        if generate_highlight:
            out = Path(BASE_DIR) / GRAPH_HIGHLIGHT_HTML
            export_pyvis(G_viz, out, nodos_resaltar=nodos_resaltar, bordes_resaltar=bordes_resaltar)
            result['highlight_path'] = f'/static/graphs/{out.name}'
            print(f'Grafo resaltado generado: {out}')
            return jsonify({'success': True, 'result': result})

        return jsonify({'success': True, 'result': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/analysis', methods=['GET', 'POST'])
def api_analysis():
    # Allow GET for quick human-friendly info (avoids 405 when user opens the URL in browser)
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'info': 'Este endpoint acepta POST con JSON. Ejemplo: {"tipo":"bfs","startNode":"<id>","limit":100}. Use POST para ejecutar análisis.'
        })

    data = request.get_json() or {}
    tipo = data.get('tipo')
    especie = data.get('especie', 'Todas')
    departamento = data.get('departamento', 'Todos')
    start = data.get('startNode')
    target = data.get('targetNode')
    limit = int(data.get('limit', 100)) if data.get('limit') else 100

    # Lectura segura de stats (si existe)
    try:
        with open(STATS_FILE, 'r', encoding='utf-8') as f:
            stats = json.load(f)
    except Exception:
        stats = {}

    # Preparar respuesta base
    response = {
        'tipo': tipo,
        'filtros': {'especie': especie, 'departamento': departamento},
        'metrics': {
            'num_nodos': stats.get('num_nodos'),
            'num_aristas': stats.get('num_aristas')
        },
        'output': None,
        'note': ''
    }

    g = load_graph()

    try:
        if tipo in ('bfs', 'dfs'):
            if not start:
                raise ValueError('Se requiere startNode para BFS/DFS')
            start = str(start)
            if start not in g:
                # try to resolve by label/attributes
                resolved, candidates = resolve_node_identifier(g, start)
                if resolved:
                    start = resolved
                    response['note'] += f"Se mapeó startNode a '{start}' según coincidencia por etiqueta/atributo. "
                elif candidates:
                    # ambiguous
                    raise ValueError(f"startNode no encontrado. Coincidencias posibles: {candidates}")
                else:
                    raise ValueError('startNode no existe en el grafo')
            visited = []
            if tipo == 'bfs':
                for n in nx.bfs_tree(g, start):
                    visited.append(n)
                    if len(visited) >= limit:
                        break
            else:
                for n in nx.dfs_preorder_nodes(g, start):
                    visited.append(n)
                    if len(visited) >= limit:
                        break
            response['output'] = {'visited_count': len(visited), 'visited': list(map(str, visited))}

        elif tipo == 'dijkstra':
            if not start or not target:
                raise ValueError('startNode y targetNode son requeridos para Dijkstra')
            start = str(start); target = str(target)
            # resolve start
            if start not in g:
                resolved_s, cand_s = resolve_node_identifier(g, start)
                if resolved_s:
                    start = resolved_s
                    response['note'] += f"Se mapeó startNode a '{start}' según coincidencia por etiqueta/atributo. "
                elif cand_s:
                    raise ValueError(f"startNode no encontrado. Coincidencias posibles: {cand_s}")
                else:
                    raise ValueError('startNode no existe en el grafo')
            # resolve target
            if target not in g:
                resolved_t, cand_t = resolve_node_identifier(g, target)
                if resolved_t:
                    target = resolved_t
                    response['note'] += f"Se mapeó targetNode a '{target}' según coincidencia por etiqueta/atributo. "
                elif cand_t:
                    raise ValueError(f"targetNode no encontrado. Coincidencias posibles: {cand_t}")
                else:
                    raise ValueError('targetNode no existe en el grafo')
            try:
                path = nx.shortest_path(g, source=start, target=target, weight='weight')
                dist = nx.shortest_path_length(g, source=start, target=target, weight='weight')
            except Exception:
                path = nx.shortest_path(g, source=start, target=target)
                dist = len(path) - 1
            response['output'] = {'distance': dist, 'path': list(map(str, path))}

        elif tipo in ('unionfind', 'components'):
            comps = list(nx.connected_components(g))
            sizes = [len(c) for c in comps]
            largest = max(sizes) if sizes else 0
            response['output'] = {'components': len(comps), 'largest_component_size': largest, 'sizes_sample': sizes[:10]}

        else:
            response['output'] = {'message': 'Tipo no reconocido; se devolvió un ejemplo.'}
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

    return jsonify({'success': True, 'result': response})


if __name__ == '__main__':
    # Al iniciar, intentar generar el grafo general HTML si hay CSV disponible
    try:
        from codigo.complex_grafo import build_visual_and_logical_graphs, export_pyvis
        csv_candidates = [
            os.path.join(DATA_DIR, 'plantaciones-2021-1.csv'),
            os.path.join(DATA_DIR, 'plantaciones 2021.csv'),
            os.path.join(DATA_DIR, 'plantaciones-2021.csv'),
            os.path.join(DATA_DIR, 'plantaciones.csv')
        ]
        csv_path = None
        for c in csv_candidates:
            if os.path.exists(c):
                csv_path = c; break
        if csv_path:
            try:
                print('Generando grafo general en HTML desde:', csv_path)
                G_viz, G_logico = build_visual_and_logical_graphs(Path(csv_path))
                out = Path(BASE_DIR) / GRAPH_GENERAL_HTML
                export_pyvis(G_viz, out)
                print('Grafo general generado en:', out)
            except Exception as e:
                print('No se pudo generar el grafo general al inicio:', e)
    except Exception:
        # ignore if complex_grafo not available
        pass

    app.run(host='127.0.0.1', port=5000, debug=True)

