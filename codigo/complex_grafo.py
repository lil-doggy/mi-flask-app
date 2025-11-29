import os
import re
from pathlib import Path
from typing import Set, Tuple, Iterable, List

import pandas as pd
import networkx as nx
from pyvis.network import Network

# Colors
COLOR_DISTRITO = "skyblue"
COLOR_ESPECIE = "#4C9A2A"
COLOR_HIGHLIGHT = "red"


def normalize_string(text):
    if isinstance(text, str):
        text = text.strip()
        text = re.sub(r"\s+", " ", text)
        return text.upper()
    return str(text)


class Planta:
    def __init__(self, id, especie, titular, distrito, superficie):
        self.id = id
        self.especie = normalize_string(especie)
        self.titular = normalize_string(titular)
        self.distrito = normalize_string(distrito)
        self.superficie = superficie


class GrafoPlantaciones:
    def __init__(self):
        self.objetos = {}

    def agregar_planta(self, planta: Planta):
        self.objetos[planta.id] = planta

    def bfs_por_especie(self, especie: str) -> List[Planta]:
        q = normalize_string(especie)
        return [p for p in self.objetos.values() if p.especie == q]


def build_visual_and_logical_graphs(csv_path: Path) -> Tuple[nx.Graph, GrafoPlantaciones]:
    df = pd.read_csv(csv_path, sep=';', encoding='utf-8-sig')
    # ensure required columns
    required_cols = ["DISTRITO", "ESPECIE", "TITULAR", "SUPERFICIE_PLANTACION"]
    for c in required_cols:
        if c not in df.columns:
            raise ValueError(f"Falta columna requerida: {c}")

    G_viz = nx.Graph()
    G_logico = GrafoPlantaciones()

    df = df.copy()
    df['ID_PLANTA'] = range(1, len(df) + 1)

    for _, fila in df.iterrows():
        distrito = normalize_string(fila['DISTRITO'])
        especie = normalize_string(fila['ESPECIE'])
        titular = normalize_string(fila['TITULAR'])

        planta = Planta(id=fila['ID_PLANTA'], especie=especie, titular=titular, distrito=distrito, superficie=fila['SUPERFICIE_PLANTACION'])
        G_logico.agregar_planta(planta)

        if distrito not in G_viz:
            G_viz.add_node(distrito, tipo='Ubicación', color={'background': COLOR_DISTRITO, 'border': '#0066aa'}, title=f'Distrito: {distrito}', group=1)
        if especie not in G_viz:
            G_viz.add_node(especie, tipo='Especie', color={'background': COLOR_ESPECIE, 'border': '#114411'}, title=f'Especie: {especie}', group=2)

        G_viz.add_edge(distrito, especie, relacion='contiene')

    return G_viz, G_logico


def ejecutar_bfs_en_grafos(G_viz: nx.Graph, G_logico: GrafoPlantaciones, especie_buscada: str):
    plantas = G_logico.bfs_por_especie(especie_buscada)
    if not plantas:
        return set(), []
    distritos = set(p.distrito for p in plantas)
    nodos_resaltar = set([normalize_string(especie_buscada)])
    bordes_resaltar = []
    for d in distritos:
        if d in G_viz:
            nodos_resaltar.add(d)
            bordes_resaltar.append((normalize_string(especie_buscada), d))
    return nodos_resaltar, bordes_resaltar


def export_pyvis(G_viz: nx.Graph, out_path: Path, nodos_resaltar: Iterable[str] = None, bordes_resaltar: Iterable[Tuple[str,str]] = None):
    if nodos_resaltar is None:
        nodos_resaltar = set()
    else:
        nodos_resaltar = set(map(str, nodos_resaltar))
    bordes_resaltar = set(tuple(sorted((str(u), str(v)))) for u,v in (bordes_resaltar or []))

    net = Network(height='900px', width='100%', notebook=False)
    for n, attrs in G_viz.nodes(data=True):
        color_bg = attrs.get('color', {}).get('background', '#CCCCCC')
        color_border = attrs.get('color', {}).get('border', '#333333')
        if str(n) in nodos_resaltar:
            color_bg = COLOR_HIGHLIGHT
            color_border = COLOR_HIGHLIGHT
        net.add_node(str(n), label=str(n), title=attrs.get('title', str(n)), color={'background': color_bg, 'border': color_border})

    for u, v, data in G_viz.edges(data=True):
        key = tuple(sorted((str(u), str(v))))
        if key in bordes_resaltar:
            net.add_edge(str(u), str(v), color=COLOR_HIGHLIGHT, width=3)
        else:
            net.add_edge(str(u), str(v), color='#888888', width=1)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    net.toggle_physics(True)
    # Use write_html to avoid pyvis attempting to render via an environment that may not be available
    net.write_html(str(out_path))
