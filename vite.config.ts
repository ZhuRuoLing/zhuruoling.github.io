import UnoCSS from 'unocss/vite'
import vue from "@vitejs/plugin-vue"
import {defineConfig} from 'vite'

export default defineConfig({
    plugins: [
        UnoCSS(),
        vue()
    ],
})