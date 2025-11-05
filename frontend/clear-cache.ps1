# Clear build cache and rebuild

# Step 1: Remove build artifacts
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules/.vite -ErrorAction SilentlyContinue

# Step 2: Clear Vite cache
npm run build -- --force

# Or if running dev server:
# npm run dev -- --force

Write-Host "Build cache cleared. Please restart your dev server or redeploy to Dokploy."
