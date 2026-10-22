import { debounce } from './debounce.js';
/**
 * Dimensions class to handle the size of the content and wrapper
 *
 * @example
 * const dimensions = new Dimensions(wrapper, content)
 * dimensions.on('resize', (e) => {
 *   console.log(e.width, e.height)
 * })
 */
export class Dimensions {
    constructor(wrapper, content, { autoResize = true, debounce: debounceValue = 250 } = {}) {
        this.wrapper = wrapper;
        this.content = content;
        this.width = 0;
        this.height = 0;
        this.scrollHeight = 0;
        this.scrollWidth = 0;
        this.resize = () => {
            this.onWrapperResize();
            this.onContentResize();
        };
        this.onWrapperResize = () => {
            if (this.wrapper instanceof Window) {
                this.width = window.innerWidth;
                this.height = window.innerHeight;
            }
            else {
                this.width = this.wrapper.clientWidth;
                this.height = this.wrapper.clientHeight;
            }
        };
        this.onContentResize = () => {
            if (this.wrapper instanceof Window) {
                this.scrollHeight = this.content.scrollHeight;
                this.scrollWidth = this.content.scrollWidth;
            }
            else {
                this.scrollHeight = this.wrapper.scrollHeight;
                this.scrollWidth = this.wrapper.scrollWidth;
            }
        };
        if (autoResize) {
            this.debouncedResize = debounce(this.resize, debounceValue);
            if (this.wrapper instanceof Window) {
                window.addEventListener('resize', this.debouncedResize);
            }
            else {
                this.wrapperResizeObserver = new ResizeObserver(this.debouncedResize);
                this.wrapperResizeObserver.observe(this.wrapper);
            }
            this.contentResizeObserver = new ResizeObserver(this.debouncedResize);
            this.contentResizeObserver.observe(this.content);
        }
        this.resize();
    }
    destroy() {
        var _a, _b;
        (_a = this.wrapperResizeObserver) === null || _a === void 0 ? void 0 : _a.disconnect();
        (_b = this.contentResizeObserver) === null || _b === void 0 ? void 0 : _b.disconnect();
        if (this.wrapper === window && this.debouncedResize) {
            window.removeEventListener('resize', this.debouncedResize);
        }
    }
    get limit() {
        return {
            x: this.scrollWidth - this.width,
            y: this.scrollHeight - this.height,
        };
    }
}
