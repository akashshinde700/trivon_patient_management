import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.js',
        '*.config.ts'
      ]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - Split large libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['@headlessui/react', 'react-icons'],
          'chart-vendor': ['recharts'],
          'utils-vendor': ['axios'],
          // Feature chunks - Split by page groups
          'analytics': ['./src/pages/Analytics'],
          'prescription': ['./src/pages/PrescriptionPad', './src/pages/PrescriptionPreview'],
          'patient': ['./src/pages/Patients', './src/pages/PatientOverview'],
          'management': ['./src/pages/ClinicManagement', './src/pages/DoctorManagement', './src/pages/StaffManagement'],
          'medical': ['./src/pages/MedicalCertificates', './src/pages/LabManagement', './src/pages/InsuranceManagement']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable sourcemaps in production for smaller bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.info', 'console.debug', 'console.warn'] // Remove specific console methods
      }
    },
    // Optimize CSS
    cssCodeSplit: true,
    // Target modern browsers for smaller output
    target: 'es2015',
    // Optimize asset handling
    assetsInlineLimit: 4096, // Inline assets smaller than 4kb
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'axios'],
    // Force optimization of these packages
    force: true
  },
  // Enable compression
  server: {
    compress: true
  }
})
