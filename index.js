(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.PanelSlider = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./Speedo"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Speedo_1 = require("./Speedo");
    var NONE = 0;
    var MOUSE = 1;
    var TOUCH = 2;
    var DEVICE_DELAY = 300;
    var DEFAULT_DRAG_THRESHOLD = 12;
    var DEFAULT_DRAG_RATIO = 1.5;
    var DraggerEvent = /** @class */ (function () {
        function DraggerEvent(type) {
            this.type = type;
        }
        return DraggerEvent;
    }());
    exports.DraggerEvent = DraggerEvent;
    var DraggerDragEvent = /** @class */ (function (_super) {
        __extends(DraggerDragEvent, _super);
        function DraggerDragEvent(type, x, xv) {
            var _this = _super.call(this, type) || this;
            _this.x = x;
            _this.xv = xv;
            return _this;
        }
        return DraggerDragEvent;
    }(DraggerEvent));
    exports.DraggerDragEvent = DraggerDragEvent;
    /**
     * Given a dom element, emit 'drag' events that occur along the horizontal axis
     */
    function Dragger(el, _a) {
        var _b = _a === void 0 ? {} : _a, _c = _b.on, on = _c === void 0 ? {} : _c, _d = _b.dragThreshold, dragThreshold = _d === void 0 ? DEFAULT_DRAG_THRESHOLD : _d, _e = _b.dragRatio, dragRatio = _e === void 0 ? DEFAULT_DRAG_RATIO : _e, devices = _b.devices, maxLeft = _b.maxLeft, maxRight = _b.maxRight;
        applyIOSHack();
        var speedo = Speedo_1.default();
        var device = NONE;
        /** Flag to prevent dragging while some child element is scrolling */
        var isScrolling = false;
        /** Touch/Mouse is down */
        var pressed = false;
        /** Indicates drag threshold crossed and we're in "dragging" mode */
        var isDragging = false;
        var dragStart = { x: 0, y: 0 };
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
            var t = e.changedTouches[0];
            onPress(t.clientX, t.clientY, e);
        }
        function onTouchMove(e) {
            var t = e.changedTouches[0];
            onMove(t.clientX, t.clientY, e);
        }
        function onTouchEnd(e) {
            el.removeEventListener('touchmove', onTouchMove);
            el.removeEventListener('touchend', onTouchEnd);
            var t = e.changedTouches[0];
            onRelease(t.clientX, t.clientY, e);
        }
        function onPress(x, y, e) {
            isScrolling = false;
            pressed = true;
            dragStart.x = x;
            dragStart.y = y;
            speedo.start(0, Date.now() / 1000);
            document.addEventListener('scroll', onScroll, true);
            on.devicepress && on.devicepress(e);
        }
        function onMove(x, y, e) {
            if (!pressed)
                return;
            var dx = x - dragStart.x;
            if (maxLeft != null) {
                dx = Math.max(dx, maxLeft());
            }
            if (maxRight != null) {
                dx = Math.min(dx, maxRight());
            }
            var dy = y - dragStart.y;
            speedo.addSample(dx, Date.now() / 1000);
            if (!isDragging) {
                var ratio = dy !== 0 ? Math.abs(dx / dy) : 1000000000.0;
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
            var dx = x - dragStart.x;
            speedo.addSample(dx, Date.now() / 1000);
            setTimeout(function () {
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
            document.removeEventListener('scroll', onScroll, true);
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
            document.removeEventListener('scroll', onScroll, true);
        }
        // Initialize the input listeners we want
        if (!devices || devices.indexOf('mouse') >= 0) {
            el.addEventListener('mousedown', onMouseDown);
        }
        if (!devices || devices.indexOf('touch') >= 0) {
            el.addEventListener('touchstart', onTouchStart);
        }
        return {
            isDragging: function () { return isDragging; },
            destroy: destroy
        };
    }
    exports.default = Dragger;
    // Workaround for webkit bug where event.preventDefault
    // within touchmove handler fails to prevent scrolling.
    var isIOS = !!navigator.userAgent.match(/iPhone|iPad|iPod/i);
    var iOSHackApplied = false;
    function applyIOSHack() {
        // Only apply this hack if iOS, haven't yet applied it,
        // and only if a component is actually created
        if (!isIOS || iOSHackApplied)
            return;
        window.addEventListener('touchmove', function () { });
        iOSHackApplied = true;
    }
});

},{"./Speedo":2}],2:[function(require,module,exports){
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./math"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var math_1 = require("./math");
    var DEFAULT_SAMPLES = 4;
    /**
     * Computes speed (delta x over time)
     */
    function Speedo(numSamples) {
        if (numSamples === void 0) { numSamples = DEFAULT_SAMPLES; }
        var samples = [];
        var index = 0;
        var count = 0;
        for (var index_1 = 0; index_1 < numSamples; ++index_1) {
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
            var n = count > numSamples ? numSamples : count;
            var iLast = math_1.pmod(index - 1, numSamples);
            var iFirst = math_1.pmod(index - n, numSamples);
            var deltaT = samples[iLast].t - samples[iFirst].t;
            var dx = samples[iLast].x - samples[iFirst].x;
            return dx / deltaT;
        }
        return {
            start: start,
            addSample: addSample,
            getVel: getVel
        };
    }
    exports.default = Speedo;
});

},{"./math":5}],3:[function(require,module,exports){
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    /** Generate an array sequence of numbers from start up to but not including end incrementing by step */
    function range(start, end, step) {
        step = step || 1;
        if (end == null) {
            end = start;
            start = 0;
        }
        var size = Math.ceil((end - start) / step);
        var a = [];
        for (var i = 0; i < size; ++i) {
            a.push(start + step * i);
        }
        return a;
    }
    exports.range = range;
});

},{}],4:[function(require,module,exports){
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "./array", "./math", "./transform", "./Dragger"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var array_1 = require("./array");
    var math_1 = require("./math");
    var transform_1 = require("./transform");
    var Dragger_1 = require("./Dragger");
    function createPanelElement(className, style) {
        if (className === void 0) { className = ''; }
        if (style === void 0) { style = {}; }
        var el = document.createElement('div');
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
    function Panel(index, widthPct, state, className) {
        if (state === void 0) { state = Panel.EMPTY; }
        if (className === void 0) { className = ''; }
        var xpct = index * widthPct;
        return {
            dom: createPanelElement(className, {
                transform: "translate3d(" + xpct + "%,0,0)"
            }),
            index: index,
            state: state
        };
    }
    exports.Panel = Panel;
    (function (Panel) {
        Panel.EMPTY = 0;
        Panel.PRERENDERED = 1;
        Panel.FETCHING = 2;
        Panel.RENDERED = 3;
        Panel.DIRTY = -1;
    })(Panel = exports.Panel || (exports.Panel = {}));
    /**
     * Creates a PanelSlider instance.
     */
    function PanelSlider(_a) {
        var dom = _a.dom, totalPanels = _a.totalPanels, visiblePanels = _a.visiblePanels, _b = _a.initialPanel, initialPanel = _b === void 0 ? 0 : _b, _c = _a.slideDuration, slideDuration = _c === void 0 ? PanelSlider.DEFAULT_SLIDE_DURATION : _c, dragThreshold = _a.dragThreshold, dragRatio = _a.dragRatio, devices = _a.devices, _d = _a.panelClassName, panelClassName = _d === void 0 ? '' : _d, _e = _a.on, on = _e === void 0 ? {} : _e, renderContent = _a.renderContent, _f = _a.terp, terp = _f === void 0 ? PanelSlider.terp : _f;
        var emitters = {
            dragstart: [],
            drag: [],
            dragend: [],
            dragcancel: [],
            animate: [],
            animationstatechange: [],
            panelchange: []
        };
        for (var _i = 0, _g = Object.keys(on); _i < _g.length; _i++) {
            var key = _g[_i];
            if (on[key] != null) {
                addListener(key, on[key]);
            }
        }
        var panelWidthPct = 100 / visiblePanels * 3;
        var panels = array_1.range(visiblePanels * 3).map(function (pid) { return Panel(pid, panelWidthPct, Panel.EMPTY, panelClassName); });
        dom.innerHTML = '';
        for (var _h = 0, panels_1 = panels; _h < panels_1.length; _h++) {
            var p = panels_1[_h];
            p.state = renderContent(p);
            dom.appendChild(p.dom);
        }
        // Will be computed on resize
        var fullWidth = panels.length;
        var visibleWidth = visiblePanels;
        /** Width of a panel in pixels */
        var panelWidth = 1;
        /** Current Panel index */
        var curPanel = initialPanel;
        /** Current viewport position in pixels (left edge) */
        var curPosX = 0;
        /** Indicates panel animation loop is running */
        var isAnimating = false;
        /** Update our full width and panel width on resize */
        function resize() {
            var rc = dom.getBoundingClientRect();
            panelWidth = rc.width;
            visibleWidth = panelWidth * visiblePanels;
            fullWidth = panelWidth * totalPanels;
            curPosX = -curPanel * panelWidth;
            render();
        }
        function render(fast) {
            // note that: curPosX = -curPanel * panelWidth
            var x = Math.abs(curPosX);
            /** Inclusive start/end panel indexes */
            var iStart = Math.floor(totalPanels * x / fullWidth);
            var iEnd = Math.min(Math.ceil(totalPanels * (x + panelWidth) / fullWidth), totalPanels - 1);
            if (!fast) {
                console.log("rendering panels " + iStart + "-" + iEnd);
            }
            /** Cached panels that are still valid */
            var keepPanels = Object.create(null);
            /** ids of panels that were not cached */
            var ids = [];
            var _loop_1 = function (i) {
                // Find a bound panel
                var panel = panels.find(function (p) { return p.index === i; });
                if (panel) {
                    if (panel.state < Panel.PRERENDERED || (!fast && panel.state < Panel.FETCHING)) {
                        panel.state = renderContent(panel, fast);
                    }
                    transform_1.setPos3d(panel.dom, curPosX + i * panelWidth);
                    keepPanels[i] = panel;
                }
                else {
                    ids.push(i);
                }
            };
            // Render panels that are cached
            for (var i = iStart; i <= iEnd; ++i) {
                _loop_1(i);
            }
            // Render panels that weren't cached
            for (var _i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
                var i = ids_1[_i];
                var panel = panels.find(function (p) { return !keepPanels[p.index]; });
                if (panel == null) {
                    console.warn('Could not find an available panel for id:', i);
                    continue;
                }
                // Need to render this
                if (!fast) {
                    console.log("updating panel: " + i);
                }
                panel.index = i;
                panel.state = renderContent(panel, fast);
                transform_1.setPos3d(panel.dom, curPosX - i * panelWidth);
                keepPanels[i] = panel;
            }
        }
        /** Application wants to re-render this panel (or all panels) content */
        function renderPanelContent(pid) {
            if (pid != null) {
                var panel = panels.find(function (p) { return p.index === pid; });
                if (!panel)
                    return false;
                panel.state = renderContent(panel);
                return true;
            }
            for (var _i = 0, panels_2 = panels; _i < panels_2.length; _i++) {
                var panel = panels_2[_i];
                panel.state = renderContent(panel);
            }
            return true;
        }
        function emit(e) {
            for (var _i = 0, _a = emitters[e.type]; _i < _a.length; _i++) {
                var cb = _a[_i];
                cb(e);
            }
        }
        resize();
        var dragger = Dragger_1.default(dom, {
            dragThreshold: dragThreshold, dragRatio: dragRatio,
            devices: devices,
            on: {
                dragstart: function (e) {
                    emit(new PanelSlider.DragEvent('drag', e.x, 0));
                },
                dragmove: function (e) {
                    var ox = -curPanel * panelWidth;
                    curPosX = Math.round(math_1.clamp(ox + e.x, -(fullWidth - panelWidth), 0));
                    render();
                    emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                    emit(new PanelSlider.DragEvent('drag', e.x, e.xv));
                },
                dragcancel: function () {
                    emit(new PanelSlider.DragEvent('dragcancel', curPosX, 0));
                    swipeAnim(0, function (pid) {
                        emit(new PanelSlider.ChangeEvent('panelchange', pid));
                    });
                },
                dragend: function (e) {
                    var ox = -curPanel * panelWidth;
                    curPosX = Math.round(math_1.clamp(ox + e.x, -(fullWidth - panelWidth), 0));
                    //setX(dom, curPosX)
                    render();
                    swipeAnim(e.xv, function (pid) {
                        emit(new PanelSlider.ChangeEvent('panelchange', pid));
                    });
                    emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
                    emit(new PanelSlider.DragEvent('dragend', e.x, e.xv));
                },
                devicepress: function () {
                    // Ensure we have up-to-date dimensions whenever a drag action
                    // may start in case we missed a stealth window resize.
                    resize();
                }
            }
        });
        function swipeAnim(xvel, done) {
            var x = curPosX + xvel * 0.5;
            var destination = math_1.clamp(Math.round(-x / panelWidth), 0, totalPanels - 1);
            var p0 = curPanel;
            if (destination - p0 > 1)
                destination = p0 + 1;
            else if (p0 - destination > 1)
                destination = p0 - 1;
            var dur = math_1.clamp(slideDuration - (slideDuration * (Math.abs(xvel / 10.0) / panelWidth)), 17, slideDuration);
            animateTo(destination, dur, done);
        }
        /** Animate panels to the specified panelId */
        function animateTo(destPanel, dur, done) {
            if (dur === void 0) { dur = slideDuration; }
            if (isAnimating) {
                console.warn("Cannot animateTo - already animating");
                return;
            }
            if (dragger.isDragging()) {
                console.warn("Cannot animateTo - currently dragging");
                return;
            }
            isAnimating = true;
            var startX = curPosX;
            var destX = -destPanel * panelWidth;
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
                var t = Date.now();
                var destX = -destPanel * panelWidth;
                var totalT = t - startT;
                var animT = Math.min(totalT, dur);
                curPosX = terp(startX, destX, animT / dur);
                // Use a 'fast' render unless this is the last frame of the animation
                var isLastFrame = totalT >= dur;
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
            var startT = Date.now();
            requestAnimationFrame(loop);
            emit(new PanelSlider.AnimateEvent('animate', -curPosX / panelWidth));
        }
        ///////////////////////////////////////////////////////
        // Public
        /** Add an event listener */
        function addListener(n, fn) {
            var arr = emitters[n];
            if (arr.indexOf(fn) === -1) {
                arr.push(fn);
            }
        }
        /** Remove an event listener */
        function removeListener(n, fn) {
            var arr = emitters[n];
            var i = arr.indexOf(fn);
            if (i >= 0) {
                arr.splice(i, 1);
            }
        }
        /** Returns current panel index */
        function getPanel() {
            return curPanel;
        }
        /** Sets current panel index, animates to position */
        function setPanel(panelId, done) {
            if (panelId === curPanel)
                return;
            animateTo(panelId, slideDuration, done);
        }
        /** Sets the current panel index immediately, no animation */
        function setPanelImmediate(panelId) {
            if (typeof panelId !== 'number' || !Number.isSafeInteger(panelId)
                || panelId < 0 || panelId >= totalPanels) {
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
            //setX(dom, curPosX)
            render();
        }
        /** Remove all event handlers, cleanup streams etc. */
        function destroy() {
            // Remove event listeners
            window.removeEventListener('resize', resize);
            dragger.destroy();
            Object.keys(emitters).forEach(function (k) {
                emitters[k].length = 0;
            });
            dom = undefined;
        }
        window.addEventListener('resize', resize);
        return {
            on: addListener,
            off: removeListener,
            getPanel: getPanel,
            setPanel: setPanel,
            setPanelImmediate: setPanelImmediate,
            getSizes: function () { return ({ fullWidth: fullWidth, panelWidth: panelWidth }); },
            isDragging: dragger.isDragging,
            isAnimating: function () { return isAnimating; },
            renderContent: renderPanelContent,
            destroy: destroy,
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
            var r = (Math.PI / 2.0) * t;
            var s = Math.sin(r);
            var si = 1.0 - s;
            return (x0 * si + x1 * s);
        }
        PanelSlider.terp = terp;
        /** Lightweight PanelSlider Event type */
        var Event = /** @class */ (function () {
            function Event(type) {
                this.type = type;
            }
            return Event;
        }());
        PanelSlider.Event = Event;
        /** Event emitted when current panel changes */
        var ChangeEvent = /** @class */ (function (_super) {
            __extends(ChangeEvent, _super);
            function ChangeEvent(type, panelId) {
                var _this = _super.call(this, type) || this;
                _this.panelId = panelId;
                return _this;
            }
            return ChangeEvent;
        }(Event));
        PanelSlider.ChangeEvent = ChangeEvent;
        /** Event emitted when current panel dragged */
        var DragEvent = /** @class */ (function (_super) {
            __extends(DragEvent, _super);
            function DragEvent(type, x, xv) {
                var _this = _super.call(this, type) || this;
                _this.x = x;
                _this.xv = xv;
                return _this;
            }
            return DragEvent;
        }(Event));
        PanelSlider.DragEvent = DragEvent;
        /** Emitted on animation start/stop */
        var AnimationEvent = /** @class */ (function (_super) {
            __extends(AnimationEvent, _super);
            function AnimationEvent(type, animating) {
                var _this = _super.call(this, type) || this;
                _this.animating = animating;
                return _this;
            }
            return AnimationEvent;
        }(Event));
        PanelSlider.AnimationEvent = AnimationEvent;
        /** Emitted every frame during an animation */
        var AnimateEvent = /** @class */ (function (_super) {
            __extends(AnimateEvent, _super);
            function AnimateEvent(type, panelFraction) {
                var _this = _super.call(this, type) || this;
                _this.panelFraction = panelFraction;
                return _this;
            }
            return AnimateEvent;
        }(Event));
        PanelSlider.AnimateEvent = AnimateEvent;
    })(PanelSlider || (PanelSlider = {}));
    exports.default = PanelSlider;
});

},{"./Dragger":1,"./array":3,"./math":5,"./transform":6}],5:[function(require,module,exports){
// Math utils
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
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
});

},{}],6:[function(require,module,exports){
// Determine style names (if prefix required)
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function toLower(s) {
        return !!s && typeof s === 'string' ? s.toLowerCase() : '';
    }
    exports.prefix = (function () {
        var t = 'translate3d(100px,20px,0px)'; // the transform we'll use to test
        var el = document.createElement('div'); // Make a test element
        //  Check support for current standard first
        el.style.transform = t;
        var styleAttrLc = toLower(el.getAttribute('style'));
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
    function setPos3d(el, x, y, z) {
        if (y === void 0) { y = 0; }
        if (z === void 0) { z = 0; }
        el.style[exports.transform] = "translate3d(" + x + "px," + y + "px," + z + "px)";
    }
    exports.setPos3d = setPos3d;
});

},{}]},{},[4])(4)
});