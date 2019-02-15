(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cache = new Map();
/**
 * Return what's available but don't initiate any fetch.
 */
function peek(id) {
    return cache.get(id);
}
exports.peek = peek;
/**
 * Return content if ready as an array.
 * Otherwise return a promise - initiate a fetch
 * or return an already pending promise.
 */
function get(id) {
    if (!cache.has(id)) {
        // Entry doesn't exist - start with a promise
        console.log('fetching: ' + id);
        // Use BaconIpsum.com to generate some content for each panel
        cache.set(id, fetch('https://baconipsum.com/api/?type=meat-and-filler').then(response => response.json()).then(texts => {
            // When resolved, replace the promise with the
            // unwrapped value in the Map
            cache.set(id, texts);
            return texts;
        }).catch(err => {
            cache.delete(id);
            throw new Error(`Failed to fetch content for panel ${id}: ${err.message}`);
        }));
    }
    return cache.get(id);
}
exports.get = get;

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Panel_1 = require("../../src/Panel");
const index_1 = require("../../src/index");
const content = require("./content");
let slider;
/** getElementById helper */
function $e(id) {
    return document.getElementById(id);
}
/** Element to display live panel ID */
const elId = $e('panelId');
/** Element to display live panel position */
const elPos = $e('panelPos');
const NUM_PANELS = 101;
const MIN_PANEL_WIDTH = 360;
/** Create a page button element */
function createPageButton(panelId) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn-pg';
    b.textContent = String(panelId);
    b.addEventListener('click', () => {
        // Start fetching the destination panel content
        content.get(panelId);
        // Send the PanelSlider there
        slider.setPanel(panelId).then(pid => {
            elId.textContent = String(pid);
        });
    });
    return b;
}
/** Build some quick nav links to jump across many panels */
function buildNav() {
    const nav = document.querySelector('nav');
    for (let i = 0; i < NUM_PANELS; i += 10) {
        nav.appendChild(createPageButton(i));
    }
}
const picsumOffset = Math.floor(Math.random() * 1000);
/** Render panel content. Returns DOM tree. */
function renderPanelContent(pid, texts) {
    const div = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.textContent = 'Panel ' + pid;
    div.appendChild(h2);
    const img = document.createElement('img');
    img.style.width = '300px';
    img.style.height = '200px';
    img.src = 'https://picsum.photos/300/200?image=' + (picsumOffset + pid);
    const p = document.createElement('p');
    p.appendChild(img);
    div.appendChild(p);
    for (const text of texts) {
        const p = document.createElement('p');
        p.textContent = text;
        div.appendChild(p);
    }
    return div;
}
/** Pre-render (fast) */
function preRenderPanelContent(pid, text) {
    const div = document.createElement('div');
    const h2 = document.createElement('h2');
    h2.textContent = 'Panel ' + pid;
    div.appendChild(h2);
    const img = document.createElement('div');
    img.style.width = '300px';
    img.style.height = '200px';
    img.style.display = 'inline-block';
    img.style.backgroundColor = '#DDD';
    let p = document.createElement('p');
    p.appendChild(img);
    div.appendChild(p);
    p = document.createElement('p');
    p.style.fontStyle = 'italic';
    p.textContent = text;
    div.appendChild(p);
    return div;
}
/**
 * (Re)Create & configure a PanelSlider instance
 */
