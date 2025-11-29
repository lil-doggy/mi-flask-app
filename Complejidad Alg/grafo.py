import pandas as pd
import networkx as nx
from pyvis.network import Network
import os
import webbrowser
import re
from collections import deque
import sys

# --- DEFINICIÓN DE COLORES ---
COLOR_DISTRITO = "skyblue"
COLOR_ESPECIE = "#4C9A2A"
COLOR_BORDE_DISTRITO_SELECCIONADO = "#007bff"
COLOR_BORDE_ESPECIE_SELECCIONADO = "#226722"
COLOR_ARISTA_SELECCIONADA = "#E8F4F8"
COLOR_HIGHLIGHT_BUSQUEDA = "red"
# -----------------------------

# --- FUNCIÓN DE NORMALIZACIÓN ---
def normalize_string(text):
    """Limpia la cadena de texto y la convierte a mayúsculas para las claves del grafo."""
    if isinstance(text, str):
        text = text.strip()
        text = re.sub(r'\s+', ' ', text)
        return text.upper()
    return str(text)

# ======================================================================
# CLASES DE MODELADO DE DATOS (Plantas y Grafos Lógicos)
# ======================================================================

class Planta:
    def __init__(self, id, especie, titular, distrito, superficie):
        self.id = id
        self.especie = especie # Normalizado (UPPER)
        self.titular = titular # Normalizado (UPPER)
        self.distrito = distrito # Normalizado (UPPER)
        self.superficie = superficie

    def __repr__(self):
        # Muestra ID, Especie, Distrito, Titular
        return f"Planta({self.id}, {self.especie}, {self.distrito}, {self.titular}, {self.superficie})"


class GrafoPlantaciones:
    """Modelo para operaciones lógicas complejas (BFS)."""
    def __init__(self):
        self.objetos = {}   # id -> Planta

    def agregar_planta(self, planta):
        self.objetos[planta.id] = planta

    def bfs_por_especie(self, especie):
        """
        Devuelve todas las plantas de una especie específica.
        """
        especie_normalizada = normalize_string(especie)
        resultado = []
        for p in self.objetos.values():
            if p.especie == especie_normalizada:
                resultado.append(p)
        return resultado

# --- FUNCIÓN DE BÚSQUEDA (USA EL GRAFO LÓGICO Y EL DE NETWORKX) ---
def ejecutar_busqueda_bfs_y_obtener_nodos_resaltar(G_viz, G_logico, especie_buscada):
    """
    1. Usa GrafoPlantaciones.bfs_por_especie para obtener detalles de las plantas.
    2. Devuelve los nodos del Grafo de Visualización (G_viz) que deben ser resaltados.
    3. Imprime los detalles de las plantas en la consola.
    """
    
    # Obtener detalles de plantas
    plantas_encontradas = G_logico.bfs_por_especie(especie_buscada)
    
    if not plantas_encontradas:
        print(f"No se encontraron plantas de la especie '{especie_buscada}'.")
        return set(), []

    print(f"\n--- Plantas de {normalize_string(especie_buscada)} encontradas ({len(plantas_encontradas)}) ---")
    
    # Preparar el resaltado para el grafo de visualización (G_viz)
    especie_normalizada = normalize_string(especie_buscada)
    nodos_resaltar = {especie_normalizada} # Siempre resaltamos la especie
    bordes_resaltar = []
    
    distritos_encontrados = set()

    for planta in plantas_encontradas:
        distrito = planta.distrito
        distritos_encontrados.add(distrito)
        # ESTO IMPRIME LA INFORMACIÓN DETALLADA (ID, TITULAR, SUPERFICIE) EN LA CONSOLA
        print(planta) 

    # Resaltar la especie y todos los distritos conectados
    for distrito in distritos_encontrados:
        if distrito in G_viz:
            nodos_resaltar.add(distrito)
            # Añadimos la arista de conexión (Especie -> Distrito)
            bordes_resaltar.append((especie_normalizada, distrito))

    return nodos_resaltar, bordes_resaltar

# --- FUNCIÓN DE VISUALIZACIÓN INTERACTIVA (SIN CAMBIOS) ---
def visualizar_grafo_interactivo(grafo, nodos_resaltar=set(), bordes_resaltar=[]):
    """Genera el HTML interactivo, aplicando el resaltado de la búsqueda y lo abre."""
    net = Network(height="1000px", width="100%", bgcolor="#222222", font_color="white", notebook=False)
    
    # 1. Configurar nodos con colores originales o de búsqueda
    for nodo, datos in grafo.nodes(data=True):
        if nodo in nodos_resaltar:
            color_fondo = COLOR_HIGHLIGHT_BUSQUEDA
            color_borde = COLOR_HIGHLIGHT_BUSQUEDA
        else:
            color_fondo = datos['color']['background']
            color_borde = datos['color']['border']
            
        net.add_node(nodo, 
                     title=datos['title'], 
                     group=datos['group'],
                     color={'background': color_fondo, 'border': color_borde, 'highlight': datos['color']['highlight']})

    # 2. Configurar aristas
    for u, v, data in grafo.edges(data=True):
        arista_clave = tuple(sorted((u, v)))
        
        color_arista = 'gray'
        if arista_clave in [tuple(sorted(b)) for b in bordes_resaltar]:
            color_arista = COLOR_HIGHLIGHT_BUSQUEDA
            
        net.add_edge(u, v, color=color_arista, width=1)


    # 3. Configuración del Layout y la Interacción
    # CSS para forzar la altura del contenedor al 100%
    css_completo = '<style type="text/css">html, body {width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;} #mynetwork {width: 100%; height: 100%;}</style>'
    net.set_options(f"""
    {{
      "nodes": {{"borderWidthSelected": 5}},
      "edges": {{"color": {{"highlight": "{COLOR_ARISTA_SELECCIONADA}", "hover": "{COLOR_ARISTA_SELECCIONADA}"}}, "widthSelected": 3}},
      "interaction": {{"dragNodes": true, "zoomView": true, "selectable": true, "hover": false, "tooltip": {{"delay": 200, "taps": 1}}}},
      "physics": {{"enabled": true, "stabilization": {{"enabled": true, "iterations": 1500}}, "solver": "barnesHut", "barnesHut": {{"gravitationalConstant": -15000, "centralGravity": 0.05, "springConstant": 0.05, "damping": 0.9}}}}
    }}
    """)
    net.heading = css_completo

    # 4. Generar y Abrir HTML
    nombre_archivo_html = "grafo_plantaciones_interactivo.html"
    net.write_html(nombre_archivo_html)
    
    ruta_absoluta = os.path.abspath(nombre_archivo_html)
    webbrowser.open_new_tab('file://' + ruta_absoluta)

    return ruta_absoluta


