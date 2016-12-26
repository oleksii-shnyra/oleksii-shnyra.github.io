"use strict";
let vertexId = 0;

class Vertex {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const neighbours = {};
        this.neighbours = neighbours;
        let id = this.id = ++vertexId;
        Vertex.all[id] = this;
    }

    static get(id) {
        return Vertex.all[id];
    }

    edgeTo(target) {
        Edge.create(this.id, target.id);
    }
}
Vertex.all = {};

class Edge {
    static get(id) {
        return Edge.all[id];
    }

    static create(id1, id2) {
        let edgeId = id2string(id1, id2);
        if (this.get(edgeId)) return false;
        let v1 = Vertex.get(id1), v2 = Vertex.get(id2);
        if (v1 && v2) {
            v1.neighbours[v2.id] = v2;
            v2.neighbours[v1.id] = v1;
            if (id1 > id2)[v1, v2] = [v2, v1];
            return Edge.all[edgeId] = {
                a: v1,
                b: v2
            };
        }
    }

    static getLen(id1, id2) {
        let edgeId = id2string(id1, id2);
        if (!this.get(edgeId)) return false;
        let v1 = Vertex.get(id1), v2 = Vertex.get(id2);
        let dx = v1.x - v2.x, dy = v1.y - v2.y;
        return Math.sqrt(dx ** 2 + dy ** 2);
    }
}
Edge.all = {};

function id2string(id, id2) {
    return id > id2 ? `${id2}_${id}` : `${id}_${id2}`;
}

function randi(min, max) {
    return Math.floor(Math.random() * (max + 1 - min)) + min;
}