function initPanelSlider(visiblePanels) {
    let initialPanel = 0;
    if (slider != null) {
        initialPanel = slider.getPanel();
        slider.destroy();
    }
    slider = index_1.default({
        dom: document.querySelector('.panel-set'),
        totalPanels: NUM_PANELS,
        visiblePanels,
        initialPanel,
        maxSwipePanels: visiblePanels === 1 ? 1 : 3 * visiblePanels,
        slideDuration: 400,
        panelClassName: 'panel',
        // Callback that gets invoked when the PanelSlider needs
        // to render this panel.
        // panel - the Panel we're rendering
        // fast  - a boolean indicating if this is a 'fast' (animating)
        //         frame, in which case we should skip async/heavy tasks.
        renderContent: (panel, fast) => {
            // Try to get 'ready' content for this panel
            let c = content.peek(panel.index);
            // If it's ready to use, we got an array of strings
            if (Array.isArray(c)) {
                // Content is available now - render it:
                panel.dom.innerHTML = '';
                panel.dom.appendChild(renderPanelContent(panel.index, c));
                // Indicate did render
                return Panel_1.default.RENDERED;
            }
            else if (!fast) {
                // Content not available yet - fetch
                c = c || Promise.resolve(content.get(panel.index));
                c.then(() => {
                    // Request PanelSlider to re-render this panel when the content promise
                    // resolves. It's possible this panel is no longer bound to this ID by
                    // then so the render request may be ignored.
                    slider.renderContent(panel.index);
                });
                // Do a fast render while waiting
                panel.dom.innerHTML = '';
                panel.dom.appendChild(preRenderPanelContent(panel.index, 'loading...'));
                return Panel_1.default.FETCHING;
            }
            else {
                // Content not available but this is a 'fast' render so
                // don't bother fetching anything.
                // We could render some 'loading' or low-res content here...
                panel.dom.innerHTML = '';
                panel.dom.appendChild(preRenderPanelContent(panel.index, '...'));
                return Panel_1.default.PRERENDERED;
            }
        },
        on: {
            panelchange: e => {
                // Update panel ID displayed
                elId.textContent = String(e.panelId);
            },
            animate: e => {
                // Update panel position displayed
                elPos.textContent = e.panelFraction.toFixed(2);
            }
        }
    });
}
function calcVisiblePanels() {
    containerWidth = rootElement.getBoundingClientRect().width;
    return Math.max(Math.floor(containerWidth / MIN_PANEL_WIDTH), 1);
}
const rootElement = document.querySelector('.panel-set');
let containerWidth = rootElement.getBoundingClientRect().width;
let numVisiblePanels = calcVisiblePanels();
buildNav();
window.addEventListener('load', () => {
    numVisiblePanels = calcVisiblePanels();
    initPanelSlider(numVisiblePanels);
    window.addEventListener('resize', e => {
        const n = calcVisiblePanels();
        if (n !== numVisiblePanels) {
            numVisiblePanels = n;
            initPanelSlider(numVisiblePanels);
        }
    });
});

},{"../../src/Panel":4,"../../src/index":8,"./content":1}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Speedo_1 = require("./Speedo");
const NONE = 0;
const MOUSE = 1;
const TOUCH = 2;
const DEVICE_DELAY = 300;
const DEFAULT_DRAG_THRESHOLD = 12;
const DEFAULT_DRAG_RATIO = 1.5;
class DraggerEvent {
    constructor(type) {
        this.type = type;
    }
}
exports.DraggerEvent = DraggerEvent;
class DraggerDragEvent extends DraggerEvent {
    constructor(type, x, xv) {
        super(type);
        this.x = x;
        this.xv = xv;
    }
}
exports.DraggerDragEvent = DraggerDragEvent;
/**
 * Given a dom element, emit 'drag' events that occur along the horizontal axis
 */
