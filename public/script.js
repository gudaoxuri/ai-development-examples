/* public/script.js */
var knowledgeTree = [];
var knowledgeTreeMap = {};
var totalLeafCount = 0;
var svg;
var svgGroup;
var nodeWidth = 150;
var nodeHeight = 40;
var horizontalSpacing = 20;
var verticalSpacing = 80;
var filterConditions = {};
var zoomLevel = 1;
var panOffset = { x: 0, y: 0 };
var isBulkEditMode = false;
var selectedNodes = [];

document.addEventListener('DOMContentLoaded', function() {
    initFilterBox();
    initControlButtons();
    initZoomAndPan();
    loadDataAndRenderMindMap();
});

function initFilterBox() {
    fetch('/api/jobs')
        .then(response => response.json())
        .then(data => {
            var jobNameSelect = document.getElementById('jobNameSelect');
            jobNameSelect.innerHTML = '<option value="">全部</option>';
            data.forEach(job => {
                var option = document.createElement('option');
                option.value = job.JobName;
                option.textContent = job.JobName;
                jobNameSelect.appendChild(option);
            });
        });

    document.getElementById('filterButton').addEventListener('click', function() {
        filterConditions.jobName = document.getElementById('jobNameSelect').value;
        filterConditions.jobLevel = document.getElementById('jobLevelSelect').value;
        filterConditions.requirement = document.getElementById('requirementSelect').value;
        loadDataAndRenderMindMap();
    });
}

function initControlButtons() {
    document.getElementById('expandAllButton').addEventListener('click', function() {
        expandCollapseAll(false);
    });
    document.getElementById('collapseAllButton').addEventListener('click', function() {
        expandCollapseAll(true);
    });
    document.getElementById('bulkEditButton').addEventListener('click', function() {
        enterBulkEditMode();
    });
    document.getElementById('bulkEditCompleteButton').addEventListener('click', function() {
        completeBulkEdit();
    });
}

function expandCollapseAll(collapse) {
    function traverse(node) {
        node.collapsed = collapse;
        if (node.children) {
            for (var i = 0; i < node.children.length; i++) {
                traverse(node.children[i]);
            }
        }
    }
    for (var i = 0; i < knowledgeTree.length; i++) {
        traverse(knowledgeTree[i]);
    }
    redraw();
}

function enterBulkEditMode() {
    isBulkEditMode = true;
    selectedNodes = [];
    document.getElementById('bulkEditButton').style.display = 'none';
    document.getElementById('bulkEditCompleteButton').style.display = 'inline-block';
    svg.classList.add('bulk-edit-mode');
    redraw();
}

function completeBulkEdit() {
    if (selectedNodes.length === 0) {
        alert('请选择至少一个知识点节点进行批量编辑。');
        return;
    }
    openBulkEditForm();
}

function openBulkEditForm() {
    fetch('/api/jobs')
        .then(response => response.json())
        .then(data => {
            var jobNameSelect = document.getElementById('bulkRelationJobName');
            jobNameSelect.innerHTML = '';
            data.forEach(job => {
                var option = document.createElement('option');
                option.value = job.JobName;
                option.textContent = job.JobName;
                jobNameSelect.appendChild(option);
            });
        });

    document.getElementById('bulkEditFormModal').style.display = 'flex';
}

function closeBulkEditFormModal() {
    document.getElementById('bulkEditFormModal').style.display = 'none';
    exitBulkEditMode();
}

function saveBulkRelation(event) {
    event.preventDefault();
    var jobName = document.getElementById('bulkRelationJobName').value;
    var jobLevel = document.getElementById('bulkRelationJobLevel').value;
    var knowledgeRequirement = document.getElementById('bulkRelationRequirement').value;
    var isRequired = document.getElementById('bulkRelationIsRequired').checked ? 1 : 0;
    var isImportant = document.getElementById('bulkRelationIsImportant').checked ? 1 : 0;

    selectedNodes.forEach(knowledgeId => {
        fetch('/api/relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                JobName: jobName,
                JobLevel: jobLevel,
                KnowledgeId: knowledgeId,
                KnowledgeRequirement: knowledgeRequirement,
                IsRequired: isRequired,
                IsImportant: isImportant
            })
        });
    });

    closeBulkEditFormModal();
    alert('批量编辑已保存。');
    exitBulkEditMode();
    loadDataAndRenderMindMap();
}