# --- PROCESO PRINCIPAL DE DATOS Y BUCLE DE CONSOLA ---

# Inicializar los grafos
G_viz = nx.Graph() # Grafo para visualización (Distrito-Especie)
G_logico = GrafoPlantaciones() # Grafo para lógica de datos (Plantas individuales)

# Cargar el DataFrame y añadir el ID secuencial
archivo = "plantaciones 2021.csv"
try:
    df = pd.read_csv(archivo, sep=';', encoding="utf-8-sig")
    # AÑADIR ID SECUENCIAL Y ÚNICO
    df['ID_PLANTA'] = range(1, len(df) + 1)
except FileNotFoundError:
    sys.exit(1)

# 1. AJUSTE: Corregir el nombre de la columna esperada
required_cols = ["DISTRITO", "ESPECIE", "TITULAR", "SUPERFICIE_PLANTACION"] 
if not all(col in df.columns for col in required_cols):
    print(f"Error: Faltan columnas necesarias ({required_cols}) en el CSV.")
    sys.exit(1)


# Poblar AMBOS grafos
for index, fila in df.iterrows():
    # Normalizar datos clave
    distrito = normalize_string(fila["DISTRITO"])
    especie = normalize_string(fila["ESPECIE"])
    titular = normalize_string(fila["TITULAR"])

    # 2. AJUSTE: Usar el nombre de columna correcto al inicializar Planta
    planta = Planta(
        id=fila['ID_PLANTA'],
        especie=especie,
        titular=titular,
        distrito=distrito,
        superficie=fila["SUPERFICIE_PLANTACION"]
    )
    G_logico.agregar_planta(planta)

    # 2. PUEBLA GRAFO DE VISUALIZACIÓN (Distrito-Especie - SOLO nodos clave)
    # Nodos de Distrito
    if distrito not in G_viz:
        G_viz.add_node(distrito, tipo="Ubicación", 
                   color={"background": COLOR_DISTRITO, "border": COLOR_BORDE_DISTRITO_SELECCIONADO, "highlight": {"border": COLOR_BORDE_DISTRITO_SELECCIONADO}}, 
                   title=f"Distrito: {distrito}", group=1)

    # Nodos de Especie
    if especie not in G_viz:
        G_viz.add_node(especie, tipo="Especie", 
                   color={"background": COLOR_ESPECIE, "border": COLOR_BORDE_ESPECIE_SELECCIONADO, "highlight": {"border": COLOR_BORDE_ESPECIE_SELECCIONADO}}, 
                   title=f"Especie: {especie}", group=2)

    G_viz.add_edge(distrito, especie, relacion="contiene")

print(f"\nGrafo Lógico (Plantas): {len(G_logico.objetos)} registros.")
print(f"Grafo de Visualización (Distrito-Especie): {G_viz.number_of_nodes()} nodos.")


# --- BUCLE PRINCIPAL DE CONSOLA ---
# Abrir el grafo inicial por defecto (sin resaltado)
visualizar_grafo_interactivo(G_viz)
print("\nGrafo inicial generado y abierto. Vuelve aquí para ejecutar búsquedas.")

while True:
    ESPECIE_BUSCADA = input("\nIngrese una ESPECIE para ejecutar BFS y ver detalles (o 'salir'): ").strip()
    
    if ESPECIE_BUSCADA.lower() == 'salir':
        break
    
    # 1. Ejecutar el BFS y obtener nodos a resaltar
    nodos_resaltar, bordes_resaltar = ejecutar_busqueda_bfs_y_obtener_nodos_resaltar(G_viz, G_logico, ESPECIE_BUSCADA)

    # 2. Resaltar y regenerar el grafo de visualización
    if nodos_resaltar:
        visualizar_grafo_interactivo(G_viz, nodos_resaltar, bordes_resaltar)
        print(f"Grafo actualizado, revisa la ventana del navegador. (Especie: {normalize_string(ESPECIE_BUSCADA)})")
    else:
        # Si no se encontró nada, simplemente restablece la vista
        visualizar_grafo_interactivo(G_viz)
        print(f"La especie '{normalize_string(ESPECIE_BUSCADA)}' no se encontró o no tiene registros.")


print("\nPrograma finalizado.")