function Dragger(el, { on = {}, dragThreshold = DEFAULT_DRAG_THRESHOLD, dragRatio = DEFAULT_DRAG_RATIO, devices, maxLeft, maxRight } = {}) {
    applyIOSHack();
    const speedo = Speedo_1.default();
    let device = NONE;
    /** Flag to prevent dragging while some child element is scrolling */
    let isScrolling = false;
    /** Touch/Mouse is down */
    let pressed = false;
    /** Indicates drag threshold crossed and we're in "dragging" mode */
    let isDragging = false;
    const dragStart = { x: 0, y: 0 };
    function onMouseDown(e) {
        if (device === TOUCH)
            return;
        cancelPress();
        if (e.button !== 0)
            return;
        device = MOUSE;
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        onPress(e.clientX, e.clientY, e);
    }
    function onMouseMove(e) {
        onMove(e.clientX, e.clientY, e);
    }
    function onMouseUp(e) {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        onRelease(e.clientX, e.clientY, e);
    }
    function onTouchStart(e) {
        if (device === MOUSE)
            return;
        cancelPress();
        device = TOUCH;
        el.addEventListener('touchmove', onTouchMove);
        el.addEventListener('touchend', onTouchEnd);
        const t = e.changedTouches[0];
        onPress(t.clientX, t.clientY, e);
    }
    function onTouchMove(e) {
        const t = e.changedTouches[0];
        onMove(t.clientX, t.clientY, e);
    }
    function onTouchEnd(e) {
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        const t = e.changedTouches[0];
        onRelease(t.clientX, t.clientY, e);
    }
    function onPress(x, y, e) {
        isScrolling = false;
        pressed = true;
        dragStart.x = x;
        dragStart.y = y;
        speedo.start(0, Date.now() / 1000);
        el.addEventListener('scroll', onScroll, true);
        on.devicepress && on.devicepress(e);
    }
    function onMove(x, y, e) {
        if (!pressed)
            return;
        let dx = x - dragStart.x;
        if (maxLeft != null) {
            dx = Math.max(dx, maxLeft());
        }
        if (maxRight != null) {
            dx = Math.min(dx, maxRight());
        }
        const dy = y - dragStart.y;
        speedo.addSample(dx, Date.now() / 1000);
        if (!isDragging) {
            const ratio = dy !== 0 ? Math.abs(dx / dy) : 1000000000.0;
            if (Math.abs(dx) < dragThreshold || ratio < dragRatio) {
                // Still not dragging. Bail out.
                return;
            }
            // Distance threshold crossed - init drag state
            isDragging = true;
            on.dragstart && on.dragstart(new DraggerDragEvent('dragstart', dx, 0));
        }
        e.preventDefault();
        on.dragmove && on.dragmove(new DraggerDragEvent('dragmove', dx, speedo.getVel()));
    }
    function onRelease(x, y, e) {
        document.removeEventListener('scroll', onScroll, true);
        pressed = false;
        if (!isDragging) {
            // Never crossed drag start threshold, bail out now.
            return;
        }
        isDragging = false;
        const dx = x - dragStart.x;
        speedo.addSample(dx, Date.now() / 1000);
        setTimeout(() => {
            if (!pressed)
                device = NONE;
        }, DEVICE_DELAY);
        on.devicerelease && on.devicerelease(e);
        on.dragend && on.dragend(new DraggerDragEvent('dragend', dx, speedo.getVel()));
    }
    /** Received scroll event - dragging should be cancelled. */
    function onScroll(e) {
        isScrolling = true;
        cancelPress();
    }
    function cancelPress() {
        if (!pressed)
            return;
        if (device === MOUSE) {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        }
        else if (device === TOUCH) {
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
        }
        el.removeEventListener('scroll', onScroll, true);
        pressed = false;
        if (isDragging) {
            isDragging = false;
            on.dragcancel && on.dragcancel(new DraggerEvent('dragcancel'));
        }
    }
    function destroy() {
        el.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', onMouseMove);
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('scroll', onScroll, true);
    }
    // Initialize the input listeners we want
    if (!devices || devices.indexOf('mouse') >= 0) {
        el.addEventListener('mousedown', onMouseDown);
    }
    if (!devices || devices.indexOf('touch') >= 0) {
        el.addEventListener('touchstart', onTouchStart);
    }
    return {
        isDragging: () => isDragging,
        destroy
    };
}
exports.default = Dragger;
// Workaround for webkit bug where event.preventDefault
// within touchmove handler fails to prevent scrolling.
const isIOS = !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
let iOSHackApplied = false;
function applyIOSHack() {
    // Only apply this hack if iOS, haven't yet applied it,
    // and only if a component is actually created
    if (!isIOS || iOSHackApplied)
        return;
    window.addEventListener('touchmove', function () { });
    iOSHackApplied = true;
}

},{"./Speedo":5}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Creates a Panel instance */
function Panel(index, widthPct, state = Panel.EMPTY, className = '') {
    const xpct = index * widthPct;
    return {
        dom: Panel.createElement(className, {
            width: `${widthPct}%`,
            transform: `translate3d(${xpct}%,0,0)`
        }),
        index,
        state
    };
}
/** Additional Panel statics */
(function (Panel) {
    Panel.EMPTY = 0;
    Panel.PRERENDERED = 1;
    Panel.FETCHING = 2;
    Panel.RENDERED = 3;
    Panel.DIRTY = -1;
    /** Creates a Panel DOM node */
    function createElement(className = '', style = {}) {
        const el = document.createElement('div');
        if (className) {
            el.className = className;
        }
        Object.assign(el.style, {
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            transform: 'translate3d(0,0,0)'
        }, style);
        return el;
    }
    Panel.createElement = createElement;
})(Panel || (Panel = {}));
exports.default = Panel;

},{}],5:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const math_1 = require("./math");
const DEFAULT_SAMPLES = 4;
/**
 * Computes speed (delta x over time)
 */