DC.ready(function () {
    let app = DC.temp().iIn('.dc-app');
    let ww = 800, wh = 600;
    
    let container = DC.temp({
        state: {
            class: 'container'
        }
    }).iIn(app);

    let canvas = DC.temp({
        eltype: 'canvas',
        attrs: {
            width: ww,
            height: wh
        }
    }).iIn(container).el;

    let info = DC.temp().iIn(app);

    let context = canvas.getContext('2d');

    function drawCircle(x, y, r) {
        context.beginPath();
        context.arc(x, y, r, 0, PI2);
        context.fill();
    }

    let k = 40, s = k * 0.5;

    let PI2 = Math.PI * 2;

    let vertices = [];

    let startV, endV;

    function onSelect(v) {
        if (!endV) {
            v.dc.addClass('opaque');
            if (!startV) {
                startV = v;
                render();
                info.t = 'Now, select destination';
            } else {
                if (v.id != startV.id) {
                    endV = v;
                    findSolutions(startV, endV);
                } else {
                    startV.dc.removeClass('opaque');
                    startV = false;
                    info.t = '';
                }
            }
        } else {
            startV.dc.removeClass('opaque');
            endV.dc.removeClass('opaque');
            endV = false;
            startV = v;
            render();
            info.t = 'Now, select destination';
            v.dc.addClass('opaque');
        }
    }

    let findSolutions = function () {
        function isDiscovered(id, o) {
            return id in o.discovered;
        }

        function markDiscovered(id, o) {
            o.discovered[id] = true;
        }

        class Queue {
            constructor() { this.nodes = []; }

            add(id, priority) {
                this.nodes.push({ id: id, priority: priority });
                this.sort();
            }

            shift() { return this.nodes.length ? this.nodes.shift().id : false; }

            infoNext() { return this.nodes[0]; }

            sort() { this.nodes.sort((a, b) => a.priority - b.priority); }
        }

        function showSolution(o) {
            if (!o.solutions) return info.t = 'solution not found... try again';
            o.solutions.find(_o => {
                if (_o.total != o.bestSolution) return false;
                let path = _o.path;
                for (let i = 1, l = path.length; i < l; i++) {
                    let v = Vertex.get(path[i - 1]);
                    let v2 = Vertex.get(path[i]);
                    drawSegment(v.x, v.y, v2.x, v2.y, 5, {
                        color: 'rgba(120,140,250,.75)'
                    }, true);
                }
                info.h = `Your solution has ${path.length} steps in this order: ${path.reverse().join(', ')}<br>
                And total length is: ${_o.total.toFixed(2)} (px)`;
                return true;
            });
        }

        function goDeeper(o) {
            if (o.step > o.limit) {
                return info.t = 'Prevented because limit exceeded';
            }

            let cur = o.cur;

            if (cur.id == o.targetId) {
                return console.log('you cannot look for end from end');
            }

            if (isDiscovered(cur.id, o)) {
                o.cur = Vertex.get(o.queue.shift());
                if (!o.cur) return showSolution(o);
                return goDeeper(o);
            }

            let neighbours = Object.keys(cur.neighbours);
            let distances = o.distances;
            let previous = o.previous;
            let queue = o.queue;
            let curLen = distances[cur.id];
            if (o.bestSolution && curLen > o.bestSolution) {
                return showSolution(o);
            }

            neighbours.forEach(id => {
                if (o.stop) return;
                if (isDiscovered(id, o)) return;
                let v = Vertex.get(id);
                let len = Edge.getLen(cur.id, id);
                let neolen = curLen + len;
                let prevLen = distances[id];
                if (!prevLen || neolen < prevLen) {
                    distances[id] = neolen;
                    if (id != o.targetId) queue.add(id, neolen);
                    previous[id] = cur.id;
                }
                drawSegment(cur.x, cur.y, v.x, v.y, 3, {
                    color: o.gradient
                });
                if (id == o.targetId) {
                    o.found = true;
                    if (!o.bestSolution || o.bestSolution > neolen) {
                        o.bestSolution = neolen;
                        while (previous[id]) {
                            o.path.push(id);
                            id = previous[id];
                        }
                        o.path.push(id);
                        o.solutions.push({
                            path: o.path,
                            total: neolen
                        });
                        o.path = [];
                        let next = queue.infoNext();
                        if (next && next.priority < neolen) o.found = false;
                    }
                }
            });

            markDiscovered(cur.id, o);
            o.step++;

            if (o.found) {
                return showSolution(o);
            } else {
                o.cur = Vertex.get(queue.shift());

                if (!o.cur) return showSolution(o);

                setTimeout(function () {
                    goDeeper(o)
                }, 17);
            }
        }

        let fn = (v1, v2) => {
            info.t = `Start looking for a solution from ${v1.id} to ${v2.id} ...`;
            const o = {
                limit: 2048,
                step: 0,
                discovered: {},
                distances: {
                    [v1.id]: 0
                },
                previous: {
                    [v1.id]: false
                },
                queue: new Queue(),
                path: [],
                solutions: [],
                bestSolution: false
            };
            let targetId = o.targetId = v2.id;
            let cur = o.cur = v1;
            let dx = v2.x - v1.x;
            let dy = v2.y - v1.y;
            o.gradient = context.createRadialGradient(v1.x, v1.y, 0, v1.x, v1.y, Math.sqrt(dx ** 2 + dy ** 2));
            o.gradient.addColorStop(0, "rgba(0,255,0,.5)");
            o.gradient.addColorStop(1, "rgba(255,0,0,.5)");
            goDeeper(o);
        }

        return fn;
    } ();

    function createVertex(x, y) {
        let v = new Vertex(x, y);
        v.dc = DC.temp({
            state: {
                class: 'p',
                text: v.id
            },
            events: {
                click() {
                    onSelect(v);
                }
            }
        }).iIn(container);
        v.el = v.dc.el;
        v.el.css({ left: x - 15, top: y - 15 });
        vertices.push(v);
        return v;
    }

    function createVertices() {
        let imax = ww - k, jmax = wh - k;
        for (let i = 0; i < imax; i += k) {
            for (let j = 0; j < jmax; j += k) {
                let x = i + k + randi(-s, s);
                let y = j + k + randi(-s, s);
                createVertex(x, y);
            }
        }
    }

    function createEdges() {
        let hcount = Math.floor(wh / k) - 1;
        for (let i = vertices.length - 1; i > 0; i--) {
            let v1 = vertices[i];
            let v2 = vertices[i - 1];
            if (i < hcount) {
                v1.edgeTo(v2);
                continue;
            };
            let v3 = vertices[i - hcount];
            v1.edgeTo(v3);
            if (i % hcount != 0) { v1.edgeTo(v2); }
        }
    }

    let degk = 180 / Math.PI;
    let angle180 = 180 / degk;

    function genSegmentPath(x, y, x2, y2, r1, r2) {
        let dx = x2 - x;
        let dy = y2 - y;

        let angle = Math.atan2(dx, dy);

        context.beginPath();

        let rotation = angle180 - angle;

        context.arc(x, y, r1, rotation, Math.PI + rotation);

        context.arc(x2, y2, r2, -angle, Math.PI - angle);

        context.closePath();
    }

    function normalizeSegCoords(x, y, x2, y2) {
        let res = '';
        res += x > x2 ? `${x2}_${x}_` : `${x}_${x2}_`;
        res += y > y2 ? `${y2}_${y}` : `${y}_${y2}`;
        return res;
    }

    let readySegments;

    function drawSegment(x, y, x2, y2, r, o = {}, force) {
        let segId = normalizeSegCoords(x, y, x2, y2);
        if (!force && readySegments[segId]) return;
        genSegmentPath(x, y, x2, y2, r, r);
        if (o.color) context.fillStyle = o.color;
        context.fill();
        readySegments[segId] = true;
    }

    function render() {
        var devicePixelRatio = window.devicePixelRatio || 1,
            backingStoreRatio = context.webkitBackingStorePixelRatio ||
                context.mozBackingStorePixelRatio ||
                context.msBackingStorePixelRatio ||
                context.oBackingStorePixelRatio ||
                context.backingStorePixelRatio || 1,
            ratio = devicePixelRatio / backingStoreRatio;
        if (devicePixelRatio !== backingStoreRatio) {

            var oldWidth = ww;
            var oldHeight = wh;

            canvas.width = oldWidth * ratio;
            canvas.height = oldHeight * ratio;

            canvas.style.width = oldWidth + 'px';
            canvas.style.height = oldHeight + 'px';

            context.scale(ratio, ratio);

        } else {
            canvas.width = ww;
            canvas.height = wh;
        }
        renderEdges();
    }

    function renderEdges() {
        readySegments = {};
        context.strokeStyle = '#555';
        for (let pair in Edge.all) {
            pair = pair.split('_');
            let [v, v2] = [Vertex.get(pair[0]), Vertex.get(pair[1])];
            context.beginPath();
            context.moveTo(v.x, v.y);
            context.lineTo(v2.x, v2.y);
            context.stroke();
        }
    }

    createVertices();
    createEdges();
    render();
});