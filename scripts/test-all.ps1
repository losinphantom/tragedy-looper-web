#!/usr/bin/env pwsh
# 一键回归测试 — 运行三套测试
# 用法: pwsh scripts/test-all.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n[1/3] test-integration.ts..." -ForegroundColor Cyan
npx tsx scripts/test-integration.ts
if ($LASTEXITCODE -ne 0) { Write-Host "❌ integration failed" -ForegroundColor Red; exit 1 }

Write-Host "`n[2/3] test-phase2.ts..." -ForegroundColor Cyan
npx tsx scripts/test-phase2.ts
if ($LASTEXITCODE -ne 0) { Write-Host "❌ phase2 failed" -ForegroundColor Red; exit 1 }

Write-Host "`n[3/3] test-comprehensive.ts..." -ForegroundColor Cyan
npx tsx scripts/test-comprehensive.ts
if ($LASTEXITCODE -ne 0) { Write-Host "❌ comprehensive failed" -ForegroundColor Red; exit 1 }

Write-Host "`n✅ 全部测试通过！" -ForegroundColor Green