function Speedo(numSamples = DEFAULT_SAMPLES) {
    const samples = [];
    let index = 0;
    let count = 0;
    for (let index = 0; index < numSamples; ++index) {
        samples.push({ x: 0, t: 0 });
    }
    index = 0;
    function start(x, t) {
        index = 0;
        count = 0;
        samples[index].x = x;
        samples[index].t = t;
        index = 1;
        count = 1;
    }
    function addSample(x, t) {
        samples[index].x = x;
        samples[index].t = t;
        index = (index + 1) % numSamples;
        count += 1;
    }
    function getVel() {
        if (count < 1) {
            return 0;
        }
        const n = count > numSamples ? numSamples : count;
        const iLast = math_1.pmod(index - 1, numSamples);
        const iFirst = math_1.pmod(index - n, numSamples);
        const deltaT = samples[iLast].t - samples[iFirst].t;
        const dx = samples[iLast].x - samples[iFirst].x;
        return dx / deltaT;
    }
    return {
        start,
        addSample,
        getVel
    };
}
exports.default = Speedo;

},{"./math":9}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Generate an array sequence of numbers from start up to but not including end incrementing by step */
function range(start, end, step) {
    step = step || 1;
    if (end == null) {
        end = start;
        start = 0;
    }
    const size = Math.ceil((end - start) / step);
    const a = [];
    for (let i = 0; i < size; ++i) {
        a.push(start + step * i);
    }
    return a;
}
exports.range = range;

},{}],7:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const math_1 = require("./math");
/**
 * Compute "throw" from swipe
 */