function exitBulkEditMode() {
    isBulkEditMode = false;
    selectedNodes = [];
    document.getElementById('bulkEditButton').style.display = 'inline-block';
    document.getElementById('bulkEditCompleteButton').style.display = 'none';
    svg.classList.remove('bulk-edit-mode');
    redraw();
}

function loadDataAndRenderMindMap() {
    svg = document.getElementById('mindMap');
    svg.innerHTML = '';

    Promise.all([
        fetch('/api/knowledge').then(response => response.json()),
        fetch(`/api/relations?jobName=${encodeURIComponent(filterConditions.jobName || '')}&jobLevel=${encodeURIComponent(filterConditions.jobLevel || '')}&requirement=${encodeURIComponent(filterConditions.requirement || '')}`).then(response => response.json())
    ]).then(([knowledgePoints, relations]) => {
        knowledgePoints.forEach(row => {
            row.children = [];
        });

        knowledgeTreeMap = {};
        knowledgePoints.forEach(point => {
            knowledgeTreeMap[point.KnowledgeId] = point;
        });

        // 构建树结构
        knowledgePoints.forEach(node => {
            node.collapsed = false;
            node.visible = true;
            node.match = false;
            if (node.ParentKnowledgeId !== null) {
                var parent = knowledgeTreeMap[node.ParentKnowledgeId];
                if (parent) {
                    parent.children.push(node);
                    node.parent = parent;
                }
            }
        });

        knowledgeTree = [];
        // 查找根节点
        for (var key in knowledgeTreeMap) {
            if (knowledgeTreeMap[key].ParentKnowledgeId === null) {
                knowledgeTree.push(knowledgeTreeMap[key]);
            }
        }

        applyFilters(relations);

        // 添加根节点 "岗位知识图谱"
        var rootNode = {
            KnowledgeId: 0,
            KnowledgeName: '岗位知识图谱',
            KnowledgeDescription: '',
            ParentKnowledgeId: null,
            children: [],
            collapsed: false,
            visible: true,
            isRoot: true
        };
        knowledgeTreeMap[0] = rootNode;
        knowledgeTree.forEach(node => {
            rootNode.children.push(node);
            node.parent = rootNode;
        });
        knowledgeTree = [rootNode];

        // 根据选择的岗位名称修改根节点名称
        if (filterConditions.jobName) {
            rootNode.KnowledgeName = filterConditions.jobName;
        } else {
            rootNode.KnowledgeName = '岗位知识图谱';
        }

        // 计算叶子节点数量并分配位置
        totalLeafCount = 0;
        knowledgeTree.forEach(node => {
            countVisibleLeaves(node);
            if (node.leafCount > 0) {
                totalLeafCount += node.leafCount;
            }
        });

        // 缓存每个知识点的关系数量
        relationCounts = {};
        relations.forEach(rel => {
            if (!relationCounts[rel.KnowledgeId]) {
                relationCounts[rel.KnowledgeId] = 0;
            }
            relationCounts[rel.KnowledgeId]++;
        });

        redraw();
    });
}

function applyFilters(relations) {
    var filteredKnowledgeIds = new Set(relations.map(rel => rel.KnowledgeId));

    // 标记匹配的节点及其祖先节点
    function markNodeAndAncestors(node) {
        node.visible = true;
        if (node.parent) {
            markNodeAndAncestors(node.parent);
        }
    }

    // 重置所有节点为不可见
    for (var key in knowledgeTreeMap) {
        knowledgeTreeMap[key].visible = false;
    }

    // 如果没有过滤条件，显示所有节点
    if (!filterConditions.jobName && !filterConditions.jobLevel && !filterConditions.requirement) {
        for (var key in knowledgeTreeMap) {
            knowledgeTreeMap[key].visible = true;
        }
    } else {
        filteredKnowledgeIds.forEach(knowledgeId => {
            var node = knowledgeTreeMap[knowledgeId];
            if (node) {
                markNodeAndAncestors(node);
            }
        });
    }
}

