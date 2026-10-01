import { struts } from './postcss/preset.js';

export default {
    plugins: struts({
        colorsConfig: './colors.config.json',
        fluid: { min: 400, max: 1440 }, // the Figma mobile and desktop frames
    }),
};