function swipe({ panelId, x, xv, panelWidth, maxSwipePanels, totalPanels, slideDuration }) {
    /** Minimum duration of animation */
    const MIN_DUR_MS = 17;
    /** Max throw velocity */
    const MAX_VEL = 10000;
    /* max distance we can travel */
    //const MAX_DIST = maxSwipePanels
    /** swipe velocity in px/s clamped to sane range */
    const xvel = math_1.clamp(xv, -MAX_VEL, MAX_VEL);
    /** Destination position */
    const destX = x + xvel * 0.5;
    /** Current index panel (where it is currently dragged to, not its resting position) */
    const p0 = Math.floor(-x / panelWidth);
    /** Destination panel index */
    let destPanel = Math.round(-destX / panelWidth);
    if (destPanel - p0 > maxSwipePanels) {
        destPanel = p0 + maxSwipePanels;
    }
    else if (p0 - destPanel > maxSwipePanels) {
        destPanel = p0 - maxSwipePanels;
    }
    destPanel = math_1.clamp(destPanel, Math.max(0, panelId - maxSwipePanels), Math.min(totalPanels - 1, panelId + maxSwipePanels));
    /** How many panels (incl. fractions) are we travelling across */
    const unitDist = Math.abs(destPanel * panelWidth - (-x)) / panelWidth;
    let dur = 0;
    if (unitDist > 1) {
        // Compute a duration suitable for travelling multiple panels
        dur = Math.max(MIN_DUR_MS, slideDuration * Math.pow(unitDist, 0.5) * 1.0);
    }
    else {
        // Compute a duration suitable for 1 or less panel travel
        dur = Math.max(MIN_DUR_MS, slideDuration * unitDist); // (unitDist * cfg.visiblePanels!))
        if (Math.sign(unitDist) === Math.sign(xvel)) {
            let timeScale = Math.abs(xvel) / (MAX_VEL / 10);
            if (timeScale < 1) {
                timeScale = 1;
            }
            dur = Math.max(MIN_DUR_MS, dur / timeScale);
        }
    }
    return { panelId: destPanel, duration: dur };
}
exports.swipe = swipe;

},{"./math":9}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const array_1 = require("./array");
const math_1 = require("./math");
const transform_1 = require("./transform");
const Dragger_1 = require("./Dragger");
const Panel_1 = require("./Panel");
const gesture = require("./gesture");
/**
 * Creates a PanelSlider instance.
 */