function countVisibleLeaves(node) {
    if (!node.visible) {
        node.leafCount = 0;
        return;
    }
    if (node.children.length === 0 || node.collapsed) {
        node.leafCount = 1;
    } else {
        node.leafCount = 0;
        for (var i = 0; i < node.children.length; i++) {
            countVisibleLeaves(node.children[i]);
            node.leafCount += node.children[i].leafCount;
        }
    }
}

function assignPositions(node, x0, x1, depth) {
    if (!node.visible) return;
    node.depth = depth;
    node.x = (x0 + x1) / 2;
    node.y = depth * (nodeHeight + verticalSpacing) + 50;
    if (!node.collapsed && node.children && node.children.length > 0) {
        var xStart = x0;
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.leafCount > 0) {
                var xEnd = xStart + (child.leafCount / node.leafCount) * (x1 - x0);
                assignPositions(child, xStart, xEnd, depth + 1);
                xStart = xEnd;
            }
        }
    }
}

function drawLinks(node) {
    if (!node.visible) return;
    if (!node.collapsed && node.children && node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++) {
            var child = node.children[i];
            if (child.visible) {
                var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                var pathData = 'M' + node.x + ',' + node.y + ' V' + (node.y + verticalSpacing / 2) + ' H' + child.x + ' V' + child.y;
                path.setAttribute('d', pathData);
                path.setAttribute('stroke', '#999');
                path.setAttribute('fill', 'none');
                svgGroup.appendChild(path);

                drawLinks(child);
            }
        }
    }
}

function drawNodes(node) {
    if (!node.visible) return;
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'translate(' + (node.x - nodeWidth / 2) + ',' + (node.y - nodeHeight / 2) + ')');

    var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', nodeWidth);
    rect.setAttribute('height', nodeHeight);
    rect.setAttribute('rx', 5);
    rect.setAttribute('ry', 5);

    // 设置节点样式
    if (isBulkEditMode && selectedNodes.includes(node.KnowledgeId)) {
        rect.setAttribute('fill', '#cce5ff'); // 浅蓝色
        rect.setAttribute('stroke', '#007bff');
        rect.setAttribute('stroke-width', '2');
    } else {
        rect.setAttribute('fill', '#fff');
        rect.setAttribute('stroke', '#000');
        rect.setAttribute('stroke-width', '1');
    }

    g.appendChild(rect);

    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', nodeWidth / 2);
    text.setAttribute('y', nodeHeight / 2 + 5);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.textContent = node.KnowledgeName;
    g.appendChild(text);

    // Display relation count if exists
    var relationCount = relationCounts[node.KnowledgeId] || 0;
    if (relationCount > 0) {
        var countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        countText.setAttribute('x', nodeWidth - 10);
        countText.setAttribute('y', nodeHeight - 5);
        countText.setAttribute('text-anchor', 'end');
        countText.setAttribute('dominant-baseline', 'auto');
        countText.setAttribute('font-size', '12px');
        countText.textContent = relationCount;
        countText.setAttribute('fill', '#007bff');
        g.appendChild(countText);
    }

    // Collapse/Expand indicator
    if (node.children && node.children.length > 0 && !node.isRoot) {
        var indicator = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        indicator.setAttribute('x', nodeWidth - 15);
        indicator.setAttribute('y', 15);
        indicator.setAttribute('text-anchor', 'middle');
        indicator.setAttribute('dominant-baseline', 'middle');
        indicator.setAttribute('font-size', '16px');
        indicator.textContent = node.collapsed ? '+' : '-';
        indicator.style.cursor = 'pointer';
        g.appendChild(indicator);

        indicator.addEventListener('click', function(event) {
            event.stopPropagation();
            toggleCollapse(node);
        });
    }

    if (isBulkEditMode) {
        g.addEventListener('click', function(event) {
            event.stopPropagation();
            toggleNodeSelection(node);
        });
    } else {
        g.addEventListener('mouseover', function(event) {
            showTooltip(node, event);
        });
        g.addEventListener('mouseout', function(event) {
            hideTooltip();
        });
        g.addEventListener('click', function(event) {
            showJobKnowledgeRelations(node);
        });
    }

    svgGroup.appendChild(g);

    if (!node.collapsed && node.children && node.children.length > 0) {
        for (var i = 0; i < node.children.length; i++) {
            drawNodes(node.children[i]);
        }
    }
}

