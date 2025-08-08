import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
	build: {
		outDir: 'dist',
		emptyOutDir: true
	},
	plugins: [tailwindcss()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'hooks': path.resolve(__dirname, 'hooks')
		}
	}
})