function PanelSlider(cfg) {
    cfg = Object.assign({}, cfg);
    cfg.visiblePanels = cfg.visiblePanels || 1;
    cfg.initialPanel = cfg.initialPanel || 0;
    cfg.maxSwipePanels = cfg.maxSwipePanels || cfg.visiblePanels;
    cfg.slideDuration = cfg.slideDuration || PanelSlider.DEFAULT_SLIDE_DURATION;
    cfg.panelClassName = cfg.panelClassName || '';
    cfg.dragRatio = cfg.dragRatio || 1.5;
    cfg.dragThreshold = cfg.dragThreshold || 12;
    cfg.on = cfg.on || {};
    cfg.terp = cfg.terp || PanelSlider.terp;
    const emitters = {
        dragstart: [],
        drag: [],
        dragend: [],
        dragcancel: [],
        animate: [],
        animationstatechange: [],
        panelchange: []
    };
    for (const key of Object.keys(cfg.on)) {
        if (cfg.on[key] != null) {
            addListener(key, cfg.on[key]);
        }
    }
    const panelWidthPct = 100 / cfg.visiblePanels;
    const panels = array_1.range(cfg.initialPanel, cfg.initialPanel + cfg.visiblePanels * 3).map(pid => Panel_1.default(pid, panelWidthPct, Panel_1.default.EMPTY, cfg.panelClassName));
    cfg.dom.innerHTML = '';
    for (const p of panels) {
        p.state = cfg.renderContent(p);
        cfg.dom.appendChild(p.dom);
    }
    // Will be computed on resize
    let fullWidth = panels.length;
    let visibleWidth = cfg.visiblePanels;
    /** Width of a panel in pixels */
    let panelWidth = 1;
    /** Current Panel index */
    let curPanel = cfg.initialPanel;
    /** Current viewport position in pixels (left edge) */
    let curPosX = 0;
    /** Indicates panel animation loop is running */
    let isAnimating = false;
    /** Update our full width and panel width on resize */
    function resize() {
        const rc = cfg.dom.getBoundingClientRect();
        panelWidth = rc.width / cfg.visiblePanels;
        visibleWidth = panelWidth * cfg.visiblePanels;
        fullWidth = panelWidth * cfg.totalPanels;
        curPosX = -curPanel * panelWidth;
        render();
    }
    function render(fast) {
        // note that: curPosX = -curPanel * panelWidth
        const x = Math.abs(curPosX);
        /** Inclusive start/end panel indexes */
        let iStart = Math.floor(cfg.totalPanels * x / fullWidth);
        let iEnd = Math.min(Math.ceil(cfg.totalPanels * (x + panelWidth * cfg.visiblePanels) / fullWidth), cfg.totalPanels - 1);
        //if (!fast) {
        // Render extrap panels outward from viewport edges.
        // Start on the left side then alternate.
        for (let i = 0, n = panels.length - (iEnd - iStart + 1); n > 0; ++i) {
            if (i % 2 === 0) {
                if (iStart > 0) {
                    iStart -= 1;
                    n -= 1;
                }
            }
            else {
                if (iEnd < panels.length - 1) {
                    iEnd += 1;
                    n -= 1;
                }
            }
        }
        //}
        /** Cached panels that are still valid */
        const keepPanels = Object.create(null);
        /** ids of panels that were not cached */
        const ids = [];
        // Render panels that are cached
        for (let i = iStart; i <= iEnd; ++i) {
            // Find a bound panel
            const panel = panels.find(p => p.index === i);
            if (panel) {
                if (panel.state < Panel_1.default.PRERENDERED || (!fast && panel.state < Panel_1.default.FETCHING)) {
                    panel.state = cfg.renderContent(panel, fast);
                }
                transform_1.setPos3d(panel.dom, curPosX + i * panelWidth);
                keepPanels[i] = panel;
            }
            else {
                ids.push(i);
            }
        }
        // Render panels that weren't cached
        for (const i of ids) {
            const panel = panels.find(p => !keepPanels[p.index]);
            if (panel == null) {
                console.warn('Could not find an available panel for id:', i);
                continue;
            }
            // Need to render this
            if (!fast) {
                console.log(`updating panel: ${i}`);
            }
            panel.index = i;
            panel.state = cfg.renderContent(panel, fast);
            transform_1.setPos3d(panel.dom, curPosX - i * panelWidth);
            keepPanels[i] = panel;
        }
    }
    /** Application wants to re-render this panel (or all panels) content */
    function renderPanelContent(pid) {
        if (pid != null) {
            const panel = panels.find(p => p.index === pid);
            if (!panel)
                return false;
            panel.state = cfg.renderContent(panel);
            return true;
        }
        for (const panel of panels) {
            panel.state = cfg.renderContent(panel);
        }
        return true;
    }
    function emit(e) {
        for (const cb of emitters[e.type]) {
            cb(e);
        }
    }
    resize();
    const dragger = Dragger_1.default(cfg.dom, {
        dragThreshold: cfg.dragThreshold, dragRatio: cfg.dragRatio,
        devices: cfg.devices,
        on: {
            dragstart(e) {
                emit(new PanelSlider.DragEvent('drag', e.x, 0));
            },
            dragmove(e) {
                const ox = -curPanel * panelWidth;
                curPosX = Math.round(math_1.clamp(ox + e.x, -(fullWidth - panelWidth), 0));
                render();
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                emit(new PanelSlider.DragEvent('drag', e.x, e.xv));
            },
            dragcancel() {
                emit(new PanelSlider.DragEvent('dragcancel', curPosX, 0));
                swipeAnim(0, pid => {
                    emit(new PanelSlider.ChangeEvent('panelchange', pid));
                });
            },
            dragend(e) {
                const ox = -curPanel * panelWidth;
                curPosX = Math.round(math_1.clamp(ox + e.x, -(fullWidth - panelWidth), 0));
                render();
                swipeAnim(e.xv, pid => {
                    emit(new PanelSlider.ChangeEvent('panelchange', pid));
                });
                emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                emit(new PanelSlider.DragEvent('dragend', e.x, e.xv));
            },
            devicepress() {
                // Ensure we have up-to-date dimensions whenever a drag action
                // may start in case we missed a stealth window resize.
                resize();
            }
        }
    });
    /**
     * @param xVelocity Speed of swipe in pixels/second
     * @param done callback when swipe ends
     */
    function swipeAnim(xVelocity, done) {
        const result = gesture.swipe({
            panelId: curPanel,
            x: curPosX, xv: xVelocity,
            maxSwipePanels: cfg.maxSwipePanels,
            panelWidth,
            slideDuration: cfg.slideDuration,
            totalPanels: cfg.totalPanels - (cfg.visiblePanels - 1)
        });
        animateTo(result.panelId, result.duration, done);
    }
    /** Animate panels to the specified panelId */
    function animateTo(destPanel, dur = cfg.slideDuration, done) {
        if (isAnimating) {
            // TODO: Allow redirect
            console.warn("Cannot animateTo - already animating");
            return;
        }
        if (dragger.isDragging()) {
            console.warn("Cannot animateTo - currently dragging");
            return;
        }
        isAnimating = true;
        const startX = curPosX;
        const destX = -destPanel * panelWidth;
        function finish() {
            curPanel = destPanel;
            isAnimating = false;
            emit(new PanelSlider.AnimationEvent('animationstatechange', false));
            done && done(curPanel);
        }
        function loop() {
            if (!isAnimating) {
                // Animation has been cancelled, assume
                // something else has changed curPanel.
                // (eg. setPanelImmediate)
                done && done(curPanel);
                emit(new PanelSlider.AnimationEvent('animationstatechange', false));
                return;
            }
            const t = Date.now();
            const destX = -destPanel * panelWidth;
            const totalT = t - startT;
            const animT = Math.min(totalT, dur);
            curPosX = cfg.terp(startX, destX, animT / dur);
            // Use a 'fast' render unless this is the last frame of the animation
            const isLastFrame = totalT >= dur;
            render(!isLastFrame);
            emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
            if (!isLastFrame) {
                requestAnimationFrame(loop);
            }
            else {
                finish();
            }
        }
        if (destX === startX) {
            requestAnimationFrame(finish);
            emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
            return;
        }
        const startT = Date.now();
        requestAnimationFrame(loop);
        emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
    }
    ///////////////////////////////////////////////////////
    // Public
    /** Add an event listener */
    function addListener(n, fn) {
        const arr = emitters[n];
        if (arr.indexOf(fn) === -1) {
            arr.push(fn);
        }
    }
    /** Remove an event listener */
    function removeListener(n, fn) {
        const arr = emitters[n];
        const i = arr.indexOf(fn);
        if (i >= 0) {
            arr.splice(i, 1);
        }
    }
    /** Returns current panel index */
    function getPanel() {
        return curPanel;
    }
    /**
     * Animates to position and updates panel index.
     * The animation could be redirected or aborted,
     * so the result index may not be what was
     * requested or the promise may not resolve.
     */
    function setPanel(panelId) {
        return panelId === curPanel
            ? Promise.resolve(panelId)
            : new Promise(r => {
                animateTo(panelId, cfg.slideDuration, r);
            });
    }
    /** Sets the current panel index immediately, no animation */
    function setPanelImmediate(panelId) {
        if (typeof panelId !== 'number' || !Number.isSafeInteger(panelId)
            || panelId < 0 || panelId >= cfg.totalPanels) {
            throw new Error('Invalid panel');
        }
        if (isAnimating) {
            isAnimating = false;
        }
        else if (panelId === curPanel) {
            return;
        }
        curPanel = panelId;
        curPosX = -curPanel * panelWidth;
        render();
    }
    /** Remove all event handlers, cleanup streams etc. */
    function destroy() {
        // Remove event listeners
        window.removeEventListener('resize', resize);
        dragger.destroy();
        Object.keys(emitters).forEach(k => {
            emitters[k].length = 0;
        });
        cfg.dom = undefined;
    }
    window.addEventListener('resize', resize);
    return {
        on: addListener,
        off: removeListener,
        getPanel,
        setPanel,
        setPanelImmediate,
        getSizes: () => ({ fullWidth, panelWidth }),
        isDragging: dragger.isDragging,
        isAnimating: () => isAnimating,
        renderContent: renderPanelContent,
        destroy,
    };
}
/**
 * PanelSlider static methods and properties.
 */
