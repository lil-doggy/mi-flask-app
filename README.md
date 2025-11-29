# 📊 Hito 2: Análisis de Plantaciones Forestales del Perú 2021
## Versión con Arquitectura Cliente-Servidor y Algoritmos

### Universidad Peruana de Ciencias Aplicadas (UPC)
- **Curso:** Complejidad Algorítmica (1ACC0184)
- **Estudiante:** Andrea Elizabeth Santur Tello (U202310988)
- **Fecha:** Noviembre 2025

---

## 🚀 INSTRUCCIONES DE USO

### 1. Abre la Aplicación Web
- Descomprime el ZIP
- Abre **index.html** en tu navegador

### 2. LOGIN
- **Usuario:** user
- **Contraseña:** 456

### 3. Explora:
- **Dashboard:** Estadísticas y gráficos
- **Análisis:** Ejecuta algoritmos (BFS, DFS, Dijkstra, Union-Find)
- **Grafo:** Visualización interactiva
- **Información:** Detalles del proyecto

---

## 📋 Contenido del ZIP

### Informe (Word)
- Descripción del problema
- Dataset y su origen
- Propuesta
- **NUEVO: Diseño de Arquitectura**
- **NUEVO: Algoritmos (Dijkstra, BFS/DFS, Union-Find)**
- **NUEVO: Validación y Pruebas**
- Conclusiones y referencias

### Aplicación Web
- **Login con autenticación** (user/456)
- Dashboard con 5 tarjetas + gráficos
- Herramientas de análisis con filtros
- Visualización del grafo (Cytoscape.js)
- Panel de información

### Datos
- plantaciones-2021-1.csv (1,853 registros)
- plantaciones-2021-1.xlsx (con análisis)
- grafo_plantaciones.pkl (2,353 nodos, 4,763 aristas)
- grafo_stats.json

### Código
- Creacion_grafo.ipynb (Jupyter Notebook)

---

## 📊 Datos Clave

- **Total Nodos:** 2,353
- **Total Aristas:** 4,763
- **Plantaciones:** 971
- **Titulares:** 900
- **Especies:** 211
- **Departamentos:** 17

**Top Especie:** Guazuma crinita (280)
**Top Departamento:** San Martín (232)

---

## ✅ Requisitos del Hito 2 - Completados

✓ Descripción del problema
✓ Descripción del dataset
✓ Propuesta
✓ Diseño de arquitectura cliente-servidor
✓ Análisis de algoritmos
✓ Validación de resultados
✓ Grafo completo
✓ Aplicación web interactiva
✓ Excel con análisis

¡**LISTO PARA ENTREGAR!**

## 🛠️ Mejoras añadidas (para obtener mayor puntaje)

- Botón para exportar la vista actual del grafo como PNG (`📷 Exportar vista (PNG)`).
- Indicador de progreso (overlay con spinner) mientras el servidor genera el HTML del grafo general.
- Conteo rápido de nodos/aristas visible en la pestaña "Grafo".
- El botón de export aparece solo cuando el grafo ha sido cargado por Cytoscape.

## ▶️ Cómo ejecutar (Windows PowerShell)

1. Crear y activar un entorno virtual (si no existe):

```powershell
python -m venv venv
; .\venv\Scripts\Activate.ps1
```

Si PowerShell bloquea `Activate.ps1` por política de ejecución, puedes usar la ruta completa `venv\Scripts\python.exe` para instalar e iniciar la aplicación.

2. Instalar dependencias:

```powershell
venv\Scripts\python.exe -m pip install -r requirements.txt
```

3. Ejecutar la app:

```powershell
venv\Scripts\python.exe app.py
```

4. Abrir en el navegador: `http://127.0.0.1:5000`

---

Si quieres que implemente pruebas unitarias o un workflow de CI (GitHub Actions) para automatizar las comprobaciones, puedo añadírtelo como siguiente paso.
