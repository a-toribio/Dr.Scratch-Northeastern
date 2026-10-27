window.addEventListener('DOMContentLoaded', function() {
    var treeEl = document.getElementById('tree');
    if (treeEl && window.projectFlat) {
        var ciudadLimpia = window.projectFlat.filter(function(item) {
            return !item.path.includes('Memoria_Global');
        });
        treeEl.setAttribute('babia-treebuilder', 'data', JSON.stringify(ciudadLimpia));
        treeEl.setAttribute('babia-treebuilder', 'field', 'path');
        treeEl.setAttribute('babia-treebuilder', 'split_by', '/');
    }
});

window.addEventListener('load', function() {
    if (typeof scratchblocks !== 'undefined') {
        scratchblocks.renderMatching('pre.blocks', {
            style: 'scratch3',
            languages: ['en'],
            scale: 1
        });
    }
});

window.selectedSpriteColors = Object.create(null);

function paintCityBoxes(cajas) {
    cajas.forEach(caja => {
        let idCaja = caja.id || "";
        let colorBase;

        if (idCaja.endsWith('Stage')) {
            colorBase = '#388E3C';
        } else if (idCaja.startsWith('boat-') && (idCaja.match(/\//g) || []).length === 2) {
            let nombreSprite = idCaja.substring(idCaja.lastIndexOf('/') + 1);
            colorBase = window.selectedSpriteColors[nombreSprite] || '#A5D6A7';
        } else if (idCaja.includes('script') || idCaja.includes('var_')) {
            let item = window.projectFlat.find(entry => idCaja.includes(entry.id));
            if (item) colorBase = item.building_color;
        } else if (idCaja.startsWith('boat-')) {
            let numeroDeBarras = (idCaja.match(/\//g) || []).length;
            colorBase = numeroDeBarras === 1 ? '#4CAF50' : numeroDeBarras === 2 ? '#A5D6A7' : '#bdefb7';

            if (idCaja.includes('Memoria_Global')) {
                colorBase = '#FFD54F';
            }
        }

        if (colorBase) {
            caja.setAttribute('color', colorBase);
            caja.setAttribute('babiaxrFirstColor', colorBase);
        }
    });
}

AFRAME.registerComponent('pintor-ciudad', {
    init: function() {
        this.painted = false;
    },
    tick: function() {
        let cajas = this.el.querySelectorAll('a-box');

        if (cajas.length > 0 && !this.painted) {
            paintCityBoxes(cajas);
            this.painted = true;
        }
    }
});

const views = {
        district: document.getElementById('view-district'),
        description: document.getElementById('view-description'),
        code: document.getElementById('view-code')
    };
    
    const ui = {
        title: document.getElementById('panel-title'),
        subtitle: document.getElementById('panel-subtitle'),
        districtName: document.getElementById('district-name-display'),
        scriptList: document.getElementById('district-scripts-list'),
        scriptId: document.getElementById('script-id-display'),
        codeBlock: document.getElementById('script_blocks'),
        aiDescription: document.getElementById('ai-description-text')
    };

    let currentRawCode = ""; 

    let navHistory = [];
    let historyIndex = -1;
    let isNavigating = false;

    function pushToHistory(type, data, parent = null) {
        if (isNavigating) return;

        if (historyIndex < navHistory.length - 1) {
            navHistory = navHistory.slice(0, historyIndex + 1);
        }

        if (navHistory.length > 0) {
            let last = navHistory[navHistory.length - 1];
            if (last.type === type && last.data.id === data.id) return;
        }

        navHistory.push({ type: type, data: data, parent: parent });
        historyIndex++;
        updateNavButtons();
    }

    function updateNavButtons() {
        let btnBack = document.getElementById('btn-back');
        let btnForward = document.getElementById('btn-forward');
        
        if(btnBack) {
            btnBack.disabled = (historyIndex <= 0);
            btnBack.style.opacity = (historyIndex <= 0) ? "0.5" : "1";
        }
        if(btnForward) {
            btnForward.disabled = (historyIndex >= navHistory.length - 1);
            btnForward.style.opacity = (historyIndex >= navHistory.length - 1) ? "0.5" : "1";
        }
    }

    window.goBack = function() {
        if (historyIndex > 0) {
            historyIndex--;
            loadHistoryState(navHistory[historyIndex]);
        }
    };

    window.goForward = function() {
        if (historyIndex < navHistory.length - 1) {
            historyIndex++;
            loadHistoryState(navHistory[historyIndex]);
        }
    };

    function loadHistoryState(state) {
        isNavigating = true;
        try {
            if (state.type === 'district') {
                showDistrictView(state.data);
            } else if (state.type === 'tower') {
                handleTowerData(state.data, state.parent);
            } else if (state.type === 'broadcast') {
                showBroadcastView(state.data);
            } else if (state.type === 'group' && window.showGroupView) {
                showGroupView(state.data.name, state.data.ids);
            }
        } finally {
            isNavigating = false;
            updateNavButtons();
        }
    }

    function hideAllViews() {
        views.district.style.display = 'none';
        views.description.style.display = 'none';
        views.code.style.display = 'none';
    }

    window.showCodeView = function() {
        views.code.style.display = 'block';
        if (currentRawCode) {
            ui.codeBlock.innerHTML = ""; 
            ui.codeBlock.innerText = currentRawCode; 
        }
        scratchblocks.renderMatching('#script_blocks', { style: 'scratch3', scale: 0.7 });
    };

    window.hideCodeView = function() {
        views.code.style.display = 'none';
    };

    document.querySelector('a-scene').addEventListener('click', function (evt) {
        
        let intersection = evt.detail.intersectedEl;
        if (!intersection) return;

        let context = findContextByElementID(intersection);

        if (context) {
            if (context.type === 'city' || context.type === 'region' || context.type === 'district') {
                ui.codeBlock.innerText = "";
                currentRawCode = "";
                showDistrictView(context.data);
            } 
            else if (context.type === 'tower') {
                handleTowerData(context.data, context.parent);
            }
        } else {
            console.log("No se identificó el objeto. Elemento clicado:", intersection.id, intersection.tagName);
        }
    });

    var districtIndex = {};
    var scriptIndex = {};
    var referenceMap = {};

    (function buildIndexes() {
        projectFlat.forEach(function(item) {
            var parts = item.path.split('/');
            var rootName   = parts[0];  // "ScratchCity"
            var regionName = parts[1];  // "Juego Principal"
            var spriteName = parts[2];  // "flappy_bird"
            var scriptId   = parts[3];  // "flappy_bird_script_1"

            if (!districtIndex[spriteName]) {
                var districtObj = {
                    id: spriteName,
                    ai_verbose:   item.ai_verbose,
                    ai_schematic: item.ai_schematic,
                    children: []
                };
                districtIndex[spriteName] = districtObj;
                districtIndex[rootName + '/' + regionName + '/' + spriteName] = districtObj;
            }
            districtIndex[spriteName].children.push(item);
            scriptIndex[scriptId] = { data: item, spriteName: spriteName };
        });
    })();

    function buildReferenceMap() {
        if (projectData) {
            if (projectData.id_num) {
                referenceMap[projectData.id_num.toUpperCase()] = { type: 'city', data: projectData };
            }

            if (projectData.broadcast) {
                projectData.broadcast.forEach(broadcast => {
                    if (broadcast.id_num) {
                        referenceMap[broadcast.id_num.toUpperCase()] = { type: 'broadcast', data: broadcast };
                    }
                });
            }
            
            projectData.children.forEach(region => {
                if (region.id_num) {
                    referenceMap[region.id_num.toUpperCase()] = { type: 'region', data: region };
                }

                if (region.children) {
                    region.children.forEach(district => {
                        if (district.id_num) {
                            referenceMap[district.id_num.toUpperCase()] = { type: 'district', data: district };
                        }
                        if (district.children) {
                            district.children.forEach(script => {
                                let flatData = projectFlat.find(item => item.id === script.id);
                                if (flatData && flatData.id_num) {
                                    referenceMap[flatData.id_num.toUpperCase()] = { type: 'tower', data: flatData, parent: district };
                                }
                            });
                        }
                    });
                }
            });
        }
    }

    buildReferenceMap();

    function linkifyReferences(text) {
        if (!text) return "";
        
        text = text.replace(/\[([^|\]]+)\|([a-zA-Z0-9,\s]+)\]/g, function(match, customName, ids) {
            let idsString = ids.split(',').map(id => id.trim().toUpperCase()).join(','); 
            return `<span class="ai-ref-link" title="Explorar scripts agrupados" onclick="showGroupView('${customName}', '${idsString}')">[${customName}]</span>`;
        });

        text = text.replace(/\[([^|\]]+)\]/g, function(match, innerText) {
            let cleanText = innerText.trim();
            let upperText = cleanText.toUpperCase();

            let target = referenceMap[upperText];

            if (!target) {
                let searchKey = cleanText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_');

                for (let key in referenceMap) {
                    let item = referenceMap[key];

                    if (item.type === 'city' && (searchKey === 'stage' || searchKey === 'ciudad_completa')) {
                        target = item; break;
                    }
                    if (item.type === 'district' || item.type === 'region' || item.type === 'broadcast') {
                        let itemIdNormalized = item.data.id.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_');
                        if (itemIdNormalized === searchKey) {
                            target = item; break;
                        }
                    }
                    if (item.type === 'variable') {
                        let varNameSinPrefijo = item.data.id.toLowerCase().replace(/^var_/, '');
                        let varNameNormalized = varNameSinPrefijo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_');
                        
                        if (varNameNormalized === searchKey || item.data.id.toLowerCase() === searchKey) {
                            target = item; break;
                        }
                    }
                    if (item.type === 'tower') {
                        let nomNat = (item.data.nombre_natural || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ /g, '_');
                        let towerId = item.data.id.toLowerCase().replace(/ /g, '_');
                        
                        let towerIdWithoutSuffix = towerId.replace(/_\d+$/, ''); 

                        let searchKeyLimpia = searchKey.replace(/_/g, '');
                        let towerIdLimpia = towerIdWithoutSuffix.replace(/_/g, '');

                        if (nomNat === searchKey || towerId === searchKey || towerIdWithoutSuffix === searchKey || towerIdLimpia === searchKeyLimpia) {
                            target = item; break;
                        }
                    }
                }
            }

            if (target && (target.data.id_num || target.type === 'variable' || target.type === 'tower')) {
                
                let refCode = target.data.id_num ? target.data.id_num.toUpperCase() : target.data.id;
                let nombreReal = cleanText; 

                if (cleanText.toUpperCase() === refCode.toUpperCase()) {
                    if (target.type === 'city') nombreReal = "Ciudad Completa";
                    else if (target.type === 'region') nombreReal = "Barrio: " + target.data.id;
                    else if (target.type === 'district') nombreReal = target.data.id;
                    else if (target.type === 'tower') nombreReal = target.data.nombre_natural || cleanText;
                    else if (target.type === 'broadcast') nombreReal = "Mensaje: " + target.data.id;
                    else if (target.type === 'variable') nombreReal = "Variable: " + cleanText;
                }

                return `<span class="ai-ref-link" title="Ir a ${nombreReal}" onclick="window.navigateToReference('${refCode}')">[${nombreReal}]</span>`;
            }

            return match; 
        });
        
        return text;
    }

    window.navigateToReference = function(refCode) {
        let target = referenceMap[refCode] || referenceMap[refCode.toUpperCase()];
        
        if (target) {
            if (target.type === 'city' || target.type === 'region' || target.type === 'district') {
                showDistrictView(target.data);
                
            } else if (target.type === 'tower' || target.type === 'variable') {

                if (target.type === 'variable') {
                    let cleanName = target.data.id.replace('var_', '');
                    target.data.nombre_natural = "Variable: [" + cleanName + "]";
                }

                let parentDistrict = target.parent;
                if (!parentDistrict) {
                    parentDistrict = { 
                        id: "Memoria_Global", 
                        node_type: "region",
                        children: [target.data]
                    };
                }

                handleTowerData(target.data, parentDistrict);
                
            } else if (target.type === 'broadcast') {
                showBroadcastView(target.data);
            }
        } else {
            console.warn("No se pudo navegar a la referencia:", refCode);
        }
    };

    window.showBroadcastView = function(broadcastData) {
        hideAllViews();
        pushToHistory('broadcast', broadcastData);

        ui.title.innerText = "Mensaje";
        ui.subtitle.innerText = "Mensaje del sistema";
        let typeLabel = document.getElementById('selection-type-label');
        if (typeLabel) typeLabel.innerText = "Has seleccionado el mensaje:";
        ui.districtName.innerText = broadcastData.id;
        
        let verbosePlaceholder = document.getElementById('ia-verbose-placeholder');
        if(verbosePlaceholder) {
            verbosePlaceholder.innerHTML = linkifyReferences(broadcastData.ai_verbose) || "Explicación no disponible.";
        }
        let schematicTab = document.getElementById('tab-schematic');
        if(schematicTab) {
            schematicTab.innerHTML = "<p><strong>Resumen esquemático:</strong></p>" + linkifyReferences(broadcastData.ai_schematic || "<p>Resumen esquemático no disponible.</p>");
        }

        ui.scriptList.innerHTML = "<li style='color:#666;'><em>No tiene una representación física en la ciudad 3D.</em></li>";
        
        views.district.style.display = 'block';
    }

    function findContextByElementID(element) {
        let el = element;
        let depth = 0;
        
        while (el && depth < 8) { 
            let checkId = el.id; 
            
            if (checkId && typeof projectData !== 'undefined' && projectData.children) {
                
                let cleanId = checkId.replace(/^boat-/, '');
                let parts = cleanId.split('/');
                let baseId = parts[parts.length - 1]; 
                
                if (checkId.endsWith('Stage') || checkId === 'boat-Stage' || baseId === 'Stage') {
                    return { type: 'city', data: projectData }; 
                }

                let variants = [checkId, cleanId, baseId, baseId.replace(/_/g, ' '), baseId.replace(/ /g, '_')];

                for (let region of projectData.children) {
                    if (variants.includes(region.id) || variants.includes(region.id.replace(/ /g, '_'))) {
                        return { type: 'region', data: region };
                    }
                    if (region.children) {
                        for (let district of region.children) {
                            if (variants.includes(district.id) || variants.includes(district.id.replace(/ /g, '_'))) {
                                return { type: 'district', data: district, parent: region };
                            }
                            if (district.children) {
                                for (let script of district.children) {
                                    let scriptIdSafe = script.id.replace(/ /g, '_');
                                    if (parts.includes(script.id) || parts.includes(scriptIdSafe)) {
                                        return { type: 'tower', data: script, parent: district }; 
                                    }
                                }
                            }
                        }
                    }
                }
            }
            el = el.parentNode;
            depth++;
        }
        return null; 
    }

    function showDistrictView(nodeData) {
        hideAllViews();
        pushToHistory('district', nodeData);

        let nodeType = 'district';
        if (nodeData.id === "Stage") nodeType = 'city';
        else if (nodeData.node_type === "Region") nodeType = 'region';
        
        ui.title.innerText = nodeType === 'city' ? "Proyecto completo" : (nodeType === 'region' ? "Distrito" : "Sprite");
        ui.subtitle.innerText = nodeType === 'city' ? "Vista general (G1)" : (nodeType === 'region' ? "Grupo de sprites" : "Vista general del Sprite");
        let typeLabel = document.getElementById('selection-type-label');
        if (typeLabel) {
            if (nodeType === 'city') typeLabel.innerText = "Has seleccionado el proyecto:";
            else if (nodeType === 'region') typeLabel.innerText = "Has seleccionado el Distrito:";
            else typeLabel.innerText = "Has seleccionado el Sprite:";
        }
        ui.districtName.innerText = nodeData.id;
        
        let verbosePlaceholder = document.getElementById('ia-verbose-placeholder');
        if(verbosePlaceholder) {
            verbosePlaceholder.innerHTML = linkifyReferences(nodeData.ai_verbose) || "Explicación no disponible.";
        }
        let schematicTab = document.getElementById('tab-schematic');
        if(schematicTab) {
            schematicTab.innerHTML = "<p><strong>Resumen esquemático:</strong></p>" + linkifyReferences(nodeData.ai_schematic || "<p>Resumen esquemático no disponible.</p>");
        }

        ui.scriptList.innerHTML = "";
        if (nodeData.children && nodeData.children.length > 0) {
            nodeData.children.forEach((child, index) => {
                let li = document.createElement('li');
                
                if (nodeType === 'city') {
                    li.innerText = "Distrito: " + child.id;
                } else if (nodeType === 'region') {
                    li.innerText = "Sprite: " + child.id;
                } else {
                    let cleanSpriteName = nodeData.id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
                    let nombreGenerico = cleanSpriteName + " Script " + (index + 1);
                    let nombreEdificio = child.nombre_natural ? child.nombre_natural : nombreGenerico;
                    
                    li.innerText = nombreEdificio + " - " + child.Blocks + " bloques";
                }

                li.style.cursor = "pointer";
                li.style.color = "#3a85fc";
                li.style.textDecoration = "underline";
                li.style.marginBottom = "5px";
                li.onclick = function() {
                    if (nodeType === 'city' || nodeType === 'region') {
                        showDistrictView(child);
                    } else {
                        handleTowerData(child, nodeData);
                    }
                };
                ui.scriptList.appendChild(li);
            });
        }
        views.district.style.display = 'block';
    }

    window.openTowerTab = function(tabId, btnElement) {
        let contents = document.querySelectorAll('.tower-tab-content');
        contents.forEach(c => c.classList.remove('active'));
        
        let btns = document.querySelectorAll('.script-tab-btn');
        btns.forEach(b => b.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        btnElement.classList.add('active');
    };

    function handleTowerData(scriptData, parentDistrict) {
        console.log("Mostrando torre:", scriptData.id, "del distrito:", parentDistrict.id);
        hideAllViews();

        pushToHistory('tower', scriptData, parentDistrict);
        
        let fullData = projectFlat.find(item => item.id === scriptData.id) || scriptData;

        currentRawCode = fullData.script_blocks || "";
        ui.codeBlock.innerText = currentRawCode; 

        ui.title.innerText = "Script seleccionado";
        ui.subtitle.innerText = "Torre de código";

        let cleanSpriteName = parentDistrict.id.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        let scriptIndex = parentDistrict.children.findIndex(c => c.id === scriptData.id) + 1;
        let nombreGenerico = cleanSpriteName + " Script " + scriptIndex;
        let scriptTitle = fullData.nombre_natural ? fullData.nombre_natural : nombreGenerico;
        ui.scriptId.innerText = scriptTitle;
        
        let verbosePlaceholder = document.getElementById('script-ai-verbose-placeholder');
        let schematicPlaceholder = document.getElementById('script-ai-schematic-placeholder');
        let connectionsPlaceholder = document.getElementById('script-ai-connections-placeholder');

        if (verbosePlaceholder) {
            verbosePlaceholder.innerHTML = linkifyReferences(fullData.ai_verbose) || "Análisis detallado no disponible para esta torre.";
        }
        
        if (schematicPlaceholder) {
            schematicPlaceholder.innerHTML = linkifyReferences(fullData.ai_schematic) || "<p>Resumen esquemático no disponible para esta torre.</p>";
        }

        if (connectionsPlaceholder) {
            let htmlConnections = fullData.ai_connections ? fullData.ai_connections : "";

            let receives = [];
            let emits = [];
            let usesVars = [];

            if (typeof flowData !== 'undefined') {
                Object.keys(flowData.broadcasts).forEach(bKey => {
                    let bObj = flowData.broadcasts[bKey];
                    if (bObj.receive.includes(scriptData.id)) receives.push(bObj.label);
                    if (bObj.emit.includes(scriptData.id)) emits.push(bObj.label);
                });

                Object.keys(flowData.variables).forEach(vKey => {
                    let vObj = flowData.variables[vKey];
                    if (vObj.use.includes(scriptData.id)) usesVars.push(vObj.label);
                });
            }

            if (receives.length > 0 || emits.length > 0 || usesVars.length > 0) {
                let autoHtml = "<div style='margin-top: 15px; padding-top: 10px; border-top: 1px solid #ccc;'>";
                if (emits.length > 0) {
                    
                }
                if (receives.length > 0) {
                    autoHtml += `<p style="margin: 3px 0;"><b>Recibe:</b> ${receives.map(b => `[${b}]`).join(', ')}</p>`;
                }
                if (usesVars.length > 0) {
                    autoHtml += `<p style="margin: 3px 0;"><b>Usa variables:</b> ${usesVars.map(v => `[${v}]`).join(', ')}</p>`;
                }
                autoHtml += "</div>";

                htmlConnections += autoHtml;
            }
            if (!htmlConnections) {
                htmlConnections = "<p>Este script no envía ni recibe señales ni variables registradas.</p>";
            }
            connectionsPlaceholder.innerHTML = linkifyReferences(htmlConnections);
        }

        let descContainer = document.getElementById('view-description');
        let oldBtn = document.getElementById('btn-back-district');
        if(oldBtn) oldBtn.remove();

        let backBtn = document.createElement('button');
        backBtn.id = 'btn-back-district';
        backBtn.className = 'button';
        backBtn.innerText = "Volver al Sprite " + parentDistrict.id;
        backBtn.style.background = "#ddd";
        backBtn.style.color = "#333";
        backBtn.style.width = "100%";
        backBtn.style.marginBottom = "10px";
        backBtn.onclick = function() { showDistrictView(parentDistrict); };
        
        descContainer.insertBefore(backBtn, descContainer.firstChild);

        views.description.style.display = 'block';
    }

    function openTab(tabId, btnElement) {
        let contents = document.querySelectorAll('.tab-content');
        contents.forEach(c => c.classList.remove('active'));
        
        let btns = document.querySelectorAll('.tab-btn');
        btns.forEach(b => b.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        btnElement.classList.add('active');
    }

    let flowData = { broadcasts: {}, variables: {} };
    let spriteColors = Object.create(null);
    const SPRITE_HIGHLIGHT_COLOR = '#FF1744';
    let originalTowerColors = {};

    function extractFlowData() {
        if (typeof projectFlat === 'undefined' || projectFlat.length === 0) return;

        projectFlat.forEach(item => {
            if (!originalTowerColors[item.id]) {
                originalTowerColors[item.id] = item.building_color || '#888888';
            }

            const pathParts = item.path.split('/');
            if (pathParts.length >= 4 && pathParts[1] !== 'Memoria_Global') {
                const spriteName = pathParts[2];
                spriteColors[spriteName] = SPRITE_HIGHLIGHT_COLOR;
            }
        });

        let varNames = new Set(["lives", "ScrollX", "clone", "clone2", "Color", "tipo", "isGameOver"]); 
        const definerRegex = /(?:set|change|show variable|hide variable)\s+\[([^\]]+?)(?: v)?\]/gi;
        
        projectFlat.forEach(item => {
            if (!item.script_blocks) return;
            let match;
            while ((match = definerRegex.exec(item.script_blocks)) !== null) {
                varNames.add(match[1].trim());
            }
        });

        const emitRegex = /(?:broadcast|enviar)\s*[[({"]([^\])}"]+?)(?: v)?[\])}"]/gi;
        const receiveRegex = /(?:when I receive|al recibir)\s*[[({"]([^\])}"]+?)(?: v)?[\])}"]/gi;

        projectFlat.forEach(item => {
            if (!item.script_blocks) return;
            const text = item.script_blocks;
            const towerId = item.id;

            let match;
            while ((match = emitRegex.exec(text)) !== null) {
                let bNameRaw = match[1].trim();
                let bName = bNameRaw.toLowerCase();
                
                if (!flowData.broadcasts[bName]) {
                    flowData.broadcasts[bName] = { label: bNameRaw, emit: [], receive: [] };
                }
                if (!flowData.broadcasts[bName].emit.includes(towerId)) {
                    flowData.broadcasts[bName].emit.push(towerId);
                }
            }

            while ((match = receiveRegex.exec(text)) !== null) {
                let bNameRaw = match[1].trim();
                let bName = bNameRaw.toLowerCase();
                
                if (!flowData.broadcasts[bName]) {
                    flowData.broadcasts[bName] = { label: bNameRaw, emit: [], receive: [] };
                }
                if (!flowData.broadcasts[bName].receive.includes(towerId)) {
                    flowData.broadcasts[bName].receive.push(towerId);
                }
            }

            definerRegex.lastIndex = 0;
            let defMatch;
            while ((defMatch = definerRegex.exec(text)) !== null) {
                let varRaw = defMatch[1].trim();
                let foundKey = Array.from(varNames).find(n => n.toLowerCase() === varRaw.toLowerCase()) || varRaw;
                if (!flowData.variables[foundKey]) flowData.variables[foundKey] = { label: foundKey, use: [], define: [] };
                if (!flowData.variables[foundKey].define.includes(towerId)) flowData.variables[foundKey].define.push(towerId);
            }

            varNames.forEach(v => {
                let vLower = v.toLowerCase();
                let textLower = text.toLowerCase();
                let pattern1 = `[${vLower} v]`; let pattern2 = `(${vLower})`; let pattern3 = `[${vLower}]`; 
                
                if (textLower.includes(pattern1) || textLower.includes(pattern2) || textLower.includes(pattern3)) {
                    if (!flowData.variables[v]) flowData.variables[v] = { label: v, use: [], define: [] };
                    if (!flowData.variables[v].use.includes(towerId)) flowData.variables[v].use.push(towerId);
                }
            });
        });

        console.log("Datos extraídos y unificados correctamente:", flowData);
        buildFlowPanelUI();
        buildSpritePanelUI();
    }

    function buildFlowPanelUI() {
        let container = document.getElementById('flow-panel-content');
        if (!container) return;

        container.innerHTML = '';
        const appendSection = function(title) {
            const heading = document.createElement('h4');
            heading.innerText = title;
            container.appendChild(heading);
        };
        const appendCheckbox = function(target, title, type, key) {
            const label = document.createElement('label');
            label.className = 'flow-checkbox-label';

            const checkbox = document.createElement('input');
            checkbox.className = type === 'sprite' ? 'sprite-checkbox' : 'flow-checkbox';
            checkbox.type = 'checkbox';
            checkbox.dataset.type = type;
            checkbox.dataset.key = key;
            checkbox.addEventListener('change', updateFlowHighlight);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + title));
            target.appendChild(label);
        };

        appendSection('Mensajes');
        Object.keys(flowData.broadcasts).sort().forEach(bKey => {
            let bObj = flowData.broadcasts[bKey];
            if (bObj.emit.length > 0 || bObj.receive.length > 0) {
                appendCheckbox(container, bObj.label, 'broadcast', bKey);
            }
        });

        appendSection('Variables');
        Object.keys(flowData.variables).sort().forEach(vKey => {
            let vObj = flowData.variables[vKey];
            if (vObj.use.length > 0) {
                appendCheckbox(container, vObj.label, 'variable', vKey);
            }
        });
    }

    function buildSpritePanelUI() {
        let container = document.getElementById('sprite-panel-content');
        if (!container) return;

        container.innerHTML = '';
        Object.keys(spriteColors).sort().forEach(spriteName => {
            const label = document.createElement('label');
            label.className = 'flow-checkbox-label';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'sprite-checkbox';
            checkbox.dataset.type = 'sprite';
            checkbox.dataset.key = spriteName;
            checkbox.addEventListener('change', updateFlowHighlight);
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(' ' + spriteName));
            container.appendChild(label);
        });
    }

    function repaintCity() {
        let cityEl = document.getElementById('boats-city');
        let painter = cityEl && cityEl.components && cityEl.components['pintor-ciudad'];
        let cajas = cityEl && cityEl.querySelectorAll('a-box');

        if (!cityEl || !cajas || cajas.length === 0) {
            console.warn("No se encontraron las cajas de la ciudad para actualizar los colores.");
            return;
        }

        paintCityBoxes(cajas);
        if (painter) {
            painter.painted = true;
        } else {
            console.warn("No se encontró el pintor de la ciudad; los colores actuales se han actualizado.");
        }
    }

    function updateFlowHighlight() {
        let activeB = [];
        let activeV = [];
        let activeSprites = [];
        document.querySelectorAll('.flow-checkbox:checked').forEach(cb => {
            if (cb.dataset.type === 'broadcast') activeB.push(cb.dataset.key);
            if (cb.dataset.type === 'variable') activeV.push(cb.dataset.key);
        });
        document.querySelectorAll('.sprite-checkbox:checked').forEach(cb => {
            activeSprites.push(cb.dataset.key);
        });

        window.selectedSpriteColors = Object.create(null);
        activeSprites.forEach(spriteName => {
            window.selectedSpriteColors[spriteName] = spriteColors[spriteName];
        });

        projectFlat.forEach(item => {
            item.building_color = originalTowerColors[item.id] || '#888888';
        });

        const hasFlowHighlights = activeB.length > 0 || activeV.length > 0;
        if (hasFlowHighlights) {
            let targetColors = {}; 
            
            const VAR_DEFINE_COLOR = '#FF6D00';
            const VAR_USE_COLOR = '#B388FF';

            activeV.forEach(v => {
                let vObj = flowData.variables[v];
                if (!vObj) return;
                if (vObj.define && vObj.define.length > 0) {
                    vObj.define.forEach(id => targetColors[id] = VAR_DEFINE_COLOR);
                }
                if (vObj.use && vObj.use.length > 0) {
                    vObj.use.forEach(id => {
                        if (!targetColors[id]) targetColors[id] = VAR_USE_COLOR;
                    });
                }
            });

            activeB.forEach(b => {
                flowData.broadcasts[b].receive.forEach(id => targetColors[id] = '#00E5FF');
                flowData.broadcasts[b].emit.forEach(id => targetColors[id] = '#E91E63');
            });

            projectFlat.forEach(item => {
                if (targetColors[item.id]) {
                    item.building_color = targetColors[item.id]; 
                } else {
                    item.building_color = '#FFFFFF';
                }
            });
        }

        repaintCity();
    }

    setTimeout(extractFlowData, 2000);

    window.addEventListener('load', () => {
        setTimeout(() => {
            if (typeof projectFlat !== 'undefined' && typeof referenceMap !== 'undefined') {
                projectFlat.forEach(item => {
                    if (item.id.startsWith('var_')) {
                        referenceMap[item.id.toUpperCase()] = { type: 'variable', data: item };
                        referenceMap[item.id] = { type: 'variable', data: item }; 
                    }
                });
                
            }
        }, 1500);
    });

  