(function (PanelSlider) {
    PanelSlider.DEFAULT_SLIDE_DURATION = 500;
    /**
     * Default animation interpolation function
     * @param x0 Start coordinate
     * @param x1 End coordinate
     * @param t Time (0..1)
     */
    function terp(x0, x1, t) {
        const r = (Math.PI / 2.0) * t;
        const s = Math.sin(r);
        const si = 1.0 - s;
        return (x0 * si + x1 * s);
    }
    PanelSlider.terp = terp;
    /** Lightweight PanelSlider Event type */
    class Event {
        constructor(type) {
            this.type = type;
        }
    }
    PanelSlider.Event = Event;
    /** Event emitted when current panel changes */
    class ChangeEvent extends Event {
        constructor(type, panelId) {
            super(type);
            this.panelId = panelId;
        }
    }
    PanelSlider.ChangeEvent = ChangeEvent;
    /** Event emitted when current panel dragged */
    class DragEvent extends Event {
        constructor(type, x, xv) {
            super(type);
            this.x = x;
            this.xv = xv;
        }
    }
    PanelSlider.DragEvent = DragEvent;
    /** Emitted on animation start/stop */
    class AnimationEvent extends Event {
        constructor(type, animating) {
            super(type);
            this.animating = animating;
        }
    }
    PanelSlider.AnimationEvent = AnimationEvent;
    /** Emitted every frame during an animation */
    class AnimateEvent extends Event {
        constructor(type, panelFraction) {
            super(type);
            this.panelFraction = panelFraction;
        }
    }
    PanelSlider.AnimateEvent = AnimateEvent;
})(PanelSlider || (PanelSlider = {}));
exports.default = PanelSlider;

},{"./Dragger":3,"./Panel":4,"./array":6,"./gesture":7,"./math":9,"./transform":10}],9:[function(require,module,exports){
"use strict";
// Math utils
Object.defineProperty(exports, "__esModule", { value: true });
/** Clamp n to range */
function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}
exports.clamp = clamp;
/**  Always positive modulus */
function pmod(n, m) {
    return ((n % m + m) % m);
}
exports.pmod = pmod;

},{}],10:[function(require,module,exports){
"use strict";
// Determine style names (if prefix required)
Object.defineProperty(exports, "__esModule", { value: true });
function toLower(s) {
    return !!s && typeof s === 'string' ? s.toLowerCase() : '';
}
exports.prefix = (function () {
    const t = 'translate3d(100px,20px,0px)'; // the transform we'll use to test
    const el = document.createElement('div'); // Make a test element
    //  Check support for current standard first
    el.style.transform = t;
    let styleAttrLc = toLower(el.getAttribute('style'));
    if (styleAttrLc.indexOf('transform') === 0) {
        return ''; // current, yay.
    }
    //  Try beta names
    // tslint:disable align
    el.style.MozTransform = t // firefox
    ;
    el.style.webkitTransform = t // webkit/chrome
    ;
    el.style.msTransform = t; // IE
    styleAttrLc = toLower(el.getAttribute('style'));
    //  See which one worked, if any...
    if (styleAttrLc.indexOf('moz') !== -1) {
        return 'moz';
    }
    else if (styleAttrLc.indexOf('webkit') !== -1) {
        return 'webkit';
    }
    else if (styleAttrLc.indexOf('ms') !== -1) {
        return 'ms';
    }
    console.warn("CSS transform style not supported.");
    return '';
})();
exports.transform = exports.prefix ? exports.prefix + '-transform' : 'transform';
/**
 * Set position of element using 3d transform style
 */
function setPos3d(el, x, y = 0, z = 0) {
    el.style[exports.transform] = `translate3d(${x}px,${y}px,${z}px)`;
}
exports.setPos3d = setPos3d;

},{}]},{},[2]);