function toggleNodeSelection(node) {
    var index = selectedNodes.indexOf(node.KnowledgeId);
    if (index === -1) {
        selectedNodes.push(node.KnowledgeId);
    } else {
        selectedNodes.splice(index, 1);
    }
    redraw();
}

function showJobKnowledgeRelations(node) {
    if (isBulkEditMode) return; // Do nothing in bulk edit mode
    var knowledgeId = node.KnowledgeId;

    fetch(`/api/knowledge/${knowledgeId}/relations`)
        .then(response => response.json())
        .then(relations => {
            var relationList = document.getElementById('relationList');
            relationList.innerHTML = '';
            if (relations.length > 0) {
                var table = document.createElement('table');
                var thead = document.createElement('thead');
                var headerRow = document.createElement('tr');
                ['岗位名称', '岗位级别', '知识点要求', '是否必备', '是否重要', '操作'].forEach(function(text) {
                    var th = document.createElement('th');
                    th.textContent = text;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);

                var tbody = document.createElement('tbody');
                relations.forEach(rel => {
                    var row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${rel.JobName}</td>
                        <td>${rel.JobLevel}</td>
                        <td>${rel.KnowledgeRequirement}</td>
                        <td>${rel.IsRequired ? '是' : '否'}</td>
                        <td>${rel.IsImportant ? '是' : '否'}</td>
                        <td>
                            <button onclick="openRelationForm(${rel.RelationId})">编辑</button>
                            <button onclick="deleteRelation(${rel.RelationId})">删除</button>
                        </td>
                    `;
                    tbody.appendChild(row);
                });
                table.appendChild(tbody);
                relationList.appendChild(table);
            } else {
                relationList.textContent = '暂无关联的岗位知识关系。';
            }

            // Prepare for new relation creation
            window.currentKnowledgeNode = node;

            openRelationDetails();
        });
}

function openRelationDetails() {
    document.getElementById('relationDetails').style.display = 'block';
}

function closeRelationDetails() {
    document.getElementById('relationDetails').style.display = 'none';
}

function toggleCollapse(node) {
    node.collapsed = !node.collapsed;
    redraw();
}

function initZoomAndPan() {
    var isPanning = false;
    var startPoint = { x: 0, y: 0 };
    var svgElement = document.getElementById('mindMap');

    svgElement.addEventListener('wheel', function(event) {
        event.preventDefault();
        var delta = event.deltaY > 0 ? 0.9 : 1.1;
        zoomLevel *= delta;
        redraw();
    });

    svgElement.addEventListener('mousedown', function(event) {
        isPanning = true;
        startPoint = { x: event.clientX, y: event.clientY };
    });

    svgElement.addEventListener('mousemove', function(event) {
        if (isPanning) {
            var dx = event.clientX - startPoint.x;
            var dy = event.clientY - startPoint.y;
            panOffset.x += dx;
            panOffset.y += dy;
            startPoint = { x: event.clientX, y: event.clientY };
            redraw();
        }
    });

    svgElement.addEventListener('mouseup', function(event) {
        isPanning = false;
    });

    svgElement.addEventListener('mouseleave', function(event) {
        isPanning = false;
    });
}

function redraw() {
    svg.innerHTML = '';
    svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svgGroup.setAttribute('transform', 'translate(' + panOffset.x + ',' + panOffset.y + ') scale(' + zoomLevel + ')');
    svg.appendChild(svgGroup);

    // Recalculate positions
    totalLeafCount = 0;
    for (var i = 0; i < knowledgeTree.length; i++) {
        countVisibleLeaves(knowledgeTree[i]);
        if (knowledgeTree[i].leafCount > 0) {
            totalLeafCount += knowledgeTree[i].leafCount;
        }
    }

    var totalWidth = totalLeafCount * (nodeWidth + horizontalSpacing);
    var x0 = 0;
    for (var i = 0; i < knowledgeTree.length; i++) {
        var node = knowledgeTree[i];
        if (node.leafCount > 0) {
            var nodeWidthPortion = (node.leafCount / totalLeafCount) * totalWidth;
            assignPositions(node, x0, x0 + nodeWidthPortion, 0);
            x0 += nodeWidthPortion;
        }
    }

    for (var i = 0; i < knowledgeTree.length; i++) {
        drawLinks(knowledgeTree[i]);
    }
    for (var i = 0; i < knowledgeTree.length; i++) {
        drawNodes(knowledgeTree[i]);
    }
}

function showTooltip(node, event) {
    var tooltip = document.getElementById('tooltip');
    tooltip.textContent = node.KnowledgeDescription || '无介绍';
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY + 10) + 'px';
    tooltip.style.display = 'block';
}

function hideTooltip() {
    var tooltip = document.getElementById('tooltip');
    tooltip.style.display = 'none';
}

function openRelationForm(relationId) {
    fetch('/api/jobs')
        .then(response => response.json())
        .then(data => {
            var jobNameSelect = document.getElementById('relationJobName');
            jobNameSelect.innerHTML = '';
            data.forEach(job => {
                var option = document.createElement('option');
                option.value = job.JobName;
                option.textContent = job.JobName;
                jobNameSelect.appendChild(option);
            });

            if (relationId) {
                fetch(`/api/relations/${relationId}`)
                    .then(response => response.json())
                    .then(relation => {
                        if (relation) {
                            document.getElementById('relationId').value = relation.RelationId;
                            document.getElementById('relationJobName').value = relation.JobName;
                            document.getElementById('relationJobLevel').value = relation.JobLevel;
                            document.getElementById('relationRequirement').value = relation.KnowledgeRequirement;
                            document.getElementById('relationIsRequired').checked = relation.IsRequired ? true : false;
                            document.getElementById('relationIsImportant').checked = relation.IsImportant ? true : false;
                        }
                        document.getElementById('relationFormModal').style.display = 'flex';
                    });
            } else {
                document.getElementById('relationId').value = '';
                document.getElementById('relationJobName').value = '';
                document.getElementById('relationJobLevel').value = '实习';
                document.getElementById('relationRequirement').value = '了解';
                document.getElementById('relationIsRequired').checked = false;
                document.getElementById('relationIsImportant').checked = false;
                document.getElementById('relationFormModal').style.display = 'flex';
            }
        });
}

function closeRelationFormModal() {
    document.getElementById('relationFormModal').style.display = 'none';
}

function saveRelation(event) {
    event.preventDefault();
    var relationId = document.getElementById('relationId').value;
    var jobName = document.getElementById('relationJobName').value;
    var jobLevel = document.getElementById('relationJobLevel').value;
    var knowledgeRequirement = document.getElementById('relationRequirement').value;
    var isRequired = document.getElementById('relationIsRequired').checked ? 1 : 0;
    var isImportant = document.getElementById('relationIsImportant').checked ? 1 : 0;
    var knowledgeId = window.currentKnowledgeNode.KnowledgeId;

    if (relationId) {
        // Update existing relation
        fetch(`/api/relations/${relationId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                JobName: jobName,
                JobLevel: jobLevel,
                KnowledgeRequirement: knowledgeRequirement,
                IsRequired: isRequired,
                IsImportant: isImportant
            })
        }).then(() => {
            closeRelationFormModal();
            showJobKnowledgeRelations(window.currentKnowledgeNode);
            loadDataAndRenderMindMap();
        });
    } else {
        // Insert new relation
        fetch('/api/relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                JobName: jobName,
                JobLevel: jobLevel,
                KnowledgeId: knowledgeId,
                KnowledgeRequirement: knowledgeRequirement,
                IsRequired: isRequired,
                IsImportant: isImportant
            })
        }).then(() => {
            closeRelationFormModal();
            showJobKnowledgeRelations(window.currentKnowledgeNode);
            loadDataAndRenderMindMap();
        });
    }
}

function deleteRelation(relationId) {
    fetch(`/api/relations/${relationId}`, {
        method: 'DELETE'
    }).then(() => {
        showJobKnowledgeRelations(window.currentKnowledgeNode);
        loadDataAndRenderMindMap();
    });
